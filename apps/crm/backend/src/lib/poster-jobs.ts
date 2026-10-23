import { randomUUID } from "node:crypto";
import type { PosterSpec } from "./ai/generate-poster-spec.js";
import { buildPosterMarketingMessage, POSTER_CAMPAIGN_TEMPLATE_KEY } from "./poster-marketing.js";

export type PosterImageOption = {
  id: string;
  /** Hive CDN or stock URL */
  url: string;
  source: "hive" | "stock";
  label: string;
};

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
  /** Composed SVG/PNG preview (selected font + image) */
  previewImageDataUrl?: string;
  /** Selected background URL (Hive / stock) */
  previewImageUrl?: string;
  previewSource?: "deepseek" | "hive" | "local";
  previewNote?: string;
  /** Spec + backgrounds kept for restyle (font / image swap) */
  posterSpec?: PosterSpec;
  restaurantDisplayName?: string;
  imageOptions?: PosterImageOption[];
  selectedImageId?: string;
  selectedTypographyId?: string;
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
  posterSpec?: PosterSpec;
  imageOptions?: PosterImageOption[];
  selectedImageId?: string;
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
    posterSpec: input.posterSpec,
    restaurantDisplayName: input.restaurantName,
    imageOptions: input.imageOptions,
    selectedImageId: input.selectedImageId,
    selectedTypographyId: input.typographyId,
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

export function updatePosterJob(job: PosterJob): PosterJob {
  jobs.set(job.id, job);
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
