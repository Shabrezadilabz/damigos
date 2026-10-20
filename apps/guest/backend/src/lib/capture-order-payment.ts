import { eq } from "drizzle-orm";
import {
  carts,
  customers,
  db,
  orderItems,
  orders,
  paymentIntents,
  restaurants,
  rewardClaims,
} from "@damigos/db";
import type { CheckoutCartSnapshot } from "./checkout-from-cart.js";
import { CONVENIENCE_FEE_PAISE } from "./checkout-from-cart.js";
import { creditLoyaltyPayback, debitLoyaltyCredits } from "./guest-loyalty.js";
import { publishKitchenRefresh } from "@damigos/kitchen-bus";
import { guestWebOrigin, sendFoodOrderConfirmed } from "./kapso.js";

export async function insertPendingOrder(
  snapshot: CheckoutCartSnapshot,
  customerId: string,
  restaurantId: string,
) {
  const [order] = await db
    .insert(orders)
    .values({
      customerId,
      restaurantId,
      status: "PAYMENT_PENDING",
      subtotalPaise: snapshot.subtotalPaise,
      convenienceFeePaise: CONVENIENCE_FEE_PAISE,
      discountPaise: snapshot.discountPaise + snapshot.loyaltyAppliedPaise,
      deliveryPincode: snapshot.deliveryPincode,
      deliveryFeePaise: snapshot.deliveryFeePaise,
      totalPaise: snapshot.totalPaise,
    })
    .returning();

  await db.insert(orderItems).values(
    snapshot.lines.map((l) => ({
      orderId: order.id,
      menuItemId: l.menuItemId,
      name: l.name,
      quantity: l.quantity,
      unitPricePaise: l.unitPricePaise,
    })),
  );

  return order;
}

export async function captureOrderPayment(
  orderId: string,
  razorpayPaymentId: string,
): Promise<{ captured: boolean; orderId: string; idempotent?: boolean }> {
  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.orderId, orderId))
    .limit(1);

  if (!intent) {
    throw new Error("PAYMENT_INTENT_NOT_FOUND");
  }

  if (intent.status === "captured") {
    return { captured: true, orderId, idempotent: true };
  }

  await db
    .update(paymentIntents)
    .set({
      status: "captured",
      razorpayPaymentId,
      capturedAt: new Date(),
    })
    .where(eq(paymentIntents.id, intent.id));

  await db.update(orders).set({ status: "PAID" }).where(eq(orders.id, orderId));

  if (intent.appliedClaimId) {
    await db
      .update(rewardClaims)
      .set({ redeemedOrderId: orderId })
      .where(eq(rewardClaims.id, intent.appliedClaimId));
  }

  await db
    .update(carts)
    .set({
      status: "CHECKED_OUT",
      appliedClaimId: null,
      autoRewardDeclined: false,
      loyaltyAppliedPaise: 0,
    })
    .where(eq(carts.id, intent.cartId));

  // Shiprocket AWB is created on kitchen Accept (C-05.06), not at payment.

  const [paidOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (paidOrder) {
    const loyaltyUsed = intent.loyaltyAppliedPaise ?? 0;
    if (loyaltyUsed > 0) {
      await debitLoyaltyCredits(paidOrder.customerId, paidOrder.restaurantId, loyaltyUsed);
    }
    const merchandise = Math.max(
      0,
      paidOrder.subtotalPaise - paidOrder.discountPaise,
    );
    await creditLoyaltyPayback(paidOrder.customerId, paidOrder.restaurantId, merchandise);

    void publishKitchenRefresh(paidOrder.restaurantId);
    void notifyFoodOrderPaid(paidOrder).catch((err) => {
      console.warn("[kapso:food] order confirm failed", err);
    });
  }

  return { captured: true, orderId };
}

async function notifyFoodOrderPaid(paidOrder: typeof orders.$inferSelect) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, paidOrder.customerId))
    .limit(1);
  const phone = customer?.phoneE164;
  if (!phone) return;

  const [kitchen] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, paidOrder.restaurantId))
    .limit(1);

  const shortId = paidOrder.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  await sendFoodOrderConfirmed({
    toPhone: phone,
    kitchenName: kitchen?.name ?? "Kitchen",
    totalPaise: paidOrder.totalPaise,
    trackUrl: `${guestWebOrigin()}/orders/${paidOrder.id}`,
    orderShortId: shortId,
  });
}
