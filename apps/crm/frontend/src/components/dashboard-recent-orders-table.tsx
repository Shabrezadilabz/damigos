"use client";

import { useState } from "react";
import { CrmOrderDetailDialog } from "@/components/crm-order-detail-dialog";
import { formatInr, type CrmOrder } from "@/lib/api";
import { cn } from "@/lib/utils";

function orderDisplayId(id: string) {
  return `#DM-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

function relativeWhen(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "short" }).format(new Date(iso));
}

function itemSummary(order: CrmOrder) {
  const n = order.items.length;
  const names = order.items
    .slice(0, 2)
    .map((i) => i.name)
    .join(", ");
  const extra = n > 2 ? ` + ${n - 2}` : "";
  return { count: n, line: names ? `${names}${extra}` : "—" };
}

function statusPill(status: string) {
  const preparing = ["PAID", "ACCEPTED", "PREPARING"].includes(status);
  const served = status === "READY" || status === "DELIVERED";
  const settled = status === "CLOSED";
  const open = preparing || status === "DISPATCHED";
  const label = preparing
    ? "Preparing"
    : served
      ? "Served"
      : settled
        ? "Paid & Settled"
        : status === "DISPATCHED"
          ? "Out for delivery"
          : status.replace(/_/g, " ");
  const green = served || settled;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
        green ? "bg-[#24963F]/10 text-[#24963F]" : open ? "bg-primary/10 text-primary" : "bg-[#24963F]/10 text-[#24963F]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", green ? "bg-[#24963F]" : "bg-primary")} />
      {label}
    </span>
  );
}

export function DashboardRecentOrdersTable({ orders }: { orders: CrmOrder[] }) {
  const [selected, setSelected] = useState<CrmOrder | null>(null);

  return (
    <>
      <CrmOrderDetailDialog order={selected} onClose={() => setSelected(null)} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="rounded-xl bg-surface-container-low/80 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              <th className="rounded-l-xl px-3 py-2.5">Order ID</th>
              <th className="px-3 py-2.5">Table / guest</th>
              <th className="px-3 py-2.5">Items</th>
              <th className="px-3 py-2.5">Amount</th>
              <th className="rounded-r-xl px-3 py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high/40">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-on-surface-variant">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const items = itemSummary(o);
                const guest = o.customerPhoneLast4 ? `+91 ••••${o.customerPhoneLast4}` : "WhatsApp guest";
                return (
                  <tr
                    key={o.id}
                    data-testid="dashboard-order-row"
                    tabIndex={0}
                    role="button"
                    aria-label={`Open order ${orderDisplayId(o.id)}`}
                    onClick={() => setSelected(o)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelected(o);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-surface-container-low/60 focus-visible:bg-surface-container-low/80 focus-visible:outline-none"
                  >
                    <td className="px-3 py-3">
                      <span className="font-[family-name:var(--font-display)] text-sm font-semibold">
                        {orderDisplayId(o.id)}
                      </span>
                      <span className="block text-[10px] font-semibold text-on-surface-variant">
                        {relativeWhen(o.createdAt)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs font-semibold">Direct checkout</div>
                      <div className="text-xs text-on-surface-variant">{guest}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span>{items.count} items</span>
                      <span className="block max-w-[140px] truncate text-xs text-on-surface-variant">
                        {items.line}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold tabular-nums">{formatInr(o.totalPaise)}</td>
                    <td className="px-3 py-3 text-right">{statusPill(o.status)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
