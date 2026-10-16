"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createCrmCampaign,
  fetchCampaignAudiencePreview,
  fetchCampaignTemplates,
  fetchGrowPoster,
  scheduleCrmCampaign,
  type AudiencePreview,
  type CampaignTemplate,
  type CrmCampaign,
} from "@/lib/api";
import type { PosterCampaignDraft } from "./poster-campaign-bridge";

const STEPS = ["Audience", "Message", "Schedule", "Review"] as const;

type Props = {
  restaurantId: string;
  onClose: () => void;
  onCreated: (campaign: CrmCampaign) => void;
  posterDraft?: PosterCampaignDraft | null;
};

export function GrowCampaignWizard({ restaurantId, onClose, onCreated, posterDraft }: Props) {
  const [step, setStep] = useState(posterDraft ? 1 : 0);
  const [name, setName] = useState(posterDraft?.campaignName ?? "New broadcast");
  const [audience, setAudience] = useState<"all" | "marketing_opt_in">("all");
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [templateKey, setTemplateKey] = useState(posterDraft?.templateKey ?? "");
  const [messagePreview, setMessagePreview] = useState(posterDraft?.marketingMessage ?? "");
  const [posterThumb, setPosterThumb] = useState<string | null>(null);
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [draft, setDraft] = useState<CrmCampaign | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletBlock, setWalletBlock] = useState(false);

  const loadPreview = useCallback(async () => {
    const p = await fetchCampaignAudiencePreview(restaurantId, audience);
    setPreview(p);
  }, [restaurantId, audience]);

  useEffect(() => {
    fetchCampaignTemplates()
      .then((t) => {
        setTemplates(t);
        if (!templateKey && t[0]) setTemplateKey(t[0].key);
      })
      .catch(() => setTemplates([]));
  }, [templateKey]);

  useEffect(() => {
    if (!posterDraft?.posterId) return;
    fetchGrowPoster(restaurantId, posterDraft.posterId)
      .then((p) => {
        setPosterThumb(p.previewImageDataUrl ?? p.previewImageUrl ?? null);
        if (p.marketingMessage) setMessagePreview(p.marketingMessage);
      })
      .catch(() => undefined);
  }, [posterDraft, restaurantId]);

  useEffect(() => {
    if (step === 0) {
      loadPreview().catch((e) => setError(e instanceof Error ? e.message : "Preview failed"));
    }
  }, [step, loadPreview]);

  async function ensureDraft(): Promise<CrmCampaign> {
    if (draft) return draft;
    const campaign = await createCrmCampaign({
      restaurantId,
      name,
      audience,
      templateKey: templateKey || undefined,
    });
    setDraft(campaign);
    return campaign;
  }

  async function onNext() {
    setError(null);
    setWalletBlock(false);
    if (step === 0 && !name.trim()) {
      setError("Name your campaign");
      return;
    }
    if (step === 1 && !templateKey) {
      setError("Pick an approved template");
      return;
    }
    if (step === 2) {
      if (!scheduledLocal) {
        setError("Pick a send time");
        return;
      }
      setBusy(true);
      try {
        await ensureDraft();
        setStep(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  async function onSchedule() {
    setError(null);
    setWalletBlock(false);
    if (!scheduledLocal) {
      setError("Pick a send time");
      return;
    }
    const iso = new Date(scheduledLocal).toISOString();
    setBusy(true);
    try {
      const c = await ensureDraft();
      const scheduled = await scheduleCrmCampaign(c.id, restaurantId, iso);
      onCreated(scheduled);
      onClose();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "INSUFFICIENT_WALLET") {
        setWalletBlock(true);
      }
      setError(err.message ?? "Schedule failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/45 p-4 pl-0 sm:pl-[20%] xl:pl-[38%]"
      role="dialog"
      aria-labelledby="campaign-wizard-title"
      aria-modal="true"
    >
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-2xl xl:max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="campaign-wizard-title" className="font-[family-name:var(--font-display)] text-xl font-bold">
              {posterDraft ? "Send poster campaign" : "New WhatsApp campaign"}
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
              {posterDraft ? " · from AI poster studio" : ""}
            </p>
          </div>
          <button type="button" className="text-sm text-foreground/60 hover:text-foreground" onClick={onClose}>
            Close
          </button>
        </div>

        <ol className="mt-4 flex gap-1">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
              aria-hidden
            />
          ))}
        </ol>

        <div className="mt-6 space-y-4">
          {step === 0 && (
            <>
              <label className="block text-sm">
                <span className="font-medium">Campaign name</span>
                <input
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <fieldset className="text-sm">
                <legend className="font-medium">Audience</legend>
                <label className="mt-2 flex items-center gap-2">
                  <input
                    type="radio"
                    checked={audience === "all"}
                    onChange={() => setAudience("all")}
                  />
                  All guests with orders
                </label>
                <label className="mt-1 flex items-center gap-2">
                  <input
                    type="radio"
                    checked={audience === "marketing_opt_in"}
                    onChange={() => setAudience("marketing_opt_in")}
                  />
                  Marketing opt-in only
                </label>
              </fieldset>
              {preview && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p>
                    Will send to <strong>{preview.willSend}</strong> guests (
                    {preview.skippedSevenDayCap} skipped — 7-day cap)
                  </p>
                  <span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                    1 msg / 7 days enabled
                  </span>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium">Approved template</span>
                <select
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-foreground/50">Kapso-approved templates only (TC-C-046).</p>
              </label>
              {messagePreview ? (
                <div className="rounded-lg border border-outline-variant/40 bg-[#ECE5DD] p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#667781]">
                    Message preview (prefixed)
                  </p>
                  <div className="rounded-lg bg-white p-3 text-sm shadow-sm">
                    <pre className="whitespace-pre-wrap text-[13px] leading-relaxed">{messagePreview}</pre>
                    {posterThumb ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={posterThumb} alt="" className="mt-3 w-full max-w-[200px] rounded-md border border-black/5" />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <label className="block text-sm">
              <span className="font-medium">Send at</span>
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
              />
            </label>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-foreground/60">Name:</span> {name}
              </p>
              <p>
                <span className="text-foreground/60">Audience:</span> {audience}
              </p>
              <p>
                <span className="text-foreground/60">Template:</span> {templateKey}
              </p>
              <p>
                <span className="text-foreground/60">Send:</span>{" "}
                {scheduledLocal ? new Date(scheduledLocal).toLocaleString("en-IN") : "—"}
              </p>
              {preview && (
                <p>
                  <span className="text-foreground/60">Recipients:</span> {preview.willSend}
                </p>
              )}
              {walletBlock && (
                <p className="rounded-lg bg-amber-50 p-3 text-amber-900">
                  Insufficient wallet — top up under Wallet before scheduling (TC-C-049).
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="mt-6 flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || busy}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={onNext} disabled={busy}>
              Next
            </Button>
          ) : (
            <Button type="button" onClick={onSchedule} disabled={busy}>
              Schedule campaign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
