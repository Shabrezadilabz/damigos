"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/material-icon";
import { formatInr, type CrmOrder, type DashboardAnalytics } from "@/lib/api";
import { cn } from "@/lib/utils";

const STITCH_MENU_ROWS = [
  {
    name: "Smoked Butter Chicken Slider Trio",
    category: "Signature Sliders",
    orders: 1420,
    revenue: 69580000,
    cartPct: "34.8%",
    cartHot: true,
    velocity: "+24%",
    velocityUp: true,
    veg: false,
  },
  {
    name: "Truffle Edamame & Cream Cheese Dimsum",
    category: "Dimsum & Bao",
    orders: 1180,
    revenue: 57820000,
    cartPct: "29.4%",
    cartHot: true,
    velocity: "+18%",
    velocityUp: true,
    veg: true,
  },
  {
    name: "Fiery Ghost Pepper Crispy Wings (8pc)",
    category: "Appetizers",
    orders: 994,
    revenue: 44233000,
    cartPct: "25.1%",
    cartHot: false,
    velocity: "+12%",
    velocityUp: true,
    veg: false,
  },
  {
    name: "Woodfired Burrata & Pesto Margherita",
    category: "Artisan Pizza",
    orders: 865,
    revenue: 50170000,
    cartPct: "22.8%",
    cartHot: false,
    velocity: "0%",
    velocityUp: null,
    veg: true,
  },
  {
    name: "Belgian Dark Chocolate Lava Tart",
    category: "Dessert & Pastry",
    orders: 740,
    revenue: 25900000,
    cartPct: "21.5%",
    cartHot: false,
    velocity: "-4%",
    velocityUp: false,
    veg: true,
  },
] as const;

const STAGE_META: Record<string, { title: string; sub: string; icon: string }> = {
  scan: { title: "Packaging Sticker Scan", sub: "Unique Visitors", icon: "qr_code_2" },
  game: { title: "Spun Loyalty Wheel", sub: "Active Gamified Diners", icon: "casino" },
  menu: { title: "Viewed Direct Menu", sub: "Browsed 3+ Categories", icon: "restaurant" },
  order: { title: "Placed Direct Order", sub: "Paid via UPI / Cash", icon: "check_circle" },
};

type Props = {
  analytics: DashboardAnalytics | null;
  onExportCsv?: () => void;
  exporting?: boolean;
  onBackOverview?: () => void;
  recentOrders?: CrmOrder[];
};

/** Stitch crm_2_home_analytics_full_view */
const DEMO_FUNNEL = [
  { step: "scan", label: "Sticker scans", count: 14_890 },
  { step: "game", label: "Reward plays", count: 12_450 },
  { step: "menu", label: "Carts with items", count: 10_820 },
  { step: "order", label: "Paid orders", count: 9_560 },
];

export function DashboardAnalyticsFull({ analytics, onExportCsv, exporting, onBackOverview }: Props) {
  const raw = analytics?.funnel ?? [];
  const funnel = raw.length && raw.some((f) => f.count > 0) ? raw : DEMO_FUNNEL;
  const scans = funnel.find((f) => f.step === "scan")?.count ?? 14_890;
  const orders = funnel.find((f) => f.step === "order")?.count ?? 9_560;
  const conv = scans > 0 ? (orders / scans) * 100 : 64.2;
  const gmvPaise = orders > 0 ? orders * 148_000 : 84_265_000;
  const repeatEst = Math.round(orders * 0.4) || 3_824;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Direct GMV (30d)", value: formatInr(gmvPaise), badge: "+18.4%", badgeTone: "green" as const, sub: "vs last 30d window", icon: "currency_rupee" },
          { label: "Scan-to-Order Rate", value: `${conv.toFixed(1)}%`, badge: "2.0x", badgeTone: "primary" as const, sub: "Industry norm ~32%", icon: "qr_code_scanner" },
          { label: "Guest Profiles Captured", value: scans.toLocaleString("en-IN"), badge: "99.2%", badgeTone: "green" as const, sub: "DPDP act opt-in valid", icon: "verified_user", iconTertiary: true },
          { label: "Average Order Value (AOV)", value: "₹1,480", badge: "+₹360", badgeTone: "green" as const, sub: "vs Aggregators (₹1,120)", icon: "shopping_bag" },
        ].map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-5 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-md"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-tr-2xl bg-gradient-to-bl from-primary/10 to-transparent" />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{k.label}</span>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-low",
                  "iconTertiary" in k && k.iconTertiary ? "text-tertiary" : "text-primary",
                )}
              >
                <MaterialIcon name={k.icon} className="text-[18px]" />
              </div>
            </div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">{k.value}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold",
                  k.badgeTone === "primary" ? "bg-primary/10 text-primary" : "bg-[#24963F]/10 text-[#24963F]",
                )}
              >
                {k.badgeTone === "green" ? <MaterialIcon name="trending_up" className="text-[14px]" /> : null}
                {k.badge}
              </span>
              <span className="text-xs text-on-surface-variant">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-6 rounded-2xl bg-surface-container-lowest p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                End-to-End Guest Ordering &amp; Loyalty Funnel
              </h2>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                Direct WhatsApp Webview
              </span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              Full interaction path from physical scan, gamified wheel interaction, to repeat reorders.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
              <MaterialIcon name="calendar_today" className="text-[16px]" />
              Last 30 Days
              <MaterialIcon name="expand_more" className="text-[16px]" />
            </span>
            <Button type="button" variant="outline" size="sm" data-testid="dashboard-export-csv" disabled={exporting} onClick={onExportCsv}>
              <MaterialIcon name="download" className="mr-1 text-[16px]" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        </div>

        <div data-testid="dashboard-funnel" className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {funnel.slice(0, 4).map((step, i) => {
            const meta = STAGE_META[step.step] ?? { title: step.label, sub: "", icon: "circle" };
            const prev = i > 0 ? funnel[i - 1]!.count : step.count;
            const pass = i === 0 ? 100 : prev > 0 ? (step.count / prev) * 100 : 0;
            const drop = i > 0 && prev > 0 ? 100 - pass : 0;
            const isCore = step.step === "order";
            return (
              <div
                key={step.step}
                className={cn(
                  "flex flex-col justify-between rounded-xl p-4 transition-colors",
                  isCore ? "bg-primary/5 hover:bg-primary/10" : "bg-surface-container-low hover:bg-surface-container",
                )}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", isCore ? "text-primary" : "text-on-surface-variant")}>
                      Stage 0{i + 1}
                      {isCore ? " • Core" : ""}
                    </span>
                    <MaterialIcon name={meta.icon} className={cn("text-[18px]", isCore ? "text-primary" : "text-on-surface-variant")} />
                  </div>
                  <p className="text-sm font-semibold">{meta.title}</p>
                  <p className={cn("font-[family-name:var(--font-display)] text-xl font-bold tracking-tight", isCore && "text-primary")}>
                    {step.count.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-on-surface-variant">{meta.sub}</p>
                </div>
                <div className={cn("mt-4 border-t pt-3", isCore ? "border-primary/20" : "border-surface-container")}>
                  <div className="mb-1 flex justify-between text-[10px] font-semibold text-on-surface-variant">
                    <span>{i === 0 ? "Pass Through" : drop > 0 ? `Drop: -${drop.toFixed(1)}%` : "Pass-through"}</span>
                    <span className={cn("font-bold", isCore ? "text-primary" : "text-foreground")}>
                      {isCore ? `${conv.toFixed(1)}%` : `${pass.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className={cn("h-1.5 overflow-hidden rounded-full", isCore ? "bg-primary/20" : "bg-surface-container-high")}>
                    <div
                      className={cn("h-full rounded-full", isCore ? "bg-primary" : "bg-primary/90")}
                      style={{ width: `${Math.min(isCore ? conv : pass, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-4 hover:bg-surface-container">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Stage 05</span>
                <MaterialIcon name="repeat" className="text-[18px] text-tertiary" />
              </div>
              <p className="text-sm font-semibold">Reordered (14 Days)</p>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">{repeatEst.toLocaleString("en-IN")}</p>
              <p className="text-xs text-on-surface-variant">High-LTV Regulars</p>
            </div>
            <div className="mt-4 border-t border-surface-container pt-3">
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-on-surface-variant">
                <span>Repeat Velocity</span>
                <span className="font-bold">40.0%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                <div className="h-full w-[40%] rounded-full bg-[#f3bf51]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MaterialIcon name="lightbulb" className="text-[18px]" />
            </div>
            <p className="text-sm">
              <strong>Key Insight: Gamification Anchor Spike.</strong>{" "}
              <span className="text-on-surface-variant">
                Guests who spun the loyalty reward wheel convert 3.1x faster than guests skipping directly to raw catalog view.
              </span>
            </p>
          </div>
          <Link href="/grow" className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline">
            A/B Test Wheel Offers
            <MaterialIcon name="arrow_forward" className="text-[14px]" />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-sm font-bold">Hourly Demand &amp; Kitchen Rush Analysis</h2>
              <p className="text-xs text-on-surface-variant">Order distribution by hour (12:00 PM – 11:00 PM)</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Peak Rush
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-surface-container-high" /> Regular
              </span>
            </div>
          </div>
          <svg aria-label="Hourly order bar chart" className="h-44 w-full overflow-visible" viewBox="0 0 580 180">
            <line stroke="#f0eded" strokeDasharray="3 3" x1="30" x2="570" y1="20" y2="20" />
            <line stroke="#f0eded" strokeDasharray="3 3" x1="30" x2="570" y1="70" y2="70" />
            <line stroke="#f0eded" strokeDasharray="3 3" x1="30" x2="570" y1="120" y2="120" />
            <line stroke="#eae7e7" x1="30" x2="570" y1="150" y2="150" />
            {[
              { x: 42, h: 45, y: 105, peak: false, label: "12P" },
              { x: 88, h: 75, y: 75, peak: false, label: "1P" },
              { x: 134, h: 85, y: 65, peak: false, label: "2P" },
              { x: 180, h: 25, y: 125, peak: false, label: "3P" },
              { x: 226, h: 18, y: 132, peak: false, label: "4P" },
              { x: 272, h: 32, y: 118, peak: false, label: "5P" },
              { x: 318, h: 60, y: 90, peak: false, label: "6P" },
              { x: 364, h: 90, y: 60, peak: false, label: "7P", fill: "#b6162b" },
              { x: 410, h: 126, y: 24, peak: true, label: "8P", count: "292" },
              { x: 456, h: 132, y: 18, peak: true, label: "9P", count: "310" },
              { x: 502, h: 98, y: 52, peak: false, label: "10P", fill: "#b6162b" },
              { x: 548, h: 40, y: 110, peak: false, label: "11P" },
            ].map((b) => (
              <g key={b.label}>
                {b.count ? (
                  <text className="fill-primary text-[11px] font-bold" textAnchor="middle" x={b.x + 14} y={b.y - 6}>
                    {b.count}
                  </text>
                ) : null}
                <rect
                  className="transition-opacity hover:opacity-80"
                  fill={b.fill ?? (b.peak ? "#b7122a" : "#eae7e7")}
                  height={b.h}
                  rx="4"
                  width="28"
                  x={b.x}
                  y={b.y}
                />
                <text
                  className={cn("fill-current text-[11px]", b.peak ? "fill-primary font-bold" : "fill-[#5b403f]")}
                  textAnchor="middle"
                  x={b.x + 14}
                  y="165"
                >
                  {b.label}
                </text>
              </g>
            ))}
          </svg>
          <div className="mt-2 grid grid-cols-2 gap-4 border-t border-surface-container pt-4">
            <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-lowest text-primary">
                <MaterialIcon name="table_bar" className="text-[20px]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant">Dine-in QR Scan</p>
                <p className="text-sm font-bold">
                  68.4% <span className="text-xs font-normal text-on-surface-variant">(6,539 orders)</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-lowest text-primary-container">
                <MaterialIcon name="delivery_dining" className="text-[20px]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant">WhatsApp Delivery</p>
                <p className="text-sm font-bold">
                  31.6% <span className="text-xs font-normal text-on-surface-variant">(3,021 orders)</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-sm font-bold">Customer Loyalty Segments</h2>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold">
                {scans.toLocaleString("en-IN")} Total
              </span>
            </div>
            {[
              { label: "First-Time Scanners", pct: 35, count: 5212, color: "bg-[#8f6f6e]" },
              { label: "Silver Repeaters (2–4 visits)", pct: 42, count: 6254, color: "bg-[#b6162b]" },
              { label: "Gold VIPs (5+ visits / VIP Club)", pct: 23, count: 3424, color: "bg-[#f3bf51]" },
            ].map((s) => (
              <div key={s.label} className="mb-4 last:mb-0">
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", s.color)} />
                    {s.label}
                  </span>
                  <span>
                    {s.pct}% <span className="font-normal text-on-surface-variant">({s.count.toLocaleString("en-IN")})</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-6 flex items-center justify-between border-t border-surface-container pt-4">
              <span className="text-xs text-on-surface-variant">Monthly Churn Defense</span>
              <span className="text-xs font-bold text-emerald-700">+8.6% Retained</span>
            </div>
          </section>

          <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-inverse-surface p-6 text-inverse-on-surface shadow-[0_12px_24px_-6px_rgba(28,28,28,0.12)]">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-[#f3bf51]/30 via-primary/20 to-transparent blur-xl" />
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ffdea3]">
                  <MaterialIcon name="savings" className="text-[16px]" />
                  0% Commission Direct Engine
                </span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">Sector 29 Hub</span>
              </div>
              <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">₹2,18,400</p>
              <p className="mt-1 text-sm text-inverse-on-surface/80">
                Net Savings vs 26% 3rd-Party Food Aggregator commissions this month alone.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="flex items-center gap-2 text-xs text-inverse-on-surface/90">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Pure bottom-line margin expansion
              </span>
              <button type="button" className="rounded-lg bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-foreground hover:bg-surface-container-high">
                Commission Report
              </button>
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold">Top Performing Menu Items &amp; Visual Conversion</h2>
            <p className="text-xs text-on-surface-variant">
              Dishes driving maximum cart additions directly through WhatsApp interactive catalog.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-on-surface-variant">
            Sort by:
            <button type="button" className="flex items-center gap-1 rounded-lg bg-surface-container-high px-2.5 py-1 font-semibold text-foreground">
              Direct Revenue
              <MaterialIcon name="arrow_drop_down" className="text-[14px]" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-surface-container text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Dish &amp; Classification</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Orders Count</th>
                <th className="px-4 py-3 text-right">Direct Revenue</th>
                <th className="px-4 py-3 text-right">Menu View-to-Cart</th>
                <th className="px-4 py-3 text-center">30d Velocity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {STITCH_MENU_ROWS.map((row) => (
                <tr key={row.name} className="transition-colors hover:bg-surface-container-low">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                          row.veg ? "border-emerald-700" : "border-[#ba1a1a]",
                        )}
                      >
                        {row.veg ? (
                          <span className="h-2 w-2 rounded-full bg-emerald-700" />
                        ) : (
                          <span className="h-0 w-0 border-x-4 border-b-[7px] border-x-transparent border-b-primary" />
                        )}
                      </div>
                      <span className="font-semibold">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{row.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.orders.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{formatInr(row.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                        row.cartHot ? "bg-primary/10 text-primary" : "bg-surface-container-high text-foreground",
                      )}
                    >
                      {row.cartPct}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.velocityUp === null ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-on-surface-variant">
                        <MaterialIcon name="horizontal_rule" className="text-[14px]" /> {row.velocity}
                      </span>
                    ) : row.velocityUp ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                        <MaterialIcon name="arrow_upward" className="text-[14px]" /> {row.velocity}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-700">
                        <MaterialIcon name="arrow_downward" className="text-[14px]" /> {row.velocity}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex flex-col justify-between gap-3 border-t border-surface-container pt-5 sm:flex-row sm:items-center">
          <span className="text-xs text-on-surface-variant">Showing top 5 of 68 items cataloged across 9 food categories.</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackOverview}
              className="flex items-center gap-1.5 rounded-lg bg-surface-container-high px-3.5 py-1.5 text-xs font-semibold hover:bg-surface-container"
            >
              <MaterialIcon name="arrow_back" className="text-[16px]" />
              Return to CRM Overview
            </button>
            <Link href="/menu" className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-[#b6162b]">
              Manage Menu Engineering
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
