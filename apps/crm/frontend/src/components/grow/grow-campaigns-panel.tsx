"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import { dispatchCrmCampaign, fetchCrmCampaigns, fetchCrmWallet, formatInr, type CrmCampaign, type CrmWallet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GrowCampaignProgramsSection } from "./grow-campaign-programs-section";
import { GrowCampaignWizard } from "./grow-campaign-wizard";
import { consumePosterCampaignDraft, type PosterCampaignDraft } from "./poster-campaign-bridge";

const STATUS_CLASS: Record<string, string> = {
  Draft: "bg-surface-container-high text-on-surface-variant",
  Scheduled: "bg-tertiary-fixed text-on-tertiary-fixed",
  Sending: "bg-amber-100 text-amber-900",
  Sent: "bg-surface-container text-on-surface-variant",
  Failed: "bg-red-100 text-red-900",
};

function CampaignCard({
  c,
  dispatchingId,
  onDispatch,
}: {
  c: CrmCampaign;
  dispatchingId: string | null;
  onDispatch: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold">{c.name}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                STATUS_CLASS[c.status] ?? STATUS_CLASS.Draft,
              )}
            >
              {c.status}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            <span className="inline-flex items-center gap-1">
              <MaterialIcon name="groups" className="text-[14px]" />
              ~{c.estimatedRecipients} guests
            </span>
            {c.skippedSevenDayCap > 0 ? (
              <>
                <span>•</span>
                <span>{c.skippedSevenDayCap} skipped (7d cap)</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[15px] font-bold tabular-nums">{c.estimatedRecipients}</span>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            Targeted
          </span>
        </div>
      </div>
      {c.scheduledAt ? (
        <p className="flex items-center gap-1 text-xs text-on-surface-variant">
          <MaterialIcon name="schedule" className="text-[14px]" />
          {new Date(c.scheduledAt).toLocaleString("en-IN")}
        </p>
      ) : (
        <p className="text-xs text-on-surface-variant">Unscheduled</p>
      )}
      {c.status === "Scheduled" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          disabled={dispatchingId === c.id}
          onClick={onDispatch}
        >
          {dispatchingId === c.id ? "Sending…" : "Send now (mock Kapso)"}
        </Button>
      ) : null}
    </li>
  );
}

function WalletOffersPeek({ wallet, dimmed }: { wallet: CrmWallet | null; dimmed: boolean }) {
  return (
    <div
      className={cn(
        "col-span-12 flex flex-col gap-5 xl:col-span-7",
        dimmed && "pointer-events-none select-none opacity-30",
      )}
    >
      <div className="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MaterialIcon name="account_balance_wallet" className="text-[20px] text-primary" />
            <span className="text-sm font-semibold">Marketing wallet peek</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Live sync</span>
        </div>
        <p className="text-xs text-on-surface-variant">WhatsApp broadcast balance</p>
        <p className="font-[family-name:var(--font-display)] text-3xl font-bold">
          {wallet ? formatInr(wallet.balancePaise) : "—"}
        </p>
        {wallet?.lowBalance ? (
          <p className="text-sm text-amber-800">Low balance — top up before scheduling.</p>
        ) : null}
      </div>
      <div className="rounded-xl bg-surface-container-lowest p-5 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
        <div className="mb-3 flex items-center gap-2">
          <MaterialIcon name="redeem" className="text-[20px] text-tertiary" />
          <span className="text-sm font-semibold">Offers & wheel peek</span>
        </div>
        <div className="flex items-center gap-4 rounded-lg bg-surface-container-low p-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-tertiary-fixed bg-tertiary-fixed/30">
            <MaterialIcon name="casino" className="text-[28px] text-tertiary" />
          </div>
          <div className="text-xs text-on-surface-variant">
            <p className="font-semibold text-foreground">Fortune spin · scratch cards</p>
            <p className="mt-0.5">Reward weights drive guest re-orders on WhatsApp.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GrowCampaignsPanel({ restaurantId }: { restaurantId: string }) {
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([]);
  const [wallet, setWallet] = useState<CrmWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [posterDraft, setPosterDraft] = useState<PosterCampaignDraft | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    fetchCrmCampaigns(restaurantId)
      .then(setCampaigns)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
    fetchCrmWallet(restaurantId)
      .then(setWallet)
      .catch(() => setWallet(null));
  }, [restaurantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const draft = consumePosterCampaignDraft();
    if (draft && draft.restaurantId === restaurantId) {
      setPosterDraft(draft);
      setWizardOpen(true);
    }
  }, [restaurantId]);

  const activeCount = campaigns.filter((c) => c.status !== "Sent" && c.status !== "Failed").length;

  return (
    <div className="relative grid grid-cols-12 gap-6">
      <div className="col-span-12 flex flex-col gap-5 xl:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight">
                Campaign broadcasts
              </h2>
              {campaigns.length > 0 ? (
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                  {activeCount} active
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-on-surface-variant">Program toggles + one-off WhatsApp broadcasts</p>
          </div>
          <Button
            type="button"
            className="gap-2 shadow-md"
            onClick={() => {
              setPosterDraft(null);
              setWizardOpen(true);
            }}
          >
            <MaterialIcon name="add" className="text-[18px]" />
            New campaign
          </Button>
        </div>

        <GrowCampaignProgramsSection restaurantId={restaurantId} />

        <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest px-3.5 py-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#24963F]/10 text-[#24963F]">
              <MaterialIcon name="verified_user" className="text-[15px]" />
            </span>
            <div>
              <p className="text-[10px] font-semibold">1 msg / 7 days per guest enabled</p>
              <p className="text-xs text-on-surface-variant">Smart spam shield auto-skips recent recipients</p>
            </div>
          </div>
          <span className="rounded bg-[#24963F]/15 px-2 py-0.5 text-[10px] font-bold text-[#24963F]">Strict</span>
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Scheduled &amp; sent broadcasts
        </p>
        <ul className="flex flex-col gap-3">
          {campaigns.length === 0 ? (
            <li className="rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
              No manual broadcasts yet. Use New campaign for audience → template → schedule → review.
            </li>
          ) : (
            campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                c={c}
                dispatchingId={dispatchingId}
                onDispatch={() => {
                  setDispatchingId(c.id);
                  void dispatchCrmCampaign(c.id, restaurantId)
                    .then(() => reload())
                    .catch((e) => setError(e instanceof Error ? e.message : "Dispatch failed"))
                    .finally(() => setDispatchingId(null));
                }}
              />
            ))
          )}
        </ul>
      </div>

      <WalletOffersPeek wallet={wallet} dimmed={wizardOpen} />

      {wizardOpen ? (
        <GrowCampaignWizard
          restaurantId={restaurantId}
          posterDraft={posterDraft}
          onClose={() => {
            setWizardOpen(false);
            setPosterDraft(null);
          }}
          onCreated={() => {
            reload();
            setWizardOpen(false);
            setPosterDraft(null);
          }}
        />
      ) : null}
    </div>
  );
}
