"use client";

import { Button } from "@/components/ui/button";
import { formatInr, type CrmCustomerDetail } from "@/lib/api";

type Props = {
  detail: CrmCustomerDetail;
  onClose: () => void;
};

function OptBadge({ label, value }: { label: string; value: boolean | null }) {
  if (value === null) {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/60">
        {label}: unknown
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        value ? "bg-emerald-100 text-emerald-900" : "bg-muted text-foreground/60"
      }`}
    >
      {label}: {value ? "Yes" : "No"}
    </span>
  );
}

export function GrowCustomerDrawer({ detail, onClose }: Props) {
  const { customer, recentOrders } = detail;

  return (
    <div
      role="dialog"
      aria-labelledby="grow-customer-drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-xl">
        <header className="border-b border-border px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="grow-customer-drawer-title" className="font-semibold">
                {customer.name ?? "Guest"}
              </h2>
              <p className="text-sm text-foreground/60">{customer.phoneMasked}</p>
            </div>
            <button type="button" className="text-sm text-foreground/60 hover:text-foreground" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <OptBadge label="Marketing" value={customer.marketingOptIn} />
            <OptBadge label="Game" value={customer.gameOptIn} />
          </div>
          <p className="mt-2 text-xs text-foreground/55">
            {customer.orderCount} order(s) · {customer.activeRewardClaims} active reward(s)
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-foreground/50">Recent orders</h3>
          <ul className="mt-2 space-y-2" data-testid="customer-recent-orders">
            {recentOrders.map((o) => (
              <li key={o.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-mono text-xs text-primary">#{o.id.slice(0, 8)}</span>
                  <span className="text-xs uppercase text-foreground/60">{o.status}</span>
                </div>
                <p className="mt-1 tabular-nums font-medium">{formatInr(o.totalPaise)}</p>
                <p className="text-xs text-foreground/55">{new Date(o.createdAt).toLocaleString("en-IN")}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-foreground/45">
            WhatsApp message timeline and scan history — coming in a later pilot release.
          </p>
        </div>

        <footer className="border-t border-border p-4">
          <Button type="button" variant="outline" className="w-full" onClick={onClose}>
            Done
          </Button>
        </footer>
      </div>
    </div>
  );
}
