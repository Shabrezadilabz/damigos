type OfferRow = { id: string; weight: number };

export function pickWeightedOffer<T extends OfferRow>(offers: T[]): T {
  const total = offers.reduce((s, o) => s + Math.max(1, o.weight), 0);
  let roll = Math.floor(Math.random() * total);
  for (const o of offers) {
    roll -= Math.max(1, o.weight);
    if (roll < 0) return o;
  }
  return offers[offers.length - 1]!;
}
