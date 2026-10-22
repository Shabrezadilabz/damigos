"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import { useCrmRestaurant } from "@/components/use-crm-restaurant";

import {

  downloadDashboardAnalyticsCsv,

  fetchCrmOrders,

  fetchDashboardAnalytics,

  fetchDashboardOverview,

  formatInr,

  pingCrmConnectivity,

  type CrmConnectivityPing,

  type CrmOrder,

  type DashboardAnalytics,

  type DashboardOverview,

} from "@/lib/api";

import { DashboardAnalyticsPanel } from "@/components/dashboard-analytics-panel";

import { DashboardRecentOrdersTable } from "@/components/dashboard-recent-orders-table";

import { MaterialIcon } from "@/components/material-icon";

import { cn } from "@/lib/utils";



type HomeTab = "overview" | "analytics";



export function HomePageClient() {

  const { restaurantId, loading: ctxLoading } = useCrmRestaurant();

  const [tab, setTab] = useState<HomeTab>("overview");

  const [analyticsScrollTo, setAnalyticsScrollTo] = useState<"hourly-demand" | null>(null);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  const [recentOrders, setRecentOrders] = useState<CrmOrder[]>([]);

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);

  const [draftDismissed, setDraftDismissed] = useState(false);

  const [pingState, setPingState] = useState<"idle" | "running" | "ok" | "fail">("idle");

  const [pingResult, setPingResult] = useState<CrmConnectivityPing | null>(null);

  const [pingError, setPingError] = useState<string | null>(null);



  useEffect(() => {

    if (!restaurantId) return;

    void Promise.all([

      fetchDashboardOverview(restaurantId),

      fetchCrmOrders(restaurantId, false, 5),

    ])

      .then(([ov, orders]) => {

        setOverview(ov);

        setRecentOrders(orders);

      })

      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));

  }, [restaurantId]);



  useEffect(() => {

    if (!restaurantId) return;

    void fetchDashboardAnalytics(restaurantId, "30d")

      .then(setAnalytics)

      .catch((e) => setError(e instanceof Error ? e.message : "Analytics failed"));

  }, [restaurantId]);



  async function onExportCsv() {

    if (!restaurantId) return;

    setExporting(true);

    try {

      const csv = await downloadDashboardAnalyticsCsv(restaurantId, "30d");

      const blob = new Blob([csv], { type: "text/csv" });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = "damigos-analytics-30d.csv";

      a.click();

      URL.revokeObjectURL(url);

    } catch (e) {

      setError(e instanceof Error ? e.message : "Export failed");

    } finally {

      setExporting(false);

    }

  }



  if (ctxLoading) {

    return <p className="text-sm text-foreground/60">Loading…</p>;

  }

  if (!restaurantId) {

    return <p className="text-sm text-red-700">No restaurant on session.</p>;

  }



  const kpis = overview?.kpis;

  const draftAlert = overview?.alerts.find((a) => a.code === "DRAFT_MENU");

  const ordersTodayLabel = kpis?.ordersToday ?? 184;



  return (

    <div className="flex flex-col gap-6">

      {tab === "analytics" ? (

        <div className="flex flex-col justify-between gap-4 border-b border-surface-container pb-6 lg:flex-row lg:items-center">

          <div>

            <div className="mb-1 flex flex-wrap items-center gap-2">

              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Guest OS Central</span>

              <span className="h-1 w-1 rounded-full bg-outline-variant" />

              <span className="text-[10px] font-medium text-on-surface-variant">Telemetry &amp; conversion engine</span>

            </div>

            <div className="flex flex-wrap items-center gap-3">

              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">

                WhatsApp Experience Control

              </h1>

              <div className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-0.5">

                <span className="h-2 w-2 animate-pulse rounded-full bg-[#24963F]" />

                <span className="text-xs font-semibold">Live kitchen</span>

              </div>

            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="flex items-center rounded-xl bg-surface-container-high p-1 shadow-inner" role="tablist">

              <button

                type="button"

                role="tab"

                data-testid="dashboard-tab-overview"

                className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:text-foreground"

                onClick={() => setTab("overview")}

              >

                <MaterialIcon name="dashboard" className="text-[16px]" />

                Overview

              </button>

              <button

                type="button"

                role="tab"

                data-testid="dashboard-tab-analytics"

                aria-selected

                className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm"

              >

                <MaterialIcon name="monitoring" className="text-[16px]" />

                Analytics

              </button>

            </div>

            <Link

              href="/grow?tab=campaigns"

              className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground shadow-sm hover:bg-primary"

            >

              <MaterialIcon name="campaign" className="text-[18px]" />

              + Broadcast Flash Deal

            </Link>

          </div>

        </div>

      ) : (

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div className="flex flex-col">

            <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-secondary">Guest OS Central</span>

            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight sm:text-2xl">

              WhatsApp Experience Control

            </h1>

          </div>

          <div

            className="flex items-center gap-2 rounded-full bg-surface-container-high p-1.5 shadow-inner"

            role="tablist"

          >

            <button

              type="button"

              role="tab"

              data-testid="dashboard-tab-overview"

              aria-selected

              className="flex items-center gap-2 rounded-full bg-surface-container-lowest px-5 py-2 text-sm font-semibold text-primary shadow-sm transition-all"

            >

              <MaterialIcon name="dashboard" className="text-[18px]" />

              Overview

            </button>

            <button

              type="button"

              role="tab"

              data-testid="dashboard-tab-analytics"

              className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-on-surface-variant transition-all hover:text-foreground"

              onClick={() => setTab("analytics")}

            >

              <MaterialIcon name="query_stats" className="text-[18px]" />

              Analytics

            </button>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold shadow-sm">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#24963F]" />

              36 Tables Active

            </div>

            <Link

              href="/grow?tab=campaigns"

              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-secondary-container"

            >

              <MaterialIcon name="send" className="text-[18px]" />

              Broadcast Flash Deal

            </Link>

          </div>

        </div>

      )}



      {error && <p className="text-sm text-red-700">{error}</p>}



      {tab === "overview" && (

        <>

          {overview?.alerts.some((a) => a.code === "LOW_WALLET") ? (

            <div

              data-testid="dashboard-low-wallet-banner"

              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"

            >

              {overview.alerts.find((a) => a.code === "LOW_WALLET")?.message}

              <Link href="/grow?tab=wallet" className="ml-2 font-semibold underline">

                Top up wallet

              </Link>

            </div>

          ) : null}



          {draftAlert && !draftDismissed ? (

            <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-primary-fixed/40 p-4 shadow-sm">

              <div className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-primary/10" />

              <div className="z-10 flex items-center gap-3.5">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">

                  <MaterialIcon name="restaurant" className="text-[22px]" />

                </div>

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="font-[family-name:var(--font-display)] text-sm font-bold text-on-primary-fixed">

                      Menu draft ready

                    </span>

                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">

                      Action required

                    </span>

                  </div>

                  <p className="text-sm text-on-surface-variant">{draftAlert.message}</p>

                </div>

              </div>

              <div className="z-10 flex items-center gap-3">

                <button

                  type="button"

                  onClick={() => setDraftDismissed(true)}

                  className="rounded-xl bg-surface-container-lowest px-4 py-2 text-sm font-semibold hover:bg-surface-container"

                >

                  Dismiss

                </button>

                <Link

                  href="/menu"

                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25"

                >

                  Review now

                  <MaterialIcon name="arrow_forward" className="text-[18px]" />

                </Link>

              </div>

            </div>

          ) : null}



          <div className="grid grid-cols-12 items-start gap-6">

            <div className="col-span-12 flex flex-col gap-6 lg:col-span-7">

              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">

                <KpiCard

                  testId="dashboard-kpi-orders-today"

                  label="Today's orders"

                  icon="lunch_dining"

                  value={kpis ? String(kpis.ordersToday) : "…"}

                  hint="+14.2% vs yesterday"

                  hintIcon="trending_up"

                />

                <KpiCard

                  testId="dashboard-kpi-scans-7d"

                  label="Sticker scans"

                  icon="qr_code_scanner"

                  value={kpis ? String(kpis.scans7d) : "…"}

                  hint="7-Day running high"

                  hintIcon="show_chart"

                />

                <KpiCard

                  testId="dashboard-kpi-wallet"

                  label="Wallet balance"

                  icon="account_balance_wallet"

                  value={kpis ? formatInr(kpis.walletBalancePaise) : "…"}

                  hint="Auto-settles 11:30 PM"

                  accent="tertiary"

                  hintIcon="dot"

                />

                <KpiCard

                  testId="dashboard-kpi-campaign-sends"

                  label="Campaign sends"

                  icon="outgoing_mail"

                  value={kpis ? String(kpis.campaignSendsRemaining) : "…"}

                  hint="Left of 10,000 quota"

                  hintMuted

                />

              </div>



              {overview?.settlement7d ? (

                <div

                  data-testid="dashboard-settlement-7d"

                  className="grid grid-cols-2 gap-4 rounded-2xl bg-surface-container-low p-4 sm:grid-cols-4"

                >

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">

                      7d gross

                    </p>

                    <p className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">

                      {formatInr(overview.settlement7d.grossSalesPaise)}

                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">

                      Waiting penalties

                    </p>

                    <p className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums text-amber-800">

                      {formatInr(overview.settlement7d.waitingPenaltyPaise)}

                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">

                      Net estimate

                    </p>

                    <p className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums text-[#24963F]">

                      {formatInr(overview.settlement7d.netEstimatePaise)}

                    </p>

                  </div>

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">

                      Paid orders

                    </p>

                    <p className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums">

                      {overview.settlement7d.paidOrders}

                    </p>

                  </div>

                </div>

              ) : null}



              <section className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">

                <div className="mb-4 flex items-center justify-between">

                  <div className="flex items-center gap-2.5">

                    <span className="h-5 w-2 rounded-full bg-primary" />

                    <h2 className="font-[family-name:var(--font-display)] text-sm font-semibold">

                      Recent WhatsApp orders

                    </h2>

                    <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">

                      Direct checkout

                    </span>

                  </div>

                  <Link href="/orders" className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-secondary">

                    View all {ordersTodayLabel}

                    <MaterialIcon name="chevron_right" className="text-[16px]" />

                  </Link>

                </div>

                <div data-testid="dashboard-recent-orders">

                  <DashboardRecentOrdersTable orders={recentOrders} />

                </div>

              </section>



              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4">

                <div className="flex items-center gap-3">

                  <div
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-lowest shadow-sm",
                      pingState === "ok" && "text-[#24963F]",
                      pingState === "fail" && "text-red-700",
                      pingState === "idle" && "text-primary",
                      pingState === "running" && "text-primary",
                    )}
                  >
                    {pingState === "running" ? (
                      <span className="absolute inline-flex h-8 w-8 animate-ping rounded-full bg-primary/30" />
                    ) : null}
                    <MaterialIcon
                      name={
                        pingState === "ok"
                          ? "check_circle"
                          : pingState === "fail"
                            ? "error"
                            : "mark_chat_unread"
                      }
                      className={cn("relative text-[20px]", pingState === "running" && "animate-pulse")}
                    />
                  </div>

                  <div>

                    <p className="text-sm font-semibold">
                      {pingState === "idle" && "WhatsApp / CRM link — not tested yet"}
                      {pingState === "running" && "Pinging CRM API…"}
                      {pingState === "ok" && "WhatsApp webhook path: tested OK"}
                      {pingState === "fail" && "Connectivity check failed"}
                    </p>

                    <p className="text-xs text-on-surface-variant">
                      {pingState === "idle" && "Tap Test ping to verify API + Kapso config"}
                      {pingState === "running" && "Measuring round-trip latency…"}
                      {pingState === "ok" && pingResult
                        ? `${pingResult.latencyMs}ms · Kapso ${pingResult.kapso} · Food ${pingResult.foodPhone} · Redis ${pingResult.redis}`
                        : null}
                      {pingState === "fail" && (pingError ?? "Try again or check CRM API")}
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  disabled={pingState === "running"}
                  onClick={() => {
                    setPingState("running");
                    setPingError(null);
                    void pingCrmConnectivity()
                      .then((r) => {
                        setPingResult(r);
                        setPingState(r.ok ? "ok" : "fail");
                        if (!r.ok) setPingError("CRM reported unhealthy (check DATABASE_URL)");
                      })
                      .catch((e) => {
                        setPingResult(null);
                        setPingState("fail");
                        setPingError(e instanceof Error ? e.message : "Ping failed");
                      });
                  }}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition",
                    pingState === "ok" && "bg-[#24963F]/15 text-[#24963F]",
                    pingState === "fail" && "bg-red-100 text-red-800",
                    pingState === "idle" && "bg-surface-container-lowest hover:bg-surface-container-high",
                    pingState === "running" && "bg-surface-container-lowest opacity-70",
                  )}
                >
                  {pingState === "idle" && "Test ping"}
                  {pingState === "running" && "Pinging…"}
                  {pingState === "ok" && "Tested ✓ — ping again"}
                  {pingState === "fail" && "Failed — retry"}
                </button>

              </div>

            </div>



            <div className="col-span-12 lg:col-span-5">

              <DashboardAnalyticsPanel

                analytics={analytics}

                variant="peek"

                exporting={exporting}

                onExportCsv={() => void onExportCsv()}

                onOpenFull={(focus) => {
                  setAnalyticsScrollTo(focus === "hourly-demand" ? "hourly-demand" : null);
                  setTab("analytics");
                }}

              />

            </div>

          </div>

        </>

      )}



      {tab === "analytics" && (

        <DashboardAnalyticsPanel

          analytics={analytics}

          variant="full"

          exporting={exporting}

          onExportCsv={() => void onExportCsv()}

          onBackOverview={() => {
            setAnalyticsScrollTo(null);
            setTab("overview");
          }}

          scrollTo={analyticsScrollTo}

          onScrollToHandled={() => setAnalyticsScrollTo(null)}

        />

      )}

    </div>

  );

}



function KpiCard({

  label,

  value,

  testId,

  icon,

  hint,

  hintIcon,

  hintMuted,

  accent,

}: {

  label: string;

  value: string;

  testId: string;

  icon: string;

  hint?: string;

  hintIcon?: "trending_up" | "show_chart" | "dot";

  hintMuted?: boolean;

  accent?: "tertiary";

}) {

  return (

    <div

      data-testid={testId}

      className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-surface-container-lowest p-4 shadow-sm transition hover:shadow-md"

    >

      {accent === "tertiary" ? (

        <div className="pointer-events-none absolute right-0 top-0 h-16 w-16 bg-gradient-to-bl from-tertiary-fixed/30 to-transparent" />

      ) : null}

      <div className={cn("flex items-center justify-between", accent === "tertiary" ? "text-tertiary" : "text-on-surface-variant")}>

        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>

        <MaterialIcon name={icon} className={cn("text-[18px]", accent === "tertiary" ? "text-tertiary" : "text-primary")} />

      </div>

      <div className="mt-3">

        <p className="font-[family-name:var(--font-display)] text-2xl font-bold tabular-nums">{value}</p>

        {hint ? (

          <p

            className={cn(

              "mt-1 flex items-center gap-1 text-[10px] font-semibold",

              hintMuted ? "text-on-surface-variant" : accent === "tertiary" ? "text-tertiary" : "text-[#24963F]",

            )}

          >

            {hintIcon === "trending_up" ? <MaterialIcon name="trending_up" className="text-[14px]" /> : null}

            {hintIcon === "show_chart" ? <MaterialIcon name="show_chart" className="text-[14px]" /> : null}

            {hintIcon === "dot" ? <span className="h-1.5 w-1.5 rounded-full bg-tertiary" /> : null}

            {hint}

          </p>

        ) : null}

      </div>

    </div>

  );

}


