import { FOOD } from "@/lib/hub-media";

export type HubCollectionSlug =
  | "bestsellers"
  | "promise"
  | "new"
  | "healthy"
  | "brands"
  | "festival"
  | "shawarma"
  | "biryani";

export type CollectionHero = {
  slug: HubCollectionSlug;
  title: string;
  titleAccent?: string;
  subtitle: string;
  /** Tailwind gradient / bg classes for hero */
  heroClass: string;
  image: string;
  badge?: string;
  mode: "restaurants" | "dishes";
  /** Soft filter hint applied client-side */
  cuisineHint?: string[];
  forceBadge?: "delivery_promise" | "lowest_price";
  vegBias?: boolean;
};

export const HUB_COLLECTIONS: Record<HubCollectionSlug, CollectionHero> = {
  bestsellers: {
    slug: "bestsellers",
    title: "Bestsellers under ₹149",
    subtitle: "Great value dishes from partner kitchens",
    heroClass: "bg-gradient-to-br from-[#fff7ed] via-white to-[#ffe4e6]",
    image: FOOD.bowl,
    mode: "dishes",
  },
  promise: {
    slug: "promise",
    title: "Delivery Promise",
    subtitle: "Fast kitchens near you · Direct D2C",
    heroClass: "bg-gradient-to-r from-[#7a0014] to-primary",
    image: FOOD.biryani,
    badge: "Fast dispatch",
    mode: "restaurants",
    forceBadge: "delivery_promise",
  },
  new: {
    slug: "new",
    title: "New on",
    titleAccent: "D'aMigo's",
    subtitle: "New kitchens, better value",
    heroClass: "bg-gradient-to-br from-[#fef3c7] via-[#fffbeb] to-white",
    image: FOOD.bowl,
    mode: "restaurants",
  },
  healthy: {
    slug: "healthy",
    title: "Healthy",
    titleAccent: "Choices",
    subtitle: "Options without guilt",
    heroClass: "bg-gradient-to-br from-[#166534] via-[#16a34a] to-[#86efac]",
    image: FOOD.healthy,
    badge: "Options without guilt",
    mode: "restaurants",
    cuisineHint: ["healthy", "bowl", "salad"],
    vegBias: true,
  },
  brands: {
    slug: "brands",
    title: "Top Brands",
    subtitle: "Most-loved restaurants near you",
    heroClass: "bg-gradient-to-br from-primary via-[#b7122a] to-[#7a0014]",
    image: FOOD.burger,
    mode: "restaurants",
    forceBadge: "lowest_price",
  },
  festival: {
    slug: "festival",
    title: "Festival Specials",
    subtitle: "Festive flavours, handpicked for you.",
    heroClass: "bg-gradient-to-br from-[#fff1f2] via-white to-[#fef3c7]",
    image: FOOD.festival,
    mode: "restaurants",
    cuisineHint: ["south", "dosa", "thali", "sweet", "festival"],
  },
  shawarma: {
    slug: "shawarma",
    title: "Shawarma",
    subtitle: "Search results near you",
    heroClass: "bg-white",
    image: FOOD.shawarma,
    mode: "restaurants",
    cuisineHint: ["shawarma", "grill", "tandoor"],
  },
  biryani: {
    slug: "biryani",
    title: "Biryani",
    subtitle: "Search results near you",
    heroClass: "bg-white",
    image: FOOD.biryani,
    mode: "restaurants",
    cuisineHint: ["biryani"],
  },
};

export function parseCollectionSlug(raw: string): HubCollectionSlug | null {
  if (raw in HUB_COLLECTIONS) return raw as HubCollectionSlug;
  return null;
}
