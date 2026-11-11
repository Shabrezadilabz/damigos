"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { ScratchCard } from "@/components/scratch-card";
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
import { cn } from "@/lib/utils";

type Props = {
  restaurantId: string;
  scanId: string | null;
  brand?: GuestRestaurantBrand | null;
  restaurantName?: string;
};

type Mode = "spin" | "scratch";

type OfferChip = {
  id: string;
  title: string;
  description: string | null;
  prizeType?: string;
  prizeValue?: number;
};

/** YUMM plum / milk wheel wedges */
const WHEEL_COLORS = ["#381932", "#5a3352", "#7a4f70", "#b98aae", "#a37798", "#2a1226", "#86717f", "#6b5466"];

const SPIN_MS = 3200;

function prizeBadge(o: OfferChip) {
  if (o.prizeType === "no_prize") return "Better luck";
  if (o.prizeType === "percent" && o.prizeValue != null) return `${o.prizeValue}% off`;
  if (o.prizeType === "flat_off_paise" && o.prizeValue != null)
    return `₹${Math.round(o.prizeValue / 100)} off`;
  if (o.prizeType === "free_item")
    return o.prizeValue && o.prizeValue > 0
      ? `Free · upto ₹${Math.round(o.prizeValue / 100)}`
      : "Free item";
  return "Perk";
}

function findSegmentIndex(segments: OfferChip[], outcome: RewardOutcome | null | undefined): number {
  if (!outcome || segments.length === 0) return 0;
  const byTitle = segments.findIndex((s) => s.title === outcome.title);
  if (byTitle >= 0) return byTitle;
  const byType = segments.findIndex((s) => s.prizeType && s.prizeType === outcome.prizeType);
  if (byType >= 0) return byType;
  return 0;
}

export function RewardsHub({ restaurantId, scanId, brand, restaurantName = "Kitchen" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("spin");
  const [offers, setOffers] = useState<OfferChip[]>([]);
  const [playId, setPlayId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<RewardOutcome | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [wheelDeg, setWheelDeg] = useState(0);
  const [scratchForced, setScratchForced] = useState(0);
  const [pendingScratch, setPendingScratch] = useState<{
    playId: string;
    outcome: RewardOutcome;
  } | null>(null);
  /** S1.7 — "Better luck next time" segment: no claim, no redeem CTA */
  const noPrize = outcome?.prizeType === "no_prize";

  const loadPlay = useCallback(async () => {
    if (!scanId) return;
    const res = await fetchPlayByScan(scanId);
    if (res.play) {
      setPlayId(res.play.playId);
      setOutcome(res.play.outcome);
      setClaimed(res.play.claimed);
      if (res.play.outcome && !res.play.claimed && res.play.outcome.prizeType !== "no_prize") {
        setWinOpen(true);
      }
    }
  }, [scanId]);

  useEffect(() => {
    void fetchActiveOffers(restaurantId)
      .then((rows) => setOffers(rows ?? []))
      .catch(() => setOffers([]));
    void loadPlay().catch(() => undefined);
  }, [restaurantId, loadPlay]);

  const segments = useMemo(() => {
    if (offers.length > 0) return offers.slice(0, 8);
    return [
      { id: "p1", title: "15% off", description: null },
      { id: "p2", title: "₹50 off", description: null },
      { id: "p3", title: "Better luck next time", description: null, prizeType: "no_prize" },
      { id: "p4", title: "₹20 off", description: null },
    ];
  }, [offers]);

  const wheelGradient = useMemo(() => {
    const n = Math.max(segments.length, 1);
    const step = 360 / n;
    const parts = segments.map((_, i) => {
      const c = WHEEL_COLORS[i % WHEEL_COLORS.length]!;
      return `${c} ${i * step}deg ${(i + 1) * step}deg`;
    });
    return `conic-gradient(from -90deg, ${parts.join(", ")})`;
  }, [segments]);

  function openWin(next: RewardOutcome, nextPlayId: string) {
    setPlayId(nextPlayId);
    setOutcome(next);
    setBurstKey((k) => k + 1);
    setWinOpen(true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(next.prizeType === "no_prize" ? [12, 40, 12] : [20, 40, 20, 40, 60]);
    }
  }

  async function onSpin() {
    if (!scanId) {
      setError("Rescan packaging QR to unlock rewards.");
      return;
    }
    setSpinning(true);
    setError(null);
    setScratchForced(0);
    setPendingScratch(null);
    try {
      const res = await spinReward({ restaurantId, scanId, mode });
      if (!res.outcome) throw new Error("No prize returned");

      if (mode === "spin") {
        const idx = findSegmentIndex(segments, res.outcome);
        const n = segments.length || 1;
        const segmentAngle = 360 / n;
        // Pointer at top (−90° in conic); land mid-wedge under pointer
        const midFromStart = idx * segmentAngle + segmentAngle / 2;
        const land = (360 - midFromStart) % 360;
        const turns = 5 + Math.floor(Math.random() * 2);
        setWheelDeg((d) => {
          const current = ((d % 360) + 360) % 360;
          const delta = (land - current + 360) % 360;
          return d + turns * 360 + delta;
        });
        await new Promise((r) => window.setTimeout(r, SPIN_MS));
        openWin(res.outcome, res.playId);
      } else {
        setPendingScratch({ playId: res.playId, outcome: res.outcome });
        setOutcome(res.outcome);
        setPlayId(res.playId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Spin failed");
    } finally {
      setSpinning(false);
    }
  }

  function onScratchComplete() {
    if (!pendingScratch) return;
    openWin(pendingScratch.outcome, pendingScratch.playId);
    setPendingScratch(null);
    setScratchForced(100);
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

  const idleWheel = !spinning && !outcome;

  return (
    <>
      <WaChrome title={restaurantName} subtitle="Packaging Perks · Direct D2C" creditsLabel="Play" />

      <section className="mx-auto max-w-lg space-y-4 px-4 pb-10 pt-[7.25rem]">
        <p className="text-[13px] text-on-surface-variant">
          Spin or scratch to unlock a kitchen perk from this pouch. One play per scan · T&amp;C apply.
        </p>

        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
            Prize pool · {segments.length} items
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {segments.map((o) => (
              <div
                key={o.id}
                className="min-w-[9.5rem] shrink-0 rounded-lg border border-border bg-surface-container-lowest p-3 text-sm shadow-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                  {prizeBadge(o)}
                </p>
                <p className="mt-1 font-semibold leading-snug">{o.title}</p>
                {o.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">{o.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex rounded-lg border border-border bg-surface-container-low p-1">
          {(["spin", "scratch"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={Boolean(outcome) || spinning}
              className={`pressable flex-1 rounded-md py-2.5 text-[13px] font-semibold capitalize disabled:opacity-60 ${
                mode === m ? "bg-primary text-primary-foreground shadow-sm" : "text-on-surface-variant"
              }`}
              onClick={() => setMode(m)}
            >
              {m === "spin" ? "Fortune Wheel" : "Scratch Card"}
            </button>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border bg-surface-container p-6 text-foreground shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            Dashing Sparkle Zone
          </p>

          <div className="relative z-10 mt-4 flex flex-col items-center">
            {mode === "spin" ? (
              <div className={cn("relative mb-5", idleWheel && "wheel-idle-wobble")}>
                <div
                  className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 -translate-y-1 border-x-[10px] border-t-[16px] border-x-transparent border-t-primary drop-shadow"
                  aria-hidden
                />
                <div
                  className="relative flex h-52 w-52 items-center justify-center rounded-full border-4 border-card shadow-inner"
                  style={{
                    background: wheelGradient,
                    transform: `rotate(${wheelDeg}deg)`,
                    borderColor: brand?.accentColor || undefined,
                    transition: spinning
                      ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.75, 0.12, 1)`
                      : "transform 400ms ease",
                  }}
                >
                  <div className="absolute inset-[18%] flex items-center justify-center rounded-full bg-background text-center text-[11px] font-bold uppercase tracking-wide text-foreground shadow-sm">
                    {outcome ? (noPrize ? "…" : "Won!") : spinning ? "…" : "Spin"}
                  </div>
                  {segments.map((seg, i) => {
                    const n = segments.length;
                    const mid = (i + 0.5) * (360 / n) - 90;
                    const rad = (mid * Math.PI) / 180;
                    const x = 50 + Math.cos(rad) * 34;
                    const y = 50 + Math.sin(rad) * 34;
                    return (
                      <span
                        key={seg.id}
                        className="pointer-events-none absolute max-w-[4.2rem] truncate text-center text-[9px] font-bold leading-tight text-primary-foreground drop-shadow"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {seg.title}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <ScratchCard
                className="mb-5"
                title={outcome?.title ?? pendingScratch?.outcome.title ?? "Scratch to reveal"}
                subtitle={pendingScratch || outcome ? "Your perk" : "Hidden perk"}
                forcedReveal={scratchForced}
                disabled={!pendingScratch && !outcome}
                onRevealComplete={onScratchComplete}
              />
            )}

            {!outcome && !pendingScratch ? (
              <Button
                className="pressable w-full max-w-xs"
                disabled={spinning || !scanId}
                onClick={() => void onSpin()}
              >
                {spinning
                  ? mode === "spin"
                    ? "Spinning…"
                    : "Preparing…"
                  : mode === "spin"
                    ? "Spin the wheel"
                    : "Get scratch card"}
              </Button>
            ) : pendingScratch ? (
              <p className="text-center text-xs font-semibold text-on-surface-variant">
                Scratch the foil to reveal your perk
              </p>
            ) : (
              <Button className="pressable w-full max-w-xs" variant="accent" onClick={() => setWinOpen(true)}>
                View pouch perk
              </Button>
            )}

            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
            {!scanId ? (
              <p className="mt-3 text-center text-xs text-on-surface-variant">
                Open menu directly or scan QR again for a rewards session.
              </p>
            ) : null}
          </div>
        </div>

        <Button asChild variant="outline" className="pressable w-full">
          <Link href={`/r/${restaurantId}/menu`}>View menu without offer</Link>
        </Button>
      </section>

      {winOpen && outcome ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-primary/55 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sparkle-win-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWinOpen(false);
          }}
        >
          <div className="sparkle-win-sheet sheet-spring relative w-full max-w-lg overflow-hidden rounded-t-[28px] border border-border bg-surface-container-lowest p-6 pb-safe text-foreground shadow-2xl">
            <WinConfetti active={winOpen && !claimed && !noPrize} burstKey={burstKey} />
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
                    noPrize
                      ? "bg-secondary text-on-surface-variant"
                      : "bg-accent/30 text-primary",
                  )}
                >
                  <MaterialIcon name="auto_awesome" className="sparkle-icon text-[14px]" />
                  {noPrize ? "No win this time" : "Pouch Perk Unlocked"}
                </span>
                <span className="rounded-full border border-border bg-surface-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  {outcome.billLabel ??
                    (outcome.scope === "PLATFORM_WIDE"
                      ? "D'aMigo Platform Offer"
                      : "Restaurant scoped")}
                </span>
              </div>
              <h2
                id="sparkle-win-title"
                className={cn(
                  "font-display text-[28px] font-extrabold tracking-tight win-title-pop",
                  noPrize ? "no-prize-shimmer" : "text-primary",
                )}
              >
                {outcome.title}
              </h2>
              {outcome.description ? (
                <p className="mt-2 text-[14px] text-on-surface-variant">{outcome.description}</p>
              ) : null}
              <p className="mt-2 text-[13px] font-semibold text-foreground">
                {noPrize
                  ? "No reward to claim — you can still order from the menu."
                  : outcome.prizeType === "percent"
                    ? `${outcome.prizeValue}% off your bill (max ₹75)`
                    : outcome.prizeType === "flat_off_paise"
                      ? `${formatInr(outcome.prizeValue)} off at checkout`
                      : outcome.prizeType === "free_item"
                        ? `Free item credit up to ${formatInr(outcome.prizeValue > 0 ? outcome.prizeValue : 9900)}`
                        : "Redeem on this kitchen’s menu"}
              </p>

              <div className={cn("mt-5 grid grid-cols-3 gap-2", noPrize && "hidden")}>
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
                    className="rounded-lg border border-border bg-surface-container px-2 py-3 text-center"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      {cell.label}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold tabular">{cell.value}</p>
                  </div>
                ))}
              </div>

              {outcome.terms ? (
                <p className="mt-3 text-[10px] leading-snug text-on-surface-variant">{outcome.terms}</p>
              ) : null}

              {noPrize ? (
                <Button asChild className="pressable mt-5 w-full">
                  <Link href={`/r/${restaurantId}/menu`}>Continue to menu</Link>
                </Button>
              ) : !claimed ? (
                <Button
                  className="pressable mt-5 w-full"
                  variant="accent"
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
                className="pressable mt-1 w-full text-on-surface-variant hover:bg-surface-container hover:text-foreground"
                onClick={() => setWinOpen(false)}
              >
                {noPrize ? "Close" : "Maybe later — we'll remind you on Spark"}
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
