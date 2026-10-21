export type CrmThemeColors = {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
};

export const DEFAULT_CRM_THEME: CrmThemeColors = {
  primaryColor: "#B7122A",
  backgroundColor: "#FCF9F8",
  accentColor: "#775600",
};

const STORAGE_KEY = "damigos.crm.theme";

function mix(hex: string, toward: string, t: number): string {
  const parse = (h: string) => {
    const n = h.replace("#", "");
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)] as const;
  };
  const a = parse(hex);
  const b = parse(toward);
  const c = (i: number) => Math.round(a[i]! + (b[i]! - a[i]!) * t);
  return `#${[c(0), c(1), c(2)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Apply CRM brand colors to Tailwind v4 theme tokens on :root */
export function applyCrmTheme(theme: CrmThemeColors): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = theme.primaryColor;
  const bg = theme.backgroundColor;
  const accent = theme.accentColor;
  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-secondary", mix(primary, "#000000", 0.08));
  root.style.setProperty("--color-ring", primary);
  root.style.setProperty("--color-primary-container", mix(primary, "#ffffff", 0.18));
  root.style.setProperty("--color-primary-fixed", mix(primary, "#ffffff", 0.82));
  root.style.setProperty("--color-secondary-container", mix(primary, "#ffffff", 0.28));
  root.style.setProperty("--color-background", bg);
  root.style.setProperty("--color-surface-container-low", mix(bg, "#000000", 0.02));
  root.style.setProperty("--color-surface-container", mix(bg, "#000000", 0.04));
  root.style.setProperty("--color-surface-container-high", mix(bg, "#000000", 0.06));
  root.style.setProperty("--color-tertiary", accent);
  root.style.setProperty("--color-tertiary-container", mix(accent, "#ffffff", 0.2));
  root.style.setProperty("--color-outline-variant", mix(primary, "#ffffff", 0.72));
  root.style.setProperty("--color-border", mix(primary, "#ffffff", 0.72));
}

export function readStoredCrmTheme(): CrmThemeColors | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CrmThemeColors>;
    if (!parsed.primaryColor?.startsWith("#")) return null;
    return {
      primaryColor: parsed.primaryColor,
      backgroundColor: parsed.backgroundColor ?? DEFAULT_CRM_THEME.backgroundColor,
      accentColor: parsed.accentColor ?? DEFAULT_CRM_THEME.accentColor,
    };
  } catch {
    return null;
  }
}

export function storeCrmTheme(theme: CrmThemeColors): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    /* ignore */
  }
}
