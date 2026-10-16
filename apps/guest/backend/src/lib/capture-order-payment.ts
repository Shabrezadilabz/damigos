import { eq } from "drizzle-orm";
import { carts, db, orderItems, orders, paymentIntents, rewardClaims } from "@damigos/db";
import type { CheckoutCartSnapshot } from "./checkout-from-cart.js";
import { CONVENIENCE_FEE_PAISE } from "./checkout-from-cart.js";
import { publishKitchenRefresh } from "@damigos/kitchen-bus";
import { createMockShipmentIfNeeded } from "./create-mock-shipment.js";

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
      discountPaise: snapshot.discountPaise,
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
    .set({ status: "CHECKED_OUT", appliedClaimId: null })
    .where(eq(carts.id, intent.cartId));

  await createMockShipmentIfNeeded(orderId);

  const [paidOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (paidOrder) void publishKitchenRefresh(paidOrder.restaurantId);

  return { captured: true, orderId };
}
