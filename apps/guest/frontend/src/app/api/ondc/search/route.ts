import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getOndcState,
  ONDC_DEFAULT_SUBSCRIBER_ID,
  ONDC_DEFAULT_SUBSCRIBER_URL,
  ONDC_PREPROD_GATEWAY_URL,
  signOndcPayload,
} from "@/lib/ondc-beckn";

export async function GET() {
  return NextResponse.json(getOndcState());
}

/**
 * Trigger an outbound Beckn /search broadcast to the ONDC PreProd Gateway for Bangalore (std:080).
 * Seller Apps (BPPs) on PreProd will asynchronously POST catalogs back to https://damigos-guest-web.vercel.app/on_search
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    gps?: string;
    areaCode?: string;
    cityCode?: string;
    queryText?: string;
    gatewayUrl?: string;
  };

  const gps = body.gps?.trim() || "12.9121,77.6446"; // HSR Layout, Bangalore default
  const areaCode = body.areaCode?.trim() || "560034";
  const cityCode = body.cityCode?.trim() || "std:080";
  const transactionId = randomUUID();
  const messageId = randomUUID();

  const searchPayload = {
    context: {
      domain: "ONDC:RET11",
      country: "IND",
      city: cityCode,
      action: "search",
      core_version: "1.2.0",
      bap_id: ONDC_DEFAULT_SUBSCRIBER_ID,
      bap_uri: ONDC_DEFAULT_SUBSCRIBER_URL,
      transaction_id: transactionId,
      message_id: messageId,
      timestamp: new Date().toISOString(),
      ttl: "PT30S",
    },
    message: {
      intent: {
        ...(body.queryText?.trim()
          ? { item: { descriptor: { name: body.queryText.trim() } } }
          : {}),
        fulfillment: {
          type: "Delivery",
          end: {
            location: {
              gps,
              address: {
                area_code: areaCode,
              },
            },
          },
        },
        payment: {
          "@ondc/org/buyer_app_finder_fee_type": "percent",
          "@ondc/org/buyer_app_finder_fee_amount": "3.0",
        },
      },
    },
  };

  const rawBody = JSON.stringify(searchPayload);
  const signed = signOndcPayload(rawBody);
  const gatewayUrl = body.gatewayUrl?.trim() || ONDC_PREPROD_GATEWAY_URL;

  try {
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: signed.header,
      },
      body: rawBody,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let gatewayResponse: unknown = text;
    try {
      gatewayResponse = JSON.parse(text);
    } catch {
      /* keep raw text */
    }
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      gatewayUrl,
      transactionId,
      messageId,
      authorizationHeader: signed.header,
      gatewayResponse,
      requestPayload: searchPayload,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        gatewayUrl,
        transactionId,
        messageId,
        authorizationHeader: signed.header,
        error: err instanceof Error ? err.message : "Gateway request failed",
        requestPayload: searchPayload,
      },
      { status: 502 },
    );
  }
}
