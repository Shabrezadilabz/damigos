/**
 * Approved Meta / Kapso WhatsApp templates for D'aMigo's.
 * Send with `template.name` (not Kapso UUID / Meta template ID).
 * Language: en_US · positional body params only (no parameter_name).
 */

export const KAPSO_CONNECTED = {
  /** Kapso WhatsApp config (reference) */
  whatsappConfigId: "4e26028f-5565-4fab-afcc-125539f56c75",
  /** Meta phone_number_id — use in send URL */
  phoneNumberId: "1365748713295932",
  /** WABA id (reference) */
  businessAccountId: "2100142510693917",
  language: "en_US",
  guestWeb: "https://damigos-guest-web.vercel.app",
} as const;

export type DamigosWaTemplateName =
  | "damigos_order_track"
  | "damigos_order_out_for_delivery"
  | "damigos_grow_winback"
  | "damigos_spark_reward_unlocked"
  | "damigos_grow_weekend_special"
  | "damigos_grow_poster"
  | "damigos_spark_opt_in"
  | "damigos_spark_claim_nudge"
  | "damigos_grow_paycheck"
  | "damigos_grow_new_menu"
  | "damigos_order_delivered"
  | "damigos_order_confirmed"
  | "damigos_open_hub";

export type DamigosWaTemplateMeta = {
  name: DamigosWaTemplateName;
  /** Kapso template UUID — reference only */
  kapsoId: string;
  /** Meta template ID — reference only */
  metaId: string;
  category: "UTILITY" | "MARKETING";
  /** Body {{n}} labels in send order */
  bodyParams: readonly string[];
  /** IMAGE header required at send time (fresh media id or public link) */
  headerImage: boolean;
  buttonLabel: string;
  buttonUrl: string;
};

export const DAMIGOS_WA_TEMPLATES: Record<DamigosWaTemplateName, DamigosWaTemplateMeta> = {
  damigos_order_track: {
    name: "damigos_order_track",
    kapsoId: "143d458b-485f-4b5e-9089-d8bed87f0309",
    metaId: "28882695058018351",
    category: "UTILITY",
    bodyParams: ["order_status"],
    headerImage: false,
    buttonLabel: "Track Order",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/orders`,
  },
  damigos_order_out_for_delivery: {
    name: "damigos_order_out_for_delivery",
    kapsoId: "2241829d-e847-4608-a3e0-d973c2e4ab54",
    metaId: "1645434637032778",
    category: "UTILITY",
    bodyParams: ["restaurant", "eta_or_tracking"],
    headerImage: false,
    buttonLabel: "Track Order",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/orders`,
  },
  damigos_grow_winback: {
    name: "damigos_grow_winback",
    kapsoId: "2a52898f-8323-4097-9da2-30f9ab2971f3",
    metaId: "1104913529022319",
    category: "MARKETING",
    bodyParams: ["restaurant", "offer"],
    headerImage: false,
    buttonLabel: "Order Again",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_spark_reward_unlocked: {
    name: "damigos_spark_reward_unlocked",
    kapsoId: "3a4f156e-3289-4a76-8890-fd0970c3d947",
    metaId: "1119397907213606",
    category: "MARKETING",
    bodyParams: [],
    headerImage: false,
    buttonLabel: "Claim Reward",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_grow_weekend_special: {
    name: "damigos_grow_weekend_special",
    kapsoId: "43881fc8-e967-4c15-91ac-4cf82eef710a",
    metaId: "1672253281185486",
    category: "MARKETING",
    bodyParams: ["restaurant", "offer"],
    headerImage: false,
    buttonLabel: "Order Now",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_grow_poster: {
    name: "damigos_grow_poster",
    kapsoId: "4624a0e2-7da3-4fd7-8f25-d7a808d0a621",
    metaId: "1500605038933766",
    category: "MARKETING",
    bodyParams: ["headline", "message"],
    headerImage: true,
    buttonLabel: "Order Now",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_spark_opt_in: {
    name: "damigos_spark_opt_in",
    kapsoId: "4ebb53e1-73e4-4635-ac2b-60ac160aa4b2",
    metaId: "1437924231675420",
    category: "MARKETING",
    bodyParams: ["restaurant"],
    headerImage: false,
    buttonLabel: "Play now",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_spark_claim_nudge: {
    name: "damigos_spark_claim_nudge",
    kapsoId: "757cddcf-ce09-49fd-a9ca-bdccd78271b3",
    metaId: "1093422630253211",
    category: "MARKETING",
    bodyParams: ["restaurant", "reward"],
    headerImage: false,
    buttonLabel: "View menu",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_grow_paycheck: {
    name: "damigos_grow_paycheck",
    kapsoId: "9748c53d-c8ed-4bf2-8863-fec77bf171b5",
    metaId: "1141014738361136",
    category: "MARKETING",
    bodyParams: ["restaurant", "offer"],
    headerImage: false,
    buttonLabel: "Order Now",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_grow_new_menu: {
    name: "damigos_grow_new_menu",
    kapsoId: "9d6b8d81-fe8f-4fdd-8ff0-aabbbc595e00",
    metaId: "1159068236790471",
    category: "MARKETING",
    bodyParams: ["restaurant", "menu_copy"],
    headerImage: false,
    buttonLabel: "View Menu",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/`,
  },
  damigos_order_delivered: {
    name: "damigos_order_delivered",
    kapsoId: "ad87674e-0b78-48e3-9a74-5326245df777",
    metaId: "1651479839824854",
    category: "MARKETING",
    bodyParams: ["restaurant"],
    headerImage: false,
    buttonLabel: "Order Again",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/hub`,
  },
  damigos_order_confirmed: {
    name: "damigos_order_confirmed",
    kapsoId: "ae0b08d6-81db-429e-be54-c4cdd08d17e0",
    metaId: "2003170180379599",
    category: "UTILITY",
    bodyParams: ["restaurant", "order_number", "total"],
    headerImage: false,
    buttonLabel: "Track Order",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/orders`,
  },
  damigos_open_hub: {
    name: "damigos_open_hub",
    kapsoId: "ce9471a1-7cc7-4dc6-9c5f-cc14edf73a29",
    metaId: "1301590259714340",
    category: "MARKETING",
    bodyParams: [],
    headerImage: false,
    buttonLabel: "Order",
    buttonUrl: `${KAPSO_CONNECTED.guestWeb}/hub`,
  },
};

/** CRM Grow `templateKey` → Meta template name (send-time). */
export const GROW_KEY_TO_TEMPLATE: Record<string, DamigosWaTemplateName> = {
  weekend_special: "damigos_grow_weekend_special",
  new_menu_drop: "damigos_grow_new_menu",
  winback_7d: "damigos_grow_winback",
  poster_status_blast: "damigos_grow_poster",
  grow_paycheck: "damigos_grow_paycheck",
  paycheck: "damigos_grow_paycheck",
};

export function resolveGrowTemplateName(templateKey: string | null | undefined): DamigosWaTemplateName | null {
  if (!templateKey?.trim()) return null;
  const key = templateKey.trim();
  if (key in GROW_KEY_TO_TEMPLATE) return GROW_KEY_TO_TEMPLATE[key]!;
  if (key in DAMIGOS_WA_TEMPLATES) return key as DamigosWaTemplateName;
  return null;
}

export function templateNameOrDefault(
  envValue: string | undefined,
  fallback: DamigosWaTemplateName,
): DamigosWaTemplateName {
  const v = envValue?.trim();
  if (v && v in DAMIGOS_WA_TEMPLATES) return v as DamigosWaTemplateName;
  return fallback;
}
