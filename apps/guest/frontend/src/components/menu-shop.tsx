"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { StickyCartDock } from "@/components/sticky-cart-dock";
import {
  addCartItem,
  applyCartClaim,
  clearOpenCart,
  fetchCart,
  fetchRewardClaims,
  fetchOpenCartSession,
  formatInr,
  type GuestMenuItem,
  type CartResponse,
  type CrossBySession,
  type OpenCartSummary,
  type RewardClaimOption,
} from "@/lib/api";
import { coverForDish, hubDemoMeta } from "@/lib/hub-media";
import { getGuestToken } from "@/lib/session";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";
import { SwitchKitchenModal } from "@/components/switch-kitchen-modal";

type Filter = "all" | "veg" | "nonveg" | "egg";

type Props = {
  restaurantId: string;
  restaurantName: string;
  items: GuestMenuItem[];
  /** From hub VEG toggle → `/menu?veg=1` */
  initialFilter?: Filter;
};

function otherAppsLabel(pricePaise: number, referencePricePaise: number | null | undefined) {
  if (referencePricePaise == null || referencePricePaise <= pricePaise) return null;
  const low = Math.round(referencePricePaise * 0.97);
  const high = referencePricePaise;
  return `Other Apps: ${formatInr(low)}–${formatInr(high)}`;
}

function VegMark({ isVeg }: { isVeg: boolean }) {
  if (isVeg) {
    return (
      <span
        className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-success"
        aria-label="Vegetarian"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-primary"
      aria-label="Non-vegetarian"
    >
      <span className="h-0 w-0 border-x-[3.5px] border-b-[6px] border-x-transparent border-b-primary" />
    </span>
  );
}

export function MenuShop({
  restaurantId,
  restaurantName,
  items,
  initialFilter = "all",
}: Props) {
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [selected, setSelected] = useState<GuestMenuItem | null>(null);
  const [qty, setQty] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [openCarts, setOpenCarts] = useState<OpenCartSummary[]>([]);
  const [crossBy, setCrossBy] = useState<CrossBySession | null>(null);
  const [limitModal, setLimitModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [claims, setClaims] = useState<RewardClaimOption[]>([]);

  const demo = useMemo(() => hubDemoMeta(restaurantName.toLowerCase().replace(/\s+/g, "-")), [restaurantName]);

  const refreshCart = useCallback(async () => {
    if (!getGuestToken()) return;
    try {
      const [c, session, claimRows] = await Promise.all([
        fetchCart(restaurantId),
        fetchOpenCartSession(),
        fetchRewardClaims(restaurantId).catch(() => [] as RewardClaimOption[]),
      ]);
      setCart(c);
      setOpenCarts(session.openCarts);
      setCrossBy(session.crossBy);
      setClaims(claimRows);
    } catch {
      setCart(null);
    }
  }, [restaurantId]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const stickyClaim = useMemo(() => {
    if (cart?.appliedClaim) {
      return {
        applied: true as const,
        title: cart.appliedClaim.title,
        billLabel:
          cart.appliedClaim.billLabel ??
          (cart.appliedClaim.scope === "PLATFORM_WIDE"
            ? "D'aMigo Platform Offer"
            : "Restaurant scoped reward"),
        discountPaise: cart.appliedClaim.discountPaise,
      };
    }
    const first = claims[0];
    if (!first) return null;
    return {
      applied: false as const,
      title: first.title,
      billLabel:
        first.billLabel ??
        (first.scope === "PLATFORM_WIDE"
          ? "D'aMigo Platform Offer"
          : "Restaurant scoped reward"),
      discountPaise: 0,
    };
  }, [cart?.appliedClaim, claims]);

  async function onRemoveStickyReward(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await applyCartClaim(restaurantId, null);
      await refreshCart();
    } catch {
      /* ignore */
    }
  }

  const savingsPct = useMemo(() => {
    const priced = items.filter(
      (i) => i.referencePricePaise != null && i.referencePricePaise > i.pricePaise,
    );
    if (!priced.length) return { low: 20, high: 30 };
    const pcts = priced.map(
      (i) => ((i.referencePricePaise! - i.pricePaise) / i.referencePricePaise!) * 100,
    );
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const low = Math.max(10, Math.floor(avg - 5));
    const high = Math.min(45, Math.ceil(avg + 5));
    return { low, high };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter === "veg") list = list.filter((i) => i.isVeg);
    if (filter === "nonveg") list = list.filter((i) => !i.isVeg);
    if (filter === "egg") {
      list = list.filter((i) => /egg|anda/i.test(`${i.name} ${i.description ?? ""}`));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, filter, query]);

  const topPicks = useMemo(() => {
    const withRef = filtered.filter(
      (i) => i.referencePricePaise && i.referencePricePaise > i.pricePaise,
    );
    return (withRef.length >= 2 ? withRef : filtered).slice(0, 8);
  }, [filtered]);

  const rest = useMemo(() => {
    const ids = new Set(topPicks.map((i) => i.id));
    return filtered.filter((i) => !ids.has(i.id));
  }, [filtered, topPicks]);

  async function onAdd(item: GuestMenuItem, quantity: number) {
    if (!getGuestToken()) {
      setSelected(item);
      setQty(quantity);
      setAuthOpen(true);
      return;
    }
    setError(null);
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15);
      }
      await addCartItem(restaurantId, item.id, quantity);
      await refreshCart();
      setSelected(null);
      setLimitModal(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not add";
      if (/2 kitchens|CROSS_BY|Replace one/i.test(msg)) {
        setLimitModal(true);
        void fetchOpenCartSession()
          .then((s) => {
            setOpenCarts(s.openCarts);
            setCrossBy(s.crossBy);
          })
          .catch(() => undefined);
      }
      setError(msg);
    }
  }

  async function shareMenu() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: restaurantName, text: `Order from ${restaurantName} on D'aMigo's`, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <>
      <main className="mx-auto min-h-dvh max-w-lg bg-white px-4 pb-36 pt-safe">
        {/* Ownly header: back · search · share */}
        <div className="sticky top-0 z-40 -mx-4 mb-3 bg-white/95 px-4 pb-2 pt-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Link
              href="/hub"
              className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low"
              aria-label="Back to hub"
            >
              <MaterialIcon name="arrow_back" className="text-[22px]" />
            </Link>
            <div className="relative flex-1">
              <MaterialIcon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
              />
              <input
                className="h-10 w-full rounded-full border-0 bg-surface-container-low pl-10 pr-3 text-[15px] outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-primary/25"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search menu"
              />
            </div>
            <button
              type="button"
              className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low"
              aria-label="Share"
              onClick={() => void shareMenu()}
            >
              <MaterialIcon name="ios_share" className="text-[20px]" />
            </button>
          </div>
        </div>

        {/* Restaurant identity */}
        <header className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display min-w-0 flex-1 text-[26px] font-extrabold leading-tight tracking-tight">
              {restaurantName}
            </h1>
            <div className="shrink-0 text-right">
              <span className="inline-flex items-center gap-0.5 rounded-lg bg-success px-2 py-1 text-[13px] font-bold text-white">
                <MaterialIcon name="star" className="text-[14px] [font-variation-settings:'FILL'_1]" />
                {demo.rating.toFixed(1)}
              </span>
              <p className="mt-1 text-[11px] text-on-surface-variant">{demo.reviewsLabel} ratings</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-on-surface-variant">
            <span className="inline-flex items-center gap-1 font-medium">
              <MaterialIcon name="schedule" className="text-[16px]" />
              {demo.etaMins} mins
            </span>
            <span className="inline-flex items-center gap-0.5 font-medium">
              <MaterialIcon name="location_on" className="text-[16px]" />
              Koramangala
              <MaterialIcon name="expand_more" className="text-[16px]" />
            </span>
          </div>
        </header>

        {stickyClaim ? (
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-inverse-surface px-3.5 py-3 text-inverse-on-surface shadow-md">
            <Link
              href={`/r/${restaurantId}/checkout`}
              className="pressable flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed-dim/25 text-tertiary-fixed-dim">
                <MaterialIcon name="auto_awesome" className="text-[20px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-tertiary-fixed-dim">
                  {stickyClaim.applied ? "Auto-applied · " : ""}
                  {stickyClaim.billLabel}
                </span>
                <span className="block truncate text-[14px] font-semibold">{stickyClaim.title}</span>
                {stickyClaim.applied && stickyClaim.discountPaise > 0 ? (
                  <span className="block text-[11px] font-semibold text-tertiary-fixed-dim">
                    −{formatInr(stickyClaim.discountPaise)}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-[12px] font-bold text-tertiary-fixed-dim">
                {stickyClaim.applied ? "Checkout" : "Redeem"}
              </span>
            </Link>
            {stickyClaim.applied ? (
              <button
                type="button"
                onClick={(e) => void onRemoveStickyReward(e)}
                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-inverse-on-surface/70 underline"
              >
                Remove
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Best Value banner — Ownly P-UI-05 */}
        <section className="mb-4 flex items-center gap-3 rounded-2xl bg-[#f3f4f6] px-3 py-3">
          <div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center bg-success text-center text-[9px] font-black uppercase leading-[1.05] text-white shadow-sm"
            style={{
              clipPath:
                "polygon(50% 0%, 63% 12%, 80% 10%, 88% 25%, 100% 35%, 92% 50%, 100% 65%, 88% 75%, 80% 90%, 63% 88%, 50% 100%, 37% 88%, 20% 90%, 12% 75%, 0% 65%, 8% 50%, 0% 35%, 12% 25%, 20% 10%, 37% 12%)",
            }}
          >
            Best
            <br />
            Value
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold leading-snug">
              {savingsPct.low}–{savingsPct.high}% lower priced than other apps
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-on-surface-variant">
              Based on matched dishes across most of the menu.
            </p>
          </div>
        </section>

        {/* Filters */}
        <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            className={`pressable inline-flex shrink-0 items-center gap-1 rounded-full border px-3.5 py-2 text-[12px] font-semibold ${
              filter === "all" ? "border-foreground bg-foreground text-background" : "border-border bg-white"
            }`}
            onClick={() => setFilter("all")}
          >
            Filters
            <MaterialIcon name="expand_more" className="text-[16px]" />
          </button>
          <button
            type="button"
            className={`pressable inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold ${
              filter === "veg"
                ? "border-success bg-[#dcfce7] text-[#166534]"
                : "border-border bg-white"
            }`}
            onClick={() => setFilter(filter === "veg" ? "all" : "veg")}
          >
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center border border-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Veg
          </button>
          <button
            type="button"
            className={`pressable inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold ${
              filter === "nonveg" ? "border-primary bg-primary/5 text-primary" : "border-border bg-white"
            }`}
            onClick={() => setFilter(filter === "nonveg" ? "all" : "nonveg")}
          >
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center border border-primary">
              <span className="h-0 w-0 border-x-[3.5px] border-b-[6px] border-x-transparent border-b-primary" />
            </span>
            Non Veg
          </button>
          <button
            type="button"
            className={`pressable inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold ${
              filter === "egg" ? "border-[#f59e0b] bg-[#fffbeb] text-[#b45309]" : "border-border bg-white"
            }`}
            onClick={() => setFilter(filter === "egg" ? "all" : "egg")}
          >
            <span className="inline-block h-3 w-2.5 rounded-[40%] bg-[#f59e0b]" />
            Egg
          </button>
        </div>

        {error ? <p className="mb-2 text-sm text-red-700">{error}</p> : null}

        {/* Top Picks 2-col — Ownly */}
        {topPicks.length > 0 ? (
          <section className="mb-6" id="menu-top-picks">
            <button
              type="button"
              className="mb-3 flex w-full items-center justify-between"
              onClick={() => setTopOpen((o) => !o)}
            >
              <h2 className="font-display text-[18px] font-bold tracking-tight">Top Picks</h2>
              <MaterialIcon
                name={topOpen ? "expand_less" : "expand_more"}
                className="text-[22px] text-on-surface-variant"
              />
            </button>
            {topOpen ? (
              <div className="grid grid-cols-2 gap-x-3 gap-y-5">
                {topPicks.map((item, idx) => {
                  const other = otherAppsLabel(item.pricePaise, item.referencePricePaise);
                  return (
                    <article
                      key={item.id}
                      className={!item.available ? "opacity-50" : undefined}
                      data-testid="menu-top-pick"
                    >
                      <div className="relative mb-2 aspect-[1/1] overflow-hidden rounded-2xl bg-surface-container">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={coverForDish(item.name, item.imageUrl, idx)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          disabled={!item.available}
                          className="pressable absolute bottom-2 right-2 rounded-full bg-primary px-4 py-1.5 text-[13px] font-bold text-white shadow-md"
                          onClick={() => {
                            setSelected(item);
                            setQty(1);
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex items-start gap-1.5 px-0.5">
                        <VegMark isVeg={item.isVeg} />
                        <p className="line-clamp-2 text-[13px] font-bold leading-snug">{item.name}</p>
                      </div>
                      <div className="mt-1.5 px-0.5">
                        <span className="inline-flex rounded-md bg-success px-2 py-0.5 text-[13px] font-bold tabular text-white">
                          {formatInr(item.pricePaise)}
                        </span>
                        {other ? (
                          <p
                            className="mt-1 text-[11px] leading-snug text-on-surface-variant"
                            data-testid="reference-price-chip"
                          >
                            {other}
                          </p>
                        ) : item.referencePricePaise != null && item.referencePricePaise > 0 ? (
                          <p
                            className="mt-1 text-[11px] text-on-surface-variant"
                            data-testid="reference-price-chip"
                          >
                            Other Apps: {formatInr(item.referencePricePaise)}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        ) : null}

        {rest.length > 0 ? (
          <section id="menu-full">
            <h2 className="font-display mb-3 text-[18px] font-bold tracking-tight">Full menu</h2>
            <ul className="space-y-4">
              {rest.map((item, idx) => {
                const other = otherAppsLabel(item.pricePaise, item.referencePricePaise);
                return (
                  <li key={item.id} className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <VegMark isVeg={item.isVeg} />
                        <div className="min-w-0">
                          <p className="text-[15px] font-bold leading-snug">{item.name}</p>
                          {item.description ? (
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-on-surface-variant">
                              {item.description}
                            </p>
                          ) : null}
                          <div className="mt-2">
                            <span className="inline-flex rounded-md bg-success px-2 py-0.5 text-[13px] font-bold tabular text-white">
                              {formatInr(item.pricePaise)}
                            </span>
                            {other ? (
                              <p className="mt-1 text-[11px] text-on-surface-variant" data-testid="reference-price-chip">
                                {other}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverForDish(item.name, item.imageUrl, idx + 10)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        disabled={!item.available}
                        className="pressable absolute bottom-1.5 right-1.5 rounded-full bg-primary px-3 py-1 text-[12px] font-bold text-white shadow"
                        onClick={() => {
                          setSelected(item);
                          setQty(1);
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {!filtered.length ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">No dishes match this filter.</p>
        ) : null}
      </main>

      <button
        type="button"
        className="pressable fixed bottom-28 right-4 z-30 inline-flex items-center gap-1.5 rounded-full bg-[#1b1b1b] px-4 py-2.5 text-[13px] font-bold text-white shadow-lg"
        onClick={() => setMenuOpen(true)}
      >
        <MaterialIcon name="menu_book" className="text-[18px]" />
        Menu
      </button>

      {menuOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-inverse-surface/50 p-4"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="sheet-spring w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="font-display mb-2 text-[17px] font-bold">Jump to</p>
            <button
              type="button"
              className="pressable flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] font-semibold hover:bg-surface-container-low"
              onClick={() => {
                setMenuOpen(false);
                document.getElementById("menu-top-picks")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Top Picks
              <span className="tabular text-on-surface-variant">{topPicks.length}</span>
            </button>
            <button
              type="button"
              className="pressable flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-[15px] font-semibold hover:bg-surface-container-low"
              onClick={() => {
                setMenuOpen(false);
                document.getElementById("menu-full")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Full menu
              <span className="tabular text-on-surface-variant">{rest.length}</span>
            </button>
            <Button className="pressable mt-2 w-full" onClick={() => setMenuOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-inverse-surface/50">
          <div className="sheet-spring w-full max-w-lg rounded-t-[24px] bg-white p-6 pb-safe shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-3 aspect-[16/10] overflow-hidden rounded-2xl bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverForDish(selected.name, selected.imageUrl, 0)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-start gap-2">
              <VegMark isVeg={selected.isVeg} />
              <h3 className="font-display text-[20px] font-bold tracking-tight">{selected.name}</h3>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
              <span className="inline-flex rounded-md bg-success px-2 py-0.5 text-[14px] font-bold tabular text-white">
                {formatInr(selected.pricePaise)}
              </span>
              {otherAppsLabel(selected.pricePaise, selected.referencePricePaise) ? (
                <span className="text-[12px]">
                  {otherAppsLabel(selected.pricePaise, selected.referencePricePaise)}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg font-bold"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
              <span className="min-w-8 text-center text-[16px] font-bold tabular">{qty}</span>
              <button
                type="button"
                className="pressable flex h-11 w-11 items-center justify-center rounded-full border border-border text-lg font-bold"
                onClick={() => setQty((q) => q + 1)}
              >
                +
              </button>
            </div>
            <Button className="pressable mt-4 w-full" onClick={() => void onAdd(selected, qty)}>
              Add to cart · {formatInr(selected.pricePaise * qty)}
            </Button>
            <Button variant="ghost" className="pressable mt-1 w-full" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <StickyCartDock
        restaurantId={restaurantId}
        restaurantName={restaurantName}
        itemCount={
          openCarts.length > 0
            ? openCarts.reduce((s, c) => s + c.itemCount, 0)
            : (cart?.itemCount ?? 0)
        }
        subtotalPaise={
          openCarts.length > 0
            ? openCarts.reduce((s, c) => s + c.subtotalPaise, 0)
            : (cart?.subtotalPaise ?? 0)
        }
        promoLine="Get 25% off on this order (upto ₹40) · Direct D2C"
        extraKitchenCount={Math.max(0, openCarts.filter((c) => c.restaurantId !== restaurantId).length)}
        riderModeLabel={
          openCarts.length > 1 && crossBy
            ? crossBy.riderMode === "SINGLE"
              ? "Single rider"
              : "2 riders"
            : null
        }
      />

      <ProfileConsentSheet
        open={authOpen}
        restaurantId={restaurantId}
        onComplete={() => {
          setAuthOpen(false);
          if (selected) void onAdd(selected, qty);
        }}
      />

      {limitModal && openCarts[0] ? (
        <SwitchKitchenModal
          openCart={openCarts[0]}
          openCarts={openCarts}
          targetKitchenName={restaurantName}
          canAddSecond={false}
          onCancel={() => setLimitModal(false)}
          onReplace={() => {
            void (async () => {
              setClearing(true);
              try {
                await clearOpenCart();
                setOpenCarts([]);
                setLimitModal(false);
                if (selected) await onAdd(selected, qty);
              } finally {
                setClearing(false);
              }
            })();
          }}
          confirming={clearing}
        />
      ) : null}
    </>
  );
}
