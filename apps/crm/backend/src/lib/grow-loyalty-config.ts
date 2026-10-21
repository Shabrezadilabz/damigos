import { z } from "zod";

/** Shared presets — CRM dropdowns and guest prize resolution */
export const OFFER_PRESETS = {
  pct_10: { label: "10% off (max ₹75)", prizeType: "percent", prizeValue: 10, title: "10% off today" },
  pct_15: { label: "15% off total bill", prizeType: "percent", prizeValue: 15, title: "15% off total" },
  pct_20: { label: "20% off (weekend)", prizeType: "percent", prizeValue: 20, title: "20% weekend off" },
  flat_50: { label: "₹50 off next order", prizeType: "flat_off_paise", prizeValue: 5000, title: "₹50 off" },
  flat_100: { label: "₹100 instant cashback", prizeType: "flat_off_paise", prizeValue: 10000, title: "₹100 cashback" },
  free_drink: { label: "Free mocktail / beverage", prizeType: "free_item", prizeValue: 0, title: "Free mocktail" },
  royal_feast: { label: "Complimentary biryani platter", prizeType: "free_item", prizeValue: 0, title: "Royal feast upgrade" },
} as const;

export type OfferPresetId = keyof typeof OFFER_PRESETS;

export const MIN_ORDER_OPTIONS = [
  { paise: 19900, label: "₹199" },
  { paise: 24900, label: "₹249" },
  { paise: 39900, label: "₹399" },
  { paise: 59900, label: "₹599" },
  { paise: 84900, label: "₹849" },
  { paise: 99900, label: "₹999" },
] as const;

const presetId = z.enum(Object.keys(OFFER_PRESETS) as [OfferPresetId, ...OfferPresetId[]]);

const spinSegmentSchema = z.object({
  localId: z.string().min(1),
  title: z.string().min(1).max(255),
  prizeType: z.string().min(1),
  prizeValue: z.number().int().min(0),
  weight: z.number().int().min(1).max(10_000),
  /** RESTAURANT_SCOPED (default) | PLATFORM_WIDE — G-04.08 */
  scope: z.enum(["RESTAURANT_SCOPED", "PLATFORM_WIDE"]).default("RESTAURANT_SCOPED"),
  /** Free-item prizes: link a live menu dish */
  menuItemId: z.string().uuid().optional().nullable(),
  menuItemName: z.string().max(255).optional().nullable(),
});

const ruleWithOfferSchema = z.object({
  enabled: z.boolean(),
  offerPresetId: presetId,
});

const orderThresholdRuleSchema = z.object({
  enabled: z.boolean(),
  minOrderPaise: z.number().int().min(0),
  offerPresetId: presetId,
});

export const growLoyaltyConfigSchema = z.object({
  version: z.literal(1),
  engineEnabled: z.boolean(),
  /** When both spin + scratch are on, guest randomly gets one UI; same prize pool. */
  spinEnabled: z.boolean().default(true),
  dailySpinLimit: z.number().int().min(0).max(10),
  scratchEnabled: z.boolean(),
  minCartPaise: z.number().int().min(0),
  paybackPercent: z.number().int().min(0).max(100),
  spinSegments: z.array(spinSegmentSchema).min(1).max(8),
  scratch: z.object({
    minOrderPaise: z.number().int().min(0),
    /** Kept for backwards compat — scratch draws from spinSegments when engine is live */
    offerPresetId: presetId,
  }),
  dineIn: ruleWithOfferSchema,
  winback15: ruleWithOfferSchema,
  winback30: ruleWithOfferSchema,
  orderThresholdRules: z.array(orderThresholdRuleSchema).max(6),
  calendar: z.object({
    weekend: ruleWithOfferSchema,
    monthend: ruleWithOfferSchema,
    festivals: ruleWithOfferSchema,
    birthdays: ruleWithOfferSchema,
  }),
});

export type GrowLoyaltyConfig = z.infer<typeof growLoyaltyConfigSchema>;

export function defaultGrowLoyaltyConfig(): GrowLoyaltyConfig {
  return {
    version: 1,
    engineEnabled: true,
    spinEnabled: true,
    dailySpinLimit: 1,
    scratchEnabled: true,
    minCartPaise: 24900,
    paybackPercent: 5,
    spinSegments: [
      {
        localId: "s1",
        title: "15% off total",
        prizeType: "percent",
        prizeValue: 15,
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
  };
}

export function parseGrowLoyaltyConfig(raw: string | null | undefined): GrowLoyaltyConfig {
  if (!raw) return defaultGrowLoyaltyConfig();
  try {
    const parsed = growLoyaltyConfigSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    return defaultGrowLoyaltyConfig();
  }
}

export function validateSpinWeights(config: GrowLoyaltyConfig): { ok: boolean; weightSum: number } {
  const weightSum = config.spinSegments.reduce((s, x) => s + x.weight, 0);
  return { ok: weightSum > 0, weightSum };
}

export function configToOffersRows(restaurantId: string, config: GrowLoyaltyConfig) {
  return config.spinSegments.map((seg) => {
    const scope = seg.scope === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED";
    return {
      restaurantId,
      scope,
      title: seg.title,
      description:
        scope === "PLATFORM_WIDE"
          ? "D'aMigo platform offer — applies across kitchens"
          : "Spin wheel segment (restaurant scoped)",
      prizeType: seg.prizeType,
      prizeValue: seg.prizeValue,
      weight: seg.weight,
      active: config.engineEnabled,
      minOrderPaise: config.minCartPaise,
      terms:
        scope === "PLATFORM_WIDE"
          ? "Platform offer · Sponsored by D'aMigo's · Grow → Offers & game"
          : "Configured in Grow → Offers & game",
    };
  });
}
