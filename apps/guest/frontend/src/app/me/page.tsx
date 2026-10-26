"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { clearGuestToken, getGuestToken } from "@/lib/session";
import { fetchMe } from "@/lib/api";

const ROWS = [
  {
    href: "/orders",
    icon: "receipt_long",
    title: "Past Orders",
    sub: "Browse and reorder from your history.",
  },
  {
    href: "/me/addresses",
    icon: "location_on",
    title: "Addresses",
    sub: "Saved areas for packaging delivery.",
  },
  {
    href: "/me/loyalty",
    icon: "loyalty",
    title: "Loyalty credits",
    sub: "Kitchen coins & Direct Perks balance.",
  },
  {
    href: "/me/rewards",
    icon: "card_giftcard",
    title: "Rewards",
    sub: "Spin, scratch & packaging QR perks.",
  },
  {
    href: "/me/settings",
    icon: "settings",
    title: "App Settings",
    sub: "Preferences, permissions and more.",
  },
  {
    href: "mailto:partners@damigos.in?subject=Damigos%20guest%20help",
    icon: "help",
    title: "Help",
    sub: "Email partners@damigos.in for assistance.",
  },
] as const;

/** Guest profile — Ownly P-UI-08 / DEC-016 */
export default function MePage() {
  const [name, setName] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState("Sign in to sync");

  useEffect(() => {
    const token = getGuestToken();
    if (!token) return;
    void fetchMe(token)
      .then((me) => {
        setName(me.name);
        setPhoneHint(me.profileComplete ? "Verified guest" : "Complete your profile");
      })
      .catch(() => undefined);
  }, []);

  function onLogout() {
    clearGuestToken();
    window.location.href = "/hub";
  }

  return (
    <main className="min-h-dvh bg-background pb-10">
      <div className="relative border-b border-border bg-surface-container-low px-4 pb-14 pt-safe">
        <div className="flex items-center justify-between py-3">
          <Link
            href="/hub"
            className="pressable flex h-11 w-11 items-center justify-center rounded-md border border-border bg-surface-container"
            aria-label="Back to hub"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <Link
            href="/me/edit"
            className="pressable rounded-md bg-primary px-4 py-1.5 text-[13px] font-bold text-primary-foreground"
            data-testid="profile-edit"
          >
            Edit
          </Link>
        </div>
        <h1 className="font-display text-[32px] font-extrabold tracking-tight text-foreground">
          {name || "Guest"}
        </h1>
        <p className="mt-1 text-[14px] text-on-surface-variant">{phoneHint}</p>
      </div>

      <div className="space-y-3 px-4 pt-4">
        <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm border border-border">
          {ROWS.slice(0, 4).map((row, i) => (
            <Link
              key={row.title}
              href={row.href}
              className={`pressable flex items-center gap-3 px-4 py-3.5 ${
                i > 0 ? "border-t border-border/60" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
                <MaterialIcon name={row.icon} className="text-[22px] text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{row.title}</p>
                <p className="text-[12px] text-on-surface-variant">{row.sub}</p>
              </div>
              <MaterialIcon name="chevron_right" className="text-[22px] text-on-surface-variant" />
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm border border-border">
          {ROWS.slice(4).map((row, i) => (
            <Link
              key={row.title}
              href={row.href}
              className={`pressable flex items-center gap-3 px-4 py-3.5 ${
                i > 0 ? "border-t border-border/60" : ""
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
                <MaterialIcon name={row.icon} className="text-[22px] text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{row.title}</p>
                <p className="text-[12px] text-on-surface-variant">{row.sub}</p>
              </div>
              <MaterialIcon name="chevron_right" className="text-[22px] text-on-surface-variant" />
            </Link>
          ))}
        </div>

        <Link
          href="/me/feedback"
          className="pressable flex items-center justify-between gap-3 rounded-lg bg-surface-container-lowest p-4 shadow-sm border border-border"
          data-testid="profile-feedback"
        >
          <div>
            <p className="text-[15px] font-semibold">Got feedback? Let us know</p>
            <p className="mt-1 text-[13px] font-semibold text-primary">
              Tell us what to improve
            </p>
          </div>
          <span className="text-[28px]" aria-hidden>
            ⭐
          </span>
        </Link>

        <button
          type="button"
          className="pressable mx-auto block py-4 text-[15px] font-bold text-primary"
          onClick={onLogout}
        >
          Logout
        </button>
        <p className="text-center text-[11px] text-on-surface-variant">
          © {new Date().getFullYear()} D&apos;aMigo&apos;s · Packaging Delivery
        </p>
      </div>
    </main>
  );
}
