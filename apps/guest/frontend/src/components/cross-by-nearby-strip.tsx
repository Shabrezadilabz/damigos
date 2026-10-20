"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { fetchCrossByNearby, type CrossByNearby } from "@/lib/api";

/** G-04.10 — Cross-By nearby kitchens (≤ 1 km) on cart / bill review */
export function CrossByNearbyStrip({ restaurantId }: { restaurantId: string }) {
  const [nearby, setNearby] = useState<CrossByNearby[]>([]);
  const [pinMissing, setPinMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCrossByNearby(restaurantId, 1)
      .then((res) => {
        if (cancelled) return;
        setNearby(res.nearby);
        setPinMissing(res.pinMissing);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  if (!loaded) return null;
  if (pinMissing) {
    return (
      <div className="rounded-2xl bg-surface-container-low px-4 py-3 text-[12px] text-on-surface-variant">
        Cross-By nearby kitchens unlock when this kitchen pins its GPS in CRM Settings.
      </div>
    );
  }
  if (nearby.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Cross-By · ≤ 1 km</p>
          <h2 className="font-display text-[17px] font-bold tracking-tight">Complete your meal</h2>
        </div>
        <MaterialIcon name="restaurant" className="text-[22px] text-primary" />
      </div>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {nearby.map((k) => (
          <Link
            key={k.restaurantId}
            href={k.menuPath}
            className="pressable min-w-[200px] shrink-0 rounded-2xl bg-surface-container-lowest p-3 shadow-sm ring-1 ring-border/60"
          >
            <p className="truncate text-[14px] font-semibold">{k.name}</p>
            <p className="mt-1 text-[11px] tabular text-on-surface-variant">
              {k.distanceMeters < 1000
                ? `${k.distanceMeters} m`
                : `${k.distanceKm.toFixed(2)} km`}
              <span className="mx-1">·</span>
              {k.riderMode === "SINGLE" ? "Single rider" : "2 riders"}
            </p>
            <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-primary">
              Add as 2nd kitchen
              <MaterialIcon name="arrow_forward" className="text-[14px]" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
