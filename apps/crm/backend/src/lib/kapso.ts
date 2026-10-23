/**
 * Spark agent sends for Grow campaigns (Kapso Meta Proxy).
 * KAPSO_MODE: mock | live | off
 * Templates: send by Meta **name** + en_US positional params (@damigos/domain).
 */

import {
  DAMIGOS_WA_TEMPLATES,
  KAPSO_CONNECTED,
  resolveGrowTemplateName,
  type DamigosWaTemplateName,
} from "@damigos/domain";

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

/** Spark agent phone — prefer dedicated id, then sandbox/shared fallback */
function sparkPhoneNumberId(): string | null {
  const spark = process.env.KAPSO_SPARK_PHONE_NUMBER_ID?.trim();
  if (spark) return spark;
  if ((process.env.KAPSO_USE_SANDBOX ?? "").toLowerCase() === "true") {
    return (
      process.env.KAPSO_SANDBOX_PHONE_NUMBER_ID?.trim() ||
      process.env.KAPSO_PHONE_NUMBER_ID?.trim() ||
      null
    );
  }
  return process.env.KAPSO_PHONE_NUMBER_ID?.trim() || null;
}

export function normalizeWaPhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

export type KapsoSendResult = {
  ok: boolean;
  mode: KapsoMode;
  messageId: string | null;
  error?: string;
};

/** Food agent phone — delivery OTP / order utility. */
function foodPhoneNumberId(): string | null {
  const food = process.env.KAPSO_FOOD_PHONE_NUMBER_ID?.trim();
  if (food) return food;
  if ((process.env.KAPSO_USE_SANDBOX ?? "").toLowerCase() === "true") {
    return (
      process.env.KAPSO_SANDBOX_PHONE_NUMBER_ID?.trim() ||
      process.env.KAPSO_PHONE_NUMBER_ID?.trim() ||
      null
    );
  }
  return process.env.KAPSO_PHONE_NUMBER_ID?.trim() || null;
}

async function sendFoodText(toPhone: string, text: string): Promise<KapsoSendResult> {
  const mode = kapsoMode();
  if (mode === "off") {
    return { ok: false, mode, messageId: null, error: "KAPSO_MODE=off" };
  }
  if (mode === "mock") {
    const messageId = `kapso_mock_food_${Date.now().toString(36)}`;
    console.info("[kapso:mock:food]", JSON.stringify({ to: normalizeWaPhone(toPhone), text: text.slice(0, 280) }));
    return { ok: true, mode, messageId };
  }
  const key = apiKey();
  const phoneNumberId = foodPhoneNumberId();
  if (!key || !phoneNumberId) {
    return { ok: false, mode, messageId: null, error: "Missing KAPSO_API_KEY or Food phone number id" };
  }
  const url = `https://api.kapso.ai/meta/whatsapp/v24.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizeWaPhone(toPhone),
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return { ok: false, mode, messageId: null, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, mode, messageId: data.messages?.[0]?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      mode,
      messageId: null,
      error: err instanceof Error ? err.message : "Kapso network error",
    };
  }
}

export async function sendFoodDeliveryOtpMessage(input: {
  toPhone: string;
  kitchenName: string;
  orderShortId: string;
  otp: string;
}): Promise<KapsoSendResult> {
  const body =
    `🔐 *Delivery OTP*\n` +
    `*${input.kitchenName}* · #${input.orderShortId}\n\n` +
    `Share this code with the rider only when they arrive:\n` +
    `*${input.otp}*\n\n` +
    `_Never share on phone calls. D'aMigo Food_`;
  return sendFoodText(input.toPhone, body);
}

async function postSparkMessage(body: Record<string, unknown>): Promise<KapsoSendResult> {
  const mode = kapsoMode();
  if (mode === "off") {
    return { ok: false, mode, messageId: null, error: "KAPSO_MODE=off" };
  }
  if (mode === "mock") {
    const messageId = `kapso_mock_spark_${Date.now().toString(36)}`;
    console.info("[kapso:mock:spark]", JSON.stringify(body).slice(0, 400));
    return { ok: true, mode, messageId };
  }

  const key = apiKey();
  const phoneNumberId = sparkPhoneNumberId();
  if (!key || !phoneNumberId) {
    return { ok: false, mode, messageId: null, error: "Missing KAPSO_API_KEY or Spark phone number id" };
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
      return { ok: false, mode, messageId: null, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, mode, messageId: data.messages?.[0]?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      mode,
      messageId: null,
      error: err instanceof Error ? err.message : "Kapso network error",
    };
  }
}

/** Marketing text via Spark WABA (session / fallback). */
export async function sendSparkMarketingText(toPhone: string, text: string): Promise<KapsoSendResult> {
  return postSparkMessage({
    to: normalizeWaPhone(toPhone),
    type: "text",
    text: { preview_url: true, body: text },
  });
}

export type KapsoTemplateHeaderImage = { link: string } | { id: string };

/** Send approved Grow/Spark template by Meta **name**. */
export async function sendSparkTemplate(
  toPhone: string,
  templateName: DamigosWaTemplateName | string,
  bodyParams: string[],
  opts?: { headerImage?: KapsoTemplateHeaderImage; languageCode?: string },
): Promise<KapsoSendResult> {
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

  return postSparkMessage({
    to: normalizeWaPhone(toPhone),
    type: "template",
    template: {
      name: templateName,
      language: { code: opts?.languageCode ?? KAPSO_CONNECTED.language },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}

/**
 * Map CRM `templateKey` → approved Meta name and send with correct body params.
 * `damigos_grow_poster` requires `headerImage` (fresh media id or public link).
 */
export async function sendGrowCampaignTemplate(input: {
  toPhone: string;
  templateKey: string | null;
  kitchenName: string;
  offerOrCopy: string;
  headline?: string;
  headerImage?: KapsoTemplateHeaderImage;
}): Promise<KapsoSendResult & { templateName?: DamigosWaTemplateName }> {
  const name = resolveGrowTemplateName(input.templateKey);
  if (!name) {
    return { ok: false, mode: kapsoMode(), messageId: null, error: "unknown_template_key" };
  }

  const meta = DAMIGOS_WA_TEMPLATES[name];
  if (meta.headerImage && !input.headerImage) {
    return {
      ok: false,
      mode: kapsoMode(),
      messageId: null,
      error: "damigos_grow_poster requires headerImage (media id or public link)",
      templateName: name,
    };
  }

  let bodyParams: string[] = [];
  if (name === "damigos_grow_poster") {
    bodyParams = [
      (input.headline ?? input.offerOrCopy).slice(0, 60),
      input.offerOrCopy.slice(0, 1024),
    ];
  } else if (meta.bodyParams.length === 2) {
    bodyParams = [input.kitchenName, input.offerOrCopy];
  } else if (meta.bodyParams.length === 1) {
    bodyParams = [input.kitchenName];
  }

  const result = await sendSparkTemplate(input.toPhone, name, bodyParams, {
    headerImage: input.headerImage,
  });
  return { ...result, templateName: name };
}
