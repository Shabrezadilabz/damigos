"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchCrmOrders, formatInr, type CrmOrder } from "@/lib/api";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

/** C-05.01 order list */
export function OrdersList({ embedded = false }: { embedded?: boolean }) {
  const { restaurantId, loading: ctxLoading } = useCrmRestaurant();
  const [orders, setOrders] = useState<CrmOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    void fetchCrmOrders(restaurantId, false)
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [restaurantId]);

  if (ctxLoading) return <p className="text-sm text-foreground/60">Loading…</p>;
  if (!restaurantId) {
    return <p className="text-sm text-red-700">No restaurant on session.</p>;
  }

  return (
    <div className={embedded ? "space-y-2" : "mt-4 space-y-2"}>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-outline-variant/30 bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <tr>
              <th className="px-3 py-2">Order</th>
              <th className="px-3 py-2">Guest</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Discount</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">When</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/50">
                <td className="px-3 py-2 font-mono text-xs font-semibold">#{o.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-3 py-2">{o.customerPhoneLast4 ? `••••${o.customerPhoneLast4}` : "—"}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2 tabular-nums">
                  {o.discountPaise > 0 ? `−${formatInr(o.discountPaise)}` : "—"}
                </td>
                <td className="px-3 py-2">{formatInr(o.totalPaise)}</td>
                <td className="px-3 py-2 text-foreground/70">
                  {new Date(o.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!orders.length && !error && (
        <p className="text-sm text-on-surface-variant">No orders yet — place a guest mock checkout first.</p>
      )}
      {!embedded ? (
        <Button variant="outline" size="sm" asChild>
          <Link href="/orders/kitchen">Open kitchen board</Link>
        </Button>
      ) : null}
    </div>
  );
}
