type OfferRow = { id: string; weight: number };

/** S1.7 — "Better luck next time" segment: lands on the wheel but never creates a reward claim. */
export const NO_PRIZE_TYPE = "no_prize";

export function isNoPrizeOffer(offer: { prizeType: string }): boolean {
  return offer.prizeType === NO_PRIZE_TYPE;
}

export function pickWeightedOffer<T extends OfferRow>(offers: T[]): T {
  const total = offers.reduce((s, o) => s + Math.max(1, o.weight), 0);
  let roll = Math.floor(Math.random() * total);
  for (const o of offers) {
    roll -= Math.max(1, o.weight);
    if (roll < 0) return o;
  }
  return offers[offers.length - 1]!;
}
