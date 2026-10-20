import { and, eq } from "drizzle-orm";
import { carts, db, guestLoyaltyCredits, restaurants } from "@damigos/db";

export async function getLoyaltyBalancePaise(customerId: string, restaurantId: string) {
  const [row] = await db
    .select()
    .from(guestLoyaltyCredits)
    .where(
      and(
        eq(guestLoyaltyCredits.customerId, customerId),
        eq(guestLoyaltyCredits.restaurantId, restaurantId),
      ),
    )
    .limit(1);
  return Math.max(0, row?.balancePaise ?? 0);
}

/** Cap loyalty so it never exceeds post-reward merchandise total. */
export function clampLoyaltyApplyPaise(
  requestedOrBalance: number,
  subtotalPaise: number,
  rewardDiscountPaise: number,
) {
  const maxRedeemable = Math.max(0, subtotalPaise - rewardDiscountPaise);
  return Math.min(Math.max(0, requestedOrBalance), maxRedeemable);
}

export async function setLoyaltyAppliedOnCart(
  cartId: string,
  apply: boolean,
  availablePaise: number,
  subtotalPaise: number,
  rewardDiscountPaise: number,
) {
  const loyaltyAppliedPaise = apply
    ? clampLoyaltyApplyPaise(availablePaise, subtotalPaise, rewardDiscountPaise)
    : 0;
  await db
    .update(carts)
    .set({ loyaltyAppliedPaise, updatedAt: new Date() })
    .where(eq(carts.id, cartId));
  return loyaltyAppliedPaise;
}

export async function debitLoyaltyCredits(
  customerId: string,
  restaurantId: string,
  amountPaise: number,
) {
  if (amountPaise <= 0) return;
  const [row] = await db
    .select()
    .from(guestLoyaltyCredits)
    .where(
      and(
        eq(guestLoyaltyCredits.customerId, customerId),
        eq(guestLoyaltyCredits.restaurantId, restaurantId),
      ),
    )
    .limit(1);
  if (!row) return;
  const next = Math.max(0, row.balancePaise - amountPaise);
  await db
    .update(guestLoyaltyCredits)
    .set({ balancePaise: next, updatedAt: new Date() })
    .where(eq(guestLoyaltyCredits.id, row.id));
}

/** Credit payback % of merchandise (after discounts) from kitchen Grow config. */
export async function creditLoyaltyPayback(
  customerId: string,
  restaurantId: string,
  merchandisePaise: number,
) {
  if (merchandisePaise <= 0) return;
  const [kitchen] = await db
    .select({ growLoyaltyConfig: restaurants.growLoyaltyConfig })
    .from(restaurants)
    .where(eq(restaurants.id, restaurantId))
    .limit(1);
  let paybackPercent = 0;
  if (kitchen?.growLoyaltyConfig) {
    try {
      const parsed = JSON.parse(kitchen.growLoyaltyConfig) as { paybackPercent?: number };
      if (typeof parsed.paybackPercent === "number" && parsed.paybackPercent > 0) {
        paybackPercent = Math.min(100, Math.floor(parsed.paybackPercent));
      }
    } catch {
      /* ignore */
    }
  }
  if (paybackPercent <= 0) return;
  const credit = Math.floor((merchandisePaise * paybackPercent) / 100);
  if (credit <= 0) return;

  const [existing] = await db
    .select()
    .from(guestLoyaltyCredits)
    .where(
      and(
        eq(guestLoyaltyCredits.customerId, customerId),
        eq(guestLoyaltyCredits.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(guestLoyaltyCredits)
      .set({ balancePaise: existing.balancePaise + credit, updatedAt: new Date() })
      .where(eq(guestLoyaltyCredits.id, existing.id));
    return;
  }

  await db.insert(guestLoyaltyCredits).values({
    customerId,
    restaurantId,
    balancePaise: credit,
    updatedAt: new Date(),
  });
}
