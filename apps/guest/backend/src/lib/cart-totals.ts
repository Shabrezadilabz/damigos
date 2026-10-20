import { and, eq, isNull } from "drizzle-orm";
import { db, offers, rewardClaims } from "@damigos/db";
import { computeOfferDiscountPaise } from "./offer-discount.js";

export const CONVENIENCE_FEE_PAISE = 200;

export type OfferScope = "RESTAURANT_SCOPED" | "PLATFORM_WIDE";

export async function resolveAppliedClaimDiscount(
  appliedClaimId: string | null | undefined,
  customerId: string,
  restaurantId: string,
  subtotalPaise: number,
) {
  if (!appliedClaimId) {
    return { discountPaise: 0, appliedClaim: null as null };
  }

  const [claim] = await db
    .select()
    .from(rewardClaims)
    .where(
      and(
        eq(rewardClaims.id, appliedClaimId),
        eq(rewardClaims.customerId, customerId),
        isNull(rewardClaims.redeemedOrderId),
      ),
    )
    .limit(1);

  if (!claim) {
    return { discountPaise: 0, appliedClaim: null as null, invalidClaim: true as const };
  }

  const [offer] = await db.select().from(offers).where(eq(offers.id, claim.offerId)).limit(1);
  if (!offer) {
    return { discountPaise: 0, appliedClaim: null as null, invalidClaim: true as const };
  }

  const scope = (offer.scope === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED") as OfferScope;

  // G-04.08 — restaurant-scoped reward cannot reduce another kitchen's leg
  if (scope === "RESTAURANT_SCOPED" && claim.restaurantId !== restaurantId) {
    return { discountPaise: 0, appliedClaim: null as null, invalidClaim: true as const };
  }

  const discountPaise = computeOfferDiscountPaise(offer, subtotalPaise);

  return {
    discountPaise,
    appliedClaim: {
      claimId: claim.id,
      title: offer.title,
      discountPaise,
      eligible: discountPaise > 0,
      minOrderPaise: offer.minOrderPaise,
      scope,
      billLabel:
        scope === "PLATFORM_WIDE" ? "D'aMigo Platform Offer" : "Restaurant scoped reward",
    },
  };
}

export function cartTotalPaise(
  subtotalPaise: number,
  discountPaise: number,
  deliveryFeePaise = 0,
  loyaltyAppliedPaise = 0,
) {
  return (
    Math.max(0, subtotalPaise - discountPaise - loyaltyAppliedPaise) +
    CONVENIENCE_FEE_PAISE +
    deliveryFeePaise
  );
}

/** Load claim+offer for apply gate (platform vs scoped) */
export async function loadClaimWithOffer(claimId: string, customerId: string) {
  const [claim] = await db
    .select()
    .from(rewardClaims)
    .where(
      and(
        eq(rewardClaims.id, claimId),
        eq(rewardClaims.customerId, customerId),
        isNull(rewardClaims.redeemedOrderId),
      ),
    )
    .limit(1);
  if (!claim) return null;
  const [offer] = await db.select().from(offers).where(eq(offers.id, claim.offerId)).limit(1);
  if (!offer) return null;
  return { claim, offer };
}
