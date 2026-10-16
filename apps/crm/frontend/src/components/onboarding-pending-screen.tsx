"use client";

import { MaterialIcon } from "@/components/material-icon";
import { OnboardingPromoCarousel } from "@/components/onboarding-promo-carousel";

const STEPS = [
  { label: "Application received", done: true },
  { label: "Ops & compliance review", done: false, active: true },
  { label: "Tenant activated — owner login unlocked", done: false },
];

type Props = {
  submittedAt: string;
  onClearDemo?: () => void;
};

export function OnboardingPendingScreen({ submittedAt, onClearDemo }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl bg-surface-container-lowest p-8 shadow-md sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-primary-fixed shadow-inner">
            <MaterialIcon name="hourglass_top" className="text-[36px] text-primary" />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">Application under review</h1>
          <p className="mt-2 max-w-md text-sm text-on-surface-variant">
            Thanks — your outlet profile is in the activation queue. <strong className="text-foreground">Owner login</strong>{" "}
            stays locked until ops verifies FSSAI, entity details, and activates your tenant (usually 24–48h pilot SLA).
          </p>
          <p className="mt-2 text-[11px] text-on-surface-variant">Submitted {submittedAt}</p>
        </div>
        <ol className="mt-8 space-y-3">
          {STEPS.map((s) => (
            <li
              key={s.label}
              className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3 text-sm"
            >
              <span
                className={
                  s.done
                    ? "flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"
                    : s.active
                      ? "flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary"
                      : "flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant"
                }
              >
                <MaterialIcon name={s.done ? "check" : s.active ? "sync" : "lock"} className="text-[18px]" />
              </span>
              <span className={s.active ? "font-semibold text-foreground" : "text-on-surface-variant"}>{s.label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-lg bg-surface-container-high px-4 py-3 text-center text-xs text-on-surface-variant">
          We will WhatsApp the director number you provided when login is enabled. Need help?{" "}
          <span className="font-semibold text-primary">helpdesk@damigos.in</span>
        </p>
        {onClearDemo ? (
          <button type="button" className="mt-4 w-full text-center text-[10px] text-on-surface-variant underline" onClick={onClearDemo}>
            Dev: clear pending state
          </button>
        ) : null}
      </section>
      <OnboardingPromoCarousel variant="hero" />
    </div>
  );
}
