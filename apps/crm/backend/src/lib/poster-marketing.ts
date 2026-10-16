import type { PosterJob } from "./poster-jobs.js";

export const POSTER_CAMPAIGN_TEMPLATE_KEY = "poster_status_blast";

export function buildPosterMarketingMessage(job: PosterJob): string {
  const detail = job.previewLines[2] ?? job.theme?.foodHeroLine ?? "";
  const cta = job.previewLines[3] ?? "Scan table QR · order direct on WhatsApp";

  return [
    "━━ D'aMigo's · WhatsApp broadcast ━━",
    "",
    `🍽️ *${job.headline}*`,
    job.offerLine,
    detail ? detail : null,
    "",
    cta,
    "",
    "📎 Poster creative attached (1024×1024 status)",
    "_Utility template · 1 msg / 7 days · Reply STOP to opt out_",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function posterCampaignName(job: PosterJob): string {
  const base = `Poster · ${job.headline}`;
  return base.length > 120 ? `${base.slice(0, 117)}…` : base;
}
