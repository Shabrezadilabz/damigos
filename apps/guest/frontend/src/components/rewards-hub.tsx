"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { WaChrome } from "@/components/wa-chrome";
import { WinConfetti } from "@/components/win-confetti";
import {
  claimReward,
  fetchActiveOffers,
  fetchPlayByScan,
  formatInr,
  spinReward,
  type GuestRestaurantBrand,
  type RewardOutcome,
} from "@/lib/api";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";
import { getGuestToken } from "@/lib/session";

type Props = {
  restaurantId: string;
  scanId: string | null;
  brand?: GuestRestaurantBrand | null;
  restaurantName?: string;
};

type Mode = "spin" | "scratch";

export function RewardsHub({ restaurantId, scanId, brand, restaurantName = "Kitchen" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("spin");
  const [offers, setOffers] = useState<{ id: string; title: string; description: string | null }[]>(
    [],
  );
  const [playId, setPlayId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RewardOutcome | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [claiming, setClaiming] = useState(false);

  const loadPlay = useCallback(async () => {
    if (!scanId) return;
    const res = await fetchPlayByScan(scanId);
    if (res.play) {
      setPlayId(res.play.playId);
      setOutcome(res.play.outcome);
      setClaimed(res.play.claimed);
      if (res.play.outcome && !res.play.claimed) setWinOpen(true);
    }
  }, [scanId]);

  useEffect(() => {
    void fetchActiveOffers(restaurantId)
      .then(setOffers)
      .catch(() => undefined);
    void loadPlay().catch(() => undefined);
  }, [restaurantId, loadPlay]);

  async function onSpin() {
    if (!scanId) {
      setError("Rescan packaging QR to unlock rewards.");
      return;
    }
    setSpinning(true);
    setError(null);
    try {
      const res = await spinReward({ restaurantId, scanId, mode });
      setPlayId(res.playId);
      setOutcome(res.outcome);
      setBurstKey((k) => k + 1);
      setWinOpen(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([20, 40, 20, 40, 60]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spin failed");
    } finally {
      setSpinning(false);
    }
  }

  async function onClaim() {
    if (!playId) return;
    if (!getGuestToken()) {
      setAuthOpen(true);
      return;
    }
    setError(null);
    setClaiming(true);
    try {
      await claimReward(playId);
      setClaimed(true);
      setWinOpen(false);
      // Redeem → that restaurant menu (auto-apply claim on cart)
      router.push(`/r/${restaurantId}/menu?redeemed=1`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claim failed";
      if (msg.includes("consent") || msg.includes("Consent")) {
        setAuthOpen(true);
      } else {
        setError(msg);
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <>
      <WaChrome title={restaurantName} subtitle="Packaging Perks · Direct D2C" creditsLabel="Play" />

      <section className="mx-auto max-w-lg space-y-4 px-4 pb-10 pt-[7.25rem]">
        <p className="text-[13px] text-on-surface-variant">
          You scanned our packaging — rewards inside. Promotional offers only; T&amp;C apply.
        </p>

        {offers.length > 0 ? (
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {offers.map((o) => (
              <div
                key={o.id}
                className="min-w-[200px] shrink-0 rounded-2xl border border-border bg-surface-container-lowest p-3 text-sm shadow-sm"
              >
                <p className="font-semibold">{o.title}</p>
                {o.description ? (
                  <p className="mt-1 text-xs text-on-surface-variant">{o.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex rounded-xl bg-surface-container-low p-1">
          {(["spin", "scratch"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`pressable flex-1 rounded-lg py-2.5 text-[13px] font-semibold capitalize ${
                mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-on-surface-variant"
              }`}
              onClick={() => setMode(m)}
            >
              {m === "spin" ? "Fortune Wheel" : "Scratch Card"}
            </button>
          ))}
        </div>

        {/* CRED charcoal game zone */}
        <div className="relative overflow-hidden rounded-3xl bg-inverse-surface p-6 text-inverse-on-surface shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-tertiary-fixed-dim/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-primary/30 blur-2xl" />

          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-tertiary-fixed-dim">
            Dashing Sparkle Zone
          </p>

          <div className="relative z-10 mt-4 flex flex-col items-center">
            {mode === "spin" ? (
              <div
                className={`mb-5 flex h-40 w-40 items-center justify-center rounded-full border-4 border-tertiary-fixed-dim bg-gradient-to-br from-[#2a2a2a] to-[#161616] text-center text-[12px] font-bold uppercase tracking-wide text-tertiary-fixed-dim shadow-inner ${
                  spinning ? "animate-spin-wheel scale-105" : ""
                }`}
                style={
                  brand
                    ? { borderColor: brand.accentColor || undefined, color: brand.accentColor }
                    : undefined
                }
              >
                {outcome ? "You won!" : "Spin to win"}
              </div>
            ) : (
              <div className="mb-5 grid h-36 w-full max-w-xs place-items-center rounded-2xl bg-gradient-to-br from-tertiary-fixed to-tertiary-fixed-dim text-sm font-bold text-[#261900]">
                {outcome ? outcome.title : "Scratch to reveal"}
              </div>
            )}

            {!outcome ? (
              <Button
                className="pressable w-full max-w-xs bg-tertiary-fixed-dim text-[#261900] hover:bg-tertiary-fixed"
                disabled={spinning || !scanId}
                onClick={() => void onSpin()}
              >
                {spinning ? "…" : mode === "spin" ? "Spin now" : "Reveal scratch"}
              </Button>
            ) : (
              <Button className="pressable w-full max-w-xs" onClick={() => setWinOpen(true)}>
                View pouch perk
              </Button>
            )}

            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
            {!scanId ? (
              <p className="mt-3 text-center text-xs text-white/50">
                Open menu directly or scan QR again for a rewards session.
              </p>
            ) : null}
          </div>
        </div>

        <Button asChild variant="outline" className="pressable w-full">
          <Link href={`/r/${restaurantId}/menu`}>View menu without offer</Link>
        </Button>
      </section>

      {/* Sparkle Win bottom sheet — G-01.07b / P1-T17 */}
      {winOpen && outcome ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sparkle-win-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWinOpen(false);
          }}
        >
          <div className="sparkle-win-sheet sheet-spring relative w-full max-w-lg overflow-hidden rounded-t-[28px] bg-inverse-surface p-6 pb-safe text-inverse-on-surface shadow-2xl">
            <WinConfetti active={winOpen && !claimed} burstKey={burstKey} />
            <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-tertiary-fixed-dim/25 blur-3xl" />
            <div className="pointer-events-none absolute -left-8 bottom-8 h-32 w-32 rounded-full bg-primary/25 blur-3xl" />
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-tertiary-fixed-dim/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-tertiary-fixed-dim">
                  <MaterialIcon name="auto_awesome" className="sparkle-icon text-[14px]" />
                  Pouch Perk Unlocked
                </span>
                <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/55 ring-1 ring-white/10">
                  {outcome.billLabel ??
                    (outcome.scope === "PLATFORM_WIDE"
                      ? "D'aMigo Platform Offer"
                      : "Restaurant scoped")}
                </span>
              </div>
              <h2
                id="sparkle-win-title"
                className="font-display text-[28px] font-extrabold tracking-tight text-tertiary-fixed-dim"
              >
                {outcome.title}
              </h2>
              {outcome.description ? (
                <p className="mt-2 text-[14px] text-white/70">{outcome.description}</p>
              ) : null}

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Min order",
                    value:
                      outcome.minOrderPaise && outcome.minOrderPaise > 0
                        ? formatInr(outcome.minOrderPaise)
                        : "As per T&C",
                  },
                  { label: "Expiry", value: `${outcome.expiresDays}d` },
                  { label: "Redeem", value: "Instant" },
                ].map((cell) => (
                  <div
                    key={cell.label}
                    className="rounded-xl bg-white/5 px-2 py-3 text-center ring-1 ring-white/10"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                      {cell.label}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold tabular">{cell.value}</p>
                  </div>
                ))}
              </div>

              {outcome.terms ? (
                <p className="mt-3 text-[10px] leading-snug text-white/40">{outcome.terms}</p>
              ) : null}

              {!claimed ? (
                <Button
                  className="pressable mt-5 w-full bg-tertiary-fixed-dim text-[#261900] hover:bg-tertiary-fixed"
                  disabled={claiming}
                  onClick={() => void onClaim()}
                >
                  {claiming ? "Redeeming…" : "Redeem & Place Order"}
                </Button>
              ) : (
                <Button asChild className="pressable mt-5 w-full">
                  <Link href={`/r/${restaurantId}/menu?redeemed=1`}>Continue to menu</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                className="pressable mt-1 w-full text-white/70 hover:bg-white/5 hover:text-white"
                onClick={() => setWinOpen(false)}
              >
                Maybe later — we&apos;ll remind you on Spark
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ProfileConsentSheet
        open={authOpen}
        restaurantId={restaurantId}
        scanId={scanId}
        onComplete={() => {
          setAuthOpen(false);
          void onClaim();
        }}
      />
    </>
  );
}
