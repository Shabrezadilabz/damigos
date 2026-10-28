"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  applyCrmCounterRedeem,
  fetchCrmCustomerDetail,
  fetchCrmCustomers,
  formatInr,
  type CrmCustomerDetail,
  type CrmCustomerRow,
} from "@/lib/api";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";

type RewardOption = {
  id: string;
  title: string;
  subtitle: string;
  amountPaise: number;
  icon: string;
  badge?: string;
  mode: "wallet" | "claim";
};

function matchPhoneLast4(digits: string, row: CrmCustomerRow): boolean {
  if (digits.length < 4) return false;
  const last4 = digits.slice(-4);
  return row.phoneMasked.endsWith(last4);
}

export function CounterRedeemTerminal() {
  const { restaurantId, loading: ctxLoading } = useCrmRestaurant();
  const [phone, setPhone] = useState("");
  const [customers, setCustomers] = useState<CrmCustomerRow[]>([]);
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fastMode, setFastMode] = useState(true);
  const [billTotalPaise] = useState(78000);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    void fetchCrmCustomers(restaurantId)
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, [restaurantId]);

  const recents = useMemo(() => customers.slice(0, 3), [customers]);

  const matched = useMemo(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 4) return null;
    return customers.find((c) => matchPhoneLast4(digits, c)) ?? null;
  }, [phone, customers]);

  async function loadGuest(customerId: string) {
    if (!restaurantId) return;
    setBusy(true);
    try {
      const d = await fetchCrmCustomerDetail(restaurantId, customerId);
      setDetail(d);
      setError(null);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!restaurantId || !matched || phone.replace(/\D/g, "").length < 4) {
      if (phone.replace(/\D/g, "").length < 4) setDetail(null);
      return;
    }
    void loadGuest(matched.id);
  }, [matched, phone, restaurantId]);

  const rewards: RewardOption[] = useMemo(() => {
    if (!detail) return [];
    const claims = detail.customer.activeRewardClaims;
    const credits = Math.max(0, detail.customer.creditsPaise ?? 0);
    const opts: RewardOption[] = [];
    if (claims > 0) {
      opts.push({
        id: "spin",
        title: "Spin / packaging reward",
        subtitle: `${claims} open claim${claims === 1 ? "" : "s"} · burns at counter`,
        amountPaise: 5000,
        icon: "casino",
        badge: "Active claim",
        mode: "claim",
      });
    }
    if (credits > 0) {
      opts.push({
        id: "wallet",
        title: "Kitchen loyalty credits",
        subtitle: `${formatInr(credits)} available to burn on this bill`,
        amountPaise: credits,
        icon: "account_balance_wallet",
        badge: "Credits",
        mode: "wallet",
      });
    }
    return opts;
  }, [detail]);

  const selected = rewards.find((r) => r.id === selectedId) ?? rewards[0] ?? null;

  useEffect(() => {
    if (rewards.length && !selectedId) setSelectedId(rewards[0]!.id);
  }, [rewards, selectedId]);

  const discountPaise = selected?.amountPaise ?? 0;
  const netPaise = Math.max(0, billTotalPaise - discountPaise);

  if (ctxLoading) return <p className="text-sm text-on-surface-variant">Loading…</p>;
  if (!restaurantId) {
    return <p className="text-sm text-red-700">Log in as restaurant staff to use the counter terminal.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 pb-2 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <span>Orders</span>
            <MaterialIcon name="chevron_right" className="text-[12px]" />
            <span className="font-semibold text-primary">Counter loyalty redeem</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-on-surface">
              Voucher &amp; loyalty terminal
            </h1>
            <span className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold text-on-surface">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#24963F]" />
              POS counter
            </span>
          </div>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-3 rounded-xl bg-surface-container-lowest px-3 py-2 shadow-sm">
          <div className="text-right">
            <span className="block text-xs font-semibold text-on-surface">Fast counter mode</span>
            <span className="text-xs text-on-surface-variant">Auto-link open ticket</span>
          </div>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={fastMode}
            onChange={(e) => setFastMode(e.target.checked)}
          />
          <div className="relative h-6 w-11 rounded-full bg-surface-container-highest after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
                    <MaterialIcon name="dialpad" className="text-[20px]" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-on-surface">Guest phone terminal</h2>
                    <p className="text-xs text-on-surface-variant">Search by mobile — matches CRM guest directory</p>
                  </div>
                </div>
                <Link href="/orders/kitchen" className="text-xs font-semibold text-primary hover:underline">
                  ← Kitchen board
                </Link>
              </div>
              <div className="flex items-center rounded-xl bg-surface-container-low p-2 shadow-inner">
                <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 py-2 text-sm font-semibold shadow-sm">
                  <span>+91</span>
                </div>
                <input
                  className="w-full bg-transparent px-4 py-3 font-[family-name:var(--font-display)] text-xl tracking-wider text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => {
                    setApplied(false);
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                  data-testid="redeem-phone-input"
                />
                <button
                  type="button"
                  className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-high"
                  onClick={() => setPhone("")}
                >
                  <MaterialIcon name="backspace" className="text-[20px]" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Quick recent:
                </span>
                {recents.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-[10px] font-semibold text-on-surface hover:bg-surface-container-high"
                    onClick={() => {
                      setPhone(c.phoneMasked.slice(-4));
                      void loadGuest(c.id);
                    }}
                  >
                    {c.name ?? "Guest"} ({c.phoneMasked.slice(-4)})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {busy ? <p className="text-sm text-on-surface-variant">Matching guest…</p> : null}

          {detail ? (
            <div className="flex flex-col gap-6 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
              <div className="flex flex-col gap-4 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-tertiary to-[#261900] text-lg font-bold text-on-tertiary">
                    {(detail.customer.name ?? "G").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{detail.customer.name ?? "Guest"}</h3>
                    <p className="text-xs text-on-surface-variant">
                      {detail.customer.phoneMasked} · {detail.customer.orderCount} visits ·{" "}
                      {detail.customer.activeRewardClaims} active reward(s)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant">Store wallet</span>
                  <p className="text-lg font-bold text-tertiary">{formatInr(detail.customer.creditsPaise || 0)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-on-surface">Available rewards</label>
                {rewards.length === 0 ? (
                  <p className="rounded-xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                    No open spin claims or kitchen loyalty credits for this guest. Ask them to scan a packaging QR or earn credits first.
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {rewards.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`flex flex-col rounded-xl p-4 text-left transition-all ${
                        selected?.id === r.id
                          ? "bg-surface-container-lowest shadow-md ring-2 ring-primary"
                          : "bg-surface-container-low hover:bg-surface-container-high"
                      }`}
                      onClick={() => {
                        setSelectedId(r.id);
                        setApplied(false);
                      }}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
                          <MaterialIcon name={r.icon} className="text-[18px]" />
                        </span>
                        {r.badge ? (
                          <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold">
                            {r.badge}
                          </span>
                        ) : null}
                      </div>
                      <h4 className="text-sm font-bold">{r.title}</h4>
                      <p className="mt-1 text-xs text-on-surface-variant">{r.subtitle}</p>
                      <p className="mt-3 text-base font-bold text-primary">{formatInr(r.amountPaise)} off</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-surface-container-low p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Active POS ticket
                    </span>
                    <p className="text-base font-semibold">Bill #DM-{detail.recentOrders[0]?.id.slice(0, 4).toUpperCase() ?? "NEW"}</p>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div>
                      <span className="text-[10px] text-on-surface-variant">Bill total</span>
                      <p className="text-base line-through text-outline">{formatInr(billTotalPaise)}</p>
                    </div>
                    <div className="text-primary">
                      <span className="text-[10px]">Discount</span>
                      <p className="text-base font-bold">−{formatInr(discountPaise)}</p>
                    </div>
                    <div className="border-l border-surface-container-highest pl-3">
                      <span className="text-[10px] font-bold uppercase text-[#24963F]">Net payable</span>
                      <p className="text-xl font-extrabold">{formatInr(netPaise)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  className="flex-1 gap-2 py-6"
                  disabled={!selected || applied || busy || !detail || discountPaise <= 0}
                  onClick={() => {
                    if (!restaurantId || !detail || discountPaise <= 0) return;
                    setBusy(true);
                    setError(null);
                    void applyCrmCounterRedeem({
                      restaurantId,
                      customerId: detail.customer.id,
                      amountPaise: discountPaise,
                      mode: selected?.mode ?? "wallet",
                    })
                      .then((res) => {
                        setApplied(true);
                        const isClaim = selected?.mode === "claim";
                        setDetail({
                          ...detail,
                          customer: {
                            ...detail.customer,
                            creditsPaise: isClaim
                              ? detail.customer.creditsPaise
                              : (res.guestCreditsRemainingPaise ??
                                Math.max(0, (detail.customer.creditsPaise || 0) - discountPaise)),
                            activeRewardClaims: Math.max(
                              0,
                              (detail.customer.activeRewardClaims || 0) - (isClaim ? 1 : 0),
                            ),
                          },
                        });
                      })
                      .catch((e) =>
                        setError(e instanceof Error ? e.message : "Redeem failed"),
                      )
                      .finally(() => setBusy(false));
                  }}
                  data-testid="redeem-apply-btn"
                >
                  <MaterialIcon name="check_circle" className="text-[20px]" />
                  {applied
                    ? "Redeemed · kitchen wallet credited"
                    : busy
                      ? "Burning…"
                      : `Apply & burn ${formatInr(discountPaise)} to bill`}
                </Button>
              </div>
            </div>
          ) : phone.length >= 4 && !matched && !busy ? (
            <p className="text-sm text-on-surface-variant">No CRM guest match for this number yet.</p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 xl:col-span-4">
          <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold">Today&apos;s counter pulse</span>
              <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#24963F]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-surface-container-low p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Burned today
                </span>
                <p className="mt-1 text-xl font-extrabold text-primary">₹0</p>
                <p className="text-xs text-on-surface-variant">Pilot ledger</p>
              </div>
              <div className="rounded-xl bg-surface-container-low p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Avg lookup
                </span>
                <p className="mt-1 text-xl font-extrabold">—</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MaterialIcon name="history" className="text-[20px] text-primary" />
              <h3 className="text-base font-semibold">Redemption stream</h3>
            </div>
            <p className="text-sm text-on-surface-variant">
              Live burn events will appear here when POS redeem API is wired. Use Grow → Customers to verify guest
              rewards until then.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
