import { createHash, randomInt } from "node:crypto";

/** Short display id shared with rider apps via Shiprocket channel order_id / label. */
export function shortOrderId(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** 4-digit kitchen ↔ rider pickup code (Damigos-owned). */
export function generatePickupCode(): string {
  return String(randomInt(1000, 10000));
}

/** 6-digit guest ↔ rider delivery OTP (Damigos-owned). */
export function generateDeliveryOtp(): string {
  return String(randomInt(100000, 1000000));
}

function otpPepper(): string {
  return process.env.DELIVERY_OTP_PEPPER?.trim() || process.env.OTP_PEPPER?.trim() || "damigos-handoff";
}

export function hashDeliveryOtp(code: string): string {
  return createHash("sha256").update(`${otpPepper()}:${code.trim()}`).digest("hex");
}

export function normalizeHandoffToken(raw: string): string {
  return raw.replace(/[\s#._-]/g, "").toUpperCase();
}

/**
 * Kitchen verifies rider by matching any of:
 * - 4-digit pickup code
 * - short order id (8 chars)
 * - full AWB or last 4–6 of AWB
 */
export function matchesPickupToken(
  rawToken: string,
  input: { pickupCode: string | null | undefined; orderId: string; awb: string | null | undefined },
): boolean {
  const token = normalizeHandoffToken(rawToken);
  if (!token || token.length < 4) return false;

  if (input.pickupCode && token === normalizeHandoffToken(input.pickupCode)) return true;

  const short = shortOrderId(input.orderId);
  if (token === short || short.endsWith(token) || token.endsWith(short.slice(-4))) return true;

  const awb = input.awb ? normalizeHandoffToken(input.awb) : "";
  if (awb && (token === awb || awb.endsWith(token) || token.endsWith(awb.slice(-4)))) return true;

  return false;
}

export function verifyDeliveryOtp(
  rawOtp: string,
  hash: string | null | undefined,
): boolean {
  if (!hash) return false;
  const digits = rawOtp.replace(/\D/g, "");
  if (digits.length < 4) return false;
  return hashDeliveryOtp(digits) === hash;
}
