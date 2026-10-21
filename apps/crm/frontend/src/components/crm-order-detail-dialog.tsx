"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import { formatInr, type CrmOrder } from "@/lib/api";
import { resolveMenuItemImageUrl } from "@/lib/menu-item-thumb";
import { cn } from "@/lib/utils";

function orderDisplayId(id: string) {
  return `#DM-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

function statusLabel(status: string) {
  if (["PAID", "ACCEPTED", "PREPARING"].includes(status)) return "Preparing";
  if (status === "READY" || status === "DELIVERED") return "Served";
  if (status === "CLOSED") return "Paid & Settled";
  if (status === "DISPATCHED") return "Out for delivery";
  return status.replace(/_/g, " ");
}

type Props = {
  order: CrmOrder | null;
  onClose: () => void;
};

export function CrmOrderDetailDialog({ order, onClose }: Props) {
  if (!order) return null;

  const guest = order.customerPhoneLast4 ? `+91 ••••${order.customerPhoneLast4}` : "WhatsApp guest";
  const preparing = ["PAID", "ACCEPTED", "PREPARING", "DISPATCHED"].includes(order.status);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-order-detail-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Order details</p>
            <h2
              id="crm-order-detail-title"
              className="font-[family-name:var(--font-display)] text-xl font-bold"
            >
              {orderDisplayId(order.id)}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {new Date(order.createdAt).toLocaleString("en-IN")} · Direct checkout
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold",
                preparing ? "bg-primary/10 text-primary" : "bg-[#24963F]/10 text-[#24963F]",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", preparing ? "bg-primary" : "bg-[#24963F]")} />
              {statusLabel(order.status)}
            </span>
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">
              {formatInr(order.totalPaise)}
            </span>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-surface-container-low px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Guest</dt>
              <dd className="mt-0.5 font-semibold">{guest}</dd>
            </div>
            <div className="rounded-xl bg-surface-container-low px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status code</dt>
              <dd className="mt-0.5 font-semibold">{order.status}</dd>
            </div>
            <div className="rounded-xl bg-surface-container-low px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Subtotal</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{formatInr(order.subtotalPaise)}</dd>
            </div>
            <div className="rounded-xl bg-surface-container-low px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Discount</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {order.discountPaise > 0 ? `−${formatInr(order.discountPaise)}` : "—"}
              </dd>
            </div>
            {order.convenienceFeePaise > 0 ? (
              <div className="rounded-xl bg-surface-container-low px-3 py-2 sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Convenience fee
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{formatInr(order.convenienceFeePaise)}</dd>
              </div>
            ) : null}
          </dl>

          <div>
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Items ({order.items.length})
            </h3>
            <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50">
              {order.items.length === 0 ? (
                <li className="px-3 py-3 text-sm text-on-surface-variant">No line items</li>
              ) : (
                order.items.map((line) => {
                  const vegGuess = !/\b(chicken|mutton|lamb|fish|prawn|egg|non[\s-]?veg)\b/i.test(
                    line.name,
                  );
                  const thumb = resolveMenuItemImageUrl(line.name, null, vegGuess);
                  return (
                    <li key={line.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                        <span className="min-w-0">
                          <span className="font-semibold">{line.name}</span>
                          <span className="block text-xs text-on-surface-variant">Qty {line.quantity}</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatInr(line.unitPricePaise * line.quantity)}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {order.shipment ? (
            <div className="rounded-xl bg-surface-container-low px-3 py-3 text-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Delivery</h3>
              <p className="mt-1 font-semibold">
                {order.shipment.carrier || "Carrier"} · {order.shipment.status}
              </p>
              {order.shipment.awb ? (
                <p className="text-xs text-on-surface-variant">AWB {order.shipment.awb}</p>
              ) : null}
              {order.shipment.trackingUrl ? (
                <a
                  href={order.shipment.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  Track shipment
                </a>
              ) : null}
            </div>
          ) : null}

          {(order.committedPrepMinutes || order.prepDeadlineAt) && (
            <div className="rounded-xl bg-surface-container-low px-3 py-3 text-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Kitchen SLA</h3>
              <p className="mt-1">
                Prep {order.committedPrepMinutes ?? "—"} min
                {order.extendedPrepMinutes ? ` (+${order.extendedPrepMinutes} extended)` : ""}
              </p>
              {order.prepDeadlineAt ? (
                <p className="text-xs text-on-surface-variant">
                  Deadline {new Date(order.prepDeadlineAt).toLocaleTimeString("en-IN")}
                </p>
              ) : null}
            </div>
          )}

          <p className="break-all text-[10px] text-on-surface-variant">ID {order.id}</p>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low"
          >
            Close
          </button>
          <Link
            href="/orders/kitchen"
            onClick={onClose}
            className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
          >
            Open kitchen
          </Link>
        </footer>
      </div>
    </div>
  );
}
