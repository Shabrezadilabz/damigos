"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { WaChrome } from "@/components/wa-chrome";
import { fetchWaStatus, sparkOptIn, sparkInvite } from "@/lib/api";
import { setGuestToken } from "@/lib/session";

/**
 * DEC-010 — After packaging scan: Spark marketing Yes → play & redeem webview.
 */
function SparkBridgeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const restaurantId = params.get("restaurantId") ?? "";
  const scanId = params.get("scan");
  const playPath = useMemo(() => {
    if (!restaurantId) return "/hub";
    return `/r/${restaurantId}${scanId ? `?scan=${scanId}` : ""}`;
  }, [restaurantId, scanId]);

  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [waMe, setWaMe] = useState<string | null>(null);
  const [kitchenHint, setKitchenHint] = useState("this kitchen");

  useEffect(() => {
    void fetchWaStatus()
      .then((s) => setWaMe(s.sparkWaMeE164 ?? null))
      .catch(() => undefined);
  }, []);

  const waDeepLink = useMemo(() => {
    if (!waMe) return null;
    const text = encodeURIComponent(
      `Hi Spark — I scanned packaging and want to unlock my reward (${scanId?.slice(0, 8) ?? "play"}).`,
    );
    return `https://wa.me/${waMe}?text=${text}`;
  }, [waMe, scanId]);

  async function onYesUnlock() {
    if (!restaurantId) {
      setError("Missing kitchen — rescan the packaging QR.");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter your WhatsApp number to get the unlock message.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const opted = await sparkOptIn({
        phone: digits,
        restaurantId,
        scanId: scanId ?? undefined,
      });
      if (opted.token) setGuestToken(opted.token);
      if (opted.restaurantName) setKitchenHint(opted.restaurantName);
      await sparkInvite({
        phone: digits,
        restaurantId,
        scanId: scanId ?? undefined,
      }).catch(() => undefined);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach Spark");
    } finally {
      setBusy(false);
    }
  }

  function goPlay() {
    router.push(playPath);
  }

  return (
    <>
      <WaChrome title="Spark by D'aMigo's" subtitle="Marketing opt-in · Packaging perks" />
      <main className="mx-auto max-w-lg space-y-5 px-4 pb-16 pt-[7.25rem]">
        <div className="rounded-3xl bg-inverse-surface p-5 text-inverse-on-surface shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tertiary-fixed-dim">
            Step 1 · WhatsApp
          </p>
          <h1 className="mt-2 font-display text-[26px] font-extrabold leading-tight">
            Unlock rewards on Spark
          </h1>
          <p className="mt-2 text-[14px] text-white/70">
            You scanned packaging from <strong className="text-white">{kitchenHint}</strong>. Opt in
            for kitchen offers, then play the spinner in WhatsApp&apos;s browser and redeem on the
            menu.
          </p>
        </div>

        {!sent ? (
          <div className="space-y-3 rounded-2xl border border-border bg-surface-container-lowest p-4">
            <label className="block text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">
              WhatsApp number
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="91XXXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[15px] text-foreground outline-none ring-primary focus:ring-2"
              />
            </label>
            <Button
              className="pressable w-full"
              disabled={busy || !restaurantId}
              onClick={() => void onYesUnlock()}
            >
              {busy ? "Sending…" : "Yes — unlock reward on Spark"}
            </Button>
            {waDeepLink ? (
              <a
                href={waDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[13px] font-semibold text-foreground"
              >
                <MaterialIcon name="chat" className="text-[18px]" />
                Open Spark in WhatsApp
              </a>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-success/30 bg-success/10 p-4">
            <p className="text-[14px] font-semibold text-foreground">
              Check WhatsApp — tap <strong>Yes, Unlock Reward</strong> on Spark.
            </p>
            <p className="text-[12px] text-on-surface-variant">
              Spark will reply with your play link. Or continue here in the webview:
            </p>
            <Button className="pressable w-full" onClick={goPlay}>
              Open play &amp; redeem
            </Button>
          </div>
        )}

        <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-[12px] text-on-surface-variant">
          <p className="font-semibold text-foreground">Already opted in?</p>
          <Button variant="outline" className="pressable mt-2 w-full" onClick={goPlay}>
            Continue to play
          </Button>
          <p className="mt-3">
            Skip offers?{" "}
            <Link href={`/r/${restaurantId}/menu`} className="font-semibold text-primary underline">
              View menu
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

export default function SparkBridgePage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-on-surface-variant">Loading Spark…</p>}>
      <SparkBridgeInner />
    </Suspense>
  );
}
