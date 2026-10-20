"use client";

import { useEffect, useState } from "react";
import { StickyCartDock } from "@/components/sticky-cart-dock";
import { fetchOpenCartSession, type CrossBySession, type OpenCartSummary } from "@/lib/api";
import { getGuestToken } from "@/lib/session";

/** Shows Ownly sticky dock on Hub when guest has an open cart */
export function HubOpenCartDock() {
  const [carts, setCarts] = useState<OpenCartSummary[]>([]);
  const [crossBy, setCrossBy] = useState<CrossBySession | null>(null);

  useEffect(() => {
    if (!getGuestToken()) return;
    void fetchOpenCartSession()
      .then((s) => {
        setCarts(s.openCarts);
        setCrossBy(s.crossBy);
      })
      .catch(() => {
        setCarts([]);
        setCrossBy(null);
      });
  }, []);

  const primary = carts[0];
  if (!primary || primary.itemCount <= 0) return null;

  const totalItems = carts.reduce((s, c) => s + c.itemCount, 0);
  const totalSub = carts.reduce((s, c) => s + c.subtotalPaise, 0);
  const extra = Math.max(0, carts.length - 1);
  const riderLabel =
    carts.length > 1 && crossBy
      ? crossBy.riderMode === "SINGLE"
        ? "Single rider"
        : "2 riders"
      : null;

  return (
    <StickyCartDock
      restaurantId={primary.restaurantId}
      restaurantName={primary.restaurantName}
      itemCount={totalItems}
      subtotalPaise={totalSub}
      promoLine="Get 25% off on this order (upto ₹40) · Direct D2C"
      extraKitchenCount={extra}
      riderModeLabel={riderLabel}
    />
  );
}
