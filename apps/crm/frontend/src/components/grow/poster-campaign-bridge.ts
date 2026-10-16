export const POSTER_CAMPAIGN_DRAFT_KEY = "damigos_grow_poster_campaign_draft";

export type PosterCampaignDraft = {
  restaurantId: string;
  posterId: string;
  campaignName: string;
  templateKey: string;
  marketingMessage: string;
  headline: string;
};

export function savePosterCampaignDraft(draft: PosterCampaignDraft): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(POSTER_CAMPAIGN_DRAFT_KEY, JSON.stringify(draft));
}

export function consumePosterCampaignDraft(): PosterCampaignDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(POSTER_CAMPAIGN_DRAFT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(POSTER_CAMPAIGN_DRAFT_KEY);
  try {
    return JSON.parse(raw) as PosterCampaignDraft;
  } catch {
    return null;
  }
}
