"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HubFiltersProvider, useHubFilters } from "@/components/hub-filters-context";
import { HubPosterCarousel } from "@/components/hub-poster-carousel";
import { HubTodaysOffers } from "@/components/hub-todays-offers";
import { MaterialIcon } from "@/components/material-icon";
import { fetchHubPerks, fetchMyOrders, type HubPerkRailItem } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

const FALLBACK_PERKS: HubPerkRailItem[] = [
  {
    id: "fb1",
    kitchenName: "Biryani Box",
    title: "Packaging perk waiting",
    badge: "Scan QR",
    coinsHint: 120,
    href: "/hub",
    kind: "kitchen",
  },
  {
    id: "fb2",
    kitchenName: "Tandoor Lane HSR",
    title: "₹75 off tandoor mains",
    badge: "₹75 OFF",
    coinsHint: 150,
    href: "/hub",
    kind: "kitchen",
  },
  {
    id: "fb3",
    kitchenName: "Pizza Slice BTM",
    title: "₹50 off pizza",
    badge: "₹50 OFF",
    coinsHint: 100,
    href: "/hub",
    kind: "kitchen",
  },
  {
    id: "fb4",
    kitchenName: "D'aMigo's",
    title: "First-order FREE delivery",
    badge: "Platform",
    coinsHint: 0,
    href: "/hub",
    kind: "platform",
  },
];

/** Hub chrome — Ownly WA IA + D'aMigo crimson (DEC-016 / P-UI-02) */
export function HubPageShell({ children }: { children: React.ReactNode }) {
  return (
    <HubFiltersProvider>
      <HubPageShellInner>{children}</HubPageShellInner>
    </HubFiltersProvider>
  );
}

function HubPageShellInner({ children }: { children: React.ReactNode }) {
  const { search, setSearch, vegOnly, setVegOnly } = useHubFilters();
  const [activeCount, setActiveCount] = useState(0);
  const [perks, setPerks] = useState<HubPerkRailItem[]>(FALLBACK_PERKS);

  useEffect(() => {
    void fetchHubPerks()
      .then((p) => {
        if (p.rail.length > 0) setPerks(p.rail);
      })
      .catch(() => undefined);
    if (!getGuestToken()) return;
    void fetchMyOrders("active")
      .then((rows) => setActiveCount(rows.length))
      .catch(() => setActiveCount(0));
  }, []);

  return (
    <div className="min-h-dvh bg-background pb-32">
      <header className="fixed top-0 z-50 w-full bg-gradient-to-b from-primary to-[#b7122a] pt-safe text-white shadow-[0_4px_20px_rgba(178,18,42,0.28)]">
        <div className="mx-auto max-w-lg">
          <div className="flex h-9 items-center justify-between px-4 text-[11px] text-white/85">
            <div className="flex items-center gap-1">
              <MaterialIcon name="lock" className="text-[14px]" />
              <span className="font-semibold tracking-tight">d-amigos.in</span>
              <span className="mx-1 h-1 w-1 rounded-full bg-white/40" />
              <MaterialIcon name="verified" className="text-[14px] text-tertiary-fixed-dim" />
              <span className="font-bold">WhatsApp</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <button type="button" className="pressable flex min-w-0 items-center gap-1.5 text-left">
              <div className="min-w-0">
                <div className="flex items-center gap-0.5">
                  <span className="truncate text-[13px] font-medium text-white/90">Current location</span>
                  <MaterialIcon name="expand_more" className="text-[18px]" />
                </div>
                <span className="mt-0.5 block truncate text-[15px] font-bold leading-tight">
                  Koramangala, Bengaluru…
                </span>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex flex-col items-end gap-0.5">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide">
                  <span className={vegOnly ? "text-white" : "text-white/70"}>VEG</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={vegOnly}
                    aria-label={
                      vegOnly
                        ? "Veg only on — showing vegetarian kitchens"
                        : "Veg off — showing non-veg and veg mix"
                    }
                    title={vegOnly ? "Veg only" : "Non-veg & veg mix"}
                    data-testid="hub-veg-toggle"
                    className={`pressable relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
                      vegOnly ? "bg-success" : "bg-white/30"
                    }`}
                    onClick={() => setVegOnly(!vegOnly)}
                  >
                    {/* ON = knob on the right (inside track); OFF = left */}
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out ${
                        vegOnly ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </label>
                <span className="max-w-[4.5rem] text-right text-[9px] font-semibold leading-none text-white/65">
                  {vegOnly ? "Veg only" : "Veg + non-veg"}
                </span>
              </div>
              <Link
                href="/me"
                className="pressable flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/40"
              >
                <MaterialIcon name="person" className="text-[20px]" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-[6.75rem] md:max-w-3xl">
        {/* Search + mini promo — Ownly row */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              data-testid="hub-search"
              className="h-12 w-full rounded-full border-0 bg-white pl-11 pr-4 text-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-primary/30"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  window.location.href = `/hub/search?q=${encodeURIComponent(search.trim())}`;
                }
              }}
            />
          </div>
          <Link
            href="/hub"
            className="pressable relative flex w-[5.5rem] shrink-0 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#f59e0b] px-2 py-1.5 text-center shadow-md"
          >
            <span className="text-[8px] font-extrabold uppercase leading-tight tracking-wide text-white">
              Save your friend
            </span>
            <span className="text-[10px] font-black leading-tight text-tertiary-fixed">
              WIN UP TO ₹600
            </span>
          </Link>
        </div>

        {activeCount > 0 ? (
          <Link
            href="/orders"
            className="pressable mb-4 flex items-center gap-3 rounded-2xl border border-border bg-white px-3.5 py-3 shadow-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold">
              {activeCount} live order{activeCount === 1 ? "" : "s"} · keep browsing
            </span>
            <MaterialIcon name="chevron_right" className="text-[20px] text-on-surface-variant" />
          </Link>
        ) : null}

        {search.trim() ? null : (
        <>
        {/* Map backdrop + floating side-by-side ad posters */}
        <HubPosterCarousel />

        {/* Today's Offers (images) + all offers combined */}
        <HubTodaysOffers perks={perks} />
        </>
        )}

        {children}
      </main>
    </div>
  );
}
