"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import type { HubRestaurant } from "@/lib/api";
import { coverForSlug, cuisineForSlug, hubDemoMeta } from "@/lib/hub-media";

type Props = {
  restaurant: HubRestaurant;
  index?: number;
  onClick?: (e: React.MouseEvent) => void;
  forceBadge?: "delivery_promise" | "lowest_price";
  distanceKm?: number;
  area?: string;
};

/** Ownly horizontal restaurant card — image left, meta right */
export function OwnlyRestaurantRow({
  restaurant: r,
  index = 0,
  onClick,
  forceBadge,
  distanceKm,
  area = "Koramangala",
}: Props) {
  const meta = hubDemoMeta(r.slug);
  const badge = forceBadge ?? meta.badge;
  const cover = r.coverImageUrl?.trim() || coverForSlug(r.slug, index);
  const cuisine = cuisineForSlug(r.slug, r.city);
  const km = distanceKm ?? (0.3 + (index % 9) * 0.35);

  return (
    <Link
      href={r.menuPath}
      onClick={onClick}
      className="pressable flex gap-3 overflow-hidden rounded-[1.15rem] bg-white p-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
      data-testid="ownly-restaurant-row"
    >
      <div className="relative h-[6.75rem] w-[6.75rem] shrink-0 overflow-hidden rounded-2xl bg-surface-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        {badge === "delivery_promise" ? (
          <span className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-[#ffe4e6] px-2 py-0.5 text-[10px] font-bold text-primary">
            <MaterialIcon name="timer" className="text-[12px]" />
            Delivery Promise
          </span>
        ) : (
          <span className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10px] font-bold text-[#166534]">
            <MaterialIcon name="sell" className="text-[12px]" />
            Lowest Price
          </span>
        )}
        <p className="truncate text-[15px] font-bold leading-tight">{r.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[11px] font-semibold text-on-surface-variant">
          <span className="inline-flex items-center gap-0.5 text-success">
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-white">
              <MaterialIcon name="star" className="text-[10px] [font-variation-settings:'FILL'_1]" />
            </span>
            {meta.rating.toFixed(1)}
          </span>
          <span className="text-on-surface-variant/70">({meta.reviewsLabel})</span>
          <span>·</span>
          <span className="inline-flex items-center gap-0.5">
            <span aria-hidden>⚡</span>
            {meta.etaMins} mins
          </span>
        </p>
        <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
          {area} · {km.toFixed(2)} km
        </p>
        <p className="mt-0.5 truncate text-[11px] text-on-surface-variant/85">{cuisine}</p>
      </div>
    </Link>
  );
}
