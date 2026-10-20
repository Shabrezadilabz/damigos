"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { SettingsPayoutPanel } from "@/components/settings-payout-panel";
import { SettingsStickersAdminPane, SettingsStickersOwnerPeek } from "@/components/settings-stickers";
import { useCrmRestaurant } from "@/components/use-crm-restaurant";
import { cn } from "@/lib/utils";
import { SettingsLocationPanel } from "./settings-location-panel";
import { SETTINGS_TABS, parseSettingsTab, type SettingsTabId } from "./settings-tabs";

function StatusRibbon() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary shadow-sm">
            <MaterialIcon name="account_balance_wallet" className="text-[20px]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-semibold text-on-surface">Banking &amp; payout</span>
              <MaterialIcon name="verified" className="text-[16px] text-[#24963F]" />
            </div>
            <p className="text-xs text-on-surface-variant">Bank · daily earnings · EOD invoice after midnight IST</p>
          </div>
        </div>
        <span className="rounded-md border border-[#24963F]/20 bg-[#24963F]/10 px-2.5 py-1 text-[10px] font-bold text-[#24963F]">
          Ready
        </span>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary shadow-sm">
            <MaterialIcon name="group" className="text-[20px]" />
          </div>
          <div>
            <p className="text-base font-semibold text-on-surface">Team access</p>
            <p className="text-xs text-on-surface-variant">Owner &amp; kitchen roles (pilot)</p>
          </div>
        </div>
        <div className="flex -space-x-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-on-primary shadow-sm">
            DA
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-container text-[11px] font-bold text-on-secondary-container shadow-sm">
            RK
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/50 text-primary shadow-sm">
            <MaterialIcon name="palette" className="text-[20px]" />
          </div>
          <div>
            <p className="text-base font-semibold text-on-surface">Brand &amp; theme</p>
            <p className="text-xs text-on-surface-variant">Crimson primary · menu AI brand kit</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-outline-variant/60 bg-surface-container-low px-2.5 py-1">
          <span className="h-3.5 w-3.5 rounded-full bg-primary shadow-inner" />
          <span className="font-mono text-[10px] font-bold text-on-surface">#B7122A</span>
        </div>
      </div>
    </div>
  );
}

function SettingsSubNav({
  active,
  isPlatformAdmin,
}: {
  active: SettingsTabId;
  isPlatformAdmin: boolean;
}) {
  const tabs = SETTINGS_TABS.filter((t) => t.id !== "admin" || isPlatformAdmin);

  return (
    <nav className="flex flex-col gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-3 shadow-sm lg:col-span-2">
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
        Navigation
      </div>
      {tabs.map((tab) => {
        const isActive = tab.id === active || (active === "admin" && tab.id === "admin");
        return (
          <Link
            key={tab.id}
            href={`/settings?tab=${tab.id}`}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all",
              isActive
                ? "bg-primary-container text-on-primary-container shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
            )}
          >
            <MaterialIcon name={tab.icon} className="text-[18px]" />
            <span className={cn("text-xs font-semibold", isActive && "font-bold")}>{tab.label}</span>
            {"badge" in tab && tab.badge ? (
              <span className="ml-auto rounded bg-surface-container-lowest px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary shadow-sm">
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
      <div className="mt-4 flex flex-col gap-2 rounded-lg bg-surface-container-low p-3">
        <span className="text-[10px] font-bold text-on-surface">Need hardware?</span>
        <p className="text-[11px] leading-tight text-on-surface-variant">
          Order pre-cut acrylic table pedestals with built-in NFC anchors (ops dispatch).
        </p>
        <button type="button" className="flex items-center gap-1 text-left text-[10px] font-bold text-primary hover:underline">
          Request dispatch
          <MaterialIcon name="arrow_forward" className="text-[14px]" />
        </button>
      </div>
    </nav>
  );
}

function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm lg:col-span-10">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-on-surface">{title}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
    </div>
  );
}

export function SettingsPageClient({ tabParam }: { tabParam?: string }) {
  const tab = parseSettingsTab(tabParam);
  const { isPlatformAdmin } = useCrmRestaurant();
  const router = useRouter();

  useEffect(() => {
    if (tab === "admin" && !isPlatformAdmin) {
      router.replace("/settings?tab=stickers");
    }
  }, [tab, isPlatformAdmin, router]);

  const showStickerWorkspace = tab === "stickers" || tab === "admin";
  const effectiveTab = tab === "admin" && isPlatformAdmin ? "admin" : tab;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-7 w-2.5 rounded-full bg-primary" />
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-on-surface">
              System &amp; experience controls
            </h1>
            <p className="text-xs text-on-surface-variant">
              Platform governance, secure QR sticker minting &amp; storefront configuration
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold text-on-surface">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#24963F]" />
            OPS NETWORK LIVE
          </span>
          <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-on-primary-fixed">
            V2.4 Cloud
          </span>
        </div>
      </div>

      <StatusRibbon />

      <div className="grid grid-cols-12 items-start gap-5">
        <SettingsSubNav active={effectiveTab} isPlatformAdmin={isPlatformAdmin} />

        {showStickerWorkspace ? (
          <>
            <div className="col-span-12 lg:col-span-3">
              <SettingsStickersOwnerPeek />
            </div>
            <div className="col-span-12 lg:col-span-7">
              {effectiveTab === "admin" && isPlatformAdmin ? (
                <SettingsStickersAdminPane />
              ) : (
                <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-on-surface">Sticker batches</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    <strong>Owner</strong> (left): activate the batch code ops shares after minting.{" "}
                    <strong>Platform admin</strong> (Admin tab): ops mint key + generate batches, print QR banners
                    (50+ designs).
                  </p>
                </div>
              )}
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
          <PlaceholderPanel
            title="Profile & theme"
            body="Restaurant display name, logo, and guest webview colors sync from menu AI brand kit (Grow / menu import). Full editor coming next."
          />
        ) : null}

        {tab === "team" ? (
          <PlaceholderPanel
            title="Team access"
            body="Invite kitchen, redeem, and staff roles with OTP login. Role matrix matches CRM auth (owner, kitchen, redeem)."
          />
        ) : null}
      </div>
    </div>
  );
}
