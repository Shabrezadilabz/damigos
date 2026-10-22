"use client";

import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/api";
import { quoteStickerPrint } from "@/lib/sticker-print-pricing";

export type StickerPayMethod = "wallet" | "external";

export function StickerPrintPaymentDialog({
  open,
  onClose,
  onConfirmPay,
  quantity,
  batchCode,
  designName,
  busy,
  error,
  walletBalancePaise,
  walletSpendablePaise,
  minBalancePaise = 100_000,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmPay: (method: StickerPayMethod) => void;
  quantity: number;
  batchCode: string;
  designName: string;
  busy?: boolean;
  error?: string | null;
  walletBalancePaise?: number | null;
  walletSpendablePaise?: number | null;
  minBalancePaise?: number;
}) {
  if (!open) return null;

  const quote = quoteStickerPrint(quantity);
  const gstPct = Math.round(quote.gstRate * 100);
  const balance = walletBalancePaise ?? 0;
  const spendable =
    walletSpendablePaise ?? Math.max(0, balance - minBalancePaise);
  const canUseWallet = spendable >= quote.totalPaise && balance - quote.totalPaise >= minBalancePaise;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      data-testid="sticker-print-payment-dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Pay for print &amp; ship</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Batch <span className="font-mono font-bold">{batchCode}</span>
              {" · "}
              {designName}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-surface-container-high disabled:opacity-40"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <MaterialIcon name="close" className="text-[22px]" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-surface-container-low p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Bill summary
            </p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">
                  Stickers · {quote.quantity} × {formatInr(quote.unitPaise)}
                </dt>
                <dd className="font-semibold tabular-nums text-on-surface">
                  {formatInr(quote.stickersPaise)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">Delivery (courier to kitchen)</dt>
                <dd className="font-semibold tabular-nums text-on-surface">
                  {formatInr(quote.deliveryPaise)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-on-surface-variant">GST ({gstPct}%)</dt>
                <dd className="font-semibold tabular-nums text-on-surface">
                  {formatInr(quote.gstPaise)}
                </dd>
              </div>
              <div className="border-t border-outline-variant/40 pt-2.5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-semibold text-on-surface">Total payable</dt>
                  <dd
                    className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-primary"
                    data-testid="sticker-print-total"
                  >
                    {formatInr(quote.totalPaise)}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-3 text-xs text-on-surface-variant">
            <p className="flex items-center gap-1.5 font-semibold text-on-surface">
              <MaterialIcon name="account_balance_wallet" className="text-[16px] text-primary" />
              Wallet
            </p>
            <p className="mt-1">
              Balance {formatInr(balance)} · spendable {formatInr(spendable)} (min reserve{" "}
              {formatInr(minBalancePaise)})
            </p>
            {canUseWallet ? (
              <p className="mt-1 text-[#24963F]">You can pay this bill from wallet.</p>
            ) : (
              <p className="mt-1 text-amber-800">
                Wallet pay needs {formatInr(quote.totalPaise)} spendable while keeping{" "}
                {formatInr(minBalancePaise)}.
              </p>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-on-surface-variant">
            Payment is saved in Grow → Wallet history with order / transaction / UTR refs for your records.
          </p>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-outline-variant/40 px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {canUseWallet ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-primary text-primary"
              disabled={busy}
              onClick={() => onConfirmPay("wallet")}
              data-testid="sticker-print-pay-wallet"
            >
              <MaterialIcon name="account_balance_wallet" className="text-[18px]" />
              {busy ? "Paying…" : `Pay from wallet`}
            </Button>
          ) : null}
          <Button
            type="button"
            className="gap-2"
            disabled={busy}
            onClick={() => onConfirmPay("external")}
            data-testid="sticker-print-pay-confirm"
          >
            <MaterialIcon name="payments" className="text-[18px]" />
            {busy ? "Paying…" : `Pay ${formatInr(quote.totalPaise)} & send`}
          </Button>
        </div>
      </div>
    </div>
  );
}
