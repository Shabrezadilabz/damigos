/**
 * Pilot dummy data for hub / Grow / Cross-By / perks QA.
 * Idempotent — safe to re-run with `pnpm --filter @damigos/db seed`.
 */
import { eq } from "drizzle-orm";
import { db, menuItems, offers, restaurants, walletAccounts } from "./index.ts";

/** Koramangala cluster — keep several kitchens within ~1km for Cross-By */
const BASE_LAT = 12.9352;
const BASE_LNG = 77.6245;

type PilotKitchen = {
  slug: string;
  name: string;
  city: string;
  /** meters offset east / north from Biryani Box (approx) */
  dLat: number;
  dLng: number;
  hubListed: boolean;
  /** Index into LOYALTY_PRESETS; undefined = no growLoyaltyConfig */
  loyaltyPreset?: number;
  dishes: Array<{ name: string; pricePaise: number; isVeg: boolean; description: string }>;
};

/** paybackPercent = "loyalty points" style cashback % on these kitchens */
const LOYALTY_PRESETS = [
  { paybackPercent: 5, dailySpinLimit: 1, label: "Starter 5%" },
  { paybackPercent: 8, dailySpinLimit: 2, label: "Regular 8%" },
  { paybackPercent: 10, dailySpinLimit: 2, label: "Gold 10%" },
  { paybackPercent: 12, dailySpinLimit: 3, label: "VIP 12%" },
  { paybackPercent: 15, dailySpinLimit: 3, label: "Elite 15%" },
] as const;

function loyaltyConfigJson(preset: (typeof LOYALTY_PRESETS)[number]): string {
  return JSON.stringify({
    version: 1,
    engineEnabled: true,
    dailySpinLimit: preset.dailySpinLimit,
    scratchEnabled: true,
    minCartPaise: 24900,
    paybackPercent: preset.paybackPercent,
    spinSegments: [
      {
        localId: "s1",
        title: `${preset.paybackPercent}% loyalty boost`,
        prizeType: "percent",
        prizeValue: Math.min(preset.paybackPercent, 20),
        weight: 35,
        scope: "RESTAURANT_SCOPED",
      },
      {
        localId: "s2",
        title: "Free mocktail",
        prizeType: "free_item",
        prizeValue: 0,
        weight: 25,
        scope: "RESTAURANT_SCOPED",
      },
      {
        localId: "s3",
        title: "₹50 kitchen voucher",
        prizeType: "flat_off_paise",
        prizeValue: 5000,
        weight: 20,
        scope: "RESTAURANT_SCOPED",
      },
      {
        localId: "s4",
        title: "₹20 D'aMigo platform off",
        prizeType: "flat_off_paise",
        prizeValue: 2000,
        weight: 20,
        scope: "PLATFORM_WIDE",
      },
    ],
    scratch: { minOrderPaise: 59900, offerPresetId: "flat_100" },
    dineIn: { enabled: true, offerPresetId: "pct_10" },
    winback15: { enabled: true, offerPresetId: "flat_50" },
    winback30: { enabled: true, offerPresetId: "pct_15" },
    orderThresholdRules: [
      { enabled: true, minOrderPaise: 59900, offerPresetId: "flat_100" },
      { enabled: false, minOrderPaise: 99900, offerPresetId: "pct_20" },
    ],
    calendar: {
      weekend: { enabled: true, offerPresetId: "pct_15" },
      monthend: { enabled: true, offerPresetId: "flat_50" },
      festivals: { enabled: true, offerPresetId: "pct_20" },
      birthdays: { enabled: true, offerPresetId: "free_drink" },
    },
  });
}

/** ~8 new kitchens; seed.ts already has Biryani + Masala → ~10 hub kitchens total */
const PILOT_KITCHENS: PilotKitchen[] = [
  {
    slug: "tandoor-lane-hsr",
    name: "Tandoor Lane HSR",
    city: "Bangalore",
    dLat: 0.002,
    dLng: 0.003,
    hubListed: true,
    loyaltyPreset: 0,
    dishes: [
      { name: "Butter Chicken", pricePaise: 27900, isVeg: false, description: "Creamy tomato gravy" },
      { name: "Garlic Naan", pricePaise: 6900, isVeg: true, description: "Tandoor fresh" },
    ],
  },
  {
    slug: "sushi-roll-koramangala",
    name: "Sushi Roll Koramangala",
    city: "Bangalore",
    dLat: -0.0015,
    dLng: 0.002,
    hubListed: true,
    loyaltyPreset: 1,
    dishes: [
      { name: "Salmon Maki (6pc)", pricePaise: 34900, isVeg: false, description: "Fresh salmon" },
      { name: "Veg Tempura Roll", pricePaise: 24900, isVeg: true, description: "Crispy veg" },
    ],
  },
  {
    slug: "dosa-house-jayanagar",
    name: "Dosa House Jayanagar",
    city: "Bangalore",
    dLat: 0.004,
    dLng: -0.002,
    hubListed: true,
    loyaltyPreset: 2,
    dishes: [
      { name: "Masala Dosa", pricePaise: 9900, isVeg: true, description: "Crispy with potato" },
      { name: "Filter Coffee", pricePaise: 4500, isVeg: true, description: "Decoction strong" },
    ],
  },
  {
    slug: "pizza-slice-btm",
    name: "Pizza Slice BTM",
    city: "Bangalore",
    dLat: -0.003,
    dLng: -0.001,
    hubListed: true,
    loyaltyPreset: 3,
    dishes: [
      { name: "Margherita 9\"", pricePaise: 19900, isVeg: true, description: "San Marzano base" },
      { name: "Pepperoni 9\"", pricePaise: 24900, isVeg: false, description: "Spicy pepperoni" },
    ],
  },
  {
    slug: "bowl-bar-whitefield",
    name: "Bowl Bar Whitefield",
    city: "Bangalore",
    dLat: 0.018,
    dLng: 0.022,
    hubListed: true,
    loyaltyPreset: 4,
    dishes: [
      { name: "Buddha Bowl", pricePaise: 22900, isVeg: true, description: "Quinoa + greens" },
      { name: "Chicken Power Bowl", pricePaise: 26900, isVeg: false, description: "Grilled chicken" },
    ],
  },
  {
    slug: "chai-tapri-mg-road",
    name: "Chai Tapri MG Road",
    city: "Bangalore",
    dLat: 0.006,
    dLng: 0.001,
    hubListed: true,
    dishes: [
      { name: "Cutting Chai", pricePaise: 2500, isVeg: true, description: "Street special" },
      { name: "Bun Maska", pricePaise: 4900, isVeg: true, description: "Soft bun + butter" },
    ],
  },
  {
    slug: "grill-nation-electronic-city",
    name: "Grill Nation Electronic City",
    city: "Bangalore",
    dLat: -0.02,
    dLng: 0.01,
    hubListed: true,
    dishes: [
      { name: "Grilled Fish", pricePaise: 32900, isVeg: false, description: "Lemon pepper" },
      { name: "Paneer Tikka", pricePaise: 21900, isVeg: true, description: "Tandoor paneer" },
    ],
  },
  {
    slug: "sweet-spot-indiranagar",
    name: "Sweet Spot Indiranagar",
    city: "Bangalore",
    dLat: 0.0035,
    dLng: 0.004,
    hubListed: true,
    dishes: [
      { name: "Gulab Jamun (2pc)", pricePaise: 8900, isVeg: true, description: "Warm syrup" },
      { name: "Chocolate Brownie", pricePaise: 12900, isVeg: true, description: "Walnut brownie" },
    ],
  },
];

type OfferSeed = {
  /** kitchen slug that owns the offer row */
  kitchenSlug: string;
  title: string;
  description: string;
  prizeType: string;
  prizeValue: number;
  minOrderPaise: number;
  weight: number;
  scope: "RESTAURANT_SCOPED" | "PLATFORM_WIDE";
  terms: string;
};

const PILOT_OFFERS: OfferSeed[] = [
  {
    kitchenSlug: "tandoor-lane-hsr",
    title: "₹75 off tandoor mains",
    description: "Min order ₹349",
    prizeType: "flat_off_paise",
    prizeValue: 7500,
    minOrderPaise: 34900,
    weight: 40,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · one use · Tandoor Lane only",
  },
  {
    kitchenSlug: "sushi-roll-koramangala",
    title: "15% off sushi rolls",
    description: "Max discount ₹120",
    prizeType: "percent",
    prizeValue: 15,
    minOrderPaise: 29900,
    weight: 35,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · Sushi Roll Koramangala",
  },
  {
    kitchenSlug: "dosa-house-jayanagar",
    title: "Free filter coffee",
    description: "With any dosa",
    prizeType: "free_item",
    prizeValue: 0,
    minOrderPaise: 9900,
    weight: 30,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · Dosa House",
  },
  {
    kitchenSlug: "pizza-slice-btm",
    title: "₹50 off pizza",
    description: "Min order ₹249",
    prizeType: "flat_off_paise",
    prizeValue: 5000,
    minOrderPaise: 24900,
    weight: 40,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · Pizza Slice BTM",
  },
  {
    kitchenSlug: "bowl-bar-whitefield",
    title: "20% weekend bowl deal",
    description: "Weekend special",
    prizeType: "percent",
    prizeValue: 20,
    minOrderPaise: 39900,
    weight: 25,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · Bowl Bar",
  },
  {
    kitchenSlug: "chai-tapri-mg-road",
    title: "Buy 2 chai get bun free",
    description: "Add-on perk",
    prizeType: "free_item",
    prizeValue: 0,
    minOrderPaise: 5000,
    weight: 30,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · Chai Tapri",
  },
  {
    kitchenSlug: "grill-nation-electronic-city",
    title: "₹100 grill cashback",
    description: "Min order ₹499",
    prizeType: "flat_off_paise",
    prizeValue: 10000,
    minOrderPaise: 49900,
    weight: 20,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · Grill Nation",
  },
  {
    kitchenSlug: "sweet-spot-indiranagar",
    title: "10% off desserts",
    description: "Sweet treat",
    prizeType: "percent",
    prizeValue: 10,
    minOrderPaise: 14900,
    weight: 35,
    scope: "RESTAURANT_SCOPED",
    terms: "Pilot dummy · Sweet Spot",
  },
  {
    kitchenSlug: "tandoor-lane-hsr",
    title: "₹30 D'aMigo platform off",
    description: "Works across hub kitchens",
    prizeType: "flat_off_paise",
    prizeValue: 3000,
    minOrderPaise: 19900,
    weight: 50,
    scope: "PLATFORM_WIDE",
    terms: "Platform offer · Sponsored by D'aMigo · hub /perks",
  },
  {
    kitchenSlug: "sushi-roll-koramangala",
    title: "Free delivery credit ₹40",
    description: "Platform-wide delivery perk",
    prizeType: "flat_off_paise",
    prizeValue: 4000,
    minOrderPaise: 29900,
    weight: 40,
    scope: "PLATFORM_WIDE",
    terms: "Platform offer · D'aMigo hub perk",
  },
];

export type PilotDummySummary = {
  kitchensUpserted: number;
  offersInserted: number;
  loyaltyConfigured: number;
  walletsSeeded: number;
  kitchenSlugs: string[];
  loyaltySlugs: string[];
};

export async function seedPilotDummy(): Promise<PilotDummySummary> {
  const kitchenIds = new Map<string, string>();
  let kitchensUpserted = 0;
  let loyaltyConfigured = 0;
  let walletsSeeded = 0;
  const loyaltySlugs: string[] = [];

  for (const k of PILOT_KITCHENS) {
    const lat = BASE_LAT + k.dLat;
    const lng = BASE_LNG + k.dLng;
    let [row] = await db.select().from(restaurants).where(eq(restaurants.slug, k.slug)).limit(1);

    const loyaltyJson =
      k.loyaltyPreset != null ? loyaltyConfigJson(LOYALTY_PRESETS[k.loyaltyPreset]!) : undefined;

    if (!row) {
      [row] = await db
        .insert(restaurants)
        .values({
          name: k.name,
          slug: k.slug,
          city: k.city,
          orderingEnabled: true,
          hubListed: k.hubListed,
          razorpayKycStatus: "pending",
          lat,
          lng,
          geoUpdatedAt: new Date(),
          growLoyaltyConfig: loyaltyJson ?? null,
        })
        .returning();
      kitchensUpserted += 1;

      await db.insert(menuItems).values(
        k.dishes.map((d) => ({
          restaurantId: row!.id,
          name: d.name,
          description: d.description,
          pricePaise: d.pricePaise,
          isVeg: d.isVeg,
          draft: false,
          available: true,
        })),
      );
    } else {
      const patch: {
        hubListed?: boolean;
        lat?: number;
        lng?: number;
        geoUpdatedAt?: Date;
        growLoyaltyConfig?: string;
        orderingEnabled?: boolean;
      } = {};
      if (!row.hubListed && k.hubListed) patch.hubListed = true;
      if (row.lat == null || row.lng == null) {
        patch.lat = lat;
        patch.lng = lng;
        patch.geoUpdatedAt = new Date();
      }
      if (loyaltyJson && !row.growLoyaltyConfig) {
        patch.growLoyaltyConfig = loyaltyJson;
      }
      if (!row.orderingEnabled) patch.orderingEnabled = true;
      if (Object.keys(patch).length > 0) {
        [row] = await db.update(restaurants).set(patch).where(eq(restaurants.id, row.id)).returning();
        kitchensUpserted += 1;
      }

      const existingMenu = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.restaurantId, row.id))
        .limit(1);
      if (existingMenu.length === 0) {
        await db.insert(menuItems).values(
          k.dishes.map((d) => ({
            restaurantId: row!.id,
            name: d.name,
            description: d.description,
            pricePaise: d.pricePaise,
            isVeg: d.isVeg,
            draft: false,
            available: true,
          })),
        );
      }
    }

    kitchenIds.set(k.slug, row.id);

    if (loyaltyJson || row.growLoyaltyConfig) {
      if (k.loyaltyPreset != null) {
        loyaltyConfigured += 1;
        loyaltySlugs.push(k.slug);
        // Refresh loyalty when missing or when re-seed should refresh pilot presets
        if (!row.growLoyaltyConfig && loyaltyJson) {
          await db
            .update(restaurants)
            .set({ growLoyaltyConfig: loyaltyJson })
            .where(eq(restaurants.id, row.id));
        }
      }
    }

    /** Seed Grow wallet on loyalty kitchens so CRM wallet UI has balance */
    if (k.loyaltyPreset != null) {
      const [w] = await db
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.restaurantId, row.id))
        .limit(1);
      if (!w) {
        await db.insert(walletAccounts).values({
          restaurantId: row.id,
          balancePaise: 75_000 + k.loyaltyPreset * 25_000,
        });
        walletsSeeded += 1;
      }
    }
  }

  /** Also ensure Biryani Box + Masala have loyalty if missing (first 2 of 5 can live on pilot kitchens; keep 5 on pilot list) */
  let offersInserted = 0;
  for (const o of PILOT_OFFERS) {
    const restaurantId = kitchenIds.get(o.kitchenSlug);
    if (!restaurantId) continue;

    const existing = await db
      .select()
      .from(offers)
      .where(eq(offers.restaurantId, restaurantId));
    const dup = existing.find((e) => e.title === o.title);
    if (dup) continue;

    await db.insert(offers).values({
      restaurantId,
      scope: o.scope,
      title: o.title,
      description: o.description,
      prizeType: o.prizeType,
      prizeValue: o.prizeValue,
      minOrderPaise: o.minOrderPaise,
      weight: o.weight,
      active: true,
      terms: o.terms,
    });
    offersInserted += 1;
  }

  return {
    kitchensUpserted,
    offersInserted,
    loyaltyConfigured,
    walletsSeeded,
    kitchenSlugs: PILOT_KITCHENS.map((k) => k.slug),
    loyaltySlugs,
  };
}
