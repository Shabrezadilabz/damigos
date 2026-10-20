import { eq } from "drizzle-orm";
import { db, orders, restaurantPayoutLedger } from "@damigos/db";

/** INTEGRATIONS-V2 §4 — ₹2/min after grace, cap ₹60 */
export function computeWaitingPenaltyPaise(input: {
  riderArrivedAt: Date | null;
  readyForPickupAt: Date | null;
  committedPrepMinutes: number | null;
  extendedPrepMinutes: number;
  now?: Date;
}): { penaltyPaise: number; overtimeMin: number; graceMin: number } {
  if (!input.riderArrivedAt || input.readyForPickupAt) {
    return { penaltyPaise: 0, overtimeMin: 0, graceMin: 0 };
  }
  const committed = input.committedPrepMinutes ?? 15;
  const graceMin = committed + (input.extendedPrepMinutes || 0) + 3;
  const now = input.now ?? new Date();
  const waitedMin = Math.floor((now.getTime() - input.riderArrivedAt.getTime()) / 60_000);
  const overtimeMin = Math.max(0, waitedMin - graceMin);
  const penaltyPaise = Math.min(overtimeMin * 200, 6000);
  return { penaltyPaise, overtimeMin, graceMin };
}

export async function finalizeWaitingPenalty(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.waitingPenaltyFinalized) return order;

  const { penaltyPaise, overtimeMin, graceMin } = computeWaitingPenaltyPaise({
    riderArrivedAt: order.riderArrivedAt,
    readyForPickupAt: order.readyForPickupAt,
    committedPrepMinutes: order.committedPrepMinutes,
    extendedPrepMinutes: order.extendedPrepMinutes,
  });

  const [updated] = await db
    .update(orders)
    .set({
      waitingPenaltyPaise: penaltyPaise,
      waitingPenaltyFinalized: true,
    })
    .where(eq(orders.id, orderId))
    .returning();

  if (penaltyPaise > 0) {
    await db.insert(restaurantPayoutLedger).values({
      restaurantId: order.restaurantId,
      orderId: order.id,
      entryType: "WAITING_PENALTY_DEBIT",
      amountPaise: -penaltyPaise,
      meta: JSON.stringify({ overtimeMin, graceMin, ratePaisePerMin: 200, capPaise: 6000 }),
    });
  }

  return updated;
}
