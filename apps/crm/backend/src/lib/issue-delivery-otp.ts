import { eq } from "drizzle-orm";
import {
  generateDeliveryOtp,
  hashDeliveryOtp,
  shortOrderId,
} from "@damigos/domain";
import { customers, db, orders, restaurants } from "@damigos/db";
import { sendFoodDeliveryOtp } from "./kapso-food.js";

/** Issue (or refresh) guest delivery OTP and WhatsApp it. Returns plaintext for logging only in mock. */
export async function issueAndSendDeliveryOtp(orderId: string): Promise<{
  sent: boolean;
  otp?: string;
  error?: string;
}> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return { sent: false, error: "Order not found" };

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
  if (!phone) {
    return { sent: false, error: "Guest phone missing" };
  }

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

  return { sent: result.ok, otp: result.mode === "mock" ? otp : undefined, error: result.error };
}
