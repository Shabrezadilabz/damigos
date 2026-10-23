"use client";

import { useState } from "react";
import { HourlyDemandDialog } from "@/components/hourly-demand-dialog";
import { MaterialIcon } from "@/components/material-icon";
import type { DashboardAnalytics } from "@/lib/api";
import { cn } from "@/lib/utils";

type Props = {
  analytics: DashboardAnalytics | null;
  onOpenFull?: (focus?: "hourly-demand") => void;
  onExportCsv?: () => void;
  exporting?: boolean;
};

/** Stitch crm_2_home_overview_analytics_peek — right column */
export function DashboardAnalyticsPeek({ analytics, onOpenFull, onExportCsv, exporting }: Props) {
  const [hourlyOpen, setHourlyOpen] = useState(false);
  const funnel = analytics?.funnel ?? [];
  const hasLive = funnel.some((f) => f.count > 0);
  const scans = funnel.find((f) => f.step === "scan")?.count ?? 0;
  const games = funnel.find((f) => f.step === "game")?.count ?? 0;
  const orders = funnel.find((f) => f.step === "order")?.count ?? 0;
  const conv = scans > 0 ? ((orders / scans) * 100).toFixed(1) : "0.0";

  const hourBars = hasLive
    ? [
        { label: "12p", h: "h-8", cls: "bg-surface-container-high" },
        { label: "2p", h: "h-12", cls: "bg-surface-container-high" },
        { label: "4p", h: "h-6", cls: "bg-surface-container-high" },
        { label: "6p", h: "h-16", cls: "bg-surface-container-high" },
        { label: "8p", h: "h-24", cls: "bg-primary-container" },
        { label: "9p", h: "h-28", cls: "bg-primary" },
        { label: "10p", h: "h-20", cls: "bg-primary-container" },
        { label: "11p", h: "h-10", cls: "bg-surface-container-high" },
      ]
    : [
        { label: "12p", h: "h-1", cls: "bg-surface-container-high" },
        { label: "2p", h: "h-1", cls: "bg-surface-container-high" },
        { label: "4p", h: "h-1", cls: "bg-surface-container-high" },
        { label: "6p", h: "h-1", cls: "bg-surface-container-high" },
        { label: "8p", h: "h-1", cls: "bg-surface-container-high" },
        { label: "9p", h: "h-1", cls: "bg-surface-container-high" },
        { label: "10p", h: "h-1", cls: "bg-surface-container-high" },
        { label: "11p", h: "h-1", cls: "bg-surface-container-high" },
      ];

  return (
    <>
    <HourlyDemandDialog
      open={hourlyOpen}
      onClose={() => setHourlyOpen(false)}
      analytics={analytics}
      onOpenFullAnalytics={() => onOpenFull?.("hourly-demand")}
    />
    <div className="group relative overflow-hidden rounded-3xl bg-surface-container-lowest p-6 shadow-md">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="analytics" className="text-[20px] text-primary" />
          <span className="font-[family-name:var(--font-display)] text-sm font-semibold">Analytics</span>
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={onExportCsv}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-[#b6162b] group-hover:underline"
        >
          {exporting ? "Exporting…" : "Export CSV"}
          <MaterialIcon name="file_download" className="text-[16px]" />
        </button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-container-low/70 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Scan → Game → Order Funnel</p>
              <p className="text-xs text-on-surface-variant">Last 30 days conversion rates</p>
            </div>
            <span className="rounded bg-surface-container-lowest px-2 py-0.5 text-sm font-bold text-primary">{conv}%</span>
          </div>
          <div className="relative flex h-36 items-end">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 400 120" aria-hidden>
              <defs>
                <linearGradient id="crmFunnelGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#b7122a" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#b7122a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 0,110 L 0,80 Q 80,45 150,60 T 280,25 T 400,10 L 400,110 Z" fill="url(#crmFunnelGradient)" />
              <path
                d="M 0,80 Q 80,45 150,60 T 280,25 T 400,10"
                fill="none"
                stroke="#b7122a"
                strokeLinecap="round"
                strokeWidth="3"
              />
              <circle cx="150" cy="60" r="4" fill="#ffffff" stroke="#b7122a" strokeWidth="2.5" />
              <circle cx="280" cy="25" r="4" fill="#ffffff" stroke="#b7122a" strokeWidth="2.5" />
              <circle cx="400" cy="10" r="4" fill="#b7122a" stroke="#ffffff" strokeWidth="2" />
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[10px] font-semibold">
            <div className="rounded-xl bg-surface-container-lowest p-2">
              <span className="block text-on-surface-variant">Table Scans</span>
              <span className="font-[family-name:var(--font-display)] text-sm font-bold">{scans.toLocaleString("en-IN")}</span>
            </div>
            <div className="rounded-xl bg-surface-container-lowest p-2">
              <span className="block text-on-surface-variant">Spun Loyalty Wheel</span>
              <span className="font-[family-name:var(--font-display)] text-sm font-bold">{games.toLocaleString("en-IN")}</span>
            </div>
            <div className="rounded-xl bg-surface-container-lowest p-2">
              <span className="block text-on-surface-variant">Placed Order</span>
              <span className="font-[family-name:var(--font-display)] text-sm font-bold text-primary">
                {orders.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setHourlyOpen(true)}
          data-testid="orders-by-hour-open"
          className="flex flex-col gap-3 rounded-2xl bg-surface-container-low/70 p-4 text-left transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Orders by Hour</p>
              <p className="text-xs text-on-surface-variant">
                {hasLive ? "Peak rush: 8:00 PM - 10:00 PM · tap for detail" : "Tap for detailed analysis"}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-on-surface-variant">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Today
              <MaterialIcon name="open_in_new" className="ml-0.5 text-[14px] text-primary" />
            </div>
          </div>
          <div className="flex h-28 items-end justify-between gap-2 px-1 pt-4">
            {hourBars.map((b) => (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div className={cn("w-full rounded-t-md transition-all", b.h, b.cls)} />
                <span
                  className={cn(
                    "text-[10px] font-semibold",
                    b.cls.includes("primary") && !b.cls.includes("container")
                      ? "font-bold text-primary"
                      : "text-[#8f6f6e]",
                  )}
                >
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </button>

        <div className="flex items-center justify-between rounded-2xl bg-inverse-surface p-4 text-inverse-on-surface shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffdea3] text-[#261900] text-sm font-bold">
              ₹
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                Avg Order Ticket: {hasLive ? "₹1,480" : "₹0"}
              </p>
              <p className="text-xs text-white/70">
                {hasLive
                  ? "WhatsApp guests spend 22% more vs counter"
                  : "Fills in after your first paid orders"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHourlyOpen(true)}
            className="rounded-lg bg-surface-container-lowest px-3 py-1.5 text-[10px] font-semibold text-foreground hover:bg-surface-container-high"
          >
            Insights
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
