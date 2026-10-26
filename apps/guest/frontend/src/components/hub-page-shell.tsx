"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HubAddressSheet } from "@/components/hub-address-sheet";
import { HubFiltersProvider, useHubFilters } from "@/components/hub-filters-context";
import { HubPosterCarousel } from "@/components/hub-poster-carousel";
import { HubTodaysOffers } from "@/components/hub-todays-offers";
import { MaterialIcon } from "@/components/material-icon";
import { fetchHubPerks, fetchMyOrders, type HubPerkRailItem } from "@/lib/api";
import {
  formatAddressHeadline,
  formatAddressSubline,
  getActiveAddress,
  GUEST_ADDRESS_CHANGED,
  type GuestSavedAddress,
} from "@/lib/guest-addresses";
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
  const [addr, setAddr] = useState<GuestSavedAddress | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);

  useEffect(() => {
    const syncAddr = () => setAddr(getActiveAddress());
    syncAddr();
    window.addEventListener(GUEST_ADDRESS_CHANGED, syncAddr);
    window.addEventListener("storage", syncAddr);
    return () => {
      window.removeEventListener(GUEST_ADDRESS_CHANGED, syncAddr);
      window.removeEventListener("storage", syncAddr);
    };
  }, []);

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
      <header className="fixed top-0 z-50 w-full border-b border-[#E2E5EE]/80 bg-[#F4F5F8]/85 pt-safe text-foreground backdrop-blur-xl">
        <div className="mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl">
          <div className="flex h-9 items-center justify-between px-4 text-[11px] font-bold text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <MaterialIcon name="lock" className="text-[14px] text-[#0F1115]" />
              <span className="font-extrabold tracking-tight text-[#0F1115]">d-amigos.in</span>
              <span className="mx-1 h-1 w-1 rounded-full bg-[#10B981]" />
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAFF81] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0F1115] shadow-2xs">
                <MaterialIcon name="verified" className="text-[12px] text-[#0F1115]" />
                WhatsApp
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 pb-3">
            <button
              type="button"
              className="pressable flex min-w-0 items-center gap-1.5 text-left"
              data-testid="hub-location"
              aria-label="Choose delivery location"
              onClick={() => setAddressOpen(true)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-0.5">
                  <span className="truncate text-[13px] font-medium text-on-surface-variant">
                    {addr ? formatAddressSubline(addr) : "Delivery location"}
                  </span>
                  <MaterialIcon name="expand_more" className="text-[18px] text-on-surface-variant" />
                </div>
                <span className="mt-0.5 block truncate text-[15px] font-bold leading-tight text-foreground">
                  {formatAddressHeadline(addr, "Add address…")}
                </span>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-3">
              <div className="flex flex-col items-end gap-0.5">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-wide">
                  <span className={vegOnly ? "text-success" : "text-on-surface-variant"}>VEG</span>
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
                    className={`pressable relative h-6 w-11 shrink-0 overflow-hidden rounded-full border border-[#E4E4E7] transition-colors ${
                      vegOnly ? "bg-[#46B881]" : "bg-[#EFEFEF]"
                    }`}
                    onClick={() => setVegOnly(!vegOnly)}
                  >
                    {/* ON = knob on the right (inside track); OFF = left */}
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-[left] duration-200 ease-out ${
                        vegOnly ? "left-[21px]" : "left-0.5"
                      }`}
                    />
                  </button>
                </label>
                <span className="max-w-[4.5rem] text-right text-[9px] font-semibold leading-none text-on-surface-variant">
                  {vegOnly ? "Veg only" : "Veg + non-veg"}
                </span>
              </div>
              <Link
                href="/me"
                className="pressable flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-container"
              >
                <MaterialIcon name="person" className="text-[20px]" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pt-[6.75rem] md:max-w-3xl lg:max-w-5xl">
        {/* Search + mini promo — Ownly row */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              data-testid="hub-search"
              className="h-12 w-full rounded-full border border-border bg-surface-container-lowest pl-11 text-foreground placeholder:text-on-surface-variant pr-4 text-[16px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] outline-none border border-border focus:ring-2 focus:ring-primary/30"
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
            href="/hub/save-and-win"
            className="pressable relative flex w-[6.25rem] shrink-0 flex-col justify-center overflow-hidden rounded-[18px] bg-[#0F1115] px-2.5 py-1.5 text-center shadow-[0_6px_16px_-4px_rgba(15,17,21,0.3)]"
            data-testid="hub-save-and-win"
          >
            <span className="text-[8px] font-extrabold uppercase leading-tight tracking-wider text-white/75">
              Refer &amp; Win
            </span>
            <span className="mt-0.5 text-[11px] font-extrabold leading-tight text-[#EAFF81]">
              WIN ₹600
            </span>
          </Link>
        </div>

        {activeCount > 0 ? (
          <Link
            href="/orders"
            className="pressable mb-4 flex items-center gap-3 rounded-2xl border border-border bg-surface-container-lowest px-3.5 py-3 shadow-sm"
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
        <HubPosterCarousel vegOnly={vegOnly} />

        {/* Today's Offers (images) + all offers combined */}
        <HubTodaysOffers perks={perks} vegOnly={vegOnly} />
        </>
        )}

        {children}
      </main>
      <HubAddressSheet open={addressOpen} onClose={() => setAddressOpen(false)} />
    </div>
  );
}
