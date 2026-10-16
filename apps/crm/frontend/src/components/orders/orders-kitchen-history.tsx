"use client";

import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { fetchCrmOrders, formatInr, type CrmOrder } from "@/lib/api";

const DONE = new Set(["DELIVERED", "CLOSED", "CANCELLED"]);

export function OrdersKitchenHistory({ restaurantId }: { restaurantId: string }) {
  const [rows, setRows] = useState<CrmOrder[]>([]);

  useEffect(() => {
    void fetchCrmOrders(restaurantId, false, 24)
      .then((all) => setRows(all.filter((o) => DONE.has(o.status)).slice(0, 8)))
      .catch(() => setRows([]));
  }, [restaurantId]);

  return (
    <section
      id="orders-history-section"
      className="flex flex-col gap-3 rounded-2xl bg-surface-container-lowest p-5 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MaterialIcon name="table_rows" className="text-[20px] text-secondary" />
          <h4 className="font-[family-name:var(--font-display)] text-base font-semibold text-on-surface">
            Past completed dispatches
          </h4>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Recent
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              <th className="rounded-l-lg px-4 py-2.5">Order</th>
              <th className="px-4 py-2.5">Guest</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Items</th>
              <th className="rounded-r-lg px-4 py-2.5 text-right">Settled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container text-on-surface">
            {rows.map((o) => (
              <tr key={o.id} className="hover:bg-surface-container-low/50">
                <td className="px-4 py-3 font-mono text-sm font-semibold">#{o.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-3">{o.customerPhoneLast4 ? `••••${o.customerPhoneLast4}` : "Guest"}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-surface-container px-2 py-0.5 text-[10px] font-semibold uppercase text-on-surface-variant">
                    {o.status}
                  </span>
                </td>
                <td className="max-w-[240px] truncate px-4 py-3 text-on-surface-variant">
                  {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatInr(o.totalPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? (
        <p className="text-sm text-on-surface-variant">No completed orders yet this shift.</p>
      ) : null}
    </section>
  );
}
