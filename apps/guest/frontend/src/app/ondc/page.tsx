"use client";

import { useEffect, useState } from "react";

type OndcState = {
  subscriberId: string;
  subscriberUrl: string;
  ukid: string;
  domain: string;
  environment: string;
  signingPublicKey: string;
  encryptionPublicKey: string;
  logsCount: number;
  restaurantsCount: number;
  logs: Array<{
    id: string;
    action: string;
    transactionId: string;
    messageId: string;
    bppId: string | null;
    receivedAt: string;
    durationMs: number;
    signatureValid: boolean;
    providersCount: number;
    itemsCount: number;
  }>;
  restaurants: Array<{
    providerId: string;
    bppId: string;
    name: string;
    shortDesc?: string;
    gps?: string;
    address?: string;
    city?: string;
    itemsCount: number;
    sampleItems: Array<{ id: string; name: string; priceInr: string }>;
    updatedAt: string;
  }>;
};

export default function OndcTestConsolePage() {
  const [state, setState] = useState<OndcState | null>(null);
  const [gps, setGps] = useState("12.9121,77.6446");
  const [areaCode, setAreaCode] = useState("560034");
  const [queryText, setQueryText] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastTrigger, setLastTrigger] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/ondc/search", { cache: "no-store" });
    if (res.ok) {
      setState((await res.json()) as OndcState);
    }
  }

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, []);

  async function triggerSearch() {
    setBusy(true);
    setLastTrigger(null);
    try {
      const res = await fetch("/api/ondc/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gps, areaCode, queryText }),
      });
      const data = await res.json();
      setLastTrigger(JSON.stringify(data, null, 2));
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function simulateMockPing() {
    setBusy(true);
    try {
      await fetch("/on_search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            domain: "ONDC:RET11",
            action: "on_search",
            transaction_id: `sim_${Date.now()}`,
            message_id: `msg_${Date.now()}`,
            bpp_id: "preprod.magicpin-bpp.ondc.org",
            bpp_uri: "https://preprod.magicpin-bpp.ondc.org",
          },
          message: {
            catalog: {
              "bpp/providers": [
                {
                  id: "blr-hsr-biryani-01",
                  descriptor: {
                    name: "HSR Donne Biryani House (ONDC PreProd)",
                    short_desc: "Authentic Bangalore Nati Style Biryani",
                  },
                  locations: [
                    {
                      gps: "12.9121,77.6446",
                      address: {
                        street: "27th Main Road",
                        locality: "HSR Layout Sector 1",
                        city: "Bengaluru",
                        area_code: "560034",
                      },
                    },
                  ],
                  items: [
                    {
                      id: "item-1",
                      descriptor: { name: "Chicken Donne Biryani" },
                      price: { value: "210" },
                    },
                    {
                      id: "item-2",
                      descriptor: { name: "Guntur Chicken Dry" },
                      price: { value: "180" },
                    },
                  ],
                },
              ],
            },
          },
        }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              ONDC PreProd · Food &amp; Beverage (ONDC:RET11)
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">
              ONDC Network Sandbox &amp; Bangalore Restaurant Discovery
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Subscriber: <strong>{state?.subscriberId ?? "damigos-guest-web.vercel.app"}</strong> ·
              UKID: <code>{state?.ukid ?? "f09c99cd-1aef-4ee7-bb5c-23756774a4d7"}</code>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void simulateMockPing()}
              disabled={busy}
              className="rounded-xl border border-border bg-secondary px-4 py-2 text-xs font-bold"
            >
              Simulate /on_search Ping (&lt;3000ms Test)
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <label className="text-xs font-semibold">
            Bangalore GPS
            <input
              value={gps}
              onChange={(e) => setGps(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Pincode
            <input
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold">
            Dish / Restaurant filter (optional)
            <input
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Biryani, Dosa, etc."
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void triggerSearch()}
              className="w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-primary-foreground"
            >
              {busy ? "Broadcasting…" : "Broadcast ONDC /search"}
            </button>
          </div>
        </div>

        {lastTrigger ? (
          <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-slate-950 p-3 text-[11px] text-emerald-300">
            {lastTrigger}
          </pre>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
          <h2 className="text-base font-bold">
            Discovered ONDC Restaurants ({state?.restaurantsCount ?? 0})
          </h2>
          <p className="text-xs text-muted-foreground">
            Populated automatically as Seller Apps (Petpooja, Magicpin, uEngage) hit{" "}
            <code>/on_search</code>
          </p>
          <div className="mt-4 space-y-3">
            {(state?.restaurants ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No callbacks yet. Click &ldquo;Broadcast ONDC /search&rdquo; or &ldquo;Simulate
                /on_search Ping&rdquo; above.
              </p>
            ) : (
              state?.restaurants.map((r) => (
                <div
                  key={`${r.bppId}:${r.providerId}`}
                  className="rounded-xl border border-border p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{r.name}</span>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                      {r.itemsCount} items
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {r.address || r.city} · GPS: {r.gps ?? "N/A"} · BPP: {r.bppId}
                  </p>
                  {r.sampleItems.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.sampleItems.map((it) => (
                        <span
                          key={it.id}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px]"
                        >
                          {it.name} (₹{it.priceInr})
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-xs">
          <h2 className="text-base font-bold">
            Live Webhook Traffic Logger ({state?.logsCount ?? 0})
          </h2>
          <p className="text-xs text-muted-foreground">
            Tracks response speed (&lt;3000ms SLA) and Ed25519 signature status
          </p>
          <div className="mt-4 space-y-2">
            {(state?.logs ?? []).map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-bold text-primary">/{l.action}</span> · tx{" "}
                  <code>{l.transactionId.slice(0, 12)}</code>
                  <p className="text-[11px] text-muted-foreground">
                    BPP: {l.bppId ?? "sandbox"} · Providers: {l.providersCount} · Items:{" "}
                    {l.itemsCount}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      l.durationMs < 3000
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-red-100 text-red-900"
                    }`}
                  >
                    {l.durationMs}ms · ACK
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
