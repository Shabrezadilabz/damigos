"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MeSubpageShell } from "@/components/me-subpage-shell";
import { MaterialIcon } from "@/components/material-icon";
import {
  fetchMyOrders,
  fetchRewardClaims,
  formatInr,
  type RewardClaimOption,
} from "@/lib/api";
import { getGuestToken } from "@/lib/session";

type ClaimRow = RewardClaimOption & {
  restaurantId: string;
  restaurantName: string;
};

export default function MeRewardsPage() {
  const [rows, setRows] = useState<ClaimRow[]>([]);
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
        const all: ClaimRow[] = [];
        for (const [restaurantId, restaurantName] of kitchens) {
          try {
            const claims = await fetchRewardClaims(restaurantId);
            for (const c of claims) {
              all.push({ ...c, restaurantId, restaurantName });
            }
          } catch {
            /* kitchen may have no claims endpoint data */
          }
        }
        all.sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
        setRows(all);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load rewards");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <MeSubpageShell title="Rewards">
      <p className="mb-4 text-[13px] text-on-surface-variant">
        Spin, scratch &amp; packaging QR perks — redeem when you order that kitchen.
      </p>

      <Link
        href="/me/rewards/scan"
        className="mb-4 flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3.5 ring-1 ring-primary/20"
        data-testid="rewards-scan-cta"
      >
        <MaterialIcon name="qr_code_2" className="text-[28px] text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-primary">Scan packaging to play</p>
          <p className="text-[12px] text-on-surface-variant">
            Opens camera → sticker QR → WhatsApp opt-in &amp; play.
          </p>
        </div>
        <MaterialIcon name="photo_camera" className="text-primary" />
      </Link>

      {!signedIn ? (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
          <p className="text-[15px] font-semibold">Sign in from WhatsApp</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            Claimed rewards appear here after Spark play.
          </p>
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-on-surface-variant">Loading rewards…</p>
      ) : error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
          <MaterialIcon name="card_giftcard" className="text-[32px] text-on-surface-variant/50" />
          <p className="mt-2 text-[15px] font-semibold">No rewards claimed yet</p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            Scan a sticker or play Spark after opt-in to unlock kitchen offers.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          {rows.map((row, i) => (
            <li
              key={`${row.claimId}-${row.restaurantId}`}
              className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-border/60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{row.title}</p>
                <p className="text-[12px] text-on-surface-variant">
                  {row.restaurantName}
                  {row.minOrderPaise > 0 ? ` · Min ${formatInr(row.minOrderPaise)}` : ""}
                </p>
              </div>
              <Link
                href={`/r/${row.restaurantId}/menu`}
                className="pressable shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-[12px] font-bold text-primary"
              >
                Use
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MeSubpageShell>
  );
}
