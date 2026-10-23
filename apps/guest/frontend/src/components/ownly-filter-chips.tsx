"use client";

import { MaterialIcon } from "@/components/material-icon";
import type { HubSort } from "@/components/hub-filters-context";

type Props = {
  sort: HubSort;
  onSortClick: () => void;
  vegOnly: boolean;
  onVegToggle: () => void;
  rating4Plus: boolean;
  onRatingToggle: () => void;
  lowestPrice: boolean;
  onLowestToggle: () => void;
  sortOpen?: boolean;
  onPickSort?: (s: HubSort) => void;
};

const SORT_LABELS: Record<HubSort, string> = {
  relevancy: "Relevancy",
  rating: "Rating (High to Low)",
  eta: "Distance / ETA",
  price: "Name (A–Z)",
};

/** Ownly filter chip row — used on hub collections / search / all restaurants */
export function OwnlyFilterChips({
  sort,
  onSortClick,
  vegOnly,
  onVegToggle,
  rating4Plus,
  onRatingToggle,
  lowestPrice,
  onLowestToggle,
  sortOpen,
  onPickSort,
}: Props) {
  return (
    <div className="relative z-30 mb-3 overflow-visible">
      <div className="hub-h-scroll no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          className={`pressable inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-[12px] font-semibold ${
            sort !== "relevancy" || sortOpen ? "border-primary text-primary" : "border-border"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSortClick();
          }}
        >
          Sort by
          <MaterialIcon name="expand_more" className="text-[16px]" />
        </button>
        <button
          type="button"
          className={`pressable inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            vegOnly ? "border-success bg-[#dcfce7] text-[#166534]" : "border-border bg-white"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onVegToggle();
          }}
        >
          <span
            className={`relative inline-flex h-4 w-7 items-center rounded-full ${
              vegOnly ? "bg-success" : "bg-surface-container-high"
            }`}
          >
            <span
              className={`absolute h-3 w-3 rounded-full bg-white shadow transition-[left] ${
                vegOnly ? "left-[12px]" : "left-0.5"
              }`}
            />
          </span>
          Pure Veg
        </button>
        <button
          type="button"
          className={`pressable inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-[12px] font-semibold ${
            rating4Plus ? "border-primary text-primary" : "border-border"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRatingToggle();
          }}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success text-white">
            <MaterialIcon name="star" className="text-[11px] [font-variation-settings:'FILL'_1]" />
          </span>
          Rating 4+
        </button>
        <button
          type="button"
          className={`pressable inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-[12px] font-semibold ${
            lowestPrice ? "border-primary text-primary" : "border-border"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLowestToggle();
          }}
        >
          <MaterialIcon name="sell" className="text-[14px] text-primary" />
          Lowest Price
        </button>
      </div>
      {sortOpen && onPickSort ? (
        <div className="absolute left-0 top-11 z-20 w-56 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/8">
          {(Object.keys(SORT_LABELS) as HubSort[]).map((key) => (
            <button
              key={key}
              type="button"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold hover:bg-surface-container-low"
              onClick={() => onPickSort(key)}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  sort === key ? "border-primary" : "border-border"
                }`}
              >
                {sort === key ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
              </span>
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
