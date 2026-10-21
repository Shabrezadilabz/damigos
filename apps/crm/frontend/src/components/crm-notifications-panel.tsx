"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { fetchCrmOrders, formatInr, type CrmOrder } from "@/lib/api";
import { subscribeCrmRefresh } from "@/lib/crm-refresh-bus";

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: string | null;
};

export function CrmNotificationsPanel({ open, onClose, restaurantId }: Props) {
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !restaurantId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCrmOrders(restaurantId, true)
      .then((rows) => {
        if (!cancelled) setOrders(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load alerts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId]);

  useEffect(() => {
    if (!open || !restaurantId) return;
    return subscribeCrmRefresh(() => {
      void fetchCrmOrders(restaurantId, true)
        .then(setOrders)
        .catch(() => undefined);
    });
  }, [open, restaurantId]);

  if (!open) return null;

  const waiting = orders.filter((o) => o.status === "PAID");
  const cooking = orders.filter((o) => o.status === "ACCEPTED" || o.status === "PREPARING");

  return (
    <>
      <button type="button" className="fixed inset-0 z-[55] cursor-default" aria-label="Close notifications" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Notifications"
        className="absolute right-0 top-11 z-[56] w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border/60 bg-background shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <span className="text-sm font-semibold">Kitchen alerts</span>
          <Link
            href="/orders/kitchen"
            className="text-[11px] font-bold uppercase tracking-wider text-primary hover:underline"
            onClick={onClose}
          >
            Open board
          </Link>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!restaurantId ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant">Sign in to see alerts.</p>
          ) : loading ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant">Loading…</p>
          ) : error ? (
            <p className="px-4 py-6 text-sm text-red-700">{error}</p>
          ) : !orders.length ? (
            <p className="px-4 py-6 text-sm text-on-surface-variant">No active kitchen orders.</p>
          ) : (
            <ul className="flex flex-col">
              {waiting.map((o) => (
                <li key={o.id} className="border-b border-border/40 last:border-0">
                  <Link
                    href="/orders/kitchen"
                    onClick={onClose}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low"
                  >
                    <MaterialIcon name="notifications_active" className="mt-0.5 text-[18px] text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">New paid · #{o.id.slice(0, 8)}</span>
                      <span className="text-[11px] text-on-surface-variant">
                        Accept on kitchen · {formatInr(o.totalPaise)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {cooking.map((o) => (
                <li key={o.id} className="border-b border-border/40 last:border-0">
                  <Link
                    href="/orders/kitchen"
                    onClick={onClose}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low"
                  >
                    <MaterialIcon name="skillet" className="mt-0.5 text-[18px] text-on-surface-variant" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {o.status} · #{o.id.slice(0, 8)}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">{formatInr(o.totalPaise)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
