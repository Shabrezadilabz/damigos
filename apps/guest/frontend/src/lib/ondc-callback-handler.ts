import { NextRequest, NextResponse } from "next/server";
import { recordOndcCallback, verifyOndcSignature } from "./ondc-beckn";

export async function handleOndcCallback(req: NextRequest, expectedAction: string) {
  const requestStartTime = Date.now();
  let rawBody = "";
  let parsed: Record<string, unknown> = {};

  try {
    rawBody = await req.text();
    parsed = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json(
      {
        message: { ack: { status: "NACK" } },
        error: { type: "JSON-SCHEMA-ERROR", code: "400", message: "Invalid JSON payload" },
      },
      { status: 400 },
    );
  }

  const ctx = (parsed.context ?? {}) as Record<string, unknown>;
  const actionType = String(ctx.action ?? expectedAction);
  const transactionId = String(ctx.transaction_id ?? "N/A");
  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("x-gateway-authorization");

  console.log(
    `[ONDC Sandbox] Incoming Test Ping: ${actionType} | Transaction ID: ${transactionId}`,
  );

  const sigCheck = verifyOndcSignature({
    authHeader,
    rawBody,
  });

  const processingDuration = Date.now() - requestStartTime;
  recordOndcCallback({
    action: actionType,
    payload: parsed,
    durationMs: processingDuration,
    signatureValid: sigCheck.valid,
  });

  console.log(
    `[ONDC Sandbox] Response Dispatched for ${actionType}. Execution Loop Time: ${processingDuration}ms`,
  );
  if (processingDuration > 3000) {
    console.warn(
      `[PERFORMANCE WARNING] Execution took ${processingDuration}ms. Your webhook must respond under 3000ms to clear PreProd certification!`,
    );
  }

  return NextResponse.json(
    {
      message: {
        ack: {
          status: "ACK",
        },
      },
    },
    { status: 200 },
  );
}
