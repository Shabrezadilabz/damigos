"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import {
  fetchRestaurantLocation,
  patchRestaurantLocation,
  type RestaurantLocation,
} from "@/lib/api";

/** C-06.08 — kitchen GPS pin for Cross-By Haversine */
export function SettingsLocationPanel() {
  const { restaurantId } = useCrmRestaurant();
  const [data, setData] = useState<RestaurantLocation | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    const row = await fetchRestaurantLocation(restaurantId);
    setData(row);
    setLat(row.lat != null ? String(row.lat) : "");
    setLng(row.lng != null ? String(row.lng) : "");
  }, [restaurantId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      setError("Enter valid latitude and longitude");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const row = await patchRestaurantLocation(restaurantId, latN, lngN);
      setData(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function useBrowserLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not available in this browser");
      return;
    }
    setGeoBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoBusy(false);
      },
      () => {
        setError("Could not read device location — enter coords manually");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  return (
    <div className="col-span-12 min-w-0 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-6 lg:col-span-9">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary">
          <MaterialIcon name="location_on" className="text-[22px]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">
            Kitchen location
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            GPS pin powers Cross-By (≤ 1 km single rider) and Shiprocket pickup. Required for ordering
            densification.
          </p>
        </div>
      </div>

      {data?.pinRequired ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Pin missing — guests won&apos;t see nearby Cross-By kitchens for this restaurant.
        </div>
      ) : data?.lat != null && data.lng != null ? (
        <div className="mt-4 rounded-lg border border-[#24963F]/20 bg-[#24963F]/10 px-3 py-2 text-sm text-[#1E7D34]">
          Pinned · {data.lat.toFixed(5)}, {data.lng.toFixed(5)}
          {data.geoUpdatedAt ? (
            <span className="text-on-surface-variant">
              {" "}
              · updated {new Date(data.geoUpdatedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={(e) => void onSave(e)} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Latitude
          </span>
          <input
            className="mt-1 w-full rounded-xl border border-outline-variant/60 bg-surface px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/25"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="12.971600"
            inputMode="decimal"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Longitude
          </span>
          <input
            className="mt-1 w-full rounded-xl border border-outline-variant/60 bg-surface px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/25"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="77.594600"
            inputMode="decimal"
            required
          />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="button" variant="outline" disabled={geoBusy} onClick={useBrowserLocation}>
            {geoBusy ? "Locating…" : "Use my location"}
          </Button>
          <Button type="submit" disabled={saving || !restaurantId}>
            {saving ? "Saving…" : "Save pin"}
          </Button>
        </div>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <p className="mt-4 text-[11px] leading-relaxed text-on-surface-variant">
        Tip: open Google Maps → drop a pin on the kitchen entrance → copy coordinates. Bangalore pilot
        densification uses Haversine ≤ 1.0 km for single-rider Cross-By.
      </p>
    </div>
  );
}
