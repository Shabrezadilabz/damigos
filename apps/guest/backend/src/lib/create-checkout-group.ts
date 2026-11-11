import { eq } from "drizzle-orm";
import {
  cartItems,
  carts,
  checkoutGroups,
  db,
  menuItems,
  orderItems,
  orders,
  paymentIntents,
} from "@damigos/db";
import { randomUUID } from "node:crypto";
import { ensureBestClaimApplied } from "./auto-apply-claim.js";
import { captureOrderPayment } from "./capture-order-payment.js";
import { resolveAppliedClaimDiscount } from "./cart-totals.js";
import { findStaleCartLines, type StaleCartLine } from "./cart-price-lock.js";
import { legMicroFeesPaise } from "./micro-fees.js";
import { crossByMeta, listOpenKitchenCarts } from "./cross-by-cart.js";
import { clampLoyaltyApplyPaise } from "./guest-loyalty.js";
import { isFirstOrderFreeEligible } from "./first-order-delivery.js";

export type LegSnapshot = {
  cartId: string;
  restaurantId: string;
  restaurantName: string;
  legIndex: number;
  lines: {
    menuItemId: string;
    quantity: number;
    unitPricePaise: number;
    name: string;
  }[];
  subtotalPaise: number;
  discountPaise: number;
  loyaltyAppliedPaise: number;
  appliedClaimTitle: string | null;
  appliedClaimBillLabel: string | null;
  deliveryFeePaise: number;
  deliveryPincode: string | null;
  deliveryAddressText: string | null;
  appliedClaimId: string | null;
  /** S1.5 — lines whose cart price drifted from live menu price (checkout is rejected if any) */
  staleLines: StaleCartLine[];
};

export async function buildLegSnapshots(customerId: string): Promise<LegSnapshot[]> {
  const open = await listOpenKitchenCarts(customerId);
  const legs: LegSnapshot[] = [];

  const usedPlatformClaims = new Set<string>();

  for (let i = 0; i < open.length; i++) {
    const kitchen = open[i]!;
    const [cart] = await db.select().from(carts).where(eq(carts.id, kitchen.cartId)).limit(1);
    if (!cart) continue;

    const lineRows = await db
      .select({
        menuItemId: cartItems.menuItemId,
        quantity: cartItems.quantity,
        unitPricePaise: cartItems.unitPricePaise,
        name: menuItems.name,
        livePricePaise: menuItems.pricePaise,
        available: menuItems.available,
        draft: menuItems.draft,
      })
      .from(cartItems)
      .innerJoin(menuItems, eq(cartItems.menuItemId, menuItems.id))
      .where(eq(cartItems.cartId, cart.id));

    if (lineRows.length === 0) continue;

    const staleLines = findStaleCartLines(lineRows);
    const lines = lineRows.map((l) => ({
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      unitPricePaise: l.unitPricePaise,
      name: l.name,
    }));

    const subtotalPaise = lines.reduce((s, l) => s + l.quantity * l.unitPricePaise, 0);

    let claimId = await ensureBestClaimApplied({
      cartId: cart.id,
      customerId,
      restaurantId: kitchen.restaurantId,
      subtotalPaise,
      appliedClaimId: cart.appliedClaimId,
      autoRewardDeclined: cart.autoRewardDeclined ?? false,
      excludeClaimIds: usedPlatformClaims,
    });

    // Platform offer applies once across the checkout group
    if (claimId && usedPlatformClaims.has(claimId)) {
      claimId = null;
    }

    const claimInfo = await resolveAppliedClaimDiscount(
      claimId,
      customerId,
      kitchen.restaurantId,
      subtotalPaise,
    );

    if (
      claimInfo.appliedClaim?.scope === "PLATFORM_WIDE" &&
      claimInfo.appliedClaim.claimId
    ) {
      usedPlatformClaims.add(claimInfo.appliedClaim.claimId);
    }

    const loyaltyAppliedPaise = clampLoyaltyApplyPaise(
      cart.loyaltyAppliedPaise ?? 0,
      subtotalPaise,
      claimInfo.discountPaise,
    );

    legs.push({
      cartId: cart.id,
      restaurantId: kitchen.restaurantId,
      restaurantName: kitchen.restaurantName,
      legIndex: i + 1,
      lines,
      subtotalPaise,
      discountPaise: claimInfo.discountPaise,
      loyaltyAppliedPaise,
      appliedClaimTitle: claimInfo.appliedClaim?.title ?? null,
      appliedClaimBillLabel: claimInfo.appliedClaim?.billLabel ?? null,
      deliveryFeePaise: cart.deliveryFeePaise ?? 0,
      deliveryPincode: cart.deliveryPincode,
      deliveryAddressText: cart.deliveryAddressText ?? null,
      appliedClaimId: claimInfo.discountPaise > 0 ? claimId : null,
      staleLines,
    });
  }

  return legs;
}

export function groupDeliveryFeePaise(
  legs: LegSnapshot[],
  riderMode: "SINGLE" | "SPLIT",
): number {
  const fees = legs.map((l) => l.deliveryFeePaise);
  if (fees.length === 0) return 0;
  if (riderMode === "SINGLE") return Math.max(...fees, 0);
  return fees.reduce((s, f) => s + f, 0);
}

export function legItemQty(leg: LegSnapshot): number {
  return leg.lines.reduce((s, l) => s + l.quantity, 0);
}

/** S1.9 — silent micro-fees for the whole group (₹2/item across legs + ₹2 WA + ₹3 rail once). */
export function groupMicroFeesPaise(legs: LegSnapshot[]): number {
  return legs.reduce((s, l) => s + legMicroFeesPaise(legItemQty(l), l.legIndex), 0);
}

export function groupTotalPaise(legs: LegSnapshot[], deliveryFeePaise: number): number {
  const items = legs.reduce(
    (s, l) => s + Math.max(0, l.subtotalPaise - l.discountPaise - l.loyaltyAppliedPaise),
    0,
  );
  return items + groupMicroFeesPaise(legs) + deliveryFeePaise;
}

export type PendingCheckoutGroup = {
  group: typeof checkoutGroups.$inferSelect;
  orderIds: string[];
  totalPaise: number;
  deliveryFeePaise: number;
  riderMode: "SINGLE" | "SPLIT";
  distanceMeters: number | null;
  legs: LegSnapshot[];
  idempotent: boolean;
};

/** Create checkout_group + N PAYMENT_PENDING orders (no capture yet). */
export async function createPendingCheckoutGroup(
  customerId: string,
  idempotencyKey?: string | null,
): Promise<PendingCheckoutGroup | { error: string }> {
  const open = await listOpenKitchenCarts(customerId);
  if (open.length === 0) return { error: "CART_EMPTY" };

  const meta = crossByMeta(open);
  const legs = await buildLegSnapshots(customerId);
  if (legs.length === 0) return { error: "CART_EMPTY" };

  const grossDelivery = groupDeliveryFeePaise(legs, meta.riderMode);
  const firstOrderFree = await isFirstOrderFreeEligible(customerId);
  const deliveryFeePaise = firstOrderFree ? 0 : grossDelivery;
  const platformSubsidyPaise = firstOrderFree ? grossDelivery : 0;
  const totalPaise = groupTotalPaise(legs, deliveryFeePaise);
  const key = idempotencyKey ?? `cg_${randomUUID().slice(0, 12)}`;

  if (idempotencyKey) {
    const [existing] = await db
      .select()
      .from(checkoutGroups)
      .where(eq(checkoutGroups.idempotencyKey, idempotencyKey))
      .limit(1);
    if (existing) {
      const childOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.checkoutGroupId, existing.id));
      if (childOrders.length > 0) {
        return {
          group: existing,
          orderIds: childOrders.map((o) => o.id),
          totalPaise: childOrders.reduce((s, o) => s + o.totalPaise, 0),
          deliveryFeePaise: existing.deliveryFeePaise,
          riderMode: existing.riderMode as "SINGLE" | "SPLIT",
          distanceMeters: existing.distanceMeters,
          legs,
          idempotent: true,
        };
      }
    }
  }

  // S1.5 — cart lock: never create orders from stale cart prices
  if (legs.some((l) => l.staleLines.length > 0)) return { error: "CART_PRICE_STALE" };

  const [group] = await db
    .insert(checkoutGroups)
    .values({
      customerId,
      status: "PAYMENT_PENDING",
      riderMode: meta.riderMode,
      distanceMeters: meta.distanceMeters,
      deliveryFeePaise,
      platformDeliverySubsidyPaise: platformSubsidyPaise,
      convenienceFeePaise: groupMicroFeesPaise(legs),
      idempotencyKey: key,
    })
    .returning();

  const createdOrderIds: string[] = [];

  for (const leg of legs) {
    const convenience = legMicroFeesPaise(legItemQty(leg), leg.legIndex);
    const deliveryShare = leg.legIndex === 1 ? deliveryFeePaise : 0;
    const combinedDiscount = leg.discountPaise + leg.loyaltyAppliedPaise;
    const legTotal =
      Math.max(0, leg.subtotalPaise - combinedDiscount) + convenience + deliveryShare;

    const [order] = await db
      .insert(orders)
      .values({
        customerId,
        restaurantId: leg.restaurantId,
        status: "PAYMENT_PENDING",
        subtotalPaise: leg.subtotalPaise,
        convenienceFeePaise: convenience,
        discountPaise: combinedDiscount,
        deliveryPincode: leg.deliveryPincode,
        deliveryAddressText: leg.deliveryAddressText,
        deliveryFeePaise: deliveryShare,
        totalPaise: legTotal,
        checkoutGroupId: group.id,
        legIndex: leg.legIndex,
      })
      .returning();

    await db.insert(orderItems).values(
      leg.lines.map((l) => ({
        orderId: order.id,
        menuItemId: l.menuItemId,
        name: l.name,
        quantity: l.quantity,
        unitPricePaise: l.unitPricePaise,
      })),
    );

    await db.insert(paymentIntents).values({
      orderId: order.id,
      cartId: leg.cartId,
      appliedClaimId: leg.appliedClaimId,
      loyaltyAppliedPaise: leg.loyaltyAppliedPaise,
      status: "created",
      idempotencyKey: `cg_${group.id}_leg_${leg.legIndex}`,
    });

    createdOrderIds.push(order.id);
  }

  return {
    group,
    orderIds: createdOrderIds,
    totalPaise,
    deliveryFeePaise,
    riderMode: meta.riderMode,
    distanceMeters: meta.distanceMeters,
    legs,
    idempotent: false,
  };
}

export async function captureCheckoutGroup(
  groupId: string,
  paymentId: string,
  razorpayOrderId?: string | null,
) {
  const childOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.checkoutGroupId, groupId));

  for (const row of childOrders) {
    await captureOrderPayment(row.id, paymentId);
  }

  await db
    .update(checkoutGroups)
    .set({
      status: "PAID",
      ...(razorpayOrderId ? { razorpayOrderId } : {}),
    })
    .where(eq(checkoutGroups.id, groupId));

  return childOrders.map((o) => o.id);
}
