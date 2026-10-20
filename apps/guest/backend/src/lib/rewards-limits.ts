import { and, eq, sql } from "drizzle-orm";
import { db, restaurants, rewardPlays } from "@damigos/db";

function envDailySpinLimit(): number {
  const n = Number(process.env.REWARDS_DAILY_SPIN_LIMIT ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/** Prefer CRM Grow loyalty config; fall back to REWARDS_DAILY_SPIN_LIMIT. */
export async function dailySpinLimitForRestaurant(restaurantId: string): Promise<number> {
  try {
    const [row] = await db
      .select({ growLoyaltyConfig: restaurants.growLoyaltyConfig })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);
    if (row?.growLoyaltyConfig) {
      const parsed = JSON.parse(row.growLoyaltyConfig) as {
        engineEnabled?: boolean;
        dailySpinLimit?: number;
      };
      if (parsed.engineEnabled === false) return 0;
      if (
        typeof parsed.dailySpinLimit === "number" &&
        Number.isFinite(parsed.dailySpinLimit) &&
        parsed.dailySpinLimit >= 0
      ) {
        return Math.floor(parsed.dailySpinLimit);
      }
    }
  } catch {
    // fall through
  }
  return envDailySpinLimit();
}

/** @deprecated use dailySpinLimitForRestaurant — kept for env-only call sites */
export function dailySpinLimit(): number {
  return envDailySpinLimit();
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
