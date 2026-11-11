/**
 * S1.9 — silent micro-fees folded into every guest total (never shown as separate line items).
 *   ₹2 per item + ₹2 WhatsApp + ₹3 delivery rail (when delivery, not pickup)
 * Stored on `orders.convenience_fee_paise` / `checkout_groups.convenience_fee_paise`.
 */
export const MICRO_FEE_PER_ITEM_PAISE = 200;
export const MICRO_FEE_WHATSAPP_PAISE = 200;
export const MICRO_FEE_DELIVERY_RAIL_PAISE = 300;

export type MicroFeeOpts = {
  /** Include ₹3 delivery rail. False for pickup. True even when first-order delivery is free (silent). */
  includeDeliveryRail?: boolean;
};

/** Fixed part for a delivery checkout (WhatsApp + optional delivery rail). */
export function microFeeFixedPaise(includeDeliveryRail = true): number {
  return (
    MICRO_FEE_WHATSAPP_PAISE + (includeDeliveryRail ? MICRO_FEE_DELIVERY_RAIL_PAISE : 0)
  );
}

/** @deprecated use microFeeFixedPaise — kept for imports that expect the full delivery fixed sum */
export const MICRO_FEE_FIXED_PAISE = MICRO_FEE_WHATSAPP_PAISE + MICRO_FEE_DELIVERY_RAIL_PAISE;

/** Total micro-fees for one checkout (single kitchen, or the whole Cross-By group). */
export function microFeesPaise(itemQty: number, opts: MicroFeeOpts = {}): number {
  const qty = Math.max(0, Math.floor(itemQty));
  const includeRail = opts.includeDeliveryRail !== false;
  return MICRO_FEE_PER_ITEM_PAISE * qty + microFeeFixedPaise(includeRail);
}

/**
 * Cross-By: per-item fee follows each leg's own items; the fixed WA + delivery rail
 * is charged once, on leg 1 (same convention the old flat convenience fee used).
 */
export function legMicroFeesPaise(
  legItemQty: number,
  legIndex: number,
  opts: MicroFeeOpts = {},
): number {
  const qty = Math.max(0, Math.floor(legItemQty));
  if (legIndex !== 1) return MICRO_FEE_PER_ITEM_PAISE * qty;
  const includeRail = opts.includeDeliveryRail !== false;
  return MICRO_FEE_PER_ITEM_PAISE * qty + microFeeFixedPaise(includeRail);
}
