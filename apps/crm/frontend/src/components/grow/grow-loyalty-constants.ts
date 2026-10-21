/** Mirrors backend OFFER_PRESETS / MIN_ORDER_OPTIONS for CRM forms */
export const OFFER_PRESET_OPTIONS = [
  { id: "pct_10", label: "10% off (max ₹75)" },
  { id: "pct_15", label: "15% off total bill" },
  { id: "pct_20", label: "20% off (weekend)" },
  { id: "flat_50", label: "₹50 off next order" },
  { id: "flat_100", label: "₹100 instant cashback" },
  { id: "free_drink", label: "Free mocktail / beverage" },
  { id: "royal_feast", label: "Complimentary biryani platter" },
] as const;

export type OfferPresetId = (typeof OFFER_PRESET_OPTIONS)[number]["id"];

export const MIN_ORDER_DROPDOWN = [
  { paise: 19900, label: "₹199 minimum order" },
  { paise: 24900, label: "₹249 minimum order" },
  { paise: 39900, label: "₹399 minimum order" },
  { paise: 59900, label: "₹599 minimum order" },
  { paise: 84900, label: "₹849 minimum order" },
  { paise: 99900, label: "₹999 minimum order" },
] as const;

export type OfferScope = "RESTAURANT_SCOPED" | "PLATFORM_WIDE";

export type GrowLoyaltyConfig = {
  version: 1;
  engineEnabled: boolean;
  /** Spin wheel UI — if both spin + scratch on, guest randomly gets one; same prize pool */
  spinEnabled: boolean;
  dailySpinLimit: number;
  scratchEnabled: boolean;
  minCartPaise: number;
  paybackPercent: number;
  spinSegments: {
    localId: string;
    title: string;
    prizeType: string;
    prizeValue: number;
    weight: number;
    scope?: OfferScope;
    menuItemId?: string | null;
    menuItemName?: string | null;
  }[];
  scratch: { minOrderPaise: number; offerPresetId: OfferPresetId };
  dineIn: { enabled: boolean; offerPresetId: OfferPresetId };
  winback15: { enabled: boolean; offerPresetId: OfferPresetId };
  winback30: { enabled: boolean; offerPresetId: OfferPresetId };
  orderThresholdRules: { enabled: boolean; minOrderPaise: number; offerPresetId: OfferPresetId }[];
  calendar: {
    weekend: { enabled: boolean; offerPresetId: OfferPresetId };
    monthend: { enabled: boolean; offerPresetId: OfferPresetId };
    festivals: { enabled: boolean; offerPresetId: OfferPresetId };
    birthdays: { enabled: boolean; offerPresetId: OfferPresetId };
  };
};

export const GROW_FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-sm";

const rule = (offerPresetId: OfferPresetId = "flat_50") => ({
  enabled: true,
  offerPresetId,
});

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
    dineIn: rule("pct_10"),
    winback15: rule("flat_50"),
    winback30: rule("pct_15"),
    orderThresholdRules: [
      { enabled: true, minOrderPaise: 59900, offerPresetId: "flat_100" },
      { enabled: false, minOrderPaise: 99900, offerPresetId: "pct_20" },
    ],
    calendar: {
      weekend: rule("pct_15"),
      monthend: rule("flat_50"),
      festivals: rule("pct_20"),
      birthdays: rule("free_drink"),
    },
  };
}

function isOfferPresetId(v: unknown): v is OfferPresetId {
  return typeof v === "string" && OFFER_PRESET_OPTIONS.some((o) => o.id === v);
}

/** Avoid client crash when API is old or config JSON is partial */
export function normalizeGrowLoyaltyConfig(raw: unknown): GrowLoyaltyConfig {
  const base = defaultGrowLoyaltyConfig();
  if (!raw || typeof raw !== "object") return base;
  const c = raw as Partial<GrowLoyaltyConfig>;
  const preset = (v: unknown, fallback: OfferPresetId) =>
    isOfferPresetId(v) ? v : fallback;

  return {
    version: 1,
    engineEnabled: typeof c.engineEnabled === "boolean" ? c.engineEnabled : base.engineEnabled,
    spinEnabled: typeof c.spinEnabled === "boolean" ? c.spinEnabled : base.spinEnabled,
    dailySpinLimit:
      typeof c.dailySpinLimit === "number" && c.dailySpinLimit >= 0 ? c.dailySpinLimit : base.dailySpinLimit,
    scratchEnabled: typeof c.scratchEnabled === "boolean" ? c.scratchEnabled : base.scratchEnabled,
    minCartPaise: typeof c.minCartPaise === "number" ? c.minCartPaise : base.minCartPaise,
    paybackPercent:
      typeof c.paybackPercent === "number" && c.paybackPercent >= 0 ? c.paybackPercent : base.paybackPercent,
    spinSegments:
      Array.isArray(c.spinSegments) && c.spinSegments.length > 0
        ? c.spinSegments.map((s, i) => ({
            localId: s.localId || `s${i + 1}`,
            title: s.title || "Prize",
            prizeType: s.prizeType || "flat_off_paise",
            prizeValue: Number.isFinite(s.prizeValue) ? s.prizeValue : 5000,
            weight: Number.isFinite(s.weight) && s.weight > 0 ? s.weight : 10,
            scope: s.scope === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED",
            menuItemId: typeof s.menuItemId === "string" ? s.menuItemId : null,
            menuItemName: typeof s.menuItemName === "string" ? s.menuItemName : null,
          }))
        : base.spinSegments,
    scratch: {
      minOrderPaise: c.scratch?.minOrderPaise ?? base.scratch.minOrderPaise,
      offerPresetId: preset(c.scratch?.offerPresetId, base.scratch.offerPresetId),
    },
    dineIn: {
      enabled: c.dineIn?.enabled ?? base.dineIn.enabled,
      offerPresetId: preset(c.dineIn?.offerPresetId, base.dineIn.offerPresetId),
    },
    winback15: {
      enabled: c.winback15?.enabled ?? base.winback15.enabled,
      offerPresetId: preset(c.winback15?.offerPresetId, base.winback15.offerPresetId),
    },
    winback30: {
      enabled: c.winback30?.enabled ?? base.winback30.enabled,
      offerPresetId: preset(c.winback30?.offerPresetId, base.winback30.offerPresetId),
    },
    orderThresholdRules: Array.isArray(c.orderThresholdRules)
      ? c.orderThresholdRules.map((r) => ({
          enabled: r.enabled ?? true,
          minOrderPaise: r.minOrderPaise ?? 59900,
          offerPresetId: preset(r.offerPresetId, "flat_50"),
        }))
      : base.orderThresholdRules,
    calendar: {
      weekend: {
        enabled: c.calendar?.weekend?.enabled ?? base.calendar.weekend.enabled,
        offerPresetId: preset(c.calendar?.weekend?.offerPresetId, base.calendar.weekend.offerPresetId),
      },
      monthend: {
        enabled: c.calendar?.monthend?.enabled ?? base.calendar.monthend.enabled,
        offerPresetId: preset(c.calendar?.monthend?.offerPresetId, base.calendar.monthend.offerPresetId),
      },
      festivals: {
        enabled: c.calendar?.festivals?.enabled ?? base.calendar.festivals.enabled,
        offerPresetId: preset(c.calendar?.festivals?.offerPresetId, base.calendar.festivals.offerPresetId),
      },
      birthdays: {
        enabled: c.calendar?.birthdays?.enabled ?? base.calendar.birthdays.enabled,
        offerPresetId: preset(c.calendar?.birthdays?.offerPresetId, base.calendar.birthdays.offerPresetId),
      },
    },
  };
}
