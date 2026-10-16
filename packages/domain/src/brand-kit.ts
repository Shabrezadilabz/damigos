export type GuestRestaurantBrand = {
  displayName: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  logoDataUrl: string | null;
};

export function brandKitForGuestFromJson(raw: string | null | undefined): GuestRestaurantBrand | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const hex = (v: unknown, fallback: string) =>
      typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : fallback;
    const displayName = typeof j.displayName === "string" ? j.displayName : null;
    if (!displayName) return null;
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
