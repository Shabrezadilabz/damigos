"use client";

import Link from "next/link";
import { MaterialIcon } from "@/components/material-icon";
import type { HubRestaurant } from "@/lib/api";
import { coverForSlug, cuisineForSlug, hubDemoMeta } from "@/lib/hub-media";

type Props = {
  restaurant: HubRestaurant;
  index?: number;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  forceBadge?: "delivery_promise" | "lowest_price";
  distanceKm?: number;
  area?: string;
};

/** Ownly horizontal restaurant card — image left, meta right */
export function OwnlyRestaurantRow({
  restaurant: r,
  index = 0,
  href,
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
      href={href ?? r.menuPath}
      onClick={onClick}
      className="pressable flex gap-3.5 overflow-hidden rounded-[22px] border border-[#E2E5EE] bg-white p-3 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.07)]"
      data-testid="ownly-restaurant-row"
    >
      <div className="relative h-[7rem] w-[7rem] shrink-0 overflow-hidden rounded-[16px] bg-surface-container">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        {badge === "delivery_promise" ? (
          <span className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-[#EEF0F5] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F1115]">
            <MaterialIcon name="timer" className="text-[12px]" />
            Delivery Promise
          </span>
        ) : (
          <span className="mb-1 inline-flex items-center gap-0.5 rounded-full bg-[#EAFF81] px-2.5 py-0.5 text-[10px] font-extrabold text-[#0F1115]">
            <MaterialIcon name="sell" className="text-[12px]" />
            Lowest Price
          </span>
        )}
        <p className="truncate font-display text-[16px] font-extrabold leading-snug tracking-tight text-[#0F1115]">
          {r.name}
        </p>
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
