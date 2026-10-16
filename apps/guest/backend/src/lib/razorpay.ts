import { createHmac, timingSafeEqual } from "node:crypto";

export function razorpayKeySecret() {
  return process.env.RAZORPAY_KEY_SECRET ?? null;
}

export function razorpayWebhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET ?? null;
}

function basicAuthHeader(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

/** Create a Razorpay order (amount in paise). */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = razorpayKeySecret();
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required for live checkout");
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes,
    }),
  });

  const data = (await res.json()) as { id?: string; error?: { description?: string } };
  if (!res.ok || !data.id) {
    throw new Error(data.error?.description ?? "Razorpay order create failed");
  }
  return data.id;
}

export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = razorpayKeySecret();
  if (!secret) return false;
  const payload = `${input.orderId}|${input.paymentId}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}

export function signWebhookBody(rawBody: string, secret?: string | null) {
  const key = secret ?? razorpayWebhookSecret();
  if (!key) throw new Error("RAZORPAY_WEBHOOK_SECRET required to sign webhooks");
  return createHmac("sha256", key).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string | undefined) {
  const secret = razorpayWebhookSecret();
  if (!secret) return true;
  if (!signature) return false;
  const expected = signWebhookBody(rawBody, secret);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
