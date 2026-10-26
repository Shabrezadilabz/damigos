"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useHubFilters, withVegQuery } from "@/components/hub-filters-context";
import { MaterialIcon } from "@/components/material-icon";
import { SwitchKitchenModal } from "@/components/switch-kitchen-modal";
import { Button } from "@/components/ui/button";
import {
  addCartItem,
  clearOpenCart,
  fetchHubBestsellers,
  fetchHubRestaurants,
  fetchOpenCartSession,
  formatInr,
  type CrossBySession,
  type HubBestsellerItem,
  type HubRestaurant,
  type OpenCartSummary,
} from "@/lib/api";
import { OwnlyFilterChips } from "@/components/ownly-filter-chips";
import { OwnlyRestaurantRow } from "@/components/ownly-restaurant-row";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";
import {
  coverForSlug,
  cuisineForSlug,
  hubDemoMeta,
  MIND_CATEGORIES,
} from "@/lib/hub-media";
import { getGuestToken } from "@/lib/session";

const VEG_MIND_IDS = new Set(["festival", "south", "chinese", "dessert", "healthy", "new"]);

type Enriched = HubRestaurant & {
  rating: number;
  reviewsLabel: string;
  etaMins: number;
  badge: "delivery_promise" | "lowest_price";
  cover: string;
  cuisine: string;
};

function enrich(r: HubRestaurant, index: number): Enriched {
  const meta = hubDemoMeta(r.slug);
  return {
    ...r,
    ...meta,
    cover: r.coverImageUrl?.trim() || coverForSlug(r.slug, index),
    cuisine: cuisineForSlug(r.slug, r.city),
  };
}

function KitchenCard({
  r,
  href,
  onClick,
}: {
  r: Enriched;
  href?: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={href ?? r.menuPath}
      onClick={onClick}
      className="pressable block w-[12rem] shrink-0 overflow-hidden rounded-[22px] border border-[#E2E5EE] bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.07)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={r.cover} alt="" className="h-full w-full object-cover" />
        {r.badge === "delivery_promise" ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F1115] shadow-sm">
            <MaterialIcon name="timer" className="text-[12px]" />
            Delivery Promise
          </span>
        ) : (
          <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-[#EAFF81] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F1115] shadow-sm">
            <MaterialIcon name="sell" className="text-[12px]" />
            Lowest Price
          </span>
        )}
      </div>
      <div className="px-3 py-3">
        <p className="truncate font-display text-[15px] font-extrabold leading-snug tracking-tight text-[#0F1115]">
          {r.name}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[11px] font-semibold text-on-surface-variant">
          <span className="inline-flex items-center gap-0.5 text-success">
            <MaterialIcon name="star" className="text-[13px] [font-variation-settings:'FILL'_1]" />
            {r.rating.toFixed(1)}
          </span>
          <span className="text-on-surface-variant/70">({r.reviewsLabel})</span>
          <span>·</span>
          <span className="inline-flex items-center gap-0.5">
            <span aria-hidden>⚡</span>
            {r.etaMins} mins
          </span>
        </p>
        <p className="mt-0.5 truncate text-[11px] text-on-surface-variant/80">{r.cuisine}</p>
      </div>
    </Link>
  );
}

/** G-S6 / Ownly WA hub feed — rails + All Restaurants */
export function HubKitchenList({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const filters = useHubFilters();
  const [rows, setRows] = useState<HubRestaurant[]>([]);
  const [bestsellers, setBestsellers] = useState<HubBestsellerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openCarts, setOpenCarts] = useState<OpenCartSummary[]>([]);
  const [crossBy, setCrossBy] = useState<CrossBySession | null>(null);
  const [pending, setPending] = useState<HubRestaurant | null>(null);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortOpen, setSortOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addNote, setAddNote] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setLoading(true);
      void fetchHubRestaurants("bangalore", filters.search, filters.vegOnly)
        .then((list) => {
          setRows(list);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false));
    }, filters.search ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [filters.search, filters.vegOnly]);

  useEffect(() => {
    void fetchHubBestsellers(filters.vegOnly)
      .then((b) => setBestsellers(b.items))
      .catch(() => setBestsellers([]));
  }, [filters.vegOnly]);

  useEffect(() => {
    if (!getGuestToken()) return;
    void fetchOpenCartSession()
      .then((s) => {
        setOpenCarts(s.openCarts);
        setCrossBy(s.crossBy);
      })
      .catch(() => {
        setOpenCarts([]);
        setCrossBy(null);
      });
  }, []);

  const enriched = useMemo(() => rows.map((r, i) => enrich(r, i)), [rows]);

  const filtered = useMemo(() => {
    let list = [...enriched];
    /**
     * VEG ON = kitchens with vegetarian dishes (pure veg OR veg-friendly mix).
     * Not pureVeg-only — that hid most onboarded menus and looked like “only Promise” moved.
     */
    if (filters.vegOnly) {
      list = list.filter((r) => r.pureVeg === true || r.vegFriendly === true);
    }
    if (filters.rating4Plus) list = list.filter((r) => r.rating >= 4);
    if (filters.lowestPrice) list = list.filter((r) => r.badge === "lowest_price");
    switch (filters.sort) {
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "eta":
        list.sort((a, b) => a.etaMins - b.etaMins);
        break;
      case "price":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }
    return list;
  }, [enriched, filters.vegOnly, filters.rating4Plus, filters.lowestPrice, filters.sort]);

  const searching = filters.search.trim().length > 0;

  function menuHref(path: string) {
    return withVegQuery(path, filters.vegOnly);
  }

  const mindCats = useMemo(() => {
    if (!filters.vegOnly) return MIND_CATEGORIES;
    return MIND_CATEGORIES.filter(
      (c) => VEG_MIND_IDS.has(c.id) || !/biryani|shawarma|burger|grill|chicken|meat/i.test(`${c.id} ${c.label} ${c.q}`),
    );
  }, [filters.vegOnly]);

  const promiseRail = useMemo(() => {
    const base = filtered.filter((r) => r.badge === "delivery_promise");
    const pool = base.length >= 3 ? base : filtered;
    return [...pool].sort((a, b) => a.etaMins - b.etaMins).slice(0, 8);
  }, [filtered]);

  const knownLoved = useMemo(
    () => [...filtered].sort((a, b) => b.rating - a.rating).slice(0, 8),
    [filtered],
  );

  const bestsellerItems = useMemo(() => {
    const raw = bestsellers.length
      ? bestsellers
      : filtered.flatMap((r) =>
          (r.sampleDishes ?? [])
            .filter((d) => d.pricePaise <= 14900)
            .filter((d) => (filters.vegOnly ? d.isVeg : true))
            .map((d) => ({
              id: d.id,
              name: d.name,
              pricePaise: d.pricePaise,
              isVeg: d.isVeg,
              imageUrl: d.imageUrl,
              restaurantId: r.id,
              restaurantName: r.name,
              restaurantSlug: r.slug,
              menuPath: r.menuPath,
              bestseller: true as const,
            })),
        );
    let list = raw;
    if (filters.vegOnly) list = list.filter((i) => i.isVeg);
    if (searching) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.restaurantName.toLowerCase().includes(q) ||
          i.restaurantSlug.toLowerCase().includes(q),
      );
    }
    return list.slice(0, 10);
  }, [bestsellers, filtered, searching, filters.search, filters.vegOnly]);

  function onKitchenClick(e: React.MouseEvent, target: HubRestaurant) {
    if (openCarts.some((c) => c.restaurantId === target.id)) return;
    if (openCarts.length === 0) return;
    e.preventDefault();
    setPending(target);
  }

  async function onAddSecond() {
    if (!pending) return;
    setPending(null);
    router.push(pending.menuPath);
  }

  async function onReplace() {
    if (!pending) return;
    setClearing(true);
    try {
      await clearOpenCart();
      setOpenCarts([]);
      setCrossBy(null);
      setPending(null);
      router.push(pending.menuPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear cart");
    } finally {
      setClearing(false);
    }
  }

  async function onAddBestseller(e: React.MouseEvent, item: HubBestsellerItem) {
    e.preventDefault();
    e.stopPropagation();
    if (!getGuestToken()) {
      setAuthOpen(true);
      return;
    }
    setAddingId(item.id);
    setAddNote(null);
    setError(null);
    try {
      await addCartItem(item.restaurantId, item.id, 1);
      const s = await fetchOpenCartSession();
      setOpenCarts(s.openCarts);
      setCrossBy(s.crossBy);
      setAddNote(`Added ${item.name} · go to checkout from cart`);
      router.push(`/r/${item.restaurantId}/checkout`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add";
      // Cross-kitchen / auth — fall back to menu only if add truly failed
      setError(message);
    } finally {
      setAddingId(null);
    }
  }

  const Wrapper = embedded ? "div" : "main";
  const wrapperClass = embedded ? "flex flex-col gap-6" : "mx-auto min-h-dvh max-w-lg p-4 md:max-w-3xl";
  const primary = openCarts[0] ?? null;

  return (
    <Wrapper className={wrapperClass}>
      {!embedded ? (
        <input
          type="search"
          data-testid="hub-search"
          className="mb-4 w-full rounded-full border border-border px-4 py-3 text-[16px]"
          value={filters.search}
          onChange={(e) => filters.setSearch(e.target.value)}
          placeholder="Search kitchens…"
        />
      ) : null}

      {error && <p className="text-sm text-red-700">{error}</p>}

      {!searching ? (
        <>
          {/* Delivery Promise rail */}
          <section data-testid="hub-delivery-promise">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="font-display text-[17px] font-bold tracking-tight">Delivery Promise</h3>
              <Link href="/hub/collections/promise" className="text-[13px] font-bold text-primary">
                See All &gt;
              </Link>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {promiseRail.map((r) => (
                <KitchenCard
                  key={`p-${r.id}`}
                  r={r}
                  href={menuHref(r.menuPath)}
                  onClick={(e) => onKitchenClick(e, r)}
                />
              ))}
            </div>
            {!promiseRail.length && filters.vegOnly ? (
              <p className="text-[12px] text-on-surface-variant">No veg-friendly kitchens in Promise yet.</p>
            ) : null}
          </section>

          {/* Bestsellers under ₹149 poster */}
          <section
            className="overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-[#fff7ed] via-[#ffe4e6] to-[#fef3c7] p-3.5 shadow-sm ring-1 ring-primary/10"
            data-testid="hub-bestsellers"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display bg-gradient-to-r from-primary to-[#f59e0b] bg-clip-text text-[18px] font-black tracking-tight text-transparent">
                Bestsellers under ₹149
              </h3>
              <Link href="/hub/collections/bestsellers" className="text-[13px] font-bold text-primary">
                See All &gt;
              </Link>
            </div>
            {addNote ? (
              <p className="mb-2 text-[12px] font-semibold text-success">{addNote}</p>
            ) : null}
            <div className="hub-h-scroll no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {bestsellerItems.map((item, idx) => (
                <div key={item.id} className="w-[8.5rem] shrink-0">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-container-lowest shadow-sm">
                    <Link href={menuHref(item.menuPath)} className="pressable absolute inset-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl?.trim() || coverForSlug(item.restaurantSlug, idx)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    {item.bestseller ? (
                      <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-md bg-[#1b1b1b]/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        Bestseller
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="pressable absolute bottom-1.5 right-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-lg font-bold text-white shadow-md disabled:opacity-60"
                      aria-label={`Add ${item.name}`}
                      data-testid={`hub-bestseller-add-${item.id}`}
                      disabled={addingId === item.id}
                      onClick={(e) => void onAddBestseller(e, item)}
                    >
                      {addingId === item.id ? "…" : "+"}
                    </button>
                  </div>
                  <Link href={menuHref(item.menuPath)} className="pressable block">
                    <p className="mt-1.5 line-clamp-2 text-[12px] font-bold leading-tight">{item.name}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-[2px] border ${
                          item.isVeg ? "border-success bg-success/20" : "border-primary bg-primary/20"
                        }`}
                      />
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                        {formatInr(item.pricePaise)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-on-surface-variant">
                      {item.restaurantName}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* What's On Your Mind */}
          <section data-testid="hub-whats-on-mind">
            <h3 className="font-display mb-3 text-[17px] font-bold tracking-tight">
              What&apos;s On Your Mind?
            </h3>
            <div className="hub-h-scroll no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
              {mindCats.map((c) => (
                <Link
                  key={c.id}
                  href={withVegQuery(
                    c.id === "festival"
                      ? "/hub/collections/festival"
                      : `/hub/search?q=${encodeURIComponent(c.q)}`,
                    filters.vegOnly,
                  )}
                  className="pressable flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="h-[4.75rem] w-[4.75rem] overflow-hidden rounded-full bg-surface-container-lowest shadow-md ring-2 ring-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <span className="text-center text-[11px] font-semibold leading-tight">{c.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Known & Loved */}
          <section data-testid="hub-known-loved">
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="font-display text-[17px] font-bold tracking-tight">Known &amp; Loved</h3>
              <Link href="/hub/collections/brands" className="text-[13px] font-bold text-primary">
                See All &gt;
              </Link>
            </div>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {knownLoved.map((r) => (
                <KitchenCard
                  key={`k-${r.id}`}
                  r={r}
                  href={menuHref(r.menuPath)}
                  onClick={(e) => onKitchenClick(e, r)}
                />
              ))}
            </div>
          </section>
        </>
      ) : null}

      {/* All Restaurants + filters */}
      <section id="hub-all-restaurants" data-testid="hub-kitchen-list">
        <h3 className="font-display mb-2.5 text-[17px] font-bold tracking-tight">All Restaurants</h3>
        <OwnlyFilterChips
          sort={filters.sort}
          onSortClick={() => setSortOpen((o) => !o)}
          vegOnly={filters.vegOnly}
          onVegToggle={() => filters.setVegOnly(!filters.vegOnly)}
          rating4Plus={filters.rating4Plus}
          onRatingToggle={() => filters.setRating4Plus(!filters.rating4Plus)}
          lowestPrice={filters.lowestPrice}
          onLowestToggle={() => filters.setLowestPrice(!filters.lowestPrice)}
          sortOpen={sortOpen}
          onPickSort={(s) => {
            filters.setSort(s);
            setSortOpen(false);
          }}
        />

        <ul className="space-y-3">
          {filtered.map((r, i) => (
            <li key={r.id}>
              <OwnlyRestaurantRow
                restaurant={r}
                index={i}
                href={menuHref(r.menuPath)}
                onClick={(e) => onKitchenClick(e, r)}
              />
            </li>
          ))}
        </ul>

        {!filtered.length && !error && !loading && (
          <p className="mt-6 text-sm text-foreground/60" data-testid="hub-empty">
            {filters.search.trim()
              ? "No kitchens match your search."
              : "No kitchens listed yet — run db:seed."}
          </p>
        )}
      </section>

      <div className="flex justify-center py-2">
        <button
          type="button"
          className="pressable inline-flex items-center gap-1 rounded-full bg-[#1b1b1b] px-4 py-2 text-[12px] font-bold text-white shadow-md"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          ↑ Back to top
        </button>
      </div>

      <Button variant="ghost" asChild className="w-full">
        <Link href="/orders">Your orders</Link>
      </Button>

      {pending && primary ? (
        <SwitchKitchenModal
          openCart={primary}
          openCarts={openCarts}
          targetKitchenName={pending.name}
          canAddSecond={crossBy?.canAddKitchen ?? openCarts.length < 2}
          onCancel={() => setPending(null)}
          onAddSecond={() => void onAddSecond()}
          onReplace={() => void onReplace()}
          confirming={clearing}
        />
      ) : null}

      <ProfileConsentSheet
        open={authOpen}
        onComplete={() => {
          setAuthOpen(false);
          setAddNote("Signed in — tap + again to add");
        }}
      />
    </Wrapper>
  );
}
