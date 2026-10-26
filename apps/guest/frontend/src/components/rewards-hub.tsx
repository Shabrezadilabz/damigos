"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type OfferChip = {
  id: string;
  title: string;
  description: string | null;
  prizeType?: string;
  prizeValue?: number;
};

const WHEEL_COLORS = ["#E23744", "#16A34A", "#F59E0B", "#2563EB", "#A855F7", "#0EA5E9", "#EC4899", "#84CC16"];

function prizeBadge(o: OfferChip) {
  if (o.prizeType === "percent" && o.prizeValue != null) return `${o.prizeValue}% off`;
  if (o.prizeType === "flat_off_paise" && o.prizeValue != null)
    return `₹${Math.round(o.prizeValue / 100)} off`;
  if (o.prizeType === "free_item")
    return o.prizeValue && o.prizeValue > 0
      ? `Free · upto ₹${Math.round(o.prizeValue / 100)}`
      : "Free item";
  return "Perk";
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
  const [scratchReveal, setScratchReveal] = useState(0);

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
      .then((rows) => setOffers(rows ?? []))
      .catch(() => setOffers([]));
    void loadPlay().catch(() => undefined);
  }, [restaurantId, loadPlay]);

  const segments = useMemo(() => {
    if (offers.length > 0) return offers.slice(0, 8);
    return [
      { id: "p1", title: "15% off", description: null },
      { id: "p2", title: "₹50 off", description: null },
      { id: "p3", title: "Free drink", description: null },
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

  async function onSpin() {
    if (!scanId) {
      setError("Rescan packaging QR to unlock rewards.");
      return;
    }
    setSpinning(true);
    setError(null);
    setScratchReveal(0);
    try {
      const res = await spinReward({ restaurantId, scanId, mode });
      const idx = Math.max(
        0,
        segments.findIndex((s) => s.title === res.outcome?.title),
      );
      const n = segments.length || 1;
      const segmentAngle = 360 / n;
      const target =
        360 * 5 + (360 - (idx * segmentAngle + segmentAngle / 2)) + Math.floor(Math.random() * 8);
      setWheelDeg((d) => d + target);
      await new Promise((r) => window.setTimeout(r, mode === "spin" ? 2200 : 900));
      if (mode === "scratch") {
        for (let p = 0; p <= 100; p += 20) {
          setScratchReveal(p);
          await new Promise((r) => window.setTimeout(r, 80));
        }
      }
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
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-success">
            Dashing Sparkle Zone
          </p>

          <div className="relative z-10 mt-4 flex flex-col items-center">
            {mode === "spin" ? (
              <div className="relative mb-5">
                <div
                  className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 -translate-y-1 border-x-[10px] border-t-[16px] border-x-transparent border-t-primary"
                  aria-hidden
                />
                <div
                  className="relative flex h-52 w-52 items-center justify-center rounded-full border-4 border-white/20 shadow-inner transition-transform duration-[2200ms] ease-out"
                  style={{
                    background: wheelGradient,
                    transform: `rotate(${wheelDeg}deg)`,
                    borderColor: brand?.accentColor || undefined,
                  }}
                >
                  <div className="absolute inset-[18%] flex items-center justify-center rounded-full bg-background text-center text-[11px] font-bold uppercase tracking-wide text-foreground">
                    {outcome ? "You won!" : spinning ? "…" : "Spin"}
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
                        className="pointer-events-none absolute max-w-[4.2rem] truncate text-center text-[9px] font-bold leading-tight text-white drop-shadow"
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
              <div className="relative mb-5 h-40 w-full max-w-xs overflow-hidden rounded-lg border border-white/15 bg-surface-container-high">
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#EAFF81] p-4 text-center">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[#525252]">
                    Hidden perk
                  </p>
                  <p className="font-display text-[20px] font-bold text-[#171717]">
                    {outcome?.title ?? "Scratch to reveal"}
                  </p>
                </div>
                <div
                  className="absolute inset-0 bg-[repeating-linear-gradient(135deg,#e4e4e7_0_12px,#d4d4d8_12px_24px)] transition-opacity duration-300"
                  style={{ opacity: Math.max(0, 1 - scratchReveal / 100) }}
                />
              </div>
            )}

            {!outcome ? (
              <Button
                className="pressable w-full max-w-xs bg-success text-white hover:bg-success/90"
                disabled={spinning || !scanId}
                onClick={() => void onSpin()}
              >
                {spinning
                  ? mode === "spin"
                    ? "Spinning…"
                    : "Revealing…"
                  : mode === "spin"
                    ? "Spin the wheel"
                    : "Scratch & reveal"}
              </Button>
            ) : (
              <Button className="pressable w-full max-w-xs" onClick={() => setWinOpen(true)}>
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sparkle-win-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWinOpen(false);
          }}
        >
          <div className="sparkle-win-sheet sheet-spring relative w-full max-w-lg overflow-hidden rounded-t-[28px] border border-border bg-surface-container-lowest p-6 pb-safe text-foreground shadow-2xl">
            <WinConfetti active={winOpen && !claimed} burstKey={burstKey} />
            <div className="relative z-10">
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
                  <MaterialIcon name="auto_awesome" className="sparkle-icon text-[14px]" />
                  Pouch Perk Unlocked
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
                className="font-display text-[28px] font-extrabold tracking-tight text-success"
              >
                {outcome.title}
              </h2>
              {outcome.description ? (
                <p className="mt-2 text-[14px] text-on-surface-variant">{outcome.description}</p>
              ) : null}
              <p className="mt-2 text-[13px] font-semibold text-foreground">
                {outcome.prizeType === "percent"
                  ? `${outcome.prizeValue}% off your bill (max ₹75)`
                  : outcome.prizeType === "flat_off_paise"
                    ? `${formatInr(outcome.prizeValue)} off at checkout`
                    : outcome.prizeType === "free_item"
                      ? `Free item credit up to ${formatInr(outcome.prizeValue > 0 ? outcome.prizeValue : 9900)}`
                      : "Redeem on this kitchen’s menu"}
              </p>

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

              {!claimed ? (
                <Button
                  className="pressable mt-5 w-full bg-success text-white hover:bg-success/90"
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
