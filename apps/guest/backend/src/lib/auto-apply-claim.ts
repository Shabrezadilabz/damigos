import { and, desc, eq, isNull, or } from "drizzle-orm";
import { carts, db, offers, rewardClaims } from "@damigos/db";
import { computeOfferDiscountPaise } from "./offer-discount.js";

/**
 * Auto-apply the best eligible unredeemed claim when none is set and guest
 * has not declined. Returns the claim id that should be used for totals.
 */
export async function ensureBestClaimApplied(opts: {
  cartId: string;
  customerId: string;
  restaurantId: string;
  subtotalPaise: number;
  appliedClaimId: string | null;
  autoRewardDeclined: boolean;
  /** Platform claims already reserved by another open cart (Cross-By) */
  excludeClaimIds?: Set<string>;
}): Promise<string | null> {
  const {
    cartId,
    customerId,
    restaurantId,
    subtotalPaise,
    appliedClaimId,
    autoRewardDeclined,
    excludeClaimIds,
  } = opts;

  if (appliedClaimId) {
    if (excludeClaimIds?.has(appliedClaimId)) {
      await db
        .update(carts)
        .set({ appliedClaimId: null, updatedAt: new Date() })
        .where(eq(carts.id, cartId));
      return null;
    }
    return appliedClaimId;
  }

  if (autoRewardDeclined || subtotalPaise <= 0) {
    return null;
  }

  const rows = await db
    .select({ claim: rewardClaims, offer: offers })
    .from(rewardClaims)
    .innerJoin(offers, eq(rewardClaims.offerId, offers.id))
    .where(
      and(
        eq(rewardClaims.customerId, customerId),
        isNull(rewardClaims.redeemedOrderId),
        or(eq(rewardClaims.restaurantId, restaurantId), eq(offers.scope, "PLATFORM_WIDE")),
      ),
    )
    .orderBy(desc(rewardClaims.claimedAt));

  let bestId: string | null = null;
  let bestDiscount = 0;

  for (const { claim, offer } of rows) {
    if (excludeClaimIds?.has(claim.id)) continue;
    const scope = offer.scope === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED";
    if (scope === "RESTAURANT_SCOPED" && claim.restaurantId !== restaurantId) continue;
    const discount = computeOfferDiscountPaise(offer, subtotalPaise);
    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestId = claim.id;
    }
  }

  if (!bestId) return null;

  await db
    .update(carts)
    .set({ appliedClaimId: bestId, autoRewardDeclined: false, updatedAt: new Date() })
    .where(eq(carts.id, cartId));

  return bestId;
}
