"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { WalletTxnDetailDialog } from "@/components/grow/wallet-txn-detail-dialog";
import {
  fetchCrmWallet,
  formatInr,
  prepareCrmWalletTopUp,
  topUpCrmWallet,
  verifyCrmWalletTopUp,
  type CrmWallet,
  type CrmWalletLedgerRow,
} from "@/lib/api";
import { loadRazorpayCheckoutScript, openRazorpayCheckout } from "@/lib/razorpay-checkout";
import { cn } from "@/lib/utils";

type LedgerTab = "all" | "topup" | "debit";

const DEFAULT_PACKS = [49900, 99900, 249900];
const DEFAULT_MIN = 100_000;

export function GrowWalletPanel({ restaurantId }: { restaurantId: string }) {
  const [wallet, setWallet] = useState<CrmWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>("all");
  const [selected, setSelected] = useState<CrmWalletLedgerRow | null>(null);

  const reload = useCallback(() => {
    fetchCrmWallet(restaurantId)
      .then(setWallet)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [restaurantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onTopUp(amountPaise: number) {
    setBusy(true);
    setError(null);
    try {
      if (wallet?.topupMode === "live") {
        const prepared = await prepareCrmWalletTopUp(restaurantId, amountPaise);
        if (!prepared.razorpayKeyId) throw new Error("Razorpay key missing");
        await loadRazorpayCheckoutScript();
        await new Promise<void>((resolve, reject) => {
          try {
            openRazorpayCheckout({
              keyId: prepared.razorpayKeyId!,
              orderId: prepared.razorpayOrderId,
              amountPaise: prepared.amountPaise,
              onSuccess: (response) => {
                void verifyCrmWalletTopUp({
                  restaurantId,
                  amountPaise: prepared.amountPaise,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                })
                  .then((w) => {
                    setWallet(w);
                    resolve();
                  })
                  .catch(reject);
              },
              onDismiss: () => resolve(),
            });
          } catch (e) {
            reject(e);
          }
        });
      } else {
        const key = crypto.randomUUID();
        const w = await topUpCrmWallet(restaurantId, key, amountPaise);
        setWallet(w);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  const packs = wallet?.packsPaise?.length ? wallet.packsPaise : DEFAULT_PACKS;
  const minBal = wallet?.minBalancePaise ?? DEFAULT_MIN;
  const spendable = wallet?.spendablePaise ?? Math.max(0, (wallet?.balancePaise ?? 0) - minBal);
  const filteredLedger =
    wallet?.ledger.filter((row) => {
      if (ledgerTab === "all") return true;
      if (ledgerTab === "topup") return row.kind.includes("topup");
      return row.amountPaise < 0 || row.kind.includes("debit") || row.kind.includes("sticker");
    }) ?? [];

  if (!wallet && !error) return <p className="text-sm text-on-surface-variant">Loading wallet…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {wallet ? (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container p-6 text-on-primary-container shadow-lg">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <p className="text-xs uppercase tracking-wide text-on-primary-container/80">
              Kitchen wallet balance
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              {formatInr(wallet.balancePaise)}
            </p>
            <p className="mt-1 text-sm font-semibold text-on-primary-container">
              Spendable {formatInr(spendable)}
              <span className="font-normal opacity-80">
                {" "}
                · keep min {formatInr(minBal)} reserved
              </span>
            </p>
            <p className="mt-1 text-sm text-on-primary-container/90">
              ≈{" "}
              {wallet.approxBroadcastCredits ??
                Math.floor(wallet.balancePaise / (wallet.msgCostPaise ?? 250))}{" "}
              message credits · stickers &amp; campaigns
            </p>
            {wallet.lowBalance ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium">
                <MaterialIcon name="warning" className="text-[18px]" />
                Below {formatInr(minBal)} — top up before wallet spends.
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {packs.map((paise) => {
                const credits = Math.floor(paise / (wallet.msgCostPaise ?? 250));
                return (
                  <Button
                    key={paise}
                    className="gap-2 bg-surface-container-lowest text-primary hover:bg-white"
                    type="button"
                    disabled={busy}
                    onClick={() => void onTopUp(paise)}
                  >
                    <MaterialIcon name="add_card" className="text-[18px]" />
                    {busy ? "…" : `${formatInr(paise)} · ~${credits} msgs`}
                  </Button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-on-primary-container/70">
              {wallet.topupMode === "live"
                ? "Pay with Razorpay → balance updates after success · history stores order & payment IDs"
                : "Stub credit · set WALLET_TOPUP_MODE=live + Razorpay keys for production"}
            </p>
          </div>

          <div className="rounded-xl bg-surface-container-lowest shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 px-4 py-3">
              <span className="text-sm font-bold">History</span>
              <div className="flex gap-1 rounded-lg bg-surface-container-high p-0.5">
                {(
                  [
                    ["all", "All"],
                    ["topup", "Top-ups"],
                    ["debit", "Spends"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
                      ledgerTab === id
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant",
                    )}
                    onClick={() => setLedgerTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {filteredLedger.length > 0 ? (
              <ul className="divide-y divide-outline-variant/30 text-sm">
                {filteredLedger.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-container-low/80"
                      onClick={() => setSelected(row)}
                      data-testid="wallet-ledger-row"
                    >
                      <span className="flex min-w-0 items-center gap-2 capitalize text-on-surface-variant">
                        <MaterialIcon
                          name={row.amountPaise >= 0 ? "south_west" : "north_east"}
                          className={cn(
                            "shrink-0 text-[16px]",
                            row.amountPaise >= 0 ? "text-[#24963F]" : "text-primary",
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-on-surface">
                            {row.kind.replace(/_/g, " ")}
                          </span>
                          <span className="block truncate text-[10px] text-on-surface-variant">
                            {new Date(row.createdAt).toLocaleString("en-IN")}
                            {row.reference ? ` · ${row.reference}` : ""}
                          </span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums font-semibold",
                          row.amountPaise >= 0 ? "text-[#24963F]" : "text-primary",
                        )}
                      >
                        {row.amountPaise >= 0 ? "+" : ""}
                        {formatInr(row.amountPaise)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">No history yet.</p>
            )}
          </div>

          <WalletTxnDetailDialog open={Boolean(selected)} onClose={() => setSelected(null)} row={selected} />
        </>
      ) : null}
    </div>
  );
}
