import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { customers, db, offers, restaurants, rewardClaims } from "@damigos/db";
import { guestWebOrigin, sendSparkOrderNudge } from "./kapso.js";

function nudgeDelayMs(): number {
  const mins = Number(process.env.SPARK_CLAIM_NUDGE_MINUTES ?? 30);
  const safe = Number.isFinite(mins) && mins >= 0 ? mins : 30;
  return Math.floor(safe * 60_000);
}

/**
 * Spark nudge for claims that were won but not ordered yet.
 * Food agent still sends confirm/track only after PAID.
 */
export async function processClaimOrderNudges(limit = 25): Promise<{ sent: number }> {
  const cutoff = new Date(Date.now() - nudgeDelayMs());
  const rows = await db
    .select({
      claimId: rewardClaims.id,
      customerId: rewardClaims.customerId,
      restaurantId: rewardClaims.restaurantId,
      phoneE164: customers.phoneE164,
      kitchenName: restaurants.name,
      rewardTitle: offers.title,
    })
    .from(rewardClaims)
    .innerJoin(customers, eq(rewardClaims.customerId, customers.id))
    .innerJoin(restaurants, eq(rewardClaims.restaurantId, restaurants.id))
    .innerJoin(offers, eq(rewardClaims.offerId, offers.id))
    .where(
      and(
        isNull(rewardClaims.redeemedOrderId),
        isNull(rewardClaims.orderNudgeSentAt),
        lt(rewardClaims.claimedAt, cutoff),
        sql`${customers.phoneE164} is not null and length(${customers.phoneE164}) >= 10`,
      ),
    )
    .limit(limit);

  let sent = 0;
  const origin = guestWebOrigin();

  for (const row of rows) {
    if (!row.phoneE164) continue;
    const menuUrl = `${origin}/r/${row.restaurantId}/menu`;
    const result = await sendSparkOrderNudge({
      toPhone: row.phoneE164,
      kitchenName: row.kitchenName,
      rewardTitle: row.rewardTitle,
      menuUrl,
    });

    await db
      .update(rewardClaims)
      .set({ orderNudgeSentAt: new Date() })
      .where(eq(rewardClaims.id, row.claimId));

    if (result.ok) sent += 1;
  }

  return { sent };
}

let nudgeTimer: ReturnType<typeof setInterval> | null = null;

export function startClaimOrderNudgeScheduler(log?: { info: (o: unknown, msg?: string) => void }) {
  if (nudgeTimer) return;
  if ((process.env.SPARK_CLAIM_NUDGE_ENABLED ?? "true").toLowerCase() === "false") return;

  const intervalMs = Number(process.env.SPARK_CLAIM_NUDGE_INTERVAL_MS ?? 60_000);
  const tick = async () => {
    try {
      const { sent } = await processClaimOrderNudges();
      if (sent > 0) log?.info({ sent }, "spark claim-order nudges sent");
    } catch (err) {
      console.warn("[claim-order-nudge]", err);
    }
  };

  void tick();
  nudgeTimer = setInterval(() => void tick(), Math.max(15_000, intervalMs));
}
