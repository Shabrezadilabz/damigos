"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import {
  fetchCrmCustomerDetail,
  fetchCrmCustomers,
  type CrmCustomerDetail,
  type CrmCustomerRow,
} from "@/lib/api";
import { GrowCustomerDrawer } from "@/components/grow/grow-customer-drawer";
import { subscribeCrmRefresh } from "@/lib/crm-refresh-bus";

function Kpi({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-4 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <MaterialIcon name={icon} className="text-[18px] text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function GrowCustomersPanel({
  restaurantId,
  openCustomerId,
}: {
  restaurantId: string;
  openCustomerId?: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CrmCustomerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCrmCustomers(restaurantId)
      .then((c) => {
        if (!cancelled) setRows(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  useEffect(() => {
    return subscribeCrmRefresh(() => {
      void fetchCrmCustomers(restaurantId)
        .then(setRows)
        .catch(() => undefined);
    });
  }, [restaurantId]);

  useEffect(() => {
    if (!openCustomerId) return;
    let cancelled = false;
    setLoadingId(openCustomerId);
    fetchCrmCustomerDetail(restaurantId, openCustomerId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load guest");
      })
      .finally(() => {
        if (!cancelled) setLoadingId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, openCustomerId]);

  const kpis = useMemo(() => {
    const optIn = rows.filter((r) => r.marketingOptIn === true).length;
    const orders = rows.reduce((s, r) => s + r.orderCount, 0);
    return {
      guests: String(rows.length),
      optIn: String(optIn),
      orders: String(orders),
    };
  }, [rows]);

  async function openCustomer(row: CrmCustomerRow) {
    setLoadingId(row.id);
    setError(null);
    try {
      const d = await fetchCrmCustomerDetail(restaurantId, row.id);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load guest");
    } finally {
      setLoadingId(null);
    }
  }

  if (error && !detail) return <p className="text-sm text-red-700">{error}</p>;

  return (
    <>
      {detail ? (
        <GrowCustomerDrawer
          detail={detail}
          onClose={() => {
            setDetail(null);
            if (openCustomerId) router.replace("/grow?tab=customers");
          }}
        />
      ) : null}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Kpi label="Directory guests" value={kpis.guests} icon="group" />
        <Kpi label="Marketing opt-in" value={kpis.optIn} icon="campaign" />
        <Kpi label="Lifetime orders" value={kpis.orders} icon="receipt_long" />
      </div>
      <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-4 py-3">
          <span className="text-sm font-semibold">Consent ledger</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-on-surface-variant">
            <MaterialIcon name="gavel" className="text-[14px]" />
            DPDP-ready export
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-[10px] uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 font-bold">Guest</th>
              <th className="px-4 py-3 font-bold">Orders</th>
              <th className="px-4 py-3 font-bold">Last order</th>
              <th className="px-4 py-3 font-bold">Opt-in</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant">
                  No guests with orders yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer transition-colors hover:bg-surface-container-low"
                  data-testid="grow-customer-row"
                  onClick={() => void openCustomer(r)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.phoneMasked}</div>
                    {r.name ? <div className="text-xs text-on-surface-variant">{r.name}</div> : null}
                    {loadingId === r.id ? (
                      <div className="text-xs text-on-surface-variant">Loading…</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.orderCount}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {new Date(r.lastOrderAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.marketingOptIn === true ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#24963F]/15 px-2 py-0.5 font-semibold text-[#24963F]">
                        <MaterialIcon name="check_circle" className="text-[14px]" />
                        Marketing
                      </span>
                    ) : r.marketingOptIn === false ? (
                      <span className="text-on-surface-variant">No mkt</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {error && detail ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
    </>
  );
}
