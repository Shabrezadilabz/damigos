"use client";

import Link from "next/link";
import { useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { SettingsPayoutPanel } from "@/components/settings-payout-panel";
import {
  SettingsStickersOwnerPeek,
  SettingsStickersOwnerWorkspace,
} from "@/components/settings-stickers";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { cn } from "@/lib/utils";
import { BrandThemeDialog } from "./brand-theme-dialog";
import { SettingsLocationPanel } from "./settings-location-panel";
import { SETTINGS_TABS, parseSettingsTab, type SettingsTabId } from "./settings-tabs";
import { TeamInviteDialog } from "./team-invite-dialog";

function StatusRibbon({
  primaryHex,
  onOpenTeam,
  onOpenTheme,
}: {
  primaryHex: string;
  onOpenTeam: () => void;
  onOpenTheme: () => void;
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        href="/settings?tab=payout"
        className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
        data-testid="settings-ribbon-payout"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary shadow-sm">
            <MaterialIcon name="account_balance_wallet" className="text-[20px]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-on-surface sm:text-base">
                Banking &amp; payout
              </span>
              <MaterialIcon name="verified" className="shrink-0 text-[16px] text-[#24963F]" />
            </div>
            <p className="truncate text-xs text-on-surface-variant">
              Bank · daily earnings · EOD invoice after midnight IST
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md border border-[#24963F]/20 bg-[#24963F]/10 px-2.5 py-1 text-[10px] font-bold text-[#24963F]">
          Open
        </span>
      </Link>

      <button
        type="button"
        onClick={onOpenTeam}
        className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-left shadow-sm transition-shadow hover:shadow-md sm:p-4"
        data-testid="settings-ribbon-team"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary shadow-sm">
            <MaterialIcon name="group" className="text-[20px]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface sm:text-base">Team access</p>
            <p className="truncate text-xs text-on-surface-variant">Invite kitchen — orders screens only</p>
          </div>
        </div>
        <div className="flex shrink-0 -space-x-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary shadow-sm">
            DA
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-container text-[11px] font-bold text-on-secondary-container shadow-sm">
            +
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenTheme}
        className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 text-left shadow-sm transition-shadow hover:shadow-md sm:col-span-2 sm:p-4 lg:col-span-1"
        data-testid="settings-ribbon-theme"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary shadow-sm">
            <MaterialIcon name="palette" className="text-[20px]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface sm:text-base">Brand &amp; theme</p>
            <p className="truncate text-xs text-on-surface-variant">Change colors for the full CRM</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-md border border-outline-variant/60 bg-surface-container-low px-2.5 py-1">
          <span className="h-3.5 w-3.5 rounded-full shadow-inner" style={{ backgroundColor: primaryHex }} />
          <span className="font-mono text-[10px] font-bold text-on-surface">{primaryHex}</span>
        </div>
      </button>
    </div>
  );
}

function SettingsSubNav({ active }: { active: SettingsTabId }) {
  return (
    <nav className="col-span-12 flex flex-col gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-sm lg:col-span-2">
      <div className="hidden px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant lg:block">
        Navigation
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {SETTINGS_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={`/settings?tab=${tab.id}`}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all lg:w-full lg:gap-2.5",
                isActive
                  ? "bg-primary-container text-on-primary-container shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              )}
            >
              <MaterialIcon name={tab.icon} className="shrink-0 text-[18px]" />
              <span className={cn("whitespace-nowrap text-xs font-semibold", isActive && "font-bold")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-2 hidden flex-col gap-2 rounded-lg bg-surface-container-low p-3 lg:mt-4 lg:flex">
        <span className="text-[10px] font-bold text-on-surface">Physical stickers</span>
        <p className="text-[11px] leading-tight text-on-surface-variant">
          Generate codes here, then send a print request to partners@damigos.in — we print and ship.
        </p>
      </div>
    </nav>
  );
}

function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="col-span-12 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm sm:p-6 lg:col-span-10">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">{title}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
    </div>
  );
}

export function SettingsPageClient({ tabParam }: { tabParam?: string }) {
  const tab = parseSettingsTab(tabParam);
  const { restaurantId } = useCrmRestaurant();
  const [teamOpen, setTeamOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [primaryHex, setPrimaryHex] = useState("#B7122A");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-7 w-2.5 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-on-surface sm:text-xl">
              System &amp; experience controls
            </h1>
            <p className="text-xs text-on-surface-variant">
              Kitchen stickers, payouts &amp; storefront configuration
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold text-on-surface">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#24963F]" />
            OPS LIVE
          </span>
          <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-primary-fixed">
            V2.4
          </span>
        </div>
      </div>

      <StatusRibbon
        primaryHex={primaryHex}
        onOpenTeam={() => setTeamOpen(true)}
        onOpenTheme={() => setThemeOpen(true)}
      />

      <div className="grid grid-cols-12 items-start gap-5">
        <SettingsSubNav active={tab} />

        {tab === "stickers" ? (
          <>
            <div className="col-span-12 lg:col-span-3">
              <SettingsStickersOwnerPeek />
            </div>
            <div className="col-span-12 lg:col-span-7">
              <SettingsStickersOwnerWorkspace />
            </div>
          </>
        ) : null}

        {tab === "payout" ? (
          <div className="col-span-12 lg:col-span-10">
            <SettingsPayoutPanel embedded />
          </div>
        ) : null}

        {tab === "location" ? <SettingsLocationPanel /> : null}

        {tab === "profile" ? (
          <div className="col-span-12 space-y-4 lg:col-span-10">
            <PlaceholderPanel
              title="Profile & theme"
              body="Use Brand & theme (top card) to recolor the full CRM. Display name and logo still sync from menu AI brand kit."
            />
            <button
              type="button"
              className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-surface-container-low"
              onClick={() => setThemeOpen(true)}
            >
              Open brand &amp; theme editor
            </button>
          </div>
        ) : null}

        {tab === "team" ? (
          <div className="col-span-12 space-y-4 lg:col-span-10">
            <PlaceholderPanel
              title="Team access"
              body="Invite kitchen staff by phone. They log in with OTP and only see Orders (kitchen board + list) — not Grow, Menu, or Settings."
            />
            <button
              type="button"
              className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm"
              onClick={() => setTeamOpen(true)}
            >
              Invite kitchen person
            </button>
          </div>
        ) : null}
      </div>

      {restaurantId ? (
        <>
          <TeamInviteDialog open={teamOpen} onClose={() => setTeamOpen(false)} restaurantId={restaurantId} />
          <BrandThemeDialog
            open={themeOpen}
            onClose={() => setThemeOpen(false)}
            restaurantId={restaurantId}
            onSaved={(hex) => setPrimaryHex(hex)}
          />
        </>
      ) : null}
    </div>
  );
}
