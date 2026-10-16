"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import {
  fetchCampaignPrograms,
  setCampaignProgramEnabled,
  type CampaignProgramRow,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export function GrowCampaignProgramsSection({ restaurantId }: { restaurantId: string }) {
  const [programs, setPrograms] = useState<CampaignProgramRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchCampaignPrograms(restaurantId)
      .then((r) => setPrograms(r.programs))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load programs"));
  }, [restaurantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onToggle(p: CampaignProgramRow) {
    setBusyId(p.id);
    setError(null);
    try {
      const res = await setCampaignProgramEnabled(restaurantId, p.id, !p.enabled);
      setPrograms(res.programs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const enabledCount = programs.filter((p) => p.enabled).length;

  return (
    <section
      className="rounded-xl bg-surface-container-lowest p-4 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]"
      data-testid="grow-campaign-programs"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight">
            Automated campaign programs
          </h3>
          <p className="text-xs text-on-surface-variant">
            Turn programs on or off — synced with Offers &amp; game rules. One-off broadcasts below.
          </p>
        </div>
        <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant">
          {enabledCount} / {programs.length} enabled
        </span>
      </div>

      {error ? <p className="mb-2 text-sm text-red-700">{error}</p> : null}

      <ul className="flex flex-col gap-2">
        {programs.length === 0 ? (
          <li className="text-sm text-on-surface-variant">Loading program catalog…</li>
        ) : (
          programs.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                p.enabled
                  ? "border-[#24963F]/30 bg-[#24963F]/5"
                  : "border-outline-variant/40 bg-surface-container-low",
              )}
            >
              <div className="flex min-w-0 gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    p.enabled ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant",
                  )}
                >
                  <MaterialIcon name={p.icon} className="text-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-on-surface-variant">{p.description}</p>
                  <p className="mt-1 text-[10px] font-medium text-on-surface-variant">
                    Offer: {p.offerSummary}
                    {p.templateKey ? (
                      <>
                        {" "}
                        · Template: <code className="rounded bg-surface-container-high px-1">{p.templateKey}</code>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
              <label className="flex shrink-0 cursor-pointer flex-col items-end gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wide text-on-surface-variant">
                  {p.enabled ? "On" : "Off"}
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={p.enabled}
                  disabled={busyId === p.id}
                  aria-label={`${p.enabled ? "Disable" : "Enable"} ${p.title}`}
                  onChange={() => void onToggle(p)}
                />
              </label>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
