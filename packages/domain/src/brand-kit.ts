export type GuestRestaurantBrand = {
  displayName: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  logoDataUrl: string | null;
};

/** Reject AI/OCR prompt leakage and other non-name strings from brand_kit.displayName */
export function isPlausibleRestaurantDisplayName(raw: string | null | undefined): boolean {
  const s = (raw ?? "").trim();
  if (s.length < 2 || s.length > 80) return false;
  if (/[\n\r]/.test(s)) return false;
  if (
    /OCR|COLORS:\s*|LOGO:\s*|DISHES:\s*|placeholders|Copy printed|no JSON|You are OCR|Need produce|menu photo|template wi/i.test(
      s,
    )
  ) {
    return false;
  }
  // Mostly punctuation / placeholders
  if (/^[\s.…\-_|:]+$/.test(s)) return false;
  return true;
}

export function brandKitForGuestFromJson(raw: string | null | undefined): GuestRestaurantBrand | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const hex = (v: unknown, fallback: string) =>
      typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : fallback;
    const displayName = typeof j.displayName === "string" ? j.displayName.trim() : null;
    if (!displayName || !isPlausibleRestaurantDisplayName(displayName)) return null;
    return {
      displayName,
      primaryColor: hex(j.primaryColor, "#B7122A"),
      backgroundColor: hex(j.backgroundColor, "#FCF9F8"),
      accentColor: hex(j.accentColor, "#775600"),
      logoDataUrl: typeof j.logoDataUrl === "string" ? j.logoDataUrl : null,
    };
  } catch {
    return null;
  }
}
