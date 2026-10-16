import type { GrowLoyaltyConfig } from "./grow-loyalty-config.js";
import { OFFER_PRESETS, type OfferPresetId } from "./grow-loyalty-config.js";

/** Platform-defined programs restaurants can turn on/off (Kapso dispatch when enabled). */
export const GROW_CAMPAIGN_PROGRAM_CATALOG = [
  {
    id: "winback_15",
    title: "15-day pullback",
    description: "Re-engage guests with no order in 15 days (marketing opt-in respected).",
    templateKey: "winback_7d",
    icon: "history",
  },
  {
    id: "winback_30",
    title: "30-day win-back",
    description: "Stronger offer for guests lapsed 30+ days.",
    templateKey: "winback_7d",
    icon: "schedule",
  },
  {
    id: "weekend",
    title: "Weekend boost",
    description: "Friday–Sunday WhatsApp offer push.",
    templateKey: "weekend_special",
    icon: "weekend",
  },
  {
    id: "monthend",
    title: "Month-end push",
    description: "Last 3 days of the month — clear slow inventory.",
    templateKey: "weekend_special",
    icon: "calendar_month",
  },
  {
    id: "festivals",
    title: "Festival & events",
    description: "Diwali, Eid, IPL matchdays, and other calendar hooks.",
    templateKey: "new_menu_drop",
    icon: "celebration",
  },
  {
    id: "birthdays",
    title: "Birthday treat",
    description: "Personalized message when DOB is on file.",
    templateKey: "weekend_special",
    icon: "cake",
  },
  {
    id: "dine_in",
    title: "Dine-in / table scan",
    description: "Welcome offer when guest scans at table (packaging QR).",
    templateKey: "new_menu_drop",
    icon: "restaurant",
  },
  {
    id: "spin_wheel",
    title: "Spin wheel (in-app)",
    description: "Gamified spin on WhatsApp webview after scan.",
    templateKey: null,
    icon: "casino",
  },
  {
    id: "scratch_card",
    title: "Scratch card milestone",
    description: "Bill threshold scratch reward in guest flow.",
    templateKey: null,
    icon: "redeem",
  },
] as const;

export type CampaignProgramId = (typeof GROW_CAMPAIGN_PROGRAM_CATALOG)[number]["id"];

export function getCampaignProgramEnabled(config: GrowLoyaltyConfig, id: CampaignProgramId): boolean {
  switch (id) {
    case "winback_15":
      return config.winback15.enabled;
    case "winback_30":
      return config.winback30.enabled;
    case "weekend":
      return config.calendar.weekend.enabled;
    case "monthend":
      return config.calendar.monthend.enabled;
    case "festivals":
      return config.calendar.festivals.enabled;
    case "birthdays":
      return config.calendar.birthdays.enabled;
    case "dine_in":
      return config.dineIn.enabled;
    case "spin_wheel":
      return config.engineEnabled;
    case "scratch_card":
      return config.scratchEnabled;
    default:
      return false;
  }
}

export function getCampaignProgramOfferLabel(config: GrowLoyaltyConfig, id: CampaignProgramId): string {
  const preset = (key: OfferPresetId) => OFFER_PRESETS[key]?.label ?? key;
  switch (id) {
    case "winback_15":
      return preset(config.winback15.offerPresetId);
    case "winback_30":
      return preset(config.winback30.offerPresetId);
    case "weekend":
      return preset(config.calendar.weekend.offerPresetId);
    case "monthend":
      return preset(config.calendar.monthend.offerPresetId);
    case "festivals":
      return preset(config.calendar.festivals.offerPresetId);
    case "birthdays":
      return preset(config.calendar.birthdays.offerPresetId);
    case "dine_in":
      return preset(config.dineIn.offerPresetId);
    case "spin_wheel":
      return "Wheel segments (Offers tab)";
    case "scratch_card":
      return preset(config.scratch.offerPresetId);
    default:
      return "—";
  }
}

export function setCampaignProgramEnabled(
  config: GrowLoyaltyConfig,
  id: CampaignProgramId,
  enabled: boolean,
): GrowLoyaltyConfig {
  switch (id) {
    case "winback_15":
      return { ...config, winback15: { ...config.winback15, enabled } };
    case "winback_30":
      return { ...config, winback30: { ...config.winback30, enabled } };
    case "weekend":
      return {
        ...config,
        calendar: { ...config.calendar, weekend: { ...config.calendar.weekend, enabled } },
      };
    case "monthend":
      return {
        ...config,
        calendar: { ...config.calendar, monthend: { ...config.calendar.monthend, enabled } },
      };
    case "festivals":
      return {
        ...config,
        calendar: { ...config.calendar, festivals: { ...config.calendar.festivals, enabled } },
      };
    case "birthdays":
      return {
        ...config,
        calendar: { ...config.calendar, birthdays: { ...config.calendar.birthdays, enabled } },
      };
    case "dine_in":
      return { ...config, dineIn: { ...config.dineIn, enabled } };
    case "spin_wheel":
      return { ...config, engineEnabled: enabled };
    case "scratch_card":
      return { ...config, scratchEnabled: enabled };
    default:
      return config;
  }
}

export function listCampaignProgramsForRestaurant(config: GrowLoyaltyConfig) {
  return GROW_CAMPAIGN_PROGRAM_CATALOG.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    templateKey: p.templateKey,
    icon: p.icon,
    enabled: getCampaignProgramEnabled(config, p.id),
    offerSummary: getCampaignProgramOfferLabel(config, p.id),
  }));
}
