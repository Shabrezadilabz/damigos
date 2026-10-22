/**
 * Spark agent sends for Grow campaigns (Kapso Meta Proxy).
 * KAPSO_MODE: mock | live | off
 */

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

/** Marketing text via Spark WABA */
export async function sendSparkMarketingText(toPhone: string, text: string): Promise<KapsoSendResult> {
  const mode = kapsoMode();
  if (mode === "off") {
    return { ok: false, mode, messageId: null, error: "KAPSO_MODE=off" };
  }

  if (mode === "mock") {
    const messageId = `kapso_mock_spark_${Date.now().toString(36)}`;
    console.info("[kapso:mock:spark]", JSON.stringify({ to: normalizeWaPhone(toPhone), text: text.slice(0, 200) }));
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
        to: normalizeWaPhone(toPhone),
        type: "text",
        text: { preview_url: true, body: text },
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
