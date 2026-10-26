type OfferLike = {
  prizeType: string;
  prizeValue: number;
  minOrderPaise: number;
};

const PERCENT_MAX_PAISE = 7500;
/** Free-item default when CRM left prizeValue at 0 (legacy presets). */
const FREE_ITEM_DEFAULT_PAISE = 9900;

export function computeOfferDiscountPaise(offer: OfferLike, subtotalPaise: number): number {
  if (subtotalPaise < offer.minOrderPaise) return 0;

  if (offer.prizeType === "flat_off_paise") {
    return Math.min(offer.prizeValue, subtotalPaise);
  }

  if (offer.prizeType === "percent") {
    const raw = Math.floor((subtotalPaise * offer.prizeValue) / 100);
    return Math.min(raw, PERCENT_MAX_PAISE);
  }

  if (offer.prizeType === "free_item") {
    const cap = offer.prizeValue > 0 ? offer.prizeValue : FREE_ITEM_DEFAULT_PAISE;
    return Math.min(cap, subtotalPaise);
  }

  return 0;
}
