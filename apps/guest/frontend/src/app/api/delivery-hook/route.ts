import { NextRequest, NextResponse } from "next/server";

/**
 * Optional Shiprocket webhook entry on the guest web domain.
 * Prefer guest-api URL in Shiprocket panel:
 *   https://damigos-guest-api.vercel.app/v1/webhooks/delivery
 *
 * This proxy exists if the panel must hit guest-web; forwards to guest-api.
 */
const API =
  process.env.GUEST_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_GUEST_API_URL?.replace(/\/$/, "") ||
  "https://damigos-guest-api.vercel.app";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "delivery-hook-proxy",
    forwardsTo: `${API}/v1/webhooks/delivery`,
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
  };
  const apiKey = req.headers.get("x-api-key");
  const alt = req.headers.get("x-shiprocket-token");
  if (apiKey) headers["x-api-key"] = apiKey;
  if (alt) headers["x-shiprocket-token"] = alt;

  try {
    const res = await fetch(`${API}/v1/webhooks/delivery`, {
      method: "POST",
      headers,
      body: raw || "{}",
      signal: AbortSignal.timeout(12_000),
    });
    const text = await res.text();
    return new NextResponse(text || '{"ok":true}', {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Proxy failed",
      },
      { status: 502 },
    );
  }
}
