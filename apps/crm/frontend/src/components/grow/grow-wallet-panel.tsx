"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { fetchCrmWallet, formatInr, topUpCrmWallet, type CrmWallet } from "@/lib/api";
import { cn } from "@/lib/utils";

type LedgerTab = "all" | "topup" | "debit";

export function GrowWalletPanel({ restaurantId }: { restaurantId: string }) {
  const [wallet, setWallet] = useState<CrmWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>("all");

  const reload = useCallback(() => {
    fetchCrmWallet(restaurantId)
      .then(setWallet)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [restaurantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onTopUp() {
    setBusy(true);
    setError(null);
    try {
      const key = crypto.randomUUID();
      const w = await topUpCrmWallet(restaurantId, key);
      setWallet(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  const filteredLedger =
    wallet?.ledger.filter((row) => {
      if (ledgerTab === "all") return true;
      if (ledgerTab === "topup") return row.kind.includes("topup");
      return row.amountPaise < 0;
    }) ?? [];

  if (!wallet && !error) return <p className="text-sm text-on-surface-variant">Loading wallet…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {wallet ? (
        <>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container to-secondary-container p-6 text-on-primary-container shadow-lg">
            <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <p className="text-xs uppercase tracking-wide text-on-primary-container/80">WhatsApp broadcast balance</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold">
              {formatInr(wallet.balancePaise)}
            </p>
            <p className="mt-1 text-sm text-on-primary-container/90">Prepaid Meta Cloud API credits · Kapso dispatch</p>
            {wallet.lowBalance ? (
              <p className="mt-3 flex items-center gap-2 text-sm font-medium">
                <MaterialIcon name="warning" className="text-[18px]" />
                Low balance — top up before scheduling campaigns.
              </p>
            ) : null}
            <Button
              className="mt-5 gap-2 bg-surface-container-lowest text-primary hover:bg-white"
              type="button"
              disabled={busy}
              onClick={() => void onTopUp()}
            >
              <MaterialIcon name="add_card" className="text-[18px]" />
              {busy ? "Processing…" : "Top up ₹999 (pilot stub)"}
            </Button>
            <p className="mt-2 text-xs text-on-primary-container/70">Stub credit in dev · Razorpay in production.</p>
          </div>

          <div className="rounded-xl bg-surface-container-lowest shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 px-4 py-3">
              <span className="text-sm font-bold">Ledger</span>
              <div className="flex gap-1 rounded-lg bg-surface-container-high p-0.5">
                {(
                  [
                    ["all", "All"],
                    ["topup", "Top-ups"],
                    ["debit", "Debits"],
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
                  <li key={row.id} role="listitem" className="flex items-center justify-between px-4 py-3">
                    <span className="flex items-center gap-2 capitalize text-on-surface-variant">
                      <MaterialIcon
                        name={row.amountPaise >= 0 ? "south_west" : "north_east"}
                        className={cn("text-[16px]", row.amountPaise >= 0 ? "text-[#24963F]" : "text-primary")}
                      />
                      {row.kind.replace(/_/g, " ")}
                    </span>
                    <span
                      className={cn(
                        "tabular-nums font-semibold",
                        row.amountPaise >= 0 ? "text-[#24963F]" : "text-red-800",
                      )}
                    >
                      {row.amountPaise >= 0 ? "+" : ""}
                      {formatInr(row.amountPaise)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-sm text-on-surface-variant">No ledger entries in this filter.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
