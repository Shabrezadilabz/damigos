import type { IncomingMessage, ServerResponse } from "node:http";
import { StaffOtpError, verifyStaffOtp } from "../../../../../src/lib/staff-otp-verify.js";

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const phone = String(body.phone ?? "");
    const code = String(body.code ?? "");
    const result = await verifyStaffOtp(phone, code);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (err) {
    if (err instanceof StaffOtpError) {
      res.statusCode = err.statusCode;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: { code: err.code, message: err.message } }));
      return;
    }
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "OTP verify failed",
        },
      }),
    );
  }
}

export const config = { maxDuration: 30 };
