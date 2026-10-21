"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchGrowOffersGame,
  normalizeGrowOffersPayload,
  type GrowOffersGamePayload,
} from "@/lib/api";
import { GrowGamePlayPreview } from "./grow-game-play-preview";
import { GrowOffersConfigForm } from "./grow-offers-config-form";
import { normalizeGrowLoyaltyConfig, type GrowLoyaltyConfig } from "./grow-loyalty-constants";

export function GrowOffersPanel({ restaurantId }: { restaurantId: string }) {
  const [raw, setRaw] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<GrowLoyaltyConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRaw(null);
    setError(null);
    setDraftConfig(null);
    fetchGrowOffersGame(restaurantId)
      .then((d) => {
        if (!cancelled) {
          setRaw(d);
          setDraftConfig(normalizeGrowLoyaltyConfig(d.config));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const data: GrowOffersGamePayload | null = useMemo(() => {
    if (raw === null) return null;
    return normalizeGrowOffersPayload(raw);
  }, [raw]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data || !draftConfig) {
    return <p className="text-sm text-on-surface-variant">Loading loyalty configuration…</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <GrowOffersConfigForm
          key={`${restaurantId}-${data.weightSum}`}
          restaurantId={restaurantId}
          initial={data}
          onConfigChange={setDraftConfig}
          onSaved={(next) => {
            setRaw(normalizeGrowOffersPayload(next));
            setDraftConfig(normalizeGrowLoyaltyConfig(next.config));
          }}
        />
      </div>
      <div className="xl:col-span-5">
        <GrowGamePlayPreview config={draftConfig} />
        {!data.weightsValid ? (
          <p className="mt-3 text-sm text-amber-800">Fix spin weights before guests can play (TC-C-040).</p>
        ) : null}
      </div>
    </div>
  );
}
