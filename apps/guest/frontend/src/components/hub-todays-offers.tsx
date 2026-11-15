"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { looksNonVegCopy, withVegQuery } from "@/components/hub-filters-context";
import { MaterialIcon } from "@/components/material-icon";
import type { HubPerkRailItem } from "@/lib/api";
import { coverForPerk, FOOD } from "@/lib/hub-media";

const TILE_IMAGES = [FOOD.festival, FOOD.bowl, FOOD.healthy, FOOD.dosa, FOOD.dessert, FOOD.thali];

function OfferThumb({
  src,
  alt,
  className,
  fallbackIndex,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackIndex: number;
}) {
  const [img, setImg] = useState(src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt={alt}
      className={className}
      onError={() => setImg(TILE_IMAGES[(fallbackIndex + 1) % TILE_IMAGES.length]!)}
    />
  );
}

type Props = { perks: HubPerkRailItem[]; vegOnly?: boolean };

/** Today's Offers — featured image tiles + combined all-offers list */
export function HubTodaysOffers({ perks, vegOnly = false }: Props) {
  const pool = useMemo(() => {
    const filtered = vegOnly
      ? perks.filter((p) => !looksNonVegCopy(p.kitchenName, p.title, p.badge))
      : perks;
    return filtered;
  }, [perks, vegOnly]);

  const featured = pool.slice(0, 12);
  const allOffers = pool;

  return (
    <div className="mb-6 space-y-5" data-testid="hub-todays-offers">
      <section data-testid="hub-pick-cravings">
        <div className="mb-3 flex items-center justify-between px-0.5">
          <h3 className="font-display text-[18px] font-bold tracking-tight">
            {vegOnly ? "Today’s Veg Offers" : "Today’s Offers"}
          </h3>
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {featured.length} live
          </span>
        </div>
        {featured.length === 0 ? (
          <p className="text-[14px] text-on-surface-variant">No offers are published right now.</p>
        ) : null}
        <div className="hub-h-scroll no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4 xl:grid-cols-5">
          {featured.map((p, i) => {
            const img = coverForPerk(p.kitchenName, p.href, i) || TILE_IMAGES[i % TILE_IMAGES.length]!;
            return (
              <Link
                key={`feat-${p.kind}-${p.id}`}
                href={withVegQuery(p.href, vegOnly)}
                className="hub-craving-float pressable flex w-[9.5rem] shrink-0 flex-col gap-1.5 md:w-auto"
              >
                <div
                  className="hub-float-inner relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-b from-primary-fixed to-surface-container-lowest shadow-[0_8px_18px_rgba(178,18,42,0.14)] border border-border"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <OfferThumb
                    src={img}
                    alt=""
                    fallbackIndex={i}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span
                    className="offer-ticket-sticker absolute left-1.5 top-1.5 z-[1] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white"
                    data-testid="offer-ticket-sticker"
                  >
                    {p.badge.slice(0, 12)}
                  </span>
                  <p className="absolute inset-x-1.5 bottom-1.5 line-clamp-2 text-[11px] font-bold leading-tight text-white drop-shadow">
                    {p.title}
                  </p>
                </div>
                <span className="truncate text-center text-[11px] font-semibold leading-tight">
                  {p.kitchenName}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section data-testid="hub-all-todays-offers">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <MaterialIcon name="local_offer" className="text-[18px] text-primary" />
            <h3 className="font-display text-[16px] font-bold tracking-tight">All today&apos;s offers</h3>
          </div>
          <Link
            href={withVegQuery("/hub/collections/bestsellers", vegOnly)}
            className="text-[12px] font-bold text-primary"
          >
            See all &gt;
          </Link>
        </div>
        <ul className="grid gap-2.5 md:grid-cols-2">
          {allOffers.map((p, i) => {
            const img = coverForPerk(p.kitchenName, p.href, i) || TILE_IMAGES[i % TILE_IMAGES.length]!;
            return (
              <li key={`all-${p.kind}-${p.id}`}>
                <Link
                  href={withVegQuery(p.href, vegOnly)}
                  className="pressable flex items-center gap-3 rounded-lg bg-surface-container-lowest p-2.5 shadow-sm border border-border"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container">
                    <OfferThumb
                      src={img}
                      alt=""
                      fallbackIndex={i + 2}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold leading-tight">{p.kitchenName}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-on-surface-variant">{p.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span
                        className="offer-ticket-sticker px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                        data-testid="offer-ticket-sticker-list"
                      >
                        {p.badge}
                      </span>
                      {p.coinsHint > 0 ? (
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          {p.coinsHint} coins
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-success">Today</span>
                      )}
                    </div>
                  </div>
                  <MaterialIcon name="chevron_right" className="shrink-0 text-[22px] text-on-surface-variant" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
