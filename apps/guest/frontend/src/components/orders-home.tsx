"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchMyOrders, formatInr, type GuestOrderSummary } from "@/lib/api";
import { getGuestToken } from "@/lib/session";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";

type Tab = "active" | "past";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

/** G-S5 / G-06.01–02 */
export function OrdersHome() {
  const [tab, setTab] = useState<Tab>("active");
  const [orders, setOrders] = useState<GuestOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async (filter: Tab) => {
    if (!getGuestToken()) return;
    setLoading(true);
    try {
      const rows = await fetchMyOrders(filter);
      setOrders(rows);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getGuestToken()) {
      setAuthOpen(true);
      setLoading(false);
      return;
    }
    void load(tab);
  }, [tab, authOpen, load]);

  return (
    <main className="mx-auto min-h-dvh max-w-lg pb-8">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Your orders</h1>
        <p className="mt-0.5 text-xs text-foreground/60">All kitchens you order from on D&apos;aMigo&apos;s</p>
        <div className="mt-3 flex gap-2">
          {(["active", "past"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
            >
              {t === "active" ? "Active" : "Past"}
            </Button>
          ))}
        </div>
      </header>

      <ul className="mt-2 divide-y divide-border">
        {orders.map((o) => (
          <li key={o.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{o.restaurantName}</p>
                <p className="mt-0.5 text-xs text-foreground/60">{formatWhen(o.createdAt)}</p>
              </div>
              <div className="text-right">
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {statusLabel(o.status)}
                </span>
                <p className="mt-1 text-sm font-bold tabular-nums">{formatInr(o.totalPaise)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tab === "active" && (
                <Button size="sm" variant="default" asChild>
                  <Link href={`/orders/${o.id}`}>Track</Link>
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link href={`/r/${o.restaurantId}/menu`}>Reorder</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {!loading && !orders.length && !authOpen && (
        <p className="px-4 py-8 text-center text-sm text-foreground/60">
          {tab === "active" ? "No active orders." : "No past orders yet."}
        </p>
      )}
      {loading && !authOpen && (
        <p className="px-4 py-8 text-center text-sm text-foreground/60">Loading…</p>
      )}

      <div className="mt-6 px-4">
        <Button variant="ghost" asChild className="w-full">
          <Link href="/hub">Discover kitchens</Link>
        </Button>
      </div>

      <ProfileConsentSheet
        open={authOpen}
        onComplete={() => {
          setAuthOpen(false);
          void load(tab);
        }}
      />
    </main>
  );
}
