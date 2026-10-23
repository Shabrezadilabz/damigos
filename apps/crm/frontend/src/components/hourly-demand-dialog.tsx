"use client";

import { MaterialIcon } from "@/components/material-icon";
import type { DashboardAnalytics } from "@/lib/api";
import { cn } from "@/lib/utils";

type HourRow = { hour: number; label: string; count: number; peak: boolean };

const SLOT_LABELS: { hour: number; label: string }[] = [
  { hour: 12, label: "12p" },
  { hour: 14, label: "2p" },
  { hour: 16, label: "4p" },
  { hour: 18, label: "6p" },
  { hour: 20, label: "8p" },
  { hour: 21, label: "9p" },
  { hour: 22, label: "10p" },
  { hour: 23, label: "11p" },
];

function buildHourRows(analytics: DashboardAnalytics | null): HourRow[] {
  const byHour = new Map((analytics?.ordersByHour ?? []).map((h) => [h.hour, h.count]));
  const liveTotal = [...byHour.values()].reduce((a, b) => a + b, 0);

  if (liveTotal > 0) {
    return SLOT_LABELS.map(({ hour, label }) => {
      const count = byHour.get(hour) ?? 0;
      return { hour, label, count, peak: hour >= 20 && hour <= 22 };
    });
  }

  // Empty kitchen — zeros only (no Stitch demo fill)
  return SLOT_LABELS.map(({ hour, label }) => ({
    hour,
    label,
    count: 0,
    peak: hour >= 20 && hour <= 22,
  }));
}

type Props = {
  open: boolean;
  onClose: () => void;
  analytics: DashboardAnalytics | null;
  onOpenFullAnalytics?: () => void;
};

export function HourlyDemandDialog({ open, onClose, analytics, onOpenFullAnalytics }: Props) {
  if (!open) return null;

  const rows = buildHourRows(analytics);
  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((a, r) => a + r.count, 0);
  const peakRows = rows.filter((r) => r.peak);
  const peakCount = peakRows.reduce((a, r) => a + r.count, 0);
  const peakShare = total > 0 ? Math.round((peakCount / total) * 100) : 0;
  const top = [...rows].sort((a, b) => b.count - a.count)[0];
  const hasLive = total > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hourly-demand-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
      data-testid="hourly-demand-dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/60 bg-background shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-background px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Kitchen rush</p>
            <h2
              id="hourly-demand-title"
              className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
            >
              Orders by hour — detailed analysis
            </h2>
            <p className="text-xs text-on-surface-variant">
              {analytics?.range === "7d" ? "Last 7 days" : "Last 30 days"} · Peak window 8–10 PM
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-foreground"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-surface-container-low p-3">
              <p className="text-[10px] font-bold uppercase text-on-surface-variant">Orders in view</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums">
                {total.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-3">
              <p className="text-[10px] font-bold uppercase text-on-surface-variant">Peak share</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums">
                {peakShare}%
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-3">
              <p className="text-[10px] font-bold uppercase text-on-surface-variant">Busiest slot</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold">
                {hasLive && top ? top.label : "—"}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Hourly distribution</p>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-primary" /> Peak
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-surface-container-high" /> Regular
                </span>
              </div>
            </div>
            <div className="flex h-40 items-end justify-between gap-2 rounded-xl bg-surface-container-low/60 px-3 pb-2 pt-6">
              {rows.map((r) => {
                const pct = Math.max(r.count > 0 ? 8 : 2, Math.round((r.count / max) * 100));
                return (
                  <div key={r.label} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold tabular-nums text-on-surface-variant">
                      {r.count > 0 ? r.count : ""}
                    </span>
                    <div
                      className={cn(
                        "w-full max-w-[28px] rounded-t-md transition-all",
                        r.peak && r.count > 0 ? "bg-primary" : "bg-surface-container-high",
                      )}
                      style={{ height: `${pct}%`, minHeight: r.count > 0 ? 12 : 4 }}
                      title={`${r.label}: ${r.count}`}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        r.peak ? "font-bold text-primary" : "text-[#8f6f6e]",
                      )}
                    >
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {!hasLive ? (
            <p className="rounded-xl border border-dashed border-outline-variant/70 bg-surface-container-low/40 px-3 py-2.5 text-xs text-on-surface-variant">
              No hourly orders yet for this kitchen. Bars fill after paid orders land in this window.
            </p>
          ) : (
            <p className="text-xs text-on-surface-variant">
              <strong className="text-foreground">Insight:</strong> Staff prep denser at 8–10 PM —
              stagger KOT batching and rider pickup calls in that window.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
            {onOpenFullAnalytics ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullAnalytics();
                }}
                className="rounded-xl bg-surface-container-high px-3.5 py-2 text-xs font-semibold hover:bg-surface-container"
              >
                Open full analytics
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-[#b6162b]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
