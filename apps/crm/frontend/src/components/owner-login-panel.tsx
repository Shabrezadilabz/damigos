"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { verifyCrmOtp } from "@/lib/api";
import { setCrmSession, setCrmToken } from "@/lib/session";
import { cn } from "@/lib/utils";

function fieldClass() {
  return "h-11 w-full rounded-lg bg-surface-container-low px-3 text-sm text-foreground transition focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20";
}

type Props = {
  onSuccess: () => void;
  className?: string;
  fullBleed?: boolean;
  initialPhone?: string;
};

export function OwnerLoginPanel({ onSuccess, className, fullBleed, initialPhone }: Props) {
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [phone, setPhone] = useState(initialPhone ?? "9876543210");
  const [otpDigits, setOtpDigits] = useState(["0", "0", "0", "0", "0", "0"]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(48);

  useEffect(() => {
    const t = window.setInterval(() => setOtpSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (initialPhone) setPhone(initialPhone);
  }, [initialPhone]);

  const otpCode = otpDigits.join("");
  const timerLabel = `Expires in ${String(Math.floor(otpSeconds / 60)).padStart(2, "0")}:${String(otpSeconds % 60).padStart(2, "0")}`;

  const onVerify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
      const res = await verifyCrmOtp(normalizedPhone, otpCode);
      setCrmToken(res.token);
      setCrmSession({ restaurantId: res.restaurantId ?? null, roles: res.roles });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }, [onSuccess, otpCode, phone]);

  function onOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function onOtpKeyDown(index: number, key: string) {
    if (key === "Backspace" && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
  }

  return (
    <section
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-8 shadow-md sm:p-10",
        fullBleed && "mx-auto w-full max-w-lg",
        className,
      )}
    >
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-gradient-to-tr from-amber-200/30 to-transparent blur-3xl" />
      <div className="relative flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-surface-container-high px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            Console Terminal
          </span>
          <div className="flex items-center gap-1 text-xs font-semibold text-tertiary">
            <MaterialIcon name="lock" className="text-[16px]" />
            Encrypted Session
          </div>
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">Owner login</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            For activated outlets only — use the director mobile registered during onboarding.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-surface-container-low p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-lowest text-primary shadow-sm">
            <MaterialIcon name="phone_android" className="text-[26px]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold">Passwordless OTP</p>
            <p className="truncate text-xs text-on-surface-variant">One-time code via WhatsApp Business pipe.</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">Registered director contact</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                <MaterialIcon name="check_circle" className="text-[14px]" />
                Verified Outlet Ready
              </span>
            </div>
            <div className="flex gap-2">
              <div className="flex h-12 items-center rounded-lg bg-surface-container-low px-3 text-xs font-semibold text-on-surface-variant">
                +91
              </div>
              <input
                className={cn(fieldClass(), "h-12 flex-1")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
              <button
                type="button"
                className="h-12 whitespace-nowrap rounded-lg bg-surface-container-high px-4 text-xs font-semibold hover:bg-surface-container"
                onClick={() => setOtpSeconds(60)}
              >
                Resend OTP
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface-variant">6-Digit Access Token</span>
              <span className="text-[10px] font-bold text-on-surface-variant">{timerLabel}</span>
            </div>
            <div className="grid grid-cols-6 gap-2 sm:gap-3">
              {otpDigits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  className="h-14 w-full rounded-xl bg-surface-container-low text-center font-[family-name:var(--font-display)] text-xl font-bold shadow-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={1}
                  inputMode="numeric"
                  value={d}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(i, e.key)}
                />
              ))}
            </div>
            <p className="text-[10px] text-on-surface-variant">Dev demo: OTP 000000 · owner 9876543210</p>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-3.5">
            <div className="flex items-center gap-2.5">
              <MaterialIcon name="hub" className="text-[20px] text-primary" />
              <div>
                <p className="text-xs font-semibold">Auto-sync with POS ledger</p>
                <p className="text-xs text-on-surface-variant">Petpooja &amp; UrbanPiper adapters hot-standby</p>
              </div>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
      <div className="relative mt-6 flex flex-col gap-3 pt-6">
        <button
          type="button"
          disabled={loading}
          onClick={() => void onVerify()}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-container disabled:opacity-60"
        >
          <MaterialIcon name="domain_verification" className="text-[20px]" />
          {loading ? "Verifying…" : "Verify & enter CRM"}
        </button>
        {error ? <p className="text-center text-sm text-red-700">{error}</p> : null}
        <div className="flex items-center justify-center gap-2 py-1 text-center text-xs font-medium text-on-surface-variant">
          <MaterialIcon name="shield" className="text-[16px] text-tertiary" />
          Post-aggregator layer — your guests, your data.
        </div>
      </div>
    </section>
  );
}
