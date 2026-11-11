import { and, eq, isNull, sql } from "drizzle-orm";
import { db, offers, restaurants, rewardClaims, rewardPlays } from "@damigos/db";

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

/** S1.8 � max unredeemed (claimed, not yet used on an order) wins per guest across all kitchens. */
export const MAX_UNREDEEMED_WINS = 5;

/** Unredeemed, unexpired claims for a guest across every kitchen + platform offers. */
export async function countUnredeemedWins(customerId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rewardClaims)
    .innerJoin(offers, eq(rewardClaims.offerId, offers.id))
    .where(
      and(
        eq(rewardClaims.customerId, customerId),
        isNull(rewardClaims.redeemedOrderId),
        sql`${offers.prizeType} <> 'no_prize'`,
        sql`${rewardClaims.claimedAt} + make_interval(days => ${offers.expiresDays}) > now()`,
      ),
    );
  return count ?? 0;
}

export async function isAtUnredeemedWinsCap(customerId: string): Promise<boolean> {
  return (await countUnredeemedWins(customerId)) >= MAX_UNREDEEMED_WINS;
}
