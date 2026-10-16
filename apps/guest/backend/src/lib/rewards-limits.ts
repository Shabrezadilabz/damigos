import { and, eq, sql } from "drizzle-orm";
import { db, rewardPlays } from "@damigos/db";

export function dailySpinLimit(): number {
  const n = Number(process.env.REWARDS_DAILY_SPIN_LIMIT ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/** Calendar day in Asia/Kolkata for pilot kitchens. */
export async function countDailyRewardPlays(customerId: string, restaurantId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rewardPlays)
    .where(
      and(
        eq(rewardPlays.customerId, customerId),
        eq(rewardPlays.restaurantId, restaurantId),
        sql`${rewardPlays.createdAt} >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')`,
      ),
    );
  return count ?? 0;
}
