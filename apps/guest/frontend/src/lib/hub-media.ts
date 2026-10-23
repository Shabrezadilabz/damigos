/** Food-forward cover art for hub cards (Unsplash — demo / QA visual feel). */

const FOOD = {
  biryani:
    "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=640&q=80&auto=format&fit=crop",
  thali:
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=640&q=80&auto=format&fit=crop",
  pizza:
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=640&q=80&auto=format&fit=crop",
  sushi:
    "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=640&q=80&auto=format&fit=crop",
  dosa:
    "https://images.unsplash.com/photo-1630383249896-424e482df921?w=640&q=80&auto=format&fit=crop",
  grill:
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=640&q=80&auto=format&fit=crop",
  bowl:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=640&q=80&auto=format&fit=crop",
  chai:
    "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=640&q=80&auto=format&fit=crop",
  dessert:
    "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=640&q=80&auto=format&fit=crop",
  tandoor:
    "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=640&q=80&auto=format&fit=crop",
  shawarma:
    "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=640&q=80&auto=format&fit=crop",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&q=80&auto=format&fit=crop",
  chinese:
    "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=640&q=80&auto=format&fit=crop",
  healthy:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80&auto=format&fit=crop",
  festival:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&q=80&auto=format&fit=crop",
} as const;

const SLUG_COVER: Record<string, string> = {
  "biryani-box-koramangala": FOOD.biryani,
  "masala-trail-indiranagar": FOOD.thali,
  "tandoor-lane-hsr": FOOD.tandoor,
  "sushi-roll-koramangala": FOOD.sushi,
  "dosa-house-jayanagar": FOOD.dosa,
  "pizza-slice-btm": FOOD.pizza,
  "bowl-bar-whitefield": FOOD.bowl,
  "chai-tapri-mg-road": FOOD.chai,
  "grill-nation-electronic-city": FOOD.grill,
  "sweet-spot-indiranagar": FOOD.dessert,
};

const SLUG_CUISINE: Record<string, string> = {
  "biryani-box-koramangala": "Biryani, North Indian",
  "masala-trail-indiranagar": "South Indian, Meals",
  "tandoor-lane-hsr": "Tandoor, North Indian",
  "sushi-roll-koramangala": "Japanese, Sushi",
  "dosa-house-jayanagar": "South Indian, Dosa",
  "pizza-slice-btm": "Pizza, Italian",
  "bowl-bar-whitefield": "Healthy, Bowls",
  "chai-tapri-mg-road": "Chai, Snacks",
  "grill-nation-electronic-city": "Grill, BBQ",
  "sweet-spot-indiranagar": "Desserts, Sweets",
};

/** Deterministic demo rating / ETA from slug */
export function hubDemoMeta(slug: string): {
  rating: number;
  reviewsLabel: string;
  etaMins: number;
  badge: "delivery_promise" | "lowest_price";
} {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const rating = 3.9 + (h % 7) / 10;
  const reviews = 800 + (h % 40) * 50;
  const etaMins = 15 + (h % 18);
  return {
    rating: Math.round(rating * 10) / 10,
    reviewsLabel: reviews >= 1000 ? `${(reviews / 1000).toFixed(1)}k+` : `${reviews}+`,
    etaMins,
    badge: h % 2 === 0 ? "delivery_promise" : "lowest_price",
  };
}

export function coverForSlug(slug: string, fallbackIndex = 0): string {
  if (SLUG_COVER[slug]) return SLUG_COVER[slug]!;
  const pool = Object.values(FOOD);
  return pool[fallbackIndex % pool.length]!;
}

export function cuisineForSlug(slug: string, city?: string | null): string {
  return SLUG_CUISINE[slug] ?? `${city ?? "Bangalore"} · Direct D2C`;
}

export const CRAVING_TILES = [
  { id: "festival", label: "Festival", image: FOOD.festival, href: "/hub/collections/festival" },
  { id: "new", label: "New on D'aMigo", image: FOOD.bowl, href: "/hub/collections/new" },
  { id: "healthy", label: "Healthy", image: FOOD.healthy, href: "/hub/collections/healthy" },
  { id: "brands", label: "Top Brands", image: FOOD.biryani, href: "/hub/collections/brands" },
] as const;

/** Hub “What’s on your mind” — `q` matches onboarded kitchen + dish names via /hub/restaurants?q= */
export const MIND_CATEGORIES = [
  { id: "festival", label: "Festival Specials", image: FOOD.festival, q: "festival thali sweet" },
  { id: "biryani", label: "Biryani", image: FOOD.biryani, q: "biryani" },
  { id: "shawarma", label: "Shawarma", image: FOOD.shawarma, q: "shawarma grill" },
  { id: "south", label: "South Indian", image: FOOD.dosa, q: "dosa idli south" },
  { id: "burger", label: "Burger", image: FOOD.burger, q: "burger" },
  { id: "chinese", label: "Chinese", image: FOOD.chinese, q: "chinese noodles" },
  { id: "dessert", label: "Desserts", image: FOOD.dessert, q: "dessert sweet" },
] as const;

/** Dish / menu thumbnail from name + optional catalog URL */
export function coverForDish(
  name: string,
  imageUrl: string | null | undefined,
  index = 0,
): string {
  if (imageUrl?.trim()) return imageUrl.trim();
  return coverForPerk(name, "", index);
}

/** Resolve food cover from kitchen display name */
export function coverForPerk(kitchenName: string, _href: string, index: number): string {
  const name = kitchenName.toLowerCase();
  if (name.includes("biryani")) return FOOD.biryani;
  if (name.includes("tandoor")) return FOOD.tandoor;
  if (name.includes("pizza")) return FOOD.pizza;
  if (name.includes("sushi")) return FOOD.sushi;
  if (name.includes("dosa") || name.includes("masala trail")) return FOOD.dosa;
  if (name.includes("bowl")) return FOOD.bowl;
  if (name.includes("chai")) return FOOD.chai;
  if (name.includes("grill")) return FOOD.grill;
  if (name.includes("sweet") || name.includes("dessert")) return FOOD.dessert;
  if (name.includes("d'amigo") || name.includes("platform") || name.includes("amigo")) {
    return FOOD.festival;
  }
  for (const [slug, url] of Object.entries(SLUG_COVER)) {
    const token = slug.split("-")[0]!;
    if (token.length >= 4 && name.includes(token)) return url;
  }
  return coverForSlug("", index);
}

export type PerkPosterVariant =
  | "photo-bottom"
  | "photo-side"
  | "photo-full"
  | "split-diagonal"
  | "gold-frame";

const PERK_VARIANTS: PerkPosterVariant[] = [
  "photo-full",
  "photo-bottom",
  "photo-side",
  "split-diagonal",
  "gold-frame",
];

const PERK_ACCENTS = [
  { glow: "from-[#e23744]/80 via-[#7a0014]/50 to-transparent", chip: "bg-primary", tag: "text-[#f3bf51]" },
  { glow: "from-[#f59e0b]/70 via-[#92001c]/45 to-transparent", chip: "bg-[#ea580c]", tag: "text-[#fde68a]" },
  { glow: "from-[#7c3aed]/75 via-[#161616]/40 to-transparent", chip: "bg-[#7c3aed]", tag: "text-[#e9d5ff]" },
  { glow: "from-[#0d9488]/75 via-[#134e4a]/40 to-transparent", chip: "bg-[#0f766e]", tag: "text-[#99f6e4]" },
  { glow: "from-[#be123c]/80 via-[#450a0a]/50 to-transparent", chip: "bg-[#e11d48]", tag: "text-[#fecdd3]" },
  { glow: "from-[#ca8a04]/70 via-[#422006]/45 to-transparent", chip: "bg-[#a16207]", tag: "text-[#fef08a]" },
] as const;

export function perkPosterStyle(index: number, kind: "claim" | "kitchen" | "platform") {
  const variant =
    kind === "platform"
      ? ("gold-frame" as const)
      : kind === "claim"
        ? ("photo-full" as const)
        : PERK_VARIANTS[index % PERK_VARIANTS.length]!;
  const accent = PERK_ACCENTS[index % PERK_ACCENTS.length]!;
  return { variant, accent };
}

export { FOOD };
