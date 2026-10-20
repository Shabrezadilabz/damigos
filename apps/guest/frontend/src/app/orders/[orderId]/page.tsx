"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { WaChrome } from "@/components/wa-chrome";
import { formatInr, fetchMyOrders, type GuestOrderSummary } from "@/lib/api";
import { authHeaders, getGuestToken } from "@/lib/session";

const STEPS = [
  { key: "PAID", label: "Paid — sent to kitchen" },
  { key: "ACCEPTED", label: "Kitchen accepted · timer on" },
  { key: "PREPARING", label: "Preparing your order" },
  { key: "READY", label: "Ready for pickup" },
  { key: "DISPATCHED", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

function rankOf(status: string) {
  if (status === "READY_FOR_PICKUP") return STEPS.findIndex((s) => s.key === "READY");
  return STEPS.findIndex((s) => s.key === status);
}

function formatCountdown(totalSec: number) {
  const m = Math.max(0, Math.floor(totalSec / 60));
  const s = Math.max(0, totalSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** G-S4 live track — countdown shell + timeline + [1st|2nd] toggler + g12 confirmed */
export default function OrderTrackPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<{
    status: string;
    totalPaise: number;
    subtotalPaise: number;
    discountPaise?: number;
    deliveryFeePaise?: number;
    deliveryPincode?: string | null;
    restaurantId: string;
    createdAt?: string;
    prepDeadlineAt?: string | null;
    committedPrepMinutes?: number | null;
    extendedPrepMinutes?: number | null;
  } | null>(null);
  const [shipment, setShipment] = useState<{
    awb: string | null;
    carrier: string;
    status?: string;
    trackingUrl?: string | null;
    lastTrackingStatus?: string | null;
    foodDelivery?: boolean;
  } | null>(null);
  const [activeOrders, setActiveOrders] = useState<GuestOrderSummary[]>([]);
  const [leg, setLeg] = useState<0 | 1>(0);
  const [now, setNow] = useState(() => Date.now());
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    void params.then((p) => setOrderId(p.orderId));
  }, [params]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("confirmed") === "1") {
      setCelebrate(true);
      if ("vibrate" in navigator) navigator.vibrate([30, 40, 30]);
    }
  }, []);

  function dismissCelebrate() {
    setCelebrate(false);
    if (orderId) {
      router.replace(`/orders/${orderId}`, { scroll: false });
    }
  }

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!getGuestToken()) return;
    void fetchMyOrders("active")
      .then(setActiveOrders)
      .catch(() => setActiveOrders([]));
  }, [orderId]);

  const trackIds = useMemo(() => {
    const ids = activeOrders.map((o) => o.id);
    if (orderId && !ids.includes(orderId)) ids.unshift(orderId);
    return ids.slice(0, 2);
  }, [activeOrders, orderId]);

  const viewingId = trackIds[leg] ?? orderId;

  useEffect(() => {
    if (!viewingId) return;
    const base = process.env.NEXT_PUBLIC_GUEST_API_URL ?? "http://localhost:4000";
    const load = () =>
      fetch(`${base}/v1/orders/${viewingId}`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          setOrder(d.order);
          setShipment(d.shipment ?? null);
        })
        .catch(() => setOrder(null));
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(id);
  }, [viewingId]);

  const countdownSec = useMemo(() => {
    if (!order) return null;
    const inPrep =
      order.status === "ACCEPTED" || order.status === "PREPARING";
    if (!inPrep) return null;
    if (order.prepDeadlineAt) {
      return Math.floor((new Date(order.prepDeadlineAt).getTime() - now) / 1000);
    }
    // Fallback before Accept writes deadline
    if (!order.createdAt) return null;
    const deadline = new Date(order.createdAt).getTime() + 16 * 60_000;
    return Math.floor((deadline - now) / 1000);
  }, [order, now]);

  const currentRank = order ? rankOf(order.status) : -1;

  return (
    <>
      <WaChrome title="Live tracking" subtitle="WhatsApp sync · Direct D2C" profileHref="/me" />

      <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-[7.25rem]">
        {trackIds.length > 1 ? (
          <div className="mb-4 flex rounded-xl bg-surface-container-low p-1">
            {trackIds.map((id, i) => (
              <button
                key={id}
                type="button"
                className={`pressable flex-1 rounded-lg py-2.5 text-[13px] font-semibold ${
                  leg === i
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant"
                }`}
                onClick={() => setLeg(i as 0 | 1)}
              >
                {i === 0 ? "1st Order" : "2nd Order"}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[24px] font-bold tracking-tight">Order tracking</h1>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">
              Mirrored to D&apos;aMigo Food WhatsApp when connected
            </p>
          </div>
          {countdownSec != null ? (
            <div className="rounded-2xl bg-inverse-surface px-3 py-2 text-center text-inverse-on-surface">
              <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary-fixed-dim">
                Prep SLA
                {order?.committedPrepMinutes
                  ? ` ${order.committedPrepMinutes}m${
                      (order.extendedPrepMinutes ?? 0) > 0 ? " +5" : ""
                    }`
                  : ""}
              </p>
              <p
                className={`font-display text-[22px] font-bold tabular ${
                  countdownSec < 0 ? "text-red-300" : "text-white"
                }`}
              >
                {countdownSec < 0 ? `+${formatCountdown(-countdownSec)}` : formatCountdown(countdownSec)}
              </p>
            </div>
          ) : null}
        </div>

        {order ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-border/50">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  {order.status.replace(/_/g, " ")}
                </span>
                <span className="text-[15px] font-bold tabular">{formatInr(order.totalPaise)}</span>
              </div>
              {order.discountPaise != null && order.discountPaise > 0 ? (
                <p className="mt-2 text-[12px] font-semibold text-success">
                  Reward saved {formatInr(order.discountPaise)}
                </p>
              ) : null}
              {shipment?.awb ? (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] text-on-surface-variant">
                    {shipment.foodDelivery !== false ? "Food delivery · " : ""}
                    {shipment.carrier} AWB:{" "}
                    <span className="font-mono font-semibold text-foreground">{shipment.awb}</span>
                  </p>
                  {shipment.lastTrackingStatus ? (
                    <p className="text-[11px] font-semibold text-primary">
                      {shipment.lastTrackingStatus}
                    </p>
                  ) : null}
                  {shipment.trackingUrl ? (
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[12px] font-bold text-primary underline"
                    >
                      Live rider track
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-on-surface-variant">
                  Rider assigns when kitchen Accepts
                </p>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-4">
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-on-surface-variant">
                <MaterialIcon name="map" className="text-[18px] text-primary" />
                Live route
              </div>
              <div className="flex h-28 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#e8eef5,#f5f5f5)]">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg ring-4 ring-white">
                    <MaterialIcon name="restaurant" className="text-[20px]" />
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-primary">Kitchen → You</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-border/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Shiprocket food delivery
              </p>
              <ul className="mt-2 space-y-1.5 text-[12px] text-on-surface-variant">
                <li>
                  Radius · up to <span className="font-semibold text-foreground">50 km</span> hyperlocal
                </li>
                <li>
                  ETA window · <span className="font-semibold text-foreground">10–60 min</span> after rider assign
                </li>
                <li>
                  Vehicle · <span className="font-semibold text-foreground">2-wheeler</span> (meals ≤20 kg)
                </li>
                {order.deliveryPincode ? (
                  <li>
                    Drop pincode ·{" "}
                    <span className="font-semibold tabular text-foreground">{order.deliveryPincode}</span>
                  </li>
                ) : null}
                {order.deliveryFeePaise != null ? (
                  <li>
                    Delivery fee ·{" "}
                    <span className="font-semibold tabular text-foreground">
                      {order.deliveryFeePaise === 0 ? "FREE" : formatInr(order.deliveryFeePaise)}
                    </span>
                  </li>
                ) : null}
                {shipment?.trackingUrl ? (
                  <li>
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-primary underline"
                    >
                      Open Shiprocket live track
                    </a>
                  </li>
                ) : (
                  <li>Live track link appears after kitchen Accept + AWB</li>
                )}
              </ul>
            </div>

            <ol className="space-y-0 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-border/50">
              {STEPS.map((step, i) => {
                const done = currentRank >= i && currentRank !== -1;
                const active = rankOf(order.status) === i;
                return (
                  <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < STEPS.length - 1 ? (
                      <span
                        className={`absolute left-[7px] top-4 h-[calc(100%-8px)] w-0.5 ${
                          done ? "bg-primary" : "bg-border"
                        }`}
                      />
                    ) : null}
                    <span
                      className={`relative z-10 mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                        active
                          ? "border-primary bg-primary"
                          : done
                            ? "border-primary bg-primary"
                            : "border-border bg-surface-container-lowest"
                      }`}
                    />
                    <div>
                      <p
                        className={`text-[14px] font-semibold ${
                          active ? "text-primary" : done ? "text-foreground" : "text-on-surface-variant"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant">Loading…</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {order ? (
            <Button variant="secondary" className="pressable" asChild>
              <Link href={`/r/${order.restaurantId}/menu`}>Reorder from this kitchen</Link>
            </Button>
          ) : null}
          <Button variant="outline" className="pressable" asChild>
            <Link href="/orders">All orders</Link>
          </Button>
          <Button variant="ghost" className="pressable" asChild>
            <Link href="/hub">Place another order</Link>
          </Button>
        </div>
      </main>

      {/* g12 — Order confirmed celebration */}
      {celebrate && order ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/55 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-confirmed-title"
        >
          <div className="sheet-spring w-full max-w-md rounded-t-[28px] bg-surface-container-lowest p-6 pb-safe shadow-2xl sm:rounded-[28px]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <MaterialIcon name="check_circle" className="text-[40px] [font-variation-settings:'FILL'_1]" />
            </div>
            <h2
              id="order-confirmed-title"
              className="text-center font-display text-[26px] font-extrabold tracking-tight"
            >
              Order confirmed
            </h2>
            <p className="mt-2 text-center text-[14px] text-on-surface-variant">
              Bill synced to D&apos;aMigo Food WhatsApp · live track below
            </p>
            <p className="mt-4 text-center font-display text-[22px] font-bold tabular text-primary">
              {formatInr(order.totalPaise)}
            </p>
            <Button className="pressable mt-5 w-full" type="button" onClick={dismissCelebrate}>
              Track order
            </Button>
            <Button
              variant="ghost"
              className="pressable mt-1 w-full"
              type="button"
              asChild
            >
              <Link href="/hub" onClick={dismissCelebrate}>
                Order again
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
