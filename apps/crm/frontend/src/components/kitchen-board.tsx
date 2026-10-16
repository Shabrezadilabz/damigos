"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  acceptCrmOrder,
  fetchCrmOrders,
  formatInr,
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

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  const shortId = order.id.slice(0, 8).toUpperCase();
  const subtotal = order.subtotalPaise ?? order.totalPaise + order.discountPaise;
  const hasDiscount = order.discountPaise > 0;

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
            className="h-11 gap-2 rounded-xl bg-[#24963F] text-white hover:bg-[#1E7D34]"
            disabled={busy}
            onClick={() => act(() => acceptCrmOrder(order.id))}
          >
            Accept
          </Button>
        </div>
      ) : null}

      {column === "prep" ? (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{ width: order.status === "PREPARING" ? "68%" : "35%" }}
            />
          </div>
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
              Mark ready to serve
            </Button>
          )}
        </>
      ) : null}

      {column === "out" ? (
        <>
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

  const reload = useCallback(async () => {
    if (!restaurantId) return;
    const rows = await fetchCrmOrders(restaurantId, true);
    setOrders(rows);
    setError(null);
  }, [restaurantId]);

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
