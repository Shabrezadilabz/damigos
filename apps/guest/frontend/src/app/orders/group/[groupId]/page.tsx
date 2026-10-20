"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { WaChrome } from "@/components/wa-chrome";
import {
  fetchOrderGroup,
  formatInr,
  type CheckoutGroupTrack,
} from "@/lib/api";
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

/** P15-T13 — Cross-By group track with [1st|2nd] leg toggler */
export default function OrderGroupTrackPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const [groupId, setGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<CheckoutGroupTrack | null>(null);
  const [leg, setLeg] = useState(0);
  const [detail, setDetail] = useState<{
    status: string;
    totalPaise: number;
    discountPaise?: number;
    deliveryFeePaise?: number;
    deliveryPincode?: string | null;
    restaurantId: string;
    prepDeadlineAt?: string | null;
    committedPrepMinutes?: number | null;
    extendedPrepMinutes?: number | null;
  } | null>(null);
  const [shipment, setShipment] = useState<{
    awb: string | null;
    carrier: string;
    trackingUrl?: string | null;
    lastTrackingStatus?: string | null;
    foodDelivery?: boolean;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void params.then((p) => setGroupId(p.groupId));
  }, [params]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!groupId || !getGuestToken()) return;
    const load = () =>
      fetchOrderGroup(groupId)
        .then(setGroup)
        .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(id);
  }, [groupId]);

  const legs = useMemo(() => {
    if (!group) return [];
    return [...group.orders].sort((a, b) => (a.legIndex ?? 0) - (b.legIndex ?? 0));
  }, [group]);

  const viewing = legs[leg] ?? legs[0];

  useEffect(() => {
    if (!viewing) return;
    const base = process.env.NEXT_PUBLIC_GUEST_API_URL ?? "http://localhost:4000";
    const load = () =>
      fetch(`${base}/v1/orders/${viewing.id}`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((d) => {
          setDetail(d.order);
          setShipment(d.shipment ?? null);
        })
        .catch(() => setDetail(null));
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(id);
  }, [viewing?.id]);

  const countdownSec = useMemo(() => {
    if (!detail) return null;
    const inPrep = detail.status === "ACCEPTED" || detail.status === "PREPARING";
    if (!inPrep || !detail.prepDeadlineAt) return null;
    return Math.floor((new Date(detail.prepDeadlineAt).getTime() - now) / 1000);
  }, [detail, now]);

  const currentRank = detail ? rankOf(detail.status) : -1;

  return (
    <>
      <WaChrome title="Cross-By tracking" subtitle="Multi-kitchen · Direct D2C" profileHref="/me" />

      <main className="mx-auto min-h-dvh max-w-lg px-4 pb-10 pt-[7.25rem]">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        {legs.length > 1 ? (
          <div className="mb-4 flex rounded-xl bg-surface-container-low p-1">
            {legs.map((l, i) => (
              <button
                key={l.id}
                type="button"
                className={`pressable flex-1 rounded-lg py-2.5 text-[13px] font-semibold ${
                  leg === i
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant"
                }`}
                onClick={() => setLeg(i)}
              >
                {i === 0 ? "1st Order" : "2nd Order"}
              </button>
            ))}
          </div>
        ) : null}

        {group ? (
          <p className="mb-3 text-[12px] text-on-surface-variant">
            Rider: <span className="font-semibold text-foreground">{group.group.riderMode}</span>
            {group.group.distanceMeters != null
              ? ` · ${(group.group.distanceMeters / 1000).toFixed(1)} km`
              : ""}
          </p>
        ) : null}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[24px] font-bold tracking-tight">Live tracking</h1>
            <p className="mt-0.5 text-[12px] text-on-surface-variant">
              Leg {viewing?.legIndex ?? leg + 1} · independent kitchen timer
            </p>
          </div>
          {countdownSec != null ? (
            <div className="rounded-2xl bg-inverse-surface px-3 py-2 text-center text-inverse-on-surface">
              <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary-fixed-dim">
                Prep SLA
              </p>
              <p
                className={`font-display text-[22px] font-bold tabular ${
                  countdownSec < 0 ? "text-red-300" : "text-white"
                }`}
              >
                {countdownSec < 0
                  ? `+${formatCountdown(-countdownSec)}`
                  : formatCountdown(countdownSec)}
              </p>
            </div>
          ) : null}
        </div>

        {detail ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-border/50">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-primary">
                  {detail.status.replace(/_/g, " ")}
                </span>
                <span className="text-[15px] font-bold tabular">{formatInr(detail.totalPaise)}</span>
              </div>
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

            <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-border/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Shiprocket food delivery
              </p>
              <ul className="mt-2 space-y-1.5 text-[12px] text-on-surface-variant">
                <li>
                  Radius · up to <span className="font-semibold text-foreground">50 km</span> hyperlocal
                </li>
                <li>
                  ETA · <span className="font-semibold text-foreground">10–60 min</span> after rider assign
                </li>
                <li>
                  Vehicle · <span className="font-semibold text-foreground">2-wheeler</span> (meals ≤20 kg)
                </li>
                {detail.deliveryPincode ? (
                  <li>
                    Drop pincode ·{" "}
                    <span className="font-semibold tabular text-foreground">{detail.deliveryPincode}</span>
                  </li>
                ) : null}
                {detail.deliveryFeePaise != null ? (
                  <li>
                    Delivery fee ·{" "}
                    <span className="font-semibold tabular text-foreground">
                      {detail.deliveryFeePaise === 0 ? "FREE" : formatInr(detail.deliveryFeePaise)}
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
                  <li>Live track after kitchen Accept + AWB</li>
                )}
              </ul>
            </div>

            <ol className="space-y-0 rounded-2xl bg-surface-container-lowest p-4 shadow-sm ring-1 ring-border/50">
              {STEPS.map((step, i) => {
                const done = currentRank >= i && currentRank !== -1;
                const active = rankOf(detail.status) === i;
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
                        active || done
                          ? "border-primary bg-primary"
                          : "border-border bg-surface-container-lowest"
                      }`}
                    />
                    <p
                      className={`text-[14px] font-semibold ${
                        active ? "text-primary" : done ? "text-foreground" : "text-on-surface-variant"
                      }`}
                    >
                      {step.label}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="mt-4 text-sm text-on-surface-variant">Loading…</p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <Button className="pressable" asChild>
            <Link href="/hub">Place another order</Link>
          </Button>
          <Button variant="outline" className="pressable" asChild>
            <Link href="/orders">All orders</Link>
          </Button>
        </div>
      </main>
    </>
  );
}
