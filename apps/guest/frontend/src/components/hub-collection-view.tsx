"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HubOpenCartDock } from "@/components/hub-open-cart-dock";
import {
  HubFiltersProvider,
  useHubFilters,
  withVegQuery,
  type HubSort,
} from "@/components/hub-filters-context";
import { MaterialIcon } from "@/components/material-icon";
import { OwnlyFilterChips } from "@/components/ownly-filter-chips";
import { OwnlyRestaurantRow } from "@/components/ownly-restaurant-row";
import { ProfileConsentSheet } from "@/components/profile-consent-sheet";
import {
  addCartItem,
  fetchHubBestsellers,
  fetchHubRestaurants,
  formatInr,
  type HubBestsellerItem,
  type HubRestaurant,
} from "@/lib/api";
import type { CollectionHero } from "@/lib/hub-collections";
import { coverForDish, cuisineForSlug, hubDemoMeta } from "@/lib/hub-media";
import { getGuestToken } from "@/lib/session";

type Props = { hero: CollectionHero; initialQuery?: string };

export function HubCollectionView(props: Props) {
  return (
    <HubFiltersProvider>
      <HubCollectionViewInner {...props} />
    </HubFiltersProvider>
  );
}

function HubCollectionViewInner({ hero, initialQuery = "" }: Props) {
  const router = useRouter();
  const { vegOnly, setVegOnly } = useHubFilters();
  const [rows, setRows] = useState<HubRestaurant[]>([]);
  const [dishes, setDishes] = useState<HubBestsellerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<HubSort>("relevancy");
  const [sortOpen, setSortOpen] = useState(false);
  const [rating4Plus, setRating4Plus] = useState(false);
  const [lowestPrice, setLowestPrice] = useState(false);
  const [cat, setCat] = useState("all");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addNote, setAddNote] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (hero.vegBias) setVegOnly(true);
  }, [hero.vegBias, setVegOnly]);

  async function onAddDish(e: React.MouseEvent, d: HubBestsellerItem) {
    e.preventDefault();
    e.stopPropagation();
    if (!getGuestToken()) {
      setAuthOpen(true);
      return;
    }
    setAddingId(d.id);
    setAddNote(null);
    setError(null);
    try {
      await addCartItem(d.restaurantId, d.id, 1);
      setAddNote(`Added ${d.name}`);
      router.push(`/r/${d.restaurantId}/checkout`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add");
    } finally {
      setAddingId(null);
    }
  }

  useEffect(() => {
    void fetchHubRestaurants("bangalore", initialQuery || undefined, vegOnly)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
    if (hero.mode === "dishes") {
      void fetchHubBestsellers(vegOnly)
        .then((b) => setDishes(b.items))
        .catch(() => setDishes([]));
    }
  }, [hero.mode, initialQuery, vegOnly]);

  const restaurants = useMemo(() => {
    let list = rows.map((r, i) => ({ r, i, meta: hubDemoMeta(r.slug) }));
    if (hero.cuisineHint?.length) {
      const hints = hero.cuisineHint;
      const hinted = list.filter(({ r }) => {
        const c = `${cuisineForSlug(r.slug, r.city)} ${r.slug} ${r.name}`.toLowerCase();
        return hints.some((h) => c.includes(h));
      });
      // Keep soft hint when it finds matches; otherwise show full hub list (still filterable)
      if (hinted.length >= 1) list = hinted;
    }
    if (hero.forceBadge === "delivery_promise") {
      const promised = list.filter(({ meta }) => meta.badge === "delivery_promise");
      if (promised.length >= 1) list = promised;
    }
    if (vegOnly) {
      list = list.filter(
        ({ r }) =>
          r.pureVeg === true ||
          r.vegFriendly === true ||
          (r.pureVeg === undefined && r.vegFriendly === undefined),
      );
    }
    if (rating4Plus) list = list.filter(({ meta }) => meta.rating >= 4);
    if (lowestPrice) list = list.filter(({ meta }) => meta.badge === "lowest_price");
    if (sort === "rating") list = [...list].sort((a, b) => b.meta.rating - a.meta.rating);
    else if (sort === "eta") list = [...list].sort((a, b) => a.meta.etaMins - b.meta.etaMins);
    else if (sort === "price") list = [...list].sort((a, b) => a.r.name.localeCompare(b.r.name));
    return list;
  }, [rows, hero.cuisineHint, hero.forceBadge, vegOnly, rating4Plus, lowestPrice, sort]);

  const dishList = useMemo(() => {
    let list = dishes.map((d) => ({ d, meta: hubDemoMeta(d.restaurantSlug) }));
    if (vegOnly) list = list.filter(({ d }) => d.isVeg);
    if (rating4Plus) list = list.filter(({ meta }) => meta.rating >= 4);
    if (lowestPrice) list = list.filter(({ d }) => d.pricePaise <= 9900);
    if (cat !== "all") {
      list = list.filter(
        ({ d }) =>
          d.name.toLowerCase().includes(cat) ||
          d.restaurantSlug.includes(cat) ||
          d.restaurantName.toLowerCase().includes(cat),
      );
    }
    if (sort === "rating") list = [...list].sort((a, b) => b.meta.rating - a.meta.rating);
    else if (sort === "eta") list = [...list].sort((a, b) => a.meta.etaMins - b.meta.etaMins);
    else if (sort === "price") list = [...list].sort((a, b) => a.d.pricePaise - b.d.pricePaise);
    return list;
  }, [dishes, vegOnly, rating4Plus, lowestPrice, cat, sort]);

  const lightHero = hero.slug === "shawarma" || hero.slug === "biryani" || hero.slug === "bestsellers";

  return (
    <div className="min-h-dvh bg-background pb-32">
      <header className={`relative overflow-hidden pt-safe ${hero.heroClass}`}>
        <div className="relative z-10 px-4 pb-5 pt-3">
          <Link
            href="/hub"
            className={`pressable mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${
              lightHero ? "bg-black/5 text-foreground" : "bg-white/20 text-white"
            }`}
            aria-label="Back"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1
                className={`font-display text-[28px] font-extrabold leading-tight tracking-tight ${
                  lightHero ? "text-foreground" : "text-white"
                }`}
              >
                {hero.title}
                {hero.titleAccent ? (
                  <>
                    <br />
                    <span className={lightHero ? "text-primary" : "text-[#fde68a]"}>{hero.titleAccent}</span>
                  </>
                ) : null}
              </h1>
              <p
                className={`mt-1 text-[13px] font-medium ${
                  lightHero ? "text-on-surface-variant" : "text-white/90"
                }`}
              >
                {hero.subtitle}
              </p>
              {hero.badge ? (
                <span className="mt-2 inline-flex rounded-full bg-[#fef08a] px-2.5 py-1 text-[11px] font-bold text-success">
                  {hero.badge}
                </span>
              ) : null}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.image}
              alt=""
              className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-lg ring-2 ring-white/40"
            />
          </div>
        </div>
      </header>

      <div className="px-4 pt-3">
        {hero.mode === "dishes" ? (
          <div className="no-scrollbar mb-3 flex gap-4 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All", img: hero.image },
              { id: "roll", label: "Rolls", img: hero.image },
              { id: "snack", label: "Snacks", img: hero.image },
              { id: "biryani", label: "Biryani", img: hero.image },
              { id: "noodle", label: "Noodles", img: hero.image },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                className="pressable flex w-14 shrink-0 flex-col items-center gap-1"
                onClick={() => setCat(c.id)}
              >
                <div
                  className={`h-14 w-14 overflow-hidden rounded-full ring-2 ${
                    cat === c.id ? "ring-primary" : "ring-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.img} alt="" className="h-full w-full object-cover" />
                </div>
                <span
                  className={`text-[11px] font-semibold ${
                    cat === c.id ? "border-b-2 border-primary text-primary" : "text-on-surface-variant"
                  }`}
                >
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <OwnlyFilterChips
          sort={sort}
          onSortClick={() => setSortOpen((o) => !o)}
          vegOnly={vegOnly}
          onVegToggle={() => setVegOnly((v) => !v)}
          rating4Plus={rating4Plus}
          onRatingToggle={() => setRating4Plus((v) => !v)}
          lowestPrice={lowestPrice}
          onLowestToggle={() => setLowestPrice((v) => !v)}
          sortOpen={sortOpen}
          onPickSort={(s) => {
            setSort(s);
            setSortOpen(false);
          }}
        />

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {addNote ? <p className="mb-2 text-[12px] font-semibold text-success">{addNote}</p> : null}

        {hero.mode === "dishes" ? (
          <ul className="space-y-3" data-testid="hub-collection-dishes">
            {dishList.map(({ d, meta }, idx) => (
              <li key={d.id}>
                <div className="relative flex gap-3 rounded-lg bg-surface-container-lowest p-3 shadow-sm border border-border">
                  <Link
                    href={withVegQuery(d.menuPath, vegOnly)}
                    className="pressable min-w-0 flex-1"
                  >
                    <span
                      className={`mb-1 inline-flex h-3.5 w-3.5 items-center justify-center border ${
                        d.isVeg ? "border-success" : "border-primary"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${d.isVeg ? "bg-success" : "bg-primary"}`}
                      />
                    </span>
                    <p className="line-clamp-2 text-[15px] font-bold leading-snug">{d.name}</p>
                    <p className="mt-1 text-[18px] font-extrabold tabular">{formatInr(d.pricePaise)}</p>
                    <p className="mt-1 text-[11px] text-on-surface-variant">
                      ★ {meta.rating.toFixed(1)} · ⚡ {meta.etaMins} mins · {d.restaurantName}
                    </p>
                  </Link>
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl">
                    <Link href={withVegQuery(d.menuPath, vegOnly)} className="pressable absolute inset-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverForDish(d.name, d.imageUrl, idx)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <button
                      type="button"
                      className="pressable absolute bottom-1.5 right-1.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow disabled:opacity-60"
                      aria-label={`Add ${d.name}`}
                      data-testid={`hub-collection-add-${d.id}`}
                      disabled={addingId === d.id}
                      onClick={(e) => void onAddDish(e, d)}
                    >
                      {addingId === d.id ? "…" : "+"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {!dishList.length ? (
              <p className="py-10 text-center text-sm text-on-surface-variant">
                No dishes match these filters.
              </p>
            ) : null}
          </ul>
        ) : (
          <ul className="space-y-3" data-testid="hub-collection-list">
            {restaurants.map(({ r, i }) => (
              <li key={r.id}>
                <OwnlyRestaurantRow restaurant={r} index={i} forceBadge={hero.forceBadge} />
              </li>
            ))}
            {!restaurants.length ? (
              <p className="py-10 text-center text-sm text-on-surface-variant">No kitchens in this collection.</p>
            ) : null}
          </ul>
        )}
      </div>

      <HubOpenCartDock />
      <ProfileConsentSheet
        open={authOpen}
        onComplete={() => {
          setAuthOpen(false);
          setAddNote("Signed in — tap + again to add");
        }}
      />
    </div>
  );
}
