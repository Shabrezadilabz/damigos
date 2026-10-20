"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  acceptCrmOrder,
  computeWaitingPenaltyPaiseClient,
  extendCrmOrderPrep,
  fetchCrmOrders,
  formatInr,
  markCrmRiderArrived,
  patchCrmOrderStatus,
  type CrmOrder,
} from "@/lib/api";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { getCrmToken } from "@/lib/session";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;
const SSE_RECONNECT_BASE_MS = 2_000;
const SSE_RECONNECT_MAX_MS = 30_000;

function columnFor(status: string): "new" | "prep" | "out" | null {
  if (status === "PAID") return "new";
  if (status === "ACCEPTED" || status === "PREPARING") return "prep";
  if (status === "READY" || status === "DISPATCHED") return "out";
  return null;
}

function VegDot({ veg }: { veg?: boolean }) {
  if (veg === false) {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded border border-primary">
        <span className="h-0 w-0 border-x-[3px] border-b-[6px] border-x-transparent border-b-primary" />
      </span>
    );
  }
  return (
    <span className="flex h-3.5 w-3.5 items-center justify-center rounded border border-[#24963F]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#24963F]" />
    </span>
  );
}

type PrepClock = { deadlineMs: number; baseMin: number; extended: boolean };

function prepFromOrder(order: CrmOrder): PrepClock | null {
  if (!order.prepDeadlineAt) return null;
  return {
    deadlineMs: new Date(order.prepDeadlineAt).getTime(),
    baseMin: order.committedPrepMinutes ?? 15,
    extended: (order.extendedPrepMinutes ?? 0) > 0,
  };
}

function formatMmSs(totalSec: number) {
  const neg = totalSec < 0;
  const abs = Math.abs(totalSec);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${neg ? "+" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function OrderCard({
  order,
  column,
  onRefresh,
}: {
  order: CrmOrder;
  column: "new" | "prep" | "out";
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const prep = prepFromOrder(order);

  useEffect(() => {
    if (column !== "prep" && column !== "new") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [column]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  const acceptPrepMin: 10 | 15 =
    order.suggestedPrepMinutes === 10 || order.suggestedPrepMinutes === 15
      ? order.suggestedPrepMinutes
      : order.committedPrepMinutes === 10
        ? 10
        : 15;

  async function onAccept() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(20);
    await act(() => acceptCrmOrder(order.id, acceptPrepMin));
  }

  async function onExtend5() {
    if (!prep || prep.extended) return;
    const remaining = prep.deadlineMs - Date.now();
    if (remaining <= 3 * 60_000) return;
    await act(() => extendCrmOrderPrep(order.id));
  }

  const shortId = order.id.slice(0, 8).toUpperCase();
  const subtotal = order.subtotalPaise ?? order.totalPaise + order.discountPaise;
  const hasDiscount = order.discountPaise > 0;
  const remainSec = prep ? Math.floor((prep.deadlineMs - now) / 1000) : null;

  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-surface-container-lowest p-5 shadow-md transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-on-surface">
              #{shortId}
            </p>
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              WhatsApp
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
            <MaterialIcon name="timer" className="text-[15px] text-primary" />
            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            <span>•</span>
            <span className="font-semibold text-on-surface">
              {order.customerPhoneLast4 ? `Guest ••••${order.customerPhoneLast4}` : "Guest"}
            </span>
          </p>
        </div>
        {hasDiscount ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-surface-dim px-2.5 py-1 text-[10px] font-semibold shadow-sm">
            <MaterialIcon name="stars" className="text-[15px] text-tertiary-container [font-variation-settings:'FILL'_1]" />
            <span>Reward applied</span>
          </div>
        ) : (
          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">{order.status}</span>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3">
        {order.items.map((line) => (
          <div key={line.id} className="flex items-center justify-between text-sm text-on-surface">
            <div className="flex items-center gap-2">
              <VegDot />
              <span>
                {line.quantity}× {line.name}
              </span>
            </div>
            <span className="font-semibold tabular-nums">{formatInr(line.unitPricePaise * line.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-on-surface-variant">
          {order.items.length} items · Total
        </span>
        <div className="flex items-baseline gap-1">
          {hasDiscount ? (
            <span className="text-xs text-on-surface-variant line-through">{formatInr(subtotal)}</span>
          ) : null}
          <span className="text-lg font-bold text-primary tabular-nums">{formatInr(order.totalPaise)}</span>
        </div>
      </div>

      {column === "new" ? (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-11 rounded-xl border-0 bg-surface-container-high text-on-surface-variant hover:bg-error-container hover:text-on-error-container"
            disabled={busy}
            onClick={() => act(() => patchCrmOrderStatus(order.id, "CANCELLED"))}
          >
            Reject
          </Button>
          <Button
            size="sm"
            className="h-11 gap-1 rounded-xl bg-[#24963F] text-white hover:bg-[#1E7D34]"
            disabled={busy}
            onClick={() => void onAccept()}
          >
            Accept
            <span className="text-[10px] font-semibold opacity-90">
              {acceptPrepMin}m + rider
            </span>
          </Button>
        </div>
      ) : null}

      {order.shipment ? (
        <div className="rounded-xl bg-sky-50 px-3 py-2.5 ring-1 ring-sky-200">
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
            {order.shipment.foodDelivery !== false
              ? "Food delivery · Shiprocket"
              : "Shiprocket"}
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-sky-950">
            {order.shipment.carrier}
            {order.shipment.awb ? (
              <span className="ml-1 font-mono text-[11px]">· {order.shipment.awb}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-[11px] text-sky-900/80">
            {order.shipment.lastTrackingStatus ?? order.shipment.status}
          </p>
          <p className="mt-1 text-[10px] text-sky-800/90">
            Limits · ≤50 km · 2-wheeler meals · ETA 10–60 min after AWB
          </p>
          {order.shipment.trackingUrl ? (
            <a
              href={order.shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[11px] font-bold text-primary underline"
            >
              Live rider track
            </a>
          ) : null}
        </div>
      ) : null}

      {column === "prep" ? (
        <>
          {remainSec != null ? (
            <div className="flex items-center justify-between rounded-xl bg-inverse-surface px-3 py-2.5 text-inverse-on-surface">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-tertiary-fixed-dim">
                  Prep SLA {prep?.baseMin ?? 15}m{prep?.extended ? " +5" : ""}
                </p>
                <p
                  className={`font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums ${
                    remainSec < 0 ? "text-red-300" : "text-white"
                  }`}
                >
                  {formatMmSs(remainSec)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-10 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20"
                disabled={!prep || prep.extended || remainSec <= 180 || busy}
                onClick={() => void onExtend5()}
                title="One-time +5 min before T-3m"
              >
                +5 min
              </Button>
            </div>
          ) : null}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{
                width:
                  remainSec == null
                    ? order.status === "PREPARING"
                      ? "68%"
                      : "35%"
                    : `${Math.max(5, Math.min(100, 100 - (remainSec / ((prep?.baseMin ?? 15) * 60)) * 100))}%`,
              }}
            />
          </div>
          {order.riderArrivedAt && !order.readyForPickupAt ? (
            <div className="rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Rider waiting · ₹2/min after grace
              </p>
              {(() => {
                const w = computeWaitingPenaltyPaiseClient({
                  riderArrivedAt: order.riderArrivedAt,
                  readyForPickupAt: order.readyForPickupAt,
                  committedPrepMinutes: order.committedPrepMinutes,
                  extendedPrepMinutes: order.extendedPrepMinutes,
                  nowMs: now,
                });
                return (
                  <p className="mt-0.5 font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-amber-950">
                    {formatInr(w.penaltyPaise)}
                    <span className="ml-2 text-[11px] font-semibold text-amber-800/80">
                      {w.overtimeMin > 0
                        ? `${w.overtimeMin}m overtime`
                        : `grace ${w.graceMin}m`}
                    </span>
                  </p>
                );
              })()}
            </div>
          ) : !order.riderArrivedAt ? (
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-full rounded-xl"
              disabled={busy}
              onClick={() => act(() => markCrmRiderArrived(order.id))}
              data-testid="kitchen-rider-arrived"
            >
              Rider at pickup
            </Button>
          ) : null}

          {order.status === "ACCEPTED" ? (
            <Button
              size="sm"
              className="h-11 w-full gap-2 rounded-xl bg-secondary text-white hover:bg-primary"
              disabled={busy}
              onClick={() => act(() => patchCrmOrderStatus(order.id, "PREPARING"))}
            >
              Start prep
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-11 w-full gap-2 rounded-xl bg-secondary text-white hover:bg-primary"
              disabled={busy}
              onClick={() => act(() => patchCrmOrderStatus(order.id, "READY"))}
            >
              Mark ready for pickup
            </Button>
          )}
        </>
      ) : null}

      {column === "out" ? (
        <>
          {(order.waitingPenaltyPaise ?? 0) > 0 ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Waiting penalty settled: {formatInr(order.waitingPenaltyPaise!)}
            </p>
          ) : null}
          {order.status === "READY" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-11 w-full rounded-xl"
              disabled={busy}
              onClick={() => act(() => patchCrmOrderStatus(order.id, "DISPATCHED"))}
            >
              Out for delivery
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              className="h-11 w-full gap-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest"
              disabled={busy}
              onClick={() => act(() => patchCrmOrderStatus(order.id, "DELIVERED"))}
            >
              Confirm handover
            </Button>
          )}
        </>
      ) : null}

      {order.status !== "PAID" ? (
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
          {order.status}
        </p>
      ) : null}
    </article>
  );
}

function Column({
  title,
  badge,
  dotClass,
  orders,
  column,
  onRefresh,
}: {
  title: string;
  badge: string;
  dotClass: string;
  orders: CrmOrder[];
  column: "new" | "prep" | "out";
  onRefresh: () => Promise<void>;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className={cn("h-3 w-3 rounded-full", dotClass)} />
          <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight">{title}</h2>
          <span className="rounded-full bg-primary-fixed px-2 py-0.5 text-[10px] font-bold text-on-primary-fixed">
            {orders.length} {badge}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} column={column} onRefresh={onRefresh} />
        ))}
        {!orders.length && <p className="px-2 text-xs text-on-surface-variant">No orders in this lane</p>}
      </div>
    </section>
  );
}

type KitchenConnection = "live" | "reconnecting" | "polling";

export function KitchenBoard({
  chrome = "legacy",
  hideTopBar = false,
  onConnectionLabel,
  registerRefresh,
}: {
  chrome?: "legacy" | "stitch";
  hideTopBar?: boolean;
  onConnectionLabel?: (label: string) => void;
  registerRefresh?: (fn: () => void) => void;
}) {
  const { restaurantId, loading: ctxLoading } = useCrmRestaurant();
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<KitchenConnection>("polling");
  const [prevPaidCount, setPrevPaidCount] = useState<number | null>(null);

  const reload = useCallback(async () => {
    if (!restaurantId) return;
    const rows = await fetchCrmOrders(restaurantId, true);
    setOrders(rows);
    setError(null);
  }, [restaurantId]);

  useEffect(() => {
    const paid = orders.filter((o) => o.status === "PAID").length;
    if (prevPaidCount != null && paid > prevPaidCount) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([40, 60, 40]);
      } catch {
        /* ignore audio errors */
      }
    }
    setPrevPaidCount(paid);
  }, [orders, prevPaidCount]);

  useEffect(() => {
    registerRefresh?.(() => {
      void reload();
    });
  }, [registerRefresh, reload]);

  useEffect(() => {
    const label =
      connection === "live"
        ? "WhatsApp live webhook: Connected · SSE active · poll fallback 60s"
        : connection === "reconnecting"
          ? "Reconnecting SSE… · poll fallback 60s"
          : "Poll only (60s) — log in for live SSE";
    onConnectionLabel?.(label);
  }, [connection, onConnectionLabel]);

  useEffect(() => {
    if (!restaurantId) return;
    const rid = restaurantId;
    void reload().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
    const pollId = window.setInterval(() => {
      void reload().catch(() => undefined);
    }, POLL_MS);

    const token = getCrmToken();
    const base = process.env.NEXT_PUBLIC_CRM_API_URL ?? "http://localhost:4001";
    let es: EventSource | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempt = 0;
    let cancelled = false;

    function connectSse() {
      const authToken = token;
      if (!authToken || cancelled) return;
      es?.close();
      const url = `${base}/v1/kitchen/stream?restaurantId=${encodeURIComponent(rid)}&token=${encodeURIComponent(authToken)}`;
      es = new EventSource(url);
      es.addEventListener("connected", () => {
        reconnectAttempt = 0;
        setConnection("live");
      });
      es.addEventListener("refresh", () => {
        void reload().catch(() => undefined);
      });
      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        setConnection("reconnecting");
        const delay = Math.min(SSE_RECONNECT_MAX_MS, SSE_RECONNECT_BASE_MS * 2 ** reconnectAttempt);
        reconnectAttempt += 1;
        reconnectTimer = window.setTimeout(connectSse, delay);
      };
    }

    if (token) {
      connectSse();
    } else {
      setConnection("polling");
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [restaurantId, reload]);

  if (ctxLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  if (!restaurantId) {
    return <p className="text-sm text-red-700">Log in as restaurant staff to view kitchen orders.</p>;
  }

  const cols = { new: [] as CrmOrder[], prep: [] as CrmOrder[], out: [] as CrmOrder[] };
  for (const o of orders) {
    const c = columnFor(o.status);
    if (c) cols[c].push(o);
  }

  const archivedPeek = orders.slice(0, 4);

  return (
    <div className="space-y-4">
      {!hideTopBar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-foreground/60" data-testid="kitchen-connection-status">
            {connection === "live" && "Live (SSE) · poll fallback 60s"}
            {connection === "reconnecting" && "Reconnecting SSE… · poll fallback 60s"}
            {connection === "polling" && "Poll only (60s) — log in for live SSE"}
          </p>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            Refresh now
          </Button>
        </div>
      )}
      {hideTopBar && chrome === "stitch" ? (
        <p className="sr-only" data-testid="kitchen-connection-status">
          {connection === "live" && "Live (SSE) · poll fallback 60s"}
          {connection === "reconnecting" && "Reconnecting SSE… · poll fallback 60s"}
          {connection === "polling" && "Poll only (60s) — log in for live SSE"}
        </p>
      ) : null}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {chrome === "stitch" ? (
        <div className="relative">
          <div className="pointer-events-none absolute -top-3 left-0 right-0 flex h-44 select-none flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low/60 p-4 opacity-35">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <span className="flex items-center gap-1">
                <MaterialIcon name="archive" className="text-[14px]" />
                Archived dispatches (peek)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 text-left text-xs text-on-surface-variant lg:grid-cols-4">
              {archivedPeek.map((o) => (
                <div key={o.id} className="truncate">
                  #{o.id.slice(0, 8).toUpperCase()} · {formatInr(o.totalPaise)} · {o.status}
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-1 items-start gap-6 pt-6 lg:grid-cols-3">
            <Column
              title="New orders"
              badge="incoming"
              dotClass="animate-ping bg-primary"
              orders={cols.new}
              column="new"
              onRefresh={reload}
            />
            <Column
              title="Preparing"
              badge="cooking"
              dotClass="bg-secondary"
              orders={cols.prep}
              column="prep"
              onRefresh={reload}
            />
            <Column
              title="Out for delivery"
              badge="active"
              dotClass="bg-tertiary-container"
              orders={cols.out}
              column="out"
              onRefresh={reload}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <Column
            title="New"
            badge=""
            dotClass="bg-primary"
            orders={cols.new}
            column="new"
            onRefresh={reload}
          />
          <Column
            title="Preparing"
            badge=""
            dotClass="bg-secondary"
            orders={cols.prep}
            column="prep"
            onRefresh={reload}
          />
          <Column
            title="Out"
            badge=""
            dotClass="bg-tertiary"
            orders={cols.out}
            column="out"
            onRefresh={reload}
          />
        </div>
      )}
    </div>
  );
}
