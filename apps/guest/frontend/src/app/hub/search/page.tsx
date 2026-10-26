"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { OwnlyRestaurantRow } from "@/components/ownly-restaurant-row";
import {
  fetchHubRestaurants,
  formatInr,
  type HubRestaurant,
} from "@/lib/api";
import { coverForDish } from "@/lib/hub-media";

function SearchInner() {
  const sp = useSearchParams();
  const q = (sp.get("q") ?? "").trim();
  const vegOnly = sp.get("veg") === "1" || sp.get("veg") === "true";
  const [rows, setRows] = useState<HubRestaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchHubRestaurants("bangalore", q || undefined, vegOnly)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Search failed"))
      .finally(() => setLoading(false));
  }, [q, vegOnly]);

  const kitchenHits = useMemo(
    () =>
      rows.filter(
        (r) =>
          !q ||
          r.matchedBy === "kitchen" ||
          r.matchedBy === "both" ||
          r.matchedBy == null,
      ),
    [rows, q],
  );

  const dishHits = useMemo(() => {
    const out: Array<{
      id: string;
      name: string;
      pricePaise: number;
      isVeg: boolean;
      imageUrl: string | null;
      restaurantId: string;
      restaurantName: string;
      restaurantSlug: string;
      menuPath: string;
    }> = [];
    for (const r of rows) {
      if (q && r.matchedBy === "kitchen") continue;
      for (const d of r.sampleDishes ?? []) {
        if (vegOnly && !d.isVeg) continue;
        out.push({
          ...d,
          restaurantId: r.id,
          restaurantName: r.name,
          restaurantSlug: r.slug,
          menuPath: vegOnly
            ? `${r.menuPath}${r.menuPath.includes("?") ? "&" : "?"}veg=1`
            : r.menuPath,
        });
      }
    }
    return out;
  }, [rows, q, vegOnly]);

  return (
    <main className="min-h-dvh bg-background pb-16">
      <header className="border-b border-border bg-surface-container-lowest px-4 pb-4 pt-safe">
        <div className="mx-auto flex max-w-lg items-center gap-2 md:max-w-3xl">
          <Link
            href="/hub"
            className="pressable flex h-10 w-10 items-center justify-center rounded-md bg-surface-container"
            aria-label="Back to hub"
          >
            <MaterialIcon name="arrow_back" className="text-[22px]" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[18px] font-bold">
              {q ? q.replace(/\b\w/g, (c) => c.toUpperCase()) : "Search"}
            </h1>
            <p className="truncate text-[12px] text-on-surface-variant">
              {q ? `Kitchens & dishes matching “${q}”` : "Type a kitchen or dish name"}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-4 pt-4 md:max-w-3xl">
        {loading ? (
          <p className="text-sm text-on-surface-variant">Searching…</p>
        ) : error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : (
          <>
            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-on-surface-variant">
                Kitchens · {kitchenHits.length}
              </h2>
              {kitchenHits.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface-container-lowest p-4 text-[13px] text-on-surface-variant">
                  No kitchen names matched. Try a shorter name, or browse dishes below.
                </p>
              ) : (
                <ul className="space-y-2">
                  {kitchenHits.map((r, i) => (
                    <OwnlyRestaurantRow
                      key={r.id}
                      restaurant={r}
                      href={r.menuPath}
                      index={i}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-on-surface-variant">
                Dishes · {dishHits.length}
              </h2>
              {dishHits.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface-container-lowest p-4 text-[13px] text-on-surface-variant">
                  No dishes matched “{q}”.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {dishHits.slice(0, 24).map((d, idx) => (
                    <li key={`${d.restaurantId}-${d.id}`}>
                      <Link
                        href={d.menuPath}
                        className="pressable block overflow-hidden rounded-lg border border-border bg-surface-container-lowest shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={d.imageUrl?.trim() || coverForDish(d.name, String(idx))}
                          alt=""
                          className="aspect-square w-full object-cover"
                        />
                        <div className="p-2">
                          <p className="line-clamp-2 text-[13px] font-semibold leading-snug">
                            {d.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                            {d.restaurantName}
                          </p>
                          <p className="mt-1 text-[13px] font-bold tabular">
                            {formatInr(d.pricePaise)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function HubSearchPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-on-surface-variant">Searching…</p>}>
      <SearchInner />
    </Suspense>
  );
}
