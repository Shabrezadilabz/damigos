import { eq } from "drizzle-orm";
import {
  generateDeliveryOtp,
  hashDeliveryOtp,
  shortOrderId,
} from "@damigos/domain";
import { customers, db, orders, restaurants } from "@damigos/db";
import { sendFoodDeliveryOtp } from "./kapso.js";

export async function issueAndSendDeliveryOtp(orderId: string): Promise<{
  sent: boolean;
  error?: string;
}> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, error: "Order not found" };

  // Don't spam if sent in last 2 minutes
  if (
    order.deliveryOtpSentAt &&
    Date.now() - order.deliveryOtpSentAt.getTime() < 120_000 &&
    order.deliveryOtpHash
  ) {
    return { sent: true };
  }

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId))
    .limit(1);
  const [kitchen] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.id, order.restaurantId))
    .limit(1);

  const phone = customer?.phoneE164;
  if (!phone) return { sent: false, error: "Guest phone missing" };

  const otp = generateDeliveryOtp();
  await db
    .update(orders)
    .set({
      deliveryOtpHash: hashDeliveryOtp(otp),
      deliveryOtpSentAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  const result = await sendFoodDeliveryOtp({
    toPhone: phone,
    kitchenName: kitchen?.name ?? "Kitchen",
    orderShortId: shortOrderId(order.id),
    otp,
  });

  return { sent: result.ok, error: result.error };
}
