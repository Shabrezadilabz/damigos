import type { IncomingMessage, ServerResponse } from "node:http";
import { StaffOtpError, verifyStaffOtp } from "./lib/staff-otp-verify.js";

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await verifyStaffOtp(String(body.phone ?? ""), String(body.code ?? ""));
    sendJson(res, 200, result);
  } catch (err) {
    if (err instanceof StaffOtpError) {
      sendJson(res, err.statusCode, { error: { code: err.code, message: err.message } });
      return;
    }
    if (err instanceof SyntaxError) {
      sendJson(res, 400, { error: { code: "INVALID_JSON", message: "Body is not valid JSON" } });
      return;
    }
    sendJson(res, 500, {
      error: {
        code: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "OTP verify failed",
      },
    });
  }
}

export const config = { maxDuration: 30 };
