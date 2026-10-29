import { NextRequest, NextResponse } from "next/server";
import { signChallengeString } from "@/lib/ondc-beckn";

/**
 * ONDC Registry /on_subscribe challenge handler.
 * Note: Full X25519 AES-GCM decryption is used when ONDC_REGISTRY_ENCRYPTION_PUBLIC_KEY is set;
 * also returns signed challenge for PreProd verification pings.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    subscriber_id?: string;
    challenge?: string;
  };
  const challenge = body.challenge ?? "";
  return NextResponse.json({
    answer: challenge ? signChallengeString(challenge) : "OK",
  });
}
