"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import {
  fetchPayoutSettings,
  fetchPayoutSettlements,
  formatInr,
  patchPayoutPos,
  type PayoutSettings,
  type PayoutSettlementRow,
} from "@/lib/api";

/** Settings → Banking & payout — bank details, today earnings, EOD invoices */
export function SettingsPayoutPanel({ embedded = false }: { embedded?: boolean }) {
  const { restaurantId, loading: ctxLoading } = useCrmRestaurant();
  const [data, setData] = useState<PayoutSettings | null>(null);
  const [settlements, setSettlements] = useState<PayoutSettlementRow[]>([]);
  const [petpooja, setPetpooja] = useState("");
  const [restroworks, setRestroworks] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [subTab, setSubTab] = useState<"bank" | "today" | "invoices" | "pos">("bank");

  const reload = useCallback(() => {
    if (!restaurantId) return;
    void Promise.all([fetchPayoutSettings(restaurantId), fetchPayoutSettlements(restaurantId)])
      .then(([p, s]) => {
        setData(p);
        setSettlements(s.settlements);
        setPetpooja(p.pos.petpoojaOutletId ?? "");
        setRestroworks(p.pos.restroworksLocationId ?? "");
        setAccountName(p.bank?.accountName ?? "");
        setIfsc(p.bank?.ifsc ?? "");
        setBankName(p.bank?.bankName ?? "");
        setAccountNumber("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [restaurantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSaveBank() {
    if (!restaurantId) return;
    if (!accountNumber.trim() || !ifsc.trim()) {
      setError("Account number and IFSC are required");
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await patchPayoutPos(restaurantId, {
        bankAccountName: accountName.trim() || null,
        bankAccountNumber: accountNumber.trim(),
        bankIfsc: ifsc.trim(),
        bankName: bankName.trim() || null,
      });
      setData(next);
      setAccountNumber("");
      setSaved(true);
      const s = await fetchPayoutSettlements(restaurantId);
      setSettlements(s.settlements);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSavePos() {
    if (!restaurantId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await patchPayoutPos(restaurantId, {
        petpoojaOutletId: petpooja.trim() || null,
        restroworksLocationId: restroworks.trim() || null,
      });
      setData(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (ctxLoading) return <p className="text-sm text-foreground/60">Loading…</p>;
  if (!restaurantId) {
    return <p className="text-sm text-red-700">Log in as owner to manage payout settings.</p>;
  }

  const today = data?.today;

  return (
    <section
      className={
        embedded
          ? "space-y-4 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm"
          : "mt-8 space-y-4 rounded-xl border border-border bg-background p-4 shadow-sm"
      }
    >
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">
          Banking &amp; payout
        </h2>
        <p className="text-xs text-on-surface-variant">
          Daily earnings, EOD settlement after 12:00 AM IST, and invoices. Editing bank freezes
          today&apos;s payout until Razorpay Route is updated (partners@damigos.in notified).
        </p>
      </div>

      {data?.payout?.frozen ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-semibold">Payouts frozen</p>
          <p className="text-xs">{data.payout.freezeReason}</p>
          {data.payout.frozenUntil ? (
            <p className="mt-0.5 text-[11px] opacity-80">Until {data.payout.frozenUntil}</p>
          ) : null}
        </div>
      ) : null}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-1 rounded-lg bg-surface-container-high p-0.5">
        {(
          [
            ["bank", "Bank"],
            ["today", "Today"],
            ["invoices", "Invoices"],
            ["pos", "POS"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={
              subTab === id
                ? "rounded-md bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-primary shadow-sm"
                : "rounded-md px-3 py-1.5 text-xs font-semibold text-on-surface-variant"
            }
            onClick={() => setSubTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "today" && today ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat
            label="Orders today"
            value={String(today.orderCount)}
            icon="receipt_long"
          />
          <Stat
            label="Payments captured"
            value={String(today.paymentsCount)}
            icon="payments"
          />
          <Stat label="Gross sales" value={formatInr(today.grossSalesPaise)} icon="trending_up" />
          <Stat
            label="Your earning (est.)"
            value={formatInr(today.restaurantSharePaise)}
            icon="account_balance_wallet"
            emphasize
          />
          <Stat label="Platform fee" value={formatInr(today.platformFeePaise)} icon="storefront" />
          <Stat
            label="Waiting penalties"
            value={formatInr(today.waitingPenaltyPaise)}
            icon="timer"
          />
          <p className="sm:col-span-2 text-[11px] text-on-surface-variant">
            Business date {today.businessDate} (IST). Settlement job runs after midnight and posts an
            invoice below.
          </p>
        </div>
      ) : null}

      {subTab === "bank" ? (
        <div className="space-y-3">
          <div
            data-testid="payout-razorpay-status"
            className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm"
          >
            <p className="text-xs font-semibold uppercase text-foreground/50">Razorpay linked account</p>
            <p className="mt-1 font-medium">{data?.razorpay.kycLabel ?? "…"}</p>
            {data?.razorpay.linkedAccountId ? (
              <p className="mt-0.5 font-mono text-xs text-foreground/60">{data.razorpay.linkedAccountId}</p>
            ) : null}
          </div>

          {data?.bank?.hasBank ? (
            <p className="text-xs text-on-surface-variant">
              On file: {data.bank.accountName ?? "—"} · {data.bank.accountNumberMasked} ·{" "}
              {data.bank.ifsc}
            </p>
          ) : (
            <p className="text-xs text-amber-800">No bank on file — add details to enable EOD settlement.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-semibold text-foreground/70">Account holder name</span>
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-foreground/70">Bank name</span>
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-foreground/70">Account number</span>
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={
                  data?.bank?.accountNumberLast4
                    ? `••••${data.bank.accountNumberLast4} — re-enter to change`
                    : "Enter account number"
                }
                autoComplete="off"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-foreground/70">IFSC</span>
              <input
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm font-mono uppercase"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void onSaveBank()}>
              {saving ? "Saving…" : "Save bank details"}
            </Button>
            {saved && subTab === "bank" ? (
              <span className="text-xs font-semibold text-emerald-800">Saved · freeze applied if changed</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {subTab === "invoices" ? (
        <div className="space-y-2">
          {settlements.length === 0 ? (
            <p className="py-6 text-center text-sm text-on-surface-variant">
              No settlement invoices yet. They appear after midnight IST.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/40 rounded-xl border border-outline-variant/50">
              {settlements.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{row.businessDate}</p>
                    <p className="text-[11px] text-on-surface-variant">
                      {row.invoiceNumber ?? "—"} · {row.orderCount} orders · {row.status}
                    </p>
                    {row.freezeNote ? (
                      <p className="text-[11px] text-amber-800">{row.freezeNote}</p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular text-primary">{formatInr(row.restaurantSharePaise)}</p>
                    <p className="text-[10px] text-on-surface-variant">Restaurant share</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {subTab === "pos" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs font-semibold text-foreground/70">Petpooja outlet ID</span>
              <input
                data-testid="payout-petpooja-input"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={petpooja}
                onChange={(e) => setPetpooja(e.target.value)}
                placeholder="e.g. PP-OUTLET-001"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-semibold text-foreground/70">Restroworks location ID</span>
              <input
                data-testid="payout-restroworks-input"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                value={restroworks}
                onChange={(e) => setRestroworks(e.target.value)}
                placeholder="e.g. RW-LOC-001"
              />
            </label>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={saving}
            data-testid="payout-pos-save"
            onClick={() => void onSavePos()}
          >
            {saving ? "Saving…" : "Save POS IDs"}
          </Button>
          {saved && subTab === "pos" ? (
            <span className="ml-2 text-xs font-semibold text-emerald-800" data-testid="payout-pos-saved">
              Saved
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
  emphasize,
}: {
  label: string;
  value: string;
  icon: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">
        <MaterialIcon name={icon} className="text-[14px]" />
        {label}
      </div>
      <p
        className={
          emphasize
            ? "mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-primary tabular"
            : "mt-1 text-lg font-semibold tabular"
        }
      >
        {value}
      </p>
    </div>
  );
}
