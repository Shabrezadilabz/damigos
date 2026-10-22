"use client";

import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { formatInr, type CrmWalletLedgerRow } from "@/lib/api";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="shrink-0 text-xs text-on-surface-variant">{label}</dt>
      <dd className="break-all font-mono text-xs font-semibold text-on-surface sm:text-right">{value}</dd>
    </div>
  );
}

export function WalletTxnDetailDialog({
  open,
  onClose,
  row,
}: {
  open: boolean;
  onClose: () => void;
  row: CrmWalletLedgerRow | null;
}) {
  if (!open || !row) return null;
  const m = row.meta ?? {};
  const credit = row.amountPaise >= 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      data-testid="wallet-txn-detail-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold capitalize text-on-surface">
              {row.kind.replace(/_/g, " ")}
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {new Date(row.createdAt).toLocaleString("en-IN")}
            </p>
          </div>
          <button type="button" className="rounded-lg p-2 hover:bg-surface-container-high" onClick={onClose}>
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Amount</p>
            <p
              className={`mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums ${
                credit ? "text-[#24963F]" : "text-primary"
              }`}
            >
              {credit ? "+" : ""}
              {formatInr(row.amountPaise)}
            </p>
            {m.note ? <p className="mt-1 text-xs text-on-surface-variant">{m.note}</p> : null}
          </div>

          <dl className="space-y-2.5 rounded-xl border border-outline-variant/40 p-4">
            <Row label="Ledger ID" value={row.id} />
            <Row label="Reference" value={row.reference} />
            <Row label="Payment method" value={m.paymentMethod} />
            <Row label="Order ID" value={m.orderId ?? m.razorpayOrderId} />
            <Row label="Transaction ID" value={m.transactionId ?? m.razorpayPaymentId} />
            <Row label="UTR / payment ref" value={m.utr} />
            <Row label="Razorpay order" value={m.razorpayOrderId} />
            <Row label="Razorpay payment" value={m.razorpayPaymentId} />
            <Row label="Batch code" value={m.batchCode} />
            <Row label="Batch ID" value={m.batchId} />
            <Row label="Design" value={m.designName} />
            <Row label="Quantity" value={m.quantity != null ? String(m.quantity) : null} />
            <Row label="Stickers" value={m.stickersPaise != null ? formatInr(m.stickersPaise) : null} />
            <Row label="Delivery" value={m.deliveryPaise != null ? formatInr(m.deliveryPaise) : null} />
            <Row label="GST" value={m.gstPaise != null ? formatInr(m.gstPaise) : null} />
            <Row label="Quoted total" value={m.totalPaise != null ? formatInr(m.totalPaise) : null} />
          </dl>
        </div>

        <div className="flex justify-end border-t border-outline-variant/40 px-5 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
