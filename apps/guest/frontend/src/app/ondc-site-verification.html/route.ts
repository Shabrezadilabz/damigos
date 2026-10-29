import { NextResponse } from "next/server";
import {
  ONDC_DEFAULT_ENCRYPTION_PUBLIC_KEY,
  ONDC_DEFAULT_SIGNING_PUBLIC_KEY,
  ONDC_DEFAULT_SUBSCRIBER_ID,
  ONDC_DEFAULT_UKID,
  signChallengeString,
} from "@/lib/ondc-beckn";

export async function GET() {
  const signedToken = signChallengeString(ONDC_DEFAULT_SUBSCRIBER_ID);
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="ondc-site-verification" content="${signedToken}" />
    <title>ONDC Site Verification - ${ONDC_DEFAULT_SUBSCRIBER_ID}</title>
  </head>
  <body>
    ONDC PreProd Verification Active — Subscriber: ${ONDC_DEFAULT_SUBSCRIBER_ID} | UKID: ${ONDC_DEFAULT_UKID}
    <!-- Signing Public Key: ${ONDC_DEFAULT_SIGNING_PUBLIC_KEY} -->
    <!-- Encryption Public Key: ${ONDC_DEFAULT_ENCRYPTION_PUBLIC_KEY} -->
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
