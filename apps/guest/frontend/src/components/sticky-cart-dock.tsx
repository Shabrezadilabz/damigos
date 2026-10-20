"use client";

import Link from "next/link";
import { useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { formatInr } from "@/lib/api";

type Props = {
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  subtotalPaise: number;
  promoLine?: string | null;
  /** Cross-By: extra kitchens already in session */
  extraKitchenCount?: number;
  riderModeLabel?: string | null;
};

/** Ownly-style dual-layer sticky cart dock — P-UI-01 / DEC-016 */
export function StickyCartDock({
  restaurantId,
  restaurantName,
  itemCount,
  subtotalPaise,
  promoLine = "Direct D2C · First order FREE delivery on D'aMigo's",
  extraKitchenCount = 0,
  riderModeLabel = null,
}: Props) {
  const [hidden, setHidden] = useState(false);
  if (itemCount <= 0 || hidden) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-safe">
      <div className="mx-auto max-w-lg px-3 pb-3">
        {promoLine ? (
          <div className="rounded-t-xl bg-promo-strip px-3 py-1.5 text-center text-[12px] font-semibold text-promo-strip-fg">
            {promoLine}
          </div>
        ) : null}
        <div
          className={`flex items-center gap-2 bg-surface-container-lowest px-3 py-2.5 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] ${
            promoLine ? "rounded-b-2xl" : "rounded-2xl"
          }`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container">
            <MaterialIcon name="restaurant" className="text-[20px] text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">
              {restaurantName}
              {extraKitchenCount > 0 ? (
                <span className="ml-1.5 inline-flex rounded-full bg-primary-fixed px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  +{extraKitchenCount} kitchen
                </span>
              ) : null}
            </p>
            <Link
              href={`/r/${restaurantId}/menu`}
              className="text-[12px] font-semibold text-primary"
            >
              {riderModeLabel ? `${riderModeLabel} · ` : null}
              View menu ▶
            </Link>
          </div>
          <Link
            href={`/r/${restaurantId}/checkout`}
            className="pressable inline-flex min-h-11 shrink-0 flex-col items-center justify-center rounded-full bg-primary px-5 py-2 text-primary-foreground shadow-sm"
          >
            <span className="text-[14px] font-bold leading-tight">Checkout</span>
            <span className="text-[11px] font-medium tabular leading-tight opacity-90">
              {itemCount} Item{itemCount === 1 ? "" : "s"} · {formatInr(subtotalPaise)}
            </span>
          </Link>
          <button
            type="button"
            aria-label="Hide cart bar"
            className="pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant"
            onClick={() => setHidden(true)}
          >
            <MaterialIcon name="close" className="text-[16px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
