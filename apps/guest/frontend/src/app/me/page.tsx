"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { clearGuestToken, getGuestToken } from "@/lib/session";
import { fetchMe, fetchOpenCartSession } from "@/lib/api";
import { readGuestAvatar } from "@/lib/guest-avatar";

const ROWS = [
  {
    href: "/orders",
    icon: "receipt_long",
    title: "Past Orders",
    sub: "Browse and reorder from your history.",
  },
  {
    href: "/hub",
    icon: "shopping_cart",
    title: "My Cart",
    sub: "Open carts across kitchens — continue checkout.",
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
    href: "/me/offers",
    icon: "local_offer",
    title: "Upcoming offers",
    sub: "Festivals, weekends & reminders.",
  },
  {
    href: "/me/settings",
    icon: "tune",
    title: "Preferences",
    sub: "Diet, notifications, location & consents.",
  },
  {
    href: "/me/feedback",
    icon: "rate_review",
    title: "Feedback",
    sub: "Tell us what to improve.",
  },
  {
    href: "/me/feedback",
    icon: "star",
    title: "Rate the app",
    sub: "Leave a star rating with your note.",
  },
  {
    href: "/me/about",
    icon: "info",
    title: "About",
    sub: "What D'aMigo's is and how Direct works.",
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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [cartHint, setCartHint] = useState<string | null>(null);

  useEffect(() => {
    setAvatar(readGuestAvatar());
    const token = getGuestToken();
    if (!token) return;
    void fetchMe(token)
      .then((me) => {
        setName(me.name);
        setPhoneHint(me.profileComplete ? "Verified guest" : "Complete your profile");
      })
      .catch(() => undefined);
    void fetchOpenCartSession()
      .then((s) => {
        const n = s.openCarts?.length ?? 0;
        setCartHint(n > 0 ? `${n} open cart${n === 1 ? "" : "s"}` : null);
      })
      .catch(() => setCartHint(null));
  }, []);

  function onLogout() {
    clearGuestToken();
    window.location.href = "/hub";
  }

  const primary = ROWS.slice(0, 6);
  const secondary = ROWS.slice(6);

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
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-border bg-surface-container">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[28px] font-extrabold text-on-surface-variant">
                {(name || "G").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-foreground">
              {name || "Guest"}
            </h1>
            <p className="mt-1 text-[14px] text-on-surface-variant">{phoneHint}</p>
            {cartHint ? (
              <Link href="/hub" className="mt-1 inline-block text-[12px] font-bold text-primary">
                {cartHint} · view My Cart
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pt-4">
        <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm border border-border">
          {primary.map((row, i) => (
            <Link
              key={`${row.title}-${row.href}`}
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
          {secondary.map((row, i) => (
            <Link
              key={`${row.title}-${row.href}-${i}`}
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
