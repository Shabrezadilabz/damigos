"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  claimReward,
  fetchActiveOffers,
  fetchPlayByScan,
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
};

type Mode = "spin" | "scratch";

export function RewardsHub({ restaurantId, scanId, brand }: Props) {
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

  const loadPlay = useCallback(async () => {
    if (!scanId) return;
    const res = await fetchPlayByScan(scanId);
    if (res.play) {
      setPlayId(res.play.playId);
      setOutcome(res.play.outcome);
      setClaimed(res.play.claimed);
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
    try {
      await claimReward(playId);
      setClaimed(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Claim failed";
      if (msg.includes("consent") || msg.includes("Consent")) {
        setAuthOpen(true);
      } else {
        setError(msg);
      }
    }
  }

  return (
    <>
      <section className="space-y-4 p-4">
        <p className="text-sm text-foreground/80">
          You scanned our packaging — rewards inside. Promotional offers only; T&amp;C apply.
        </p>

        {offers.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {offers.map((o) => (
              <div
                key={o.id}
                className="min-w-[200px] shrink-0 rounded-xl border border-border bg-muted/30 p-3 text-sm"
              >
                <p className="font-semibold">{o.title}</p>
                {o.description && <p className="mt-1 text-xs text-foreground/60">{o.description}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="flex rounded-lg border border-border p-1">
          {(["spin", "scratch"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-semibold capitalize ${
                mode === m ? "bg-primary text-primary-foreground" : "text-foreground/70"
              }`}
              onClick={() => setMode(m)}
            >
              {m === "spin" ? "Spin wheel" : "Scratch card"}
            </button>
          ))}
        </div>

        <div
          className="flex flex-col items-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-8"
          style={
            brand
              ? {
                  borderColor: `${brand.primaryColor}66`,
                  backgroundColor: `${brand.accentColor}18`,
                }
              : undefined
          }
        >
          {mode === "spin" ? (
            <div
              className={`mb-4 flex h-36 w-36 items-center justify-center rounded-full border-4 border-primary bg-background text-center text-xs font-bold uppercase tracking-wide text-primary transition-transform duration-700 ${
                spinning ? "animate-pulse scale-105" : ""
              }`}
              style={
                brand
                  ? {
                      borderColor: brand.primaryColor,
                      color: brand.primaryColor,
                    }
                  : undefined
              }
            >
              {outcome ? "You won!" : "Spin to win"}
            </div>
          ) : (
            <div className="mb-4 grid h-36 w-full max-w-xs place-items-center rounded-xl bg-gradient-to-br from-amber-200 to-amber-500 text-sm font-bold text-amber-950">
              {outcome ? outcome.title : "Scratch reveal"}
            </div>
          )}

          {!outcome && (
            <Button className="w-full max-w-xs" disabled={spinning || !scanId} onClick={() => void onSpin()}>
              {spinning ? "…" : mode === "spin" ? "Spin now" : "Reveal scratch"}
            </Button>
          )}

          {outcome && (
            <div className="w-full max-w-sm space-y-3 text-center">
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-primary">
                {outcome.title}
              </p>
              {outcome.description && <p className="text-sm text-foreground/70">{outcome.description}</p>}
              {outcome.terms && (
                <p className="text-[10px] leading-snug text-foreground/50">{outcome.terms}</p>
              )}
              {!claimed ? (
                <Button className="w-full" onClick={() => void onClaim()}>
                  Avail offer
                </Button>
              ) : (
                <p className="text-sm font-medium text-emerald-800">Offer saved to your profile</p>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          {!scanId && (
            <p className="mt-3 text-xs text-foreground/60">
              Open menu directly or scan QR again for a rewards session.
            </p>
          )}
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link href={`/r/${restaurantId}/menu`}>Skip to menu</Link>
        </Button>
      </section>

      <ProfileConsentSheet
        open={authOpen}
        onComplete={() => {
          setAuthOpen(false);
          void onClaim();
        }}
      />
    </>
  );
}
