/**
 * S1.5 — guest sell prices are restricted to two bands: ₹49 or ₹99 (D'aMigo 99/49 pricing).
 * `menu_items.price_paise` is the guest sell price; `reference_price_paise` stays free-form.
 */
export const GUEST_PRICE_BANDS_PAISE = [4900, 9900] as const;

export function isAllowedGuestPricePaise(pricePaise: number): boolean {
  return (GUEST_PRICE_BANDS_PAISE as readonly number[]).includes(pricePaise);
}

export const GUEST_PRICE_BAND_MESSAGE = "Guest price must be ₹49 or ₹99";
