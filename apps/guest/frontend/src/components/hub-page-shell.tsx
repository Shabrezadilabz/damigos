"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";

const PERKS = [
  { kitchen: "Biryani Box", coins: 120, badge: "₹50 OFF Ready" },
  { kitchen: "Masala Trail", coins: 45, badge: "Free filter coffee" },
] as const;

/** Stitch g17 — hub chrome (hero header + perks strip) */
export function HubPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-surface-container-lowest/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex h-11 items-center justify-between px-4 text-sm">
          <div className="flex items-center gap-1">
            <MaterialIcon name="lock" className="text-[18px] text-tertiary-container" />
            <span className="text-xs font-semibold">d-amigos.in</span>
            <span className="mx-1 h-1.5 w-1.5 rounded-full bg-border" />
            <MaterialIcon name="verified" className="text-[16px] text-tertiary-container" />
            <span className="text-[10px] font-bold text-on-surface-variant">WhatsApp</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/" className="flex h-11 w-11 items-center justify-center text-on-surface-variant">
              <MaterialIcon name="refresh" className="text-[20px]" />
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">D&apos;aMigo&apos;s Dining</span>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">Hero Hub</h1>
          </div>
          <Link
            href="/orders"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-sm"
          >
            <MaterialIcon name="person" className="text-[18px] text-primary-foreground" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-[7.5rem] md:max-w-3xl">
        <section className="mb-4 flex items-center justify-between rounded-xl bg-surface-container-low p-3 shadow-sm">
          <button type="button" className="flex min-w-0 items-center gap-2 text-left">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
              <MaterialIcon name="location_on" className="text-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Deliver to
              </span>
              <div className="flex items-center gap-0.5">
                <span className="truncate text-sm font-semibold">Koramangala 4th Block</span>
                <MaterialIcon name="keyboard_arrow_down" className="shrink-0 text-[18px] text-primary" />
              </div>
            </div>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-high"
          >
            <MaterialIcon name="notifications_none" className="text-[19px]" />
          </button>
        </section>

        <section className="mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <MaterialIcon name="account_balance_wallet" className="text-[18px] text-tertiary-container" />
              <span className="font-[family-name:var(--font-display)] text-sm font-semibold">Your direct perks</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary">Rewards ready</span>
          </div>
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
            {PERKS.map((p) => (
              <div
                key={p.kitchen}
                className="relative flex w-64 shrink-0 snap-start flex-col justify-between overflow-hidden rounded-xl bg-inverse-surface p-4 text-inverse-on-surface shadow-md"
              >
                <div className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 rounded-full bg-primary/20 blur-xl" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Direct diner credit</span>
                  <p className="text-sm font-bold">{p.kitchen}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold tabular-nums">{p.coins} coins</span>
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                    {p.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {children}
      </main>
    </div>
  );
}
