/**
 * S1.5 — cart lock: cart_items.unit_price_paise is a snapshot taken when the item was added.
 * Before any money moves it must still equal the live menu_items.price_paise (and the dish
 * must still be orderable), otherwise checkout is rejected with CART_PRICE_STALE (409).
 */
export type PriceLockLine = {
  name: string;
  unitPricePaise: number;
  livePricePaise: number;
  available: boolean;
  draft: boolean;
};

export type StaleCartLine = {
  name: string;
  cartPricePaise: number;
  livePricePaise: number;
  reason: "PRICE_CHANGED" | "UNAVAILABLE";
};

export function findStaleCartLines(lines: PriceLockLine[]): StaleCartLine[] {
  const stale: StaleCartLine[] = [];
  for (const l of lines) {
    if (!l.available || l.draft) {
      stale.push({
        name: l.name,
        cartPricePaise: l.unitPricePaise,
        livePricePaise: l.livePricePaise,
        reason: "UNAVAILABLE",
      });
    } else if (l.unitPricePaise !== l.livePricePaise) {
      stale.push({
        name: l.name,
        cartPricePaise: l.unitPricePaise,
        livePricePaise: l.livePricePaise,
        reason: "PRICE_CHANGED",
      });
    }
  }
  return stale;
}

export function staleCartMessage(stale: StaleCartLine[]): string {
  const names = stale
    .slice(0, 3)
    .map((s) => s.name)
    .join(", ");
  const more = stale.length > 3 ? ` +${stale.length - 3} more` : "";
  return `Menu prices changed for ${names}${more}. Refresh your cart and try again.`;
}
