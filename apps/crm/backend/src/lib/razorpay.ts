import { createHmac, timingSafeEqual } from "node:crypto";

function keySecret() {
  return process.env.RAZORPAY_KEY_SECRET ?? null;
}

function basicAuthHeader(keyId: string, keySecretVal: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecretVal}`).toString("base64")}`;
}

export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null;
}

/** Create a Razorpay order (amount in paise) for CRM wallet top-up. */
export async function createRazorpayOrder(input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = keySecret();
  if (!keyId || !secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required for live wallet top-up");
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(keyId, secret),
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
  const secret = keySecret();
  if (!secret) return false;
  const payload = `${input.orderId}|${input.paymentId}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
}
