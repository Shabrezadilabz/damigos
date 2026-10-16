"use client";

import { useEffect, useMemo, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import {
  fetchGrowOffersGame,
  normalizeGrowOffersPayload,
  type GrowOffersGamePayload,
} from "@/lib/api";
import { GrowOffersConfigForm } from "./grow-offers-config-form";

export function GrowOffersPanel({ restaurantId }: { restaurantId: string }) {
  const [raw, setRaw] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRaw(null);
    setError(null);
    fetchGrowOffersGame(restaurantId)
      .then((d) => {
        if (!cancelled) setRaw(d);
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
  if (!data) return <p className="text-sm text-on-surface-variant">Loading loyalty configuration…</p>;

  const { config, segments } = data;

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="xl:col-span-7">
        <GrowOffersConfigForm
          key={`${restaurantId}-${data.weightSum}-${segments.length}`}
          restaurantId={restaurantId}
          initial={data}
          onSaved={(next) => setRaw(normalizeGrowOffersPayload(next))}
        />
      </div>
      <div className="xl:col-span-5">
        <div className="sticky top-20 flex flex-col gap-4">
          <div className="rounded-xl bg-surface-container-low p-4 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Live preview (after save)
            </p>
            <div className="flex flex-col items-center gap-3 rounded-lg bg-[#121212] p-5 text-white">
              <MaterialIcon name="casino" className="text-[32px] text-tertiary-fixed-dim" />
              <p className="text-center font-[family-name:var(--font-display)] text-lg font-bold">
                Spin &amp; savor wheel
              </p>
              <p className="text-center text-xs text-gray-400">
                {config.engineEnabled ? "Engine on" : "Engine paused"} · {data.dailySpinLimit} spin/day ·{" "}
                {config.paybackPercent}% payback
              </p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {segments.map((s) => (
                  <span
                    key={s.offerId}
                    className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold"
                  >
                    {s.title} ({s.weight})
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <p className="mb-2 text-xs font-bold text-on-surface-variant">WhatsApp message preview</p>
            <div className="mx-auto max-w-[280px] rounded-2xl border border-outline-variant/40 bg-[#e5ddd5] p-3">
              <div className="rounded-lg bg-white p-3 text-xs shadow-sm">
                <p className="font-semibold text-[#075e54]">Your kitchen</p>
                <p className="mt-2">🎡 Spin unlocked — configure rewards above, then save.</p>
                <div className="mt-3 rounded-lg bg-[#25D366] py-2 text-center font-semibold text-white">
                  Play now
                </div>
              </div>
            </div>
          </div>
          {!data.weightsValid ? (
            <p className="text-sm text-amber-800">Fix spin weights before guests can play (TC-C-040).</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
