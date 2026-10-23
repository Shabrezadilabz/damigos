"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";
import { applyCartLoyalty, fetchMyOrders, formatInr } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

type KitchenBalance = {
  restaurantId: string;
  restaurantName: string;
  availablePaise: number;
};

export default function MeLoyaltyPage() {
  const [rows, setRows] = useState<KitchenBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signedIn = Boolean(getGuestToken());

  useEffect(() => {
    if (!getGuestToken()) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const orders = await fetchMyOrders();
        const kitchens = new Map<string, string>();
        for (const o of orders) {
          if (!kitchens.has(o.restaurantId)) {
            kitchens.set(o.restaurantId, o.restaurantName);
          }
        }
        const balances: KitchenBalance[] = [];
        for (const [restaurantId, restaurantName] of kitchens) {
          try {
            // Probe available balance without applying (apply:false returns available)
            const snap = await applyCartLoyalty(restaurantId, false);
            balances.push({
              restaurantId,
              restaurantName,
              availablePaise: snap.loyaltyAvailablePaise ?? 0,
            });
          } catch {
            balances.push({ restaurantId, restaurantName, availablePaise: 0 });
          }
        }
        setRows(balances);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load loyalty");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPaise = rows.reduce((s, r) => s + r.availablePaise, 0);

  return (
    <MeSubpageShell title="Loyalty credits">
      <p className="mb-4 text-[13px] text-on-surface-variant">
        Kitchen coins &amp; Direct Perks — redeem at checkout for that kitchen.
      </p>

      {!signedIn ? (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-[15px] font-semibold">Sign in from WhatsApp</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            Loyalty balances sync to your guest account after you order.
          </p>
          <Link href="/hub" className="mt-3 inline-block text-[13px] font-bold text-primary">
            Browse kitchens
          </Link>
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-on-surface-variant">Loading credits…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : (
        <>
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Total available
            </p>
            <p className="mt-1 font-display text-[28px] font-extrabold text-primary">
              {formatInr(totalPaise)}
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
              <MaterialIcon name="loyalty" className="text-[32px] text-on-surface-variant/50" />
              <p className="mt-2 text-[15px] font-semibold">No kitchen credits yet</p>
              <p className="mt-1 text-[12px] text-on-surface-variant">
                Order direct — kitchens may pay Direct Perks back into your balance.
              </p>
              <Link href="/hub" className="mt-3 inline-block text-[13px] font-bold text-primary">
                Explore hub
              </Link>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {rows.map((row, i) => (
                <li
                  key={row.restaurantId}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/60" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{row.restaurantName}</p>
                    <p className="text-[12px] text-on-surface-variant">
                      {row.availablePaise > 0
                        ? `${formatInr(row.availablePaise)} ready at checkout`
                        : "No balance yet"}
                    </p>
                  </div>
                  <Link
                    href={`/r/${row.restaurantId}/menu`}
                    className="pressable text-[12px] font-bold text-primary"
                  >
                    Menu
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </MeSubpageShell>
  );
}
