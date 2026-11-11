"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";
import { RewardPostersOverlay } from "@/components/reward-posters-overlay";
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

const PENDING_TILES = [
  { id: "p1", tone: "blue" as const, label: "Scratch card" },
  { id: "p2", tone: "green" as const, label: "Kitchen spin" },
  { id: "p3", tone: "blue" as const, label: "Packaging QR" },
];

export default function MeRewardsPage() {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postersOpen, setPostersOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
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

  const readyCount = rows.length;

  function goAuthed(href: string) {
    if (getGuestToken()) {
      window.location.href = href;
      return;
    }
    setPendingHref(href);
    setAuthOpen(true);
  }

  return (
    <main className="min-h-dvh bg-[#F5F5F5] pb-10" data-testid="me-rewards-gpay">
      <div className="relative overflow-hidden bg-[#F9C732] px-4 pb-10 pt-safe text-[#171717]">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 88% 35%, rgba(180,100,0,0.4), transparent 42%), radial-gradient(circle at 72% 85%, rgba(180,100,0,0.22), transparent 38%)",
          }}
        />
        <div className="relative z-10 flex items-center justify-between py-3">
          <Link
            href="/me"
            className="pressable flex h-10 w-10 items-center justify-center rounded-full"
            aria-label="Back"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <button
            type="button"
            className="pressable rounded-full bg-black/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide"
            onClick={() => setPostersOpen(true)}
            data-testid="rewards-open-posters"
          >
            Posters
          </button>
        </div>
        <div className="relative z-10 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[40px] font-extrabold leading-none tracking-tight tabular">
              {readyCount > 0 ? readyCount : formatInr(0)}
            </p>
            <p className="mt-1 text-[14px] font-medium">
              {readyCount > 0 ? "Rewards ready" : "Total Rewards"}
            </p>
          </div>
          <div className="flex gap-1 text-[#B45309]/85" aria-hidden>
            <MaterialIcon name="emoji_events" className="text-[40px]" />
            <MaterialIcon name="celebration" className="mt-4 text-[28px]" />
          </div>
        </div>
      </div>

      <div className="-mt-4 space-y-4 px-4">
        <Link
          href="/me/rewards/scan"
          className="pressable flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-black/5"
          data-testid="rewards-scan-cta"
        >
          <MaterialIcon name="qr_code_2" className="text-[28px] text-[#1A73E8]" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold">Scan packaging to play</p>
            <p className="text-[12px] text-[#5F6368]">Camera → sticker QR → claim &amp; redeem</p>
          </div>
          <MaterialIcon name="photo_camera" className="text-[#1A73E8]" />
        </Link>

        {!signedIn ? (
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
            <p className="text-[15px] font-semibold">Sign in to sync rewards</p>
            <p className="mt-1 text-[12px] text-[#5F6368]">
              Login unlocks claims, then we send you to the offer or kitchen.
            </p>
            <button
              type="button"
              className="pressable mt-3 rounded-full bg-[#1A73E8] px-5 py-2.5 text-[13px] font-extrabold text-white"
              onClick={() => {
                setPendingHref("/me/rewards");
                setAuthOpen(true);
              }}
            >
              Login
            </button>
          </div>
        ) : loading ? (
          <p className="py-8 text-center text-sm text-[#5F6368]">Loading rewards…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3" data-testid="rewards-grid">
            {rows.map((row) => (
              <button
                key={`${row.claimId}-${row.restaurantId}`}
                type="button"
                className="pressable flex aspect-square flex-col items-center justify-center rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-black/5"
                onClick={() => goAuthed(`/r/${row.restaurantId}/menu?redeemed=1`)}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A73E8]">
                  <MaterialIcon
                    name="emoji_events"
                    className="text-[24px] text-white [font-variation-settings:'FILL'_1]"
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-[#5F6368]">You won</p>
                <p className="line-clamp-2 text-[13px] font-extrabold leading-tight">{row.title}</p>
                <p className="mt-1 text-[10px] text-[#5F6368]">{row.restaurantName}</p>
                <span className="mt-2 rounded-full bg-[#E8F0FE] px-2.5 py-1 text-[10px] font-extrabold text-[#1A73E8]">
                  Redeem
                </span>
              </button>
            ))}

            {PENDING_TILES.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={`pressable relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl p-3 shadow-sm ${
                  tile.tone === "green" ? "bg-[#0F9D58]" : "bg-[#1A73E8]"
                }`}
                onClick={() => setPostersOpen(true)}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 70%, #fff 1.5px, transparent 1.5px)",
                    backgroundSize: "16px 16px, 22px 22px",
                  }}
                />
                <div
                  className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${
                    tile.tone === "green" ? "bg-[#0B8043]" : "bg-[#0B57D0]"
                  }`}
                >
                  <MaterialIcon name="emoji_events" className="text-[24px] text-white" />
                </div>
                <p className="relative z-10 mt-2 text-[12px] font-bold text-white">{tile.label}</p>
                <p className="relative z-10 text-[10px] text-white/75">Tap to open</p>
              </button>
            ))}

            <Link
              href="/hub/save-and-win"
              className="pressable flex aspect-square flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F9C732]/40">
                <MaterialIcon name="group_add" className="text-[24px] text-[#92400e]" />
              </div>
              <p className="mt-2 text-[11px] font-medium text-[#5F6368]">Refer &amp; Win</p>
              <p className="font-display text-[18px] font-extrabold">₹200</p>
            </Link>
          </div>
        )}

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#5F6368]">
            Rules &amp; conditions
          </p>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-snug text-[#3C4043]">
            <li>Redeem at the kitchen on the claim · platform offers apply once per cart.</li>
            <li>Min order &amp; expiry follow each offer. Unused value may land in Loyalty credits.</li>
            <li>Refer &amp; Win pool is ₹200. Friend must opt in on WhatsApp to unlock.</li>
          </ul>
        </div>
      </div>

      <RewardPostersOverlay open={postersOpen} onClose={() => setPostersOpen(false)} />
      <ProfileConsentSheet
        open={authOpen}
        onComplete={() => {
          setAuthOpen(false);
          const href = pendingHref ?? "/me/rewards";
          setPendingHref(null);
          window.location.href = href;
        }}
      />
    </main>
  );
}
