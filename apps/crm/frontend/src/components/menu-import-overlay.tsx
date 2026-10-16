"use client";

import { MaterialIcon } from "@/components/material-icon";
import type { MenuImportJobRow } from "@/lib/api";

const STEPS = [
  { min: 0, label: "Uploading & preparing photo" },
  { min: 10, label: "Reading menu with AI vision" },
  { min: 30, label: "Extracting dishes & brand colors" },
  { min: 90, label: "Saving draft menu rows" },
] as const;

function stepLabel(pct: number, uploading: boolean): string {
  if (uploading) return STEPS[0].label;
  for (let i = STEPS.length - 1; i >= 0; i -= 1) {
    if (pct >= STEPS[i]!.min) return STEPS[i]!.label;
  }
  return STEPS[1]!.label;
}

export function MenuImportOverlay({
  job,
  uploading,
}: {
  job: MenuImportJobRow | null;
  uploading: boolean;
}) {
  const pct = uploading ? 8 : (job?.progressPct ?? 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-import-overlay-title"
      data-testid="menu-import-overlay"
    >
      <div className="w-full max-w-md rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-2xl">
        <div className="relative mx-auto mb-8 flex h-28 w-28 items-center justify-center">
          <span
            className="absolute inset-0 animate-spin rounded-full border-4 border-primary/15 border-t-primary"
            aria-hidden
          />
          <span
            className="absolute inset-3 animate-pulse rounded-full bg-primary/10"
            aria-hidden
          />
          <MaterialIcon name="document_scanner" className="relative text-[40px] text-primary" />
        </div>

        <h2
          id="menu-import-overlay-title"
          className="text-center font-[family-name:var(--font-display)] text-xl font-bold"
        >
          AI menu vision
        </h2>
        <p className="mt-2 text-center text-sm text-on-surface-variant">
          {stepLabel(pct, uploading)} — usually 1–3 minutes
        </p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs font-bold">
            <span className="text-on-surface-variant">Progress</span>
            <span className="tabular-nums text-primary">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        <ul className="mt-6 space-y-2 text-left text-xs">
          {STEPS.slice(1).map((s) => {
            const done = !uploading && pct >= s.min + (s.min === 30 ? 5 : 0);
            const active = !uploading && pct >= s.min && !done;
            return (
              <li
                key={s.label}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  done
                    ? "bg-[#24963F]/10 text-[#24963F]"
                    : active
                      ? "bg-primary/10 text-foreground"
                      : "text-on-surface-variant/70"
                }`}
              >
                <MaterialIcon
                  name={done ? "check_circle" : active ? "hourglass_top" : "radio_button_unchecked"}
                  className={`text-[18px] ${active ? "animate-pulse" : ""}`}
                />
                {s.label}
              </li>
            );
          })}
        </ul>

        {job?.sourceFilename ? (
          <p className="mt-4 truncate text-center text-[10px] text-on-surface-variant">
            {job.sourceFilename}
          </p>
        ) : null}
      </div>
    </div>
  );
}
