"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MaterialIcon } from "@/components/material-icon";
import { Button } from "@/components/ui/button";
import {
  approveGrowPoster,
  fetchPosterTypographyOptions,
  generateGrowPoster,
  restyleGrowPoster,
  type GrowPosterJob,
  type PosterTypographyOption,
} from "@/lib/api";
import {
  savePosterCampaignDraft,
  type PosterCampaignDraft,
} from "./poster-campaign-bridge";

const GENERATE_STEPS = ["Polishing copy", "Generating photo options", "Laying out type"] as const;

function posterCampaignName(headline: string): string {
  const base = `Poster · ${headline}`;
  return base.length > 120 ? `${base.slice(0, 117)}…` : base;
}

function PosterStudioLoader({ stepIndex }: { stepIndex: number }) {
  return (
    <div
      className="flex aspect-square max-w-md flex-col items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-container-high/80 p-8"
      data-testid="poster-generating"
    >
      <div className="relative mb-6 h-16 w-16">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <MaterialIcon name="auto_awesome" className="animate-pulse text-[32px] text-primary" />
        </span>
      </div>
      <p className="font-[family-name:var(--font-display)] text-lg font-bold">Building your poster…</p>
      <p className="mt-2 text-center text-sm text-on-surface-variant">
        Multiple photo options + type stacks — usually 20–60 seconds.
      </p>
      <ol className="mt-6 w-full max-w-xs space-y-2 text-left text-xs">
        {GENERATE_STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
              i <= stepIndex ? "bg-primary/10 text-foreground" : "text-on-surface-variant/60"
            }`}
          >
            <MaterialIcon
              name={i < stepIndex ? "check_circle" : i === stepIndex ? "hourglass_top" : "radio_button_unchecked"}
              className={`text-[18px] ${i === stepIndex ? "animate-spin" : ""}`}
            />
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function WhatsAppTemplatePreview({
  poster,
  message,
}: {
  poster: GrowPosterJob;
  message: string;
}) {
  const thumb = poster.previewImageDataUrl ?? poster.previewImageUrl;
  return (
    <div
      className="rounded-xl border border-outline-variant/50 bg-[#ECE5DD] p-4 shadow-inner"
      data-testid="poster-whatsapp-template"
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#667781]">
        Prefixed marketing template
      </p>
      <div className="max-w-sm rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
        <pre className="whitespace-pre-wrap font-[family-name:var(--font-sans)] text-[13px] leading-relaxed text-[#111]">
          {message}
        </pre>
        {thumb ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumb}
            alt=""
            className="mt-3 w-full rounded-lg border border-black/5 object-cover"
          />
        ) : null}
        <p className="mt-2 text-right text-[10px] text-[#667781]">
          Template · {poster.campaignTemplateKey ?? "poster_status_blast"}
        </p>
      </div>
    </div>
  );
}

export function GrowPosterPanel({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [headline, setHeadline] = useState("Weekend biryani special");
  const [offerLine, setOfferLine] = useState("₹50 off when you scan & order direct");
  const [typographyId, setTypographyId] = useState("soft-editorial");
  const [typographyOptions, setTypographyOptions] = useState<PosterTypographyOption[]>([]);
  const [poster, setPoster] = useState<GrowPosterJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const [approving, setApproving] = useState(false);
  const [restyling, startRestyle] = useTransition();

  useEffect(() => {
    void fetchPosterTypographyOptions()
      .then(setTypographyOptions)
      .catch(() => {
        /* optional — generate response also returns options */
      });
  }, []);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    setPoster(null);
    setLoaderStep(0);
    const stepTimer = window.setInterval(() => {
      setLoaderStep((s) => Math.min(s + 1, GENERATE_STEPS.length - 1));
    }, 8000);
    try {
      const { poster: job, typographyOptions: opts } = await generateGrowPoster({
        restaurantId,
        headline,
        offerLine,
        typographyId,
        imageCount: 3,
      });
      if (opts.length) setTypographyOptions(opts);
      setPoster(job);
      if (job.selectedTypographyId) setTypographyId(job.selectedTypographyId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      window.clearInterval(stepTimer);
      setGenerating(false);
    }
  }

  function applyRestyle(next: { typographyId?: string; imageId?: string }) {
    if (!poster) return;
    startRestyle(() => {
      void (async () => {
        setError(null);
        try {
          const { poster: job, typographyOptions: opts } = await restyleGrowPoster({
            restaurantId,
            posterId: poster.id,
            typographyId: next.typographyId ?? typographyId,
            imageId: next.imageId ?? poster.selectedImageId,
          });
          if (opts.length) setTypographyOptions(opts);
          setPoster(job);
          if (job.selectedTypographyId) setTypographyId(job.selectedTypographyId);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not update style");
        }
      })();
    });
  }

  async function onApprove() {
    if (!poster) return;
    setApproving(true);
    setError(null);
    try {
      const approved = await approveGrowPoster(restaurantId, poster.id);
      setPoster(approved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  }

  function onSendViaCampaigns() {
    if (!poster || poster.status !== "approved") return;
    const marketingMessage =
      poster.marketingMessage ??
      [
        "━━ D'aMigo's · WhatsApp broadcast ━━",
        "",
        `🍽️ *${poster.headline}*`,
        poster.offerLine,
        "",
        "📎 Poster creative attached",
      ].join("\n");

    const draft: PosterCampaignDraft = {
      restaurantId,
      posterId: poster.id,
      campaignName: posterCampaignName(poster.headline),
      templateKey: poster.campaignTemplateKey ?? "poster_status_blast",
      marketingMessage,
      headline: poster.headline,
    };
    savePosterCampaignDraft(draft);
    router.push("/grow?tab=campaigns");
  }

  const fontOptions =
    typographyOptions.length > 0
      ? typographyOptions
      : [
          {
            id: "soft-editorial",
            label: "Soft editorial",
            description: "Friendly rounded headline",
            layout: "left-stack" as const,
          },
        ];

  return (
    <div className="grid gap-6 xl:grid-cols-12">
      <div className="space-y-4 xl:col-span-5">
        <div className="rounded-xl bg-surface-container-lowest p-5 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
          <div className="mb-4 flex items-center gap-2">
            <MaterialIcon name="auto_awesome" className="text-[22px] text-tertiary" />
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">Creative brief</h2>
          </div>
          <p className="mb-4 text-xs text-on-surface-variant">
            Generate several food photos, then pick type + image before approve.
          </p>
          <label className="block text-sm">
            <span className="font-semibold">Headline</span>
            <input
              className="mt-1.5 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              disabled={generating}
              data-testid="poster-headline"
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-semibold">Offer line</span>
            <input
              className="mt-1.5 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm"
              value={offerLine}
              onChange={(e) => setOfferLine(e.target.value)}
              disabled={generating}
            />
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-semibold">Font style</span>
            <select
              className="mt-1.5 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2.5 text-sm"
              value={typographyId}
              disabled={generating || restyling}
              data-testid="poster-font-select"
              onChange={(e) => {
                const next = e.target.value;
                setTypographyId(next);
                if (poster) applyRestyle({ typographyId: next });
              }}
            >
              {fontOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-on-surface-variant">
              {fontOptions.find((o) => o.id === typographyId)?.description ??
                "Choose a readable type stack for the overlay"}
            </span>
          </label>
          <Button
            type="button"
            className="mt-4 gap-2"
            disabled={generating || approving}
            onClick={() => void onGenerate()}
          >
            <MaterialIcon name={generating ? "hourglass_top" : "palette"} className="text-[18px]" />
            {generating ? "Generating…" : "Generate options"}
          </Button>
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>

        {poster?.imageOptions && poster.imageOptions.length > 0 ? (
          <div className="rounded-xl bg-surface-container-lowest p-5 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
            <h3 className="mb-1 text-sm font-bold">Photo options</h3>
            <p className="mb-3 text-[11px] text-on-surface-variant">
              Tap a photo to relayout the poster. {restyling ? "Updating…" : ""}
            </p>
            <div className="grid grid-cols-3 gap-2" data-testid="poster-image-options">
              {poster.imageOptions.map((opt) => {
                const selected = opt.id === poster.selectedImageId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={generating || restyling}
                    onClick={() => applyRestyle({ imageId: opt.id })}
                    className={`overflow-hidden rounded-lg border-2 text-left transition ${
                      selected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-outline-variant/40 hover:border-primary/50"
                    }`}
                    data-testid={`poster-image-option-${opt.id}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={opt.url} alt={opt.label} className="aspect-square w-full object-cover" />
                    <span className="block truncate bg-surface-container-low px-1.5 py-1 text-[10px] font-semibold">
                      {opt.label}
                      {opt.source === "hive" ? " · AI" : " · stock"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {poster?.status === "approved" && poster.marketingMessage ? (
          <WhatsAppTemplatePreview poster={poster} message={poster.marketingMessage} />
        ) : null}
      </div>

      <div className="xl:col-span-7">
        <div className="min-h-[320px] rounded-xl bg-surface-container-low p-5 shadow-[0_2px_8px_-2px_rgba(28,28,28,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              Studio preview
            </h3>
            <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-[9px] font-bold uppercase text-on-tertiary-fixed">
              1024 × 1024
            </span>
          </div>
          {generating ? (
            <div className="mx-auto max-w-md">
              <PosterStudioLoader stepIndex={loaderStep} />
            </div>
          ) : !poster ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant text-sm text-on-surface-variant">
              <MaterialIcon name="image" className="mb-2 text-[32px] opacity-40" />
              Generate to see photo + font options.
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-3" data-testid="poster-preview">
              {poster.previewImageUrl || poster.previewImageDataUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={poster.previewImageDataUrl ?? poster.previewImageUrl}
                    alt="AI poster preview"
                    className={`w-full rounded-xl border border-outline-variant/40 shadow-lg ${restyling ? "opacity-70" : ""}`}
                    data-testid="poster-preview-image"
                  />
                  {poster.theme?.typographyId || poster.selectedTypographyId ? (
                    <p className="text-center text-[11px] text-on-surface-variant">
                      Type:{" "}
                      <span className="font-semibold">
                        {fontOptions.find(
                          (o) => o.id === (poster.selectedTypographyId ?? poster.theme?.typographyId),
                        )?.label ??
                          (poster.selectedTypographyId ?? poster.theme?.typographyId)?.replace(/-/g, " ")}
                      </span>
                      {poster.previewSource === "hive" ? " · dish-matched photo" : ""}
                    </p>
                  ) : null}
                  {poster.previewNote ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                      {poster.previewNote}
                    </p>
                  ) : null}
                </>
              ) : (
                <div
                  className="space-y-3 rounded-xl p-6 shadow-inner"
                  style={
                    poster.theme
                      ? {
                          background: `linear-gradient(135deg, ${poster.theme.backgroundColor}, ${poster.theme.accentColor}44)`,
                          color: poster.theme.primaryColor,
                        }
                      : undefined
                  }
                >
                  {poster.previewLines.map((line, i) => (
                    <p key={line} className={i === 0 ? "text-xl font-bold" : "text-sm font-medium"}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
              <p className="pt-2 text-xs text-on-surface-variant">
                Status: {poster.status === "approved" ? "Approved for share" : "Draft — approve to share"}
              </p>
              {poster.status === "draft" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={approving || generating || restyling}
                  onClick={() => void onApprove()}
                >
                  {approving ? "Approving…" : "Approve poster"}
                </Button>
              ) : null}
              {poster.status === "approved" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <p className="text-xs font-semibold text-[#24963F]" data-testid="poster-approved">
                    Ready for WhatsApp broadcast
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    data-testid="poster-send-campaigns"
                    onClick={onSendViaCampaigns}
                  >
                    <MaterialIcon name="send" className="text-[18px]" />
                    Send via Campaigns
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
