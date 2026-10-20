"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { WaChrome } from "@/components/wa-chrome";
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

function statusTone(status: string) {
  if (status === "DELIVERED" || status === "CLOSED") return "bg-surface-container text-on-surface-variant";
  if (status === "DISPATCHED" || status === "READY") return "bg-emerald-100 text-emerald-800";
  return "bg-primary-fixed text-primary";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function stepHint(status: string) {
  const map: Record<string, string> = {
    PAID: "Kitchen Fire · Awaiting accept",
    ACCEPTED: "Kitchen Fire · Accepted",
    PREPARING: "Kitchen Fire · Cooking",
    READY: "Ready for rider pickup",
    READY_FOR_PICKUP: "Ready for rider pickup",
    DISPATCHED: "Out for delivery",
    DELIVERED: "Delivered",
  };
  return map[status] ?? statusLabel(status);
}

function progressWidth(status: string) {
  const order = ["PAID", "ACCEPTED", "PREPARING", "READY", "READY_FOR_PICKUP", "DISPATCHED", "DELIVERED"];
  const i = order.indexOf(status);
  if (i < 0) return "20%";
  return `${Math.min(100, Math.round(((i + 1) / order.length) * 100))}%`;
}

function trackHref(o: GuestOrderSummary) {
  if (o.checkoutGroupId) return `/orders/group/${o.checkoutGroupId}`;
  return `/orders/${o.id}`;
}

/** G-S5 / G-06 — Active/Past multi-active + concurrent order CTA (P15-T14/T15) */
export function OrdersHome() {
  const [tab, setTab] = useState<Tab>("active");
  const [orders, setOrders] = useState<GuestOrderSummary[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async (filter: Tab) => {
    if (!getGuestToken()) return;
    setLoading(true);
    try {
      const [rows, activeRows, pastRows] = await Promise.all([
        fetchMyOrders(filter),
        fetchMyOrders("active").catch(() => [] as GuestOrderSummary[]),
        fetchMyOrders("past").catch(() => [] as GuestOrderSummary[]),
      ]);
      setOrders(rows);
      setActiveCount(activeRows.length);
      setPastCount(pastRows.length);
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

  useEffect(() => {
    if (!getGuestToken() || tab !== "active") return;
    const id = window.setInterval(() => {
      void load("active");
    }, 15_000);
    return () => window.clearInterval(id);
  }, [tab, load]);

  const crossByGroups = useMemo(() => {
    const map = new Map<string, GuestOrderSummary[]>();
    for (const o of orders) {
      if (!o.checkoutGroupId) continue;
      const list = map.get(o.checkoutGroupId) ?? [];
      list.push(o);
      map.set(o.checkoutGroupId, list);
    }
    return map;
  }, [orders]);

  return (
    <>
      <WaChrome title="Orders Home" subtitle="Packaging Delivery · All kitchens" profileHref="/me" />

      <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-[7.25rem]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-[24px] font-bold tracking-tight">Your Orders</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-on-surface-variant">
              {tab === "active" && orders.length > 0 ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  {orders.length} live · Order again anytime
                </>
              ) : (
                "Track packaging delivery & history"
              )}
            </p>
          </div>
          <Link
            href="/hub"
            className="pressable rounded-full bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground shadow-sm"
          >
            + New order
          </Link>
        </div>

        {/* G-06.03 — concurrent ordering never blocked */}
        {tab === "active" && activeCount > 0 ? (
          <Link
            href="/hub"
            className="pressable mb-4 flex items-center gap-3 rounded-2xl bg-inverse-surface px-3.5 py-3 text-inverse-on-surface shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed-dim/25 text-tertiary-fixed-dim">
              <MaterialIcon name="add_shopping_cart" className="text-[20px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-tertiary-fixed-dim">
                Concurrent order
              </span>
              <span className="block text-[14px] font-semibold">
                {activeCount} live — start another kitchen anytime
              </span>
            </span>
            <MaterialIcon name="chevron_right" className="text-[22px] text-white/60" />
          </Link>
        ) : null}

        <div className="mb-4 flex rounded-xl bg-surface-container-low p-1">
          {(["active", "past"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`pressable flex-1 rounded-lg py-2.5 text-[13px] font-semibold capitalize ${
                tab === t
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant"
              }`}
              onClick={() => setTab(t)}
            >
              {t === "active" ? `Active (${activeCount})` : `Past (${pastCount})`}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {orders.map((o) => {
            const groupLegs =
              o.checkoutGroupId && crossByGroups.get(o.checkoutGroupId)?.length
                ? crossByGroups.get(o.checkoutGroupId)!
                : null;
            const isCrossBy = Boolean(groupLegs && groupLegs.length > 1);
            const legLabel =
              o.legIndex != null && o.legIndex > 0
                ? `${o.legIndex === 1 ? "1st" : "2nd"} leg`
                : null;

            return (
              <li
                key={o.id}
                className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-border/50"
              >
                {tab === "active" ? (
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary to-tertiary-fixed-dim" />
                ) : null}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-container">
                      <MaterialIcon name="restaurant" className="text-[24px] text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold">{o.restaurantName}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        Packaging Delivery · {formatWhen(o.createdAt)}
                      </p>
                      {isCrossBy || legLabel ? (
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-tertiary">
                          {isCrossBy ? "Cross-By · " : ""}
                          {legLabel ?? "Multi-kitchen"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone(o.status)}`}
                  >
                    {statusLabel(o.status)}
                  </span>
                </div>

                {tab === "active" ? (
                  <div className="mt-3 rounded-xl bg-surface-container-low p-3">
                    <div className="mb-1.5 flex justify-between text-[11px] font-semibold">
                      <span className="text-primary">{stepHint(o.status)}</span>
                      <span className="text-on-surface-variant">Live</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: progressWidth(o.status) }}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-on-surface-variant">Total</p>
                    <p className="text-[18px] font-bold tabular">{formatInr(o.totalPaise)}</p>
                  </div>
                  <div className="flex gap-2">
                    {tab === "active" ? (
                      <Button size="sm" className="pressable rounded-xl" asChild>
                        <Link href={trackHref(o)}>
                          Track
                          <MaterialIcon name="sports_motorsports" className="text-[16px]" />
                        </Link>
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" className="pressable rounded-xl" asChild>
                      <Link href={`/r/${o.restaurantId}/menu`}>Reorder</Link>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {!loading && !orders.length && !authOpen ? (
          <div className="rounded-2xl bg-surface-container-lowest px-4 py-10 text-center shadow-sm">
            <MaterialIcon name="receipt_long" className="text-[40px] text-on-surface-variant" />
            <p className="mt-2 text-[14px] text-on-surface-variant">
              {tab === "active" ? "No active orders — place one anytime." : "No past orders yet."}
            </p>
            <Button className="pressable mt-4" asChild>
              <Link href="/hub">Discover kitchens</Link>
            </Button>
          </div>
        ) : null}
        {loading && !authOpen ? (
          <p className="py-8 text-center text-sm text-on-surface-variant">Loading…</p>
        ) : null}

        <ProfileConsentSheet
          open={authOpen}
          onComplete={() => {
            setAuthOpen(false);
            void load(tab);
          }}
        />
      </main>
    </>
  );
}
