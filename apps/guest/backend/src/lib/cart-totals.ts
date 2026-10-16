import { and, eq, isNull } from "drizzle-orm";
import { db, offers, rewardClaims } from "@damigos/db";
import { computeOfferDiscountPaise } from "./offer-discount.js";

export const CONVENIENCE_FEE_PAISE = 200;

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
        eq(rewardClaims.restaurantId, restaurantId),
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

  const discountPaise = computeOfferDiscountPaise(offer, subtotalPaise);

  return {
    discountPaise,
    appliedClaim: {
      claimId: claim.id,
      title: offer.title,
      discountPaise,
      eligible: discountPaise > 0,
      minOrderPaise: offer.minOrderPaise,
    },
  };
}

export function cartTotalPaise(
  subtotalPaise: number,
  discountPaise: number,
  deliveryFeePaise = 0,
) {
  return Math.max(0, subtotalPaise - discountPaise) + CONVENIENCE_FEE_PAISE + deliveryFeePaise;
}
