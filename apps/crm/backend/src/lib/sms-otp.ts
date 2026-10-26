/**
 * MSG91 Official v5 OTP + Flow SMS integration (with Twilio & pilot stub fallback).
 * Docs:
 * - SendOTP: POST https://control.msg91.com/api/v5/otp
 * - VerifyOTP: GET https://control.msg91.com/api/v5/otp/verify
 * - ResendOTP: GET https://control.msg91.com/api/v5/otp/retry
 * - Send SMS (Flow): POST https://control.msg91.com/api/v5/flow
 */

const issuedOtpCache = new Map<string, { code: string; expiresAt: number }>();

function digits10(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}

export function generateSixDigitOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function rememberIssuedOtp(phone: string, code: string, ttlMs = 15 * 60 * 1000) {
  const to10 = digits10(phone);
  if (to10.length === 10) {
    issuedOtpCache.set(to10, { code, expiresAt: Date.now() + ttlMs });
  }
}

export function checkRememberedOtp(phone: string, enteredCode: string): boolean {
  const to10 = digits10(phone);
  const hit = issuedOtpCache.get(to10);
  if (!hit) return false;
  if (Date.now() > hit.expiresAt) {
    issuedOtpCache.delete(to10);
    return false;
  }
  if (hit.code === enteredCode.trim()) {
    issuedOtpCache.delete(to10);
    return true;
  }
  return false;
}

/** Verify OTP against MSG91 /api/v5/otp/verify when MSG91_AUTH_KEY is configured */
export async function verifyMsg91Otp(phone: string, code: string): Promise<boolean> {
  const to10 = digits10(phone);
  if (to10.length < 10) return false;
  if (checkRememberedOtp(to10, code)) return true;

  const msg91Key = process.env.MSG91_AUTH_KEY?.trim();
  if (!msg91Key) return false;

  try {
    const url = new URL("https://control.msg91.com/api/v5/otp/verify");
    url.searchParams.set("mobile", `91${to10}`);
    url.searchParams.set("otp", code.trim());

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        authkey: msg91Key,
        accept: "application/json",
      },
    });
    const data = (await res.json().catch(() => null)) as { type?: string; message?: string } | null;
    return data?.type === "success";
  } catch {
    return false;
  }
}

export async function sendStaffOtpSms(
  phone: string,
  code?: string,
): Promise<{
  sent: boolean;
  channel: "msg91" | "twilio" | "sms_stub";
  requestId?: string;
}> {
  const to10 = digits10(phone);
  if (to10.length < 10) return { sent: false, channel: "sms_stub" };

  const otpCode = code?.trim() || generateSixDigitOtp();
  rememberIssuedOtp(to10, otpCode);

  const msg91Key = process.env.MSG91_AUTH_KEY?.trim();
  const msg91Sender = process.env.MSG91_SENDER_ID?.trim() || "DAMIGO";
  if (msg91Key) {
    try {
      const otpTemplateId =
        process.env.MSG91_OTP_TEMPLATE_ID?.trim() || process.env.MSG91_TEMPLATE_ID?.trim();

      // 1. Official MSG91 v5 SendOTP endpoint
      const otpUrl = new URL("https://control.msg91.com/api/v5/otp");
      otpUrl.searchParams.set("mobile", `91${to10}`);
      otpUrl.searchParams.set("otp", otpCode);
      otpUrl.searchParams.set("otp_length", String(otpCode.length));
      otpUrl.searchParams.set("otp_expiry", "15");
      if (otpTemplateId) {
        otpUrl.searchParams.set("template_id", otpTemplateId);
      }

      const otpRes = await fetch(otpUrl.toString(), {
        method: "POST",
        headers: {
          authkey: msg91Key,
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({ OTP: otpCode }),
      });
      const otpJson = (await otpRes.json().catch(() => null)) as {
        type?: string;
        request_id?: string;
        message?: string;
      } | null;

      if (otpJson?.type === "success") {
        return { sent: true, channel: "msg91", requestId: otpJson.request_id };
      }

      // 2. Fallback: MSG91 v5 Flow API if template_id is a Flow template
      if (otpTemplateId) {
        const flowRes = await fetch("https://control.msg91.com/api/v5/flow", {
          method: "POST",
          headers: {
            authkey: msg91Key,
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            template_id: otpTemplateId,
            short_url: "0",
            recipients: [{ mobiles: `91${to10}`, otp: otpCode, VAR1: otpCode }],
          }),
        });
        const flowJson = (await flowRes.json().catch(() => null)) as {
          type?: string;
          message?: string;
        } | null;
        if (flowJson?.type === "success") {
          return { sent: true, channel: "msg91", requestId: flowJson.message };
        }
      }

      // 3. Fallback: transactional HTTP API when DLT template ID is not yet configured in env
      const legacyUrl = `https://api.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(msg91Key)}&mobiles=91${to10}&message=${encodeURIComponent(`D'aMigo's login OTP is ${otpCode}. Valid for 15 minutes.`)}&sender=${encodeURIComponent(msg91Sender)}&route=4&country=91&response=json`;
      await fetch(legacyUrl);
      return { sent: true, channel: "msg91" };
    } catch {
      return { sent: false, channel: "sms_stub" };
    }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (sid && token && from) {
    try {
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `+91${to10}`,
          From: from,
          Body: `D'aMigo's login OTP: ${otpCode}`,
        }),
      });
      return { sent: true, channel: "twilio" };
    } catch {
      return { sent: false, channel: "sms_stub" };
    }
  }

  return { sent: true, channel: "sms_stub" };
}
