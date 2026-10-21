"use client";

import { GrowCampaignsPanel } from "./grow-campaigns-panel";
import { GrowCustomersPanel } from "./grow-customers-panel";
import { GrowOffersPanel } from "./grow-offers-panel";
import { GrowTabs, type GrowTabId } from "./grow-tabs";
import { GrowWalletPanel } from "./grow-wallet-panel";
import { GrowPosterPanel } from "./grow-poster-panel";

const TAB_SUB: Record<GrowTabId, { title: string; sub: string }> = {
  offers: {
    title: "Loyalty engine & gamified rewards",
    sub: "Configure spin, scratch, payback, dine-in, win-back, order rules, and calendar offers — save before campaigns",
  },
  customers: { title: "Guest Directory & DPDP Consent Ledger", sub: "Profiles, opt-in, and order history" },
  campaigns: { title: "Marketing Hub — Campaign Broadcasts", sub: "WhatsApp re-engagement · Kapso dispatch" },
  wallet: { title: "Marketing Wallet, Credits & Billing", sub: "Prepaid Meta Cloud API balance & ledger" },
  poster: { title: "AI Poster Copilot & Creative Studio", sub: "Generate WhatsApp-ready food creatives" },
};

export function GrowModule({
  restaurantId,
  tab,
  openCustomerId,
}: {
  restaurantId: string;
  tab: GrowTabId;
  openCustomerId?: string | null;
}) {
  const meta = TAB_SUB[tab];

  return (
    <div className="flex flex-col gap-2">
      <header className="mb-2 flex flex-col gap-1">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight">Grow</h1>
        {tab !== "campaigns" ? (
          <>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">{meta.title}</h2>
            <p className="text-sm text-on-surface-variant">{meta.sub}</p>
          </>
        ) : (
          <p className="text-sm text-on-surface-variant">{meta.sub}</p>
        )}
      </header>
      <GrowTabs active={tab} />
      {tab === "offers" && <GrowOffersPanel restaurantId={restaurantId} />}
      {tab === "customers" && (
        <GrowCustomersPanel restaurantId={restaurantId} openCustomerId={openCustomerId} />
      )}
      {tab === "campaigns" && <GrowCampaignsPanel restaurantId={restaurantId} />}
      {tab === "wallet" && <GrowWalletPanel restaurantId={restaurantId} />}
      {tab === "poster" && <GrowPosterPanel restaurantId={restaurantId} />}
    </div>
  );
}
