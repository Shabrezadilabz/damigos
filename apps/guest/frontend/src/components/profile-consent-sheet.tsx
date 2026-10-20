"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  fetchMe,
  saveGuestConsents,
  saveGuestProfile,
  sparkOptIn,
  verifyGuestOtp,
} from "@/lib/api";
import { setGuestToken } from "@/lib/session";

type Props = {
  open: boolean;
  onComplete: () => void;
  restaurantId?: string;
  scanId?: string | null;
};

/** G-02 — one-time profile + separate consents (+ Spark WA opt-in when marketing) */
export function ProfileConsentSheet({ open, onComplete, restaurantId, scanId }: Props) {
  const [step, setStep] = useState<"otp" | "profile">("otp");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [transactional, setTransactional] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [game, setGame] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await verifyGuestOtp(phone, code);
      setGuestToken(res.token);
      setToken(res.token);
      const me = await fetchMe(res.token);
      if (me.profileComplete) {
        onComplete();
        return;
      }
      if (me.name) setName(me.name);
      setStep("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await saveGuestProfile(token, name.trim());
      await saveGuestConsents(token, { transactional, marketing, game });
      if (marketing && restaurantId) {
        try {
          const spark = await sparkOptIn({ phone, restaurantId, scanId });
          if (spark.token) setGuestToken(spark.token);
        } catch {
          /* consents already saved; Spark invite is best-effort */
        }
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-background p-6 shadow-xl sm:rounded-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
          {step === "otp" ? "Verify your phone" : "Complete your profile once"}
        </h2>
        <p className="mt-1 text-sm text-foreground/65">
          Marketing and game consent are separate from order updates (DPDP).
        </p>

        {step === "otp" ? (
          <form onSubmit={(e) => void onVerifyOtp(e)} className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-border px-3 py-3 text-sm"
              placeholder="Phone (+91)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-border px-3 py-3 text-sm tracking-widest"
              placeholder="OTP (dev: 000000)"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              Verify
            </Button>
          </form>
        ) : (
          <form onSubmit={(e) => void onSaveProfile(e)} className="mt-4 space-y-3">
            <input
              className="w-full rounded-xl border border-border px-3 py-3 text-sm"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={transactional}
                onChange={(e) => setTransactional(e.target.checked)}
                required
              />
              <span>I agree to transactional messages for orders (required)</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>WhatsApp marketing from this restaurant (optional)</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={game} onChange={(e) => setGame(e.target.checked)} />
              <span>Participate in reward games (optional)</span>
            </label>
            <Button type="submit" className="w-full" disabled={loading || !transactional}>
              Save & continue
            </Button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
