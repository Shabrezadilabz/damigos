"use client";

import Link from "next/link";
import { useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import type { HubPerkRailItem } from "@/lib/api";
import { coverForPerk, FOOD } from "@/lib/hub-media";

const FEATURED_FALLBACKS: HubPerkRailItem[] = [
  {
    id: "todays-1",
    kitchenName: "Festival Special",
    title: "Celebrate & save on Direct D2C",
    badge: "TODAY",
    coinsHint: 0,
    href: "/hub/collections/festival",
    kind: "platform",
  },
  {
    id: "todays-2",
    kitchenName: "Bestsellers",
    title: "Under ₹149 · great value picks",
    badge: "DEAL",
    coinsHint: 0,
    href: "/hub/collections/bestsellers",
    kind: "kitchen",
  },
  {
    id: "todays-3",
    kitchenName: "Delivery Promise",
    title: "Fast kitchens near you",
    badge: "FAST",
    coinsHint: 0,
    href: "/hub/collections/promise",
    kind: "kitchen",
  },
  {
    id: "todays-4",
    kitchenName: "Healthy Choices",
    title: "Options without guilt",
    badge: "FRESH",
    coinsHint: 0,
    href: "/hub/collections/healthy",
    kind: "kitchen",
  },
];

const TILE_IMAGES = [FOOD.festival, FOOD.bowl, FOOD.biryani, FOOD.healthy, FOOD.pizza, FOOD.dessert];

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

type Props = { perks: HubPerkRailItem[] };

/** Today's Offers — featured image tiles + combined all-offers list */
export function HubTodaysOffers({ perks }: Props) {
  const featured = (perks.length >= 2 ? perks : [...perks, ...FEATURED_FALLBACKS]).slice(0, 8);
  const allOffers = perks.length > 0 ? perks : FEATURED_FALLBACKS;

  return (
    <div className="mb-6 space-y-5" data-testid="hub-todays-offers">
      {/* Featured — perfect image tiles */}
      <section data-testid="hub-pick-cravings">
        <div className="mb-3 flex items-center justify-between px-0.5">
          <h3 className="font-display text-[18px] font-bold tracking-tight">Today&apos;s Offers</h3>
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {featured.length} live
          </span>
        </div>
        <div className="hub-h-scroll no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 pt-1">
          {featured.map((p, i) => {
            const img = coverForPerk(p.kitchenName, p.href, i) || TILE_IMAGES[i % TILE_IMAGES.length]!;
            return (
              <Link
                key={`feat-${p.kind}-${p.id}`}
                href={p.href}
                className="hub-craving-float pressable flex w-[7.25rem] shrink-0 flex-col gap-1.5"
              >
                <div
                  className="hub-float-inner relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#ffe4e6] to-white shadow-[0_8px_18px_rgba(178,18,42,0.14)] ring-1 ring-black/5"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <OfferThumb
                    src={img}
                    alt=""
                    fallbackIndex={i}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
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

      {/* Combined all today's offers */}
      <section data-testid="hub-all-todays-offers">
        <div className="mb-2.5 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <MaterialIcon name="local_offer" className="text-[18px] text-primary" />
            <h3 className="font-display text-[16px] font-bold tracking-tight">All today&apos;s offers</h3>
          </div>
          <Link href="/hub/collections/bestsellers" className="text-[12px] font-bold text-primary">
            See all &gt;
          </Link>
        </div>
        <ul className="space-y-2.5">
          {allOffers.map((p, i) => {
            const img = coverForPerk(p.kitchenName, p.href, i) || TILE_IMAGES[i % TILE_IMAGES.length]!;
            return (
              <li key={`all-${p.kind}-${p.id}`}>
                <Link
                  href={p.href}
                  className="pressable flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-black/5"
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
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
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
