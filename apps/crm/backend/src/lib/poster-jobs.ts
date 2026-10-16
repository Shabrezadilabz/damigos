import { randomUUID } from "node:crypto";
import { buildPosterMarketingMessage, POSTER_CAMPAIGN_TEMPLATE_KEY } from "./poster-marketing.js";

export type PosterJob = {
  id: string;
  restaurantId: string;
  headline: string;
  offerLine: string;
  status: "draft" | "approved";
  previewLines: string[];
  theme?: {
    primaryColor: string;
    backgroundColor: string;
    accentColor: string;
    layoutHint?: string;
    foodHeroLine?: string;
    imageMood?: string;
    typographyId?: string;
  };
  marketingMessage?: string;
  campaignTemplateKey?: string;
  /** SVG/PNG poster preview (1080×1080) for WhatsApp status */
  previewImageDataUrl?: string;
  /** Hive Flux CDN URL when POSTER_IMAGE_PROVIDER=hive */
  previewImageUrl?: string;
  /** deepseek = AI copy; local = branded SVG fallback */
  previewSource?: "deepseek" | "hive" | "local";
  previewNote?: string;
  createdAt: string;
  approvedAt: string | null;
};

const jobs = new Map<string, PosterJob>();

export function createPosterJob(input: {
  restaurantId: string;
  headline: string;
  offerLine: string;
  restaurantName: string;
  subline?: string;
  theme?: PosterJob["theme"];
  previewImageDataUrl?: string;
  previewImageUrl?: string;
  previewSource?: PosterJob["previewSource"];
  previewNote?: string;
  typographyId?: string;
}): PosterJob {
  const id = randomUUID();
  const job: PosterJob = {
    id,
    restaurantId: input.restaurantId,
    headline: input.headline,
    offerLine: input.offerLine,
    status: "draft",
    previewLines: [
      input.headline,
      input.offerLine,
      input.subline ?? `Order on D'aMigo's — ${input.restaurantName}`,
      "Scan packaging QR · Spin & save",
    ],
    theme: input.typographyId
      ? { ...input.theme, typographyId: input.typographyId }
      : input.theme,
    previewImageDataUrl: input.previewImageDataUrl,
    previewImageUrl: input.previewImageUrl,
    previewSource: input.previewSource,
    previewNote: input.previewNote,
    createdAt: new Date().toISOString(),
    approvedAt: null,
  };
  jobs.set(id, job);
  return job;
}

export function getPosterJob(id: string, restaurantId: string): PosterJob | null {
  const job = jobs.get(id);
  if (!job || job.restaurantId !== restaurantId) return null;
  return job;
}

export function approvePosterJob(id: string, restaurantId: string): PosterJob | null {
  const job = getPosterJob(id, restaurantId);
  if (!job || job.status === "approved") return job;
  const approved: PosterJob = {
    ...job,
    status: "approved",
    approvedAt: new Date().toISOString(),
    marketingMessage: buildPosterMarketingMessage(job),
    campaignTemplateKey: POSTER_CAMPAIGN_TEMPLATE_KEY,
  };
  jobs.set(id, approved);
  return approved;
}
