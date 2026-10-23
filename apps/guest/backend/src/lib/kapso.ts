/**
 * Dual WhatsApp agents via Kapso Meta Proxy API.
 * - Spark by D'aMigo — marketing / opt-in / game launch
 * - D'aMigo Food — utility bill / track / HI
 *
 * KAPSO_MODE: mock | live | off
 * Templates: send by Meta **name** + en_US positional body params
 * (see @damigos/domain kapso-templates — Kapso/Meta UUIDs are reference only).
 */

import {
  KAPSO_CONNECTED,
  templateNameOrDefault,
  type DamigosWaTemplateName,
} from "@damigos/domain";

export type KapsoAgent = "spark" | "food";

export type KapsoMode = "mock" | "live" | "off";

export function kapsoMode(): KapsoMode {
  const mode = (process.env.KAPSO_MODE ?? "mock").toLowerCase();
  if (mode === "live") return "live";
  if (mode === "off") return "off";
  return "mock";
}

function apiKey(): string | null {
  return process.env.KAPSO_API_KEY?.trim() || null;
}

/** Legacy single-number sandbox fallback when SPARK/FOOD ids unset */
function useSandbox(): boolean {
  return (process.env.KAPSO_USE_SANDBOX ?? "").toLowerCase() === "true";
}

/**
 * Dual agents: always prefer SPARK / FOOD phone ids.
 * If KAPSO_USE_SANDBOX=true and an agent id is missing, fall back to
 * KAPSO_SANDBOX_PHONE_NUMBER_ID then KAPSO_PHONE_NUMBER_ID.
 */
export function phoneNumberIdFor(agent: KapsoAgent): string | null {
  const agentId =
    agent === "spark"
      ? process.env.KAPSO_SPARK_PHONE_NUMBER_ID?.trim()
      : process.env.KAPSO_FOOD_PHONE_NUMBER_ID?.trim();
  if (agentId) return agentId;

  if (useSandbox()) {
    return (
      process.env.KAPSO_SANDBOX_PHONE_NUMBER_ID?.trim() ||
      process.env.KAPSO_PHONE_NUMBER_ID?.trim() ||
      null
    );
  }
  return process.env.KAPSO_PHONE_NUMBER_ID?.trim() || null;
}

/** Normalize to digits only (Kapso accepts country code without +) */
export function normalizeWaPhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

export type KapsoSendResult = {
  ok: boolean;
  mode: KapsoMode;
  agent: KapsoAgent;
  messageId: string | null;
  error?: string;
};

async function postMessage(
  agent: KapsoAgent,
  body: Record<string, unknown>,
): Promise<KapsoSendResult> {
  const mode = kapsoMode();
  if (mode === "off") {
    return { ok: false, mode, agent, messageId: null, error: "KAPSO_MODE=off" };
  }

  if (mode === "mock") {
    const messageId = `kapso_mock_${agent}_${Date.now().toString(36)}`;
    console.info("[kapso:mock]", agent, JSON.stringify(body).slice(0, 400));
    return { ok: true, mode, agent, messageId };
  }

  const key = apiKey();
  const phoneNumberId = phoneNumberIdFor(agent);
  if (!key || !phoneNumberId) {
    return {
      ok: false,
      mode,
      agent,
      messageId: null,
      error: "Missing KAPSO_API_KEY or phone number id",
    };
  }

  const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        ...body,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        mode,
        agent,
        messageId: null,
        error: data.error?.message ?? `HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      mode,
      agent,
      messageId: data.messages?.[0]?.id ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      mode,
      agent,
      messageId: null,
      error: err instanceof Error ? err.message : "Kapso network error",
    };
  }
}

export async function sendKapsoText(
  agent: KapsoAgent,
  toPhone: string,
  text: string,
): Promise<KapsoSendResult> {
  return postMessage(agent, {
    to: normalizeWaPhone(toPhone),
    type: "text",
    text: { preview_url: true, body: text },
  });
}

/** Interactive reply buttons (utility / service window) */
export async function sendKapsoButtons(
  agent: KapsoAgent,
  toPhone: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
): Promise<KapsoSendResult> {
  return postMessage(agent, {
    to: normalizeWaPhone(toPhone),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

/**
 * CTA URL — on mobile WhatsApp this prefers the in-app browser (webview)
 * over jumping to Chrome. Desktop WhatsApp Web still uses a browser tab
 * (Meta limitation — cannot force webview-only everywhere).
 */
export async function sendKapsoCtaUrl(
  agent: KapsoAgent,
  toPhone: string,
  bodyText: string,
  displayText: string,
  url: string,
): Promise<KapsoSendResult> {
  return postMessage(agent, {
    to: normalizeWaPhone(toPhone),
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: bodyText.slice(0, 1024) },
      action: {
        name: "cta_url",
        parameters: {
          display_text: displayText.slice(0, 20),
          url,
        },
      },
    },
  });
}

export async function sendSparkOptInInvite(toPhone: string, playUrl: string, kitchenName: string) {
  const template = templateNameOrDefault(
    process.env.KAPSO_SPARK_TEMPLATE_OPT_IN,
    "damigos_spark_opt_in",
  );
  if (kapsoMode() === "live") {
    const templated = await sendKapsoTemplate("spark", toPhone, template, [kitchenName]);
    if (templated.ok) return templated;
  }
  const body =
    `🎁 *Spark by D'aMigo's*\n\n` +
    `You scanned *${kitchenName}* packaging.\n` +
    `Tap *Yes* to opt in for kitchen offers, then play & redeem in WhatsApp.\n\n` +
    `Play link (also sent after Yes):\n${playUrl}`;
  return sendKapsoButtons("spark", toPhone, body, [
    { id: "unlock_reward", title: "Yes, Unlock Reward" },
    { id: "view_menu", title: "View Menu" },
  ]);
}

/** Claimed reward but no order yet — nudge to place order; Food sends bill after pay */
export async function sendSparkOrderNudge(input: {
  toPhone: string;
  kitchenName: string;
  rewardTitle: string;
  menuUrl: string;
  foodHint?: string;
}) {
  const template = templateNameOrDefault(
    process.env.KAPSO_SPARK_TEMPLATE_CLAIM_NUDGE,
    "damigos_spark_claim_nudge",
  );
  if (kapsoMode() === "live") {
    const templated = await sendKapsoTemplate("spark", input.toPhone, template, [
      input.kitchenName,
      input.rewardTitle,
    ]);
    if (templated.ok) return templated;
  }
  const food =
    input.foodHint ??
    "After you pay, *D'aMigo Food* will WhatsApp your bill & live tracking link.";
  const body =
    `⏰ *Don't miss your perk*\n` +
    `*${input.kitchenName}*\n` +
    `You won: *${input.rewardTitle}*\n\n` +
    `Order now & redeem:\n${input.menuUrl}\n\n` +
    `${food}\n\n` +
    `_Spark by D'aMigo's_`;
  return sendKapsoButtons("spark", input.toPhone, body.slice(0, 1024), [
    { id: "order_now_menu", title: "Order now" },
    { id: "view_menu", title: "View menu" },
  ]).then(async (r) => {
    if (r.ok) return r;
    return sendKapsoText("spark", input.toPhone, body);
  });
}

/** Digits for wa.me deep link (Spark line). */
export function sparkWaMeE164(): string | null {
  const raw =
    process.env.KAPSO_SPARK_WA_E164?.trim() ||
    process.env.KAPSO_WA_E164?.trim() ||
    null;
  if (!raw) return null;
  return normalizeWaPhone(raw);
}

export type KapsoTemplateHeaderImage =
  | { link: string }
  | { id: string };

/**
 * Send approved template by **name**. Positional body params only.
 * For `damigos_grow_poster`, pass `headerImage` (media id or public link) —
 * the template-review handle is not reused at send time.
 */
export async function sendKapsoTemplate(
  agent: KapsoAgent,
  toPhone: string,
  templateName: DamigosWaTemplateName | string,
  bodyParams: string[],
  opts?: {
    languageCode?: string;
    headerImage?: KapsoTemplateHeaderImage;
  },
): Promise<KapsoSendResult> {
  const languageCode = opts?.languageCode ?? KAPSO_CONNECTED.language;
  const components: Record<string, unknown>[] = [];

  if (opts?.headerImage) {
    const image =
      "id" in opts.headerImage
        ? { id: opts.headerImage.id }
        : { link: opts.headerImage.link };
    components.push({
      type: "header",
      parameters: [{ type: "image", image }],
    });
  }

  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams.map((text) => ({ type: "text", text: String(text) })),
    });
  }

  return postMessage(agent, {
    to: normalizeWaPhone(toPhone),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}

export async function sendFoodOrderConfirmed(input: {
  toPhone: string;
  kitchenName: string;
  totalPaise: number;
  trackUrl: string;
  orderShortId: string;
}) {
  // Body: ₹{{3}} — send digits only (no ₹ prefix)
  const rupees = (input.totalPaise / 100).toFixed(0);
  const template = templateNameOrDefault(
    process.env.KAPSO_FOOD_TEMPLATE_ORDER_CONFIRMED ?? process.env.KAPSO_FOOD_TEMPLATE_CONFIRM,
    "damigos_order_confirmed",
  );
  if (kapsoMode() === "live") {
    const templated = await sendKapsoTemplate("food", input.toPhone, template, [
      input.kitchenName,
      input.orderShortId,
      rupees,
    ]);
    if (templated.ok) return templated;
  }
  const body =
    `✅ *Order confirmed*\n` +
    `*${input.kitchenName}* · #${input.orderShortId}\n` +
    `Total: ₹${rupees}\n\n` +
    `Track live: ${input.trackUrl}\n\n` +
    `_D'aMigo Food · Direct D2C_`;
  return sendKapsoText("food", input.toPhone, body);
}

export async function sendFoodDeliveryOtp(input: {
  toPhone: string;
  kitchenName: string;
  orderShortId: string;
  otp: string;
}) {
  const body =
    `🔐 *Delivery OTP*\n` +
    `*${input.kitchenName}* · #${input.orderShortId}\n\n` +
    `Share this code with the rider only when they arrive:\n` +
    `*${input.otp}*\n\n` +
    `_Never share on phone calls. D'aMigo Food_`;
  return sendKapsoText("food", input.toPhone, body);
}

export async function sendFoodOrderTrackUpdate(input: {
  toPhone: string;
  kitchenName: string;
  statusLabel: string;
  trackUrl: string;
  orderShortId: string;
}) {
  // Approved: {{1}} = order status only (Track button is fixed URL)
  const template = templateNameOrDefault(
    process.env.KAPSO_FOOD_TEMPLATE_TRACK_UPDATE,
    "damigos_order_track",
  );
  if (kapsoMode() === "live") {
    const templated = await sendKapsoTemplate("food", input.toPhone, template, [
      input.statusLabel,
    ]);
    if (templated.ok) return templated;
  }
  const body =
    `📦 *Order update*\n` +
    `*${input.kitchenName}* · #${input.orderShortId}\n` +
    `Status: ${input.statusLabel}\n\n` +
    `Track: ${input.trackUrl}\n\n` +
    `_D'aMigo Food_`;
  return sendKapsoText("food", input.toPhone, body);
}

export async function sendFoodOutForDelivery(input: {
  toPhone: string;
  kitchenName: string;
  etaOrTracking: string;
  trackUrl: string;
}) {
  const template = templateNameOrDefault(
    process.env.KAPSO_FOOD_TEMPLATE_OUT_FOR_DELIVERY,
    "damigos_order_out_for_delivery",
  );
  if (kapsoMode() === "live") {
    const templated = await sendKapsoTemplate("food", input.toPhone, template, [
      input.kitchenName,
      input.etaOrTracking,
    ]);
    if (templated.ok) return templated;
  }
  const body =
    `🛵 *Out for delivery*\n` +
    `*${input.kitchenName}*\n` +
    `ETA / tracking: ${input.etaOrTracking}\n\n` +
    `Track: ${input.trackUrl}\n\n` +
    `_D'aMigo Food_`;
  return sendKapsoText("food", input.toPhone, body);
}

export async function sendFoodOrderDelivered(input: {
  toPhone: string;
  kitchenName: string;
  hubUrl: string;
}) {
  const template = templateNameOrDefault(
    process.env.KAPSO_FOOD_TEMPLATE_DELIVERED,
    "damigos_order_delivered",
  );
  if (kapsoMode() === "live") {
    const templated = await sendKapsoTemplate("food", input.toPhone, template, [
      input.kitchenName,
    ]);
    if (templated.ok) return templated;
  }
  const body =
    `✅ *Delivered*\n` +
    `Thanks for ordering from *${input.kitchenName}*!\n\n` +
    `Order again: ${input.hubUrl}\n\n` +
    `_D'aMigo Food_`;
  return sendKapsoText("food", input.toPhone, body);
}

export async function sendFoodHiReturning(
  toPhone: string,
  hubUrl: string,
  lastKitchens: { name: string; menuUrl: string }[] = [],
) {
  const kitchenLines =
    lastKitchens.length > 0
      ? `\n\n*Your recent kitchens*\n` +
        lastKitchens
          .slice(0, 3)
          .map((k, i) => `${i + 1}. *${k.name}*\n${k.menuUrl}`)
          .join("\n")
      : "";

  const body =
    `Welcome back to D'aMigo Food 👋\nWhat would you like to do?` + kitchenLines;

  return sendKapsoButtons("food", toPhone, body.slice(0, 1024), [
    { id: "order_last", title: "Order Last Visited" },
    { id: "explore_hub", title: "Explore Hub" },
    { id: "active_orders", title: "Active Orders" },
  ]).then(async (r) => {
    if (r.ok) return r;
    return sendKapsoText(
      "food",
      toPhone,
      `Welcome back!${kitchenLines}\n\nExplore: ${hubUrl}`,
    );
  });
}

export async function sendFoodHiNew(toPhone: string, hubUrl: string) {
  const body =
    `👋 Welcome to *D'aMigo Food*\n\n` +
    `Order direct from local kitchens — *First order FREE delivery* on us.\n\n` +
    `Tap below to open the hub.`;
  const cta = await sendKapsoCtaUrl("food", toPhone, body, "Open hub", hubUrl);
  if (cta.ok) return cta;
  return sendKapsoText("food", toPhone, `${body}\n\n${hubUrl}`);
}

export function guestWebOrigin(): string {
  return (
    process.env.GUEST_WEB_URL?.replace(/\/$/, "") ||
    process.env.GUEST_WEB_ORIGIN?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
