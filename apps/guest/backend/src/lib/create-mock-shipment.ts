import { eq } from "drizzle-orm";
import { db, orders, shipments } from "@damigos/db";
import { deliveryMode } from "./delivery-mode.js";

/** P1-T03 — mock AWB after payment when delivery was quoted */
export async function createMockShipmentIfNeeded(orderId: string) {
  if (deliveryMode() !== "mock") return null;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.deliveryFeePaise <= 0) return null;

  const [existing] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  if (existing) return existing;

  const awb = `MOCK${order.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const [row] = await db
    .insert(shipments)
    .values({
      orderId,
      carrier: "Shiprocket",
      awb,
      status: "pickup_scheduled",
    })
    .returning();

  return row;
}
