type OfferLike = {
  prizeType: string;
  prizeValue: number;
  minOrderPaise: number;
};

const PERCENT_MAX_PAISE = 7500;

export function computeOfferDiscountPaise(offer: OfferLike, subtotalPaise: number): number {
  if (subtotalPaise < offer.minOrderPaise) return 0;

  if (offer.prizeType === "flat_off_paise") {
    return Math.min(offer.prizeValue, subtotalPaise);
  }

  if (offer.prizeType === "percent") {
    const raw = Math.floor((subtotalPaise * offer.prizeValue) / 100);
    return Math.min(raw, PERCENT_MAX_PAISE);
  }

  return 0;
}
