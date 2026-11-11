export type CrmThemeColors = {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
};

/** YUMM plum / milk defaults */
export const DEFAULT_CRM_THEME: CrmThemeColors = {
  primaryColor: "#381932",
  backgroundColor: "#fff3e6",
  accentColor: "#b98aae",
};

const STORAGE_KEY = "damigos.crm.theme.yumm";

/** Apply YUMM brand colors onto CSS variables (palette only). */
export function applyCrmTheme(theme: CrmThemeColors = DEFAULT_CRM_THEME): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const primary = theme.primaryColor || DEFAULT_CRM_THEME.primaryColor;
  const background = theme.backgroundColor || DEFAULT_CRM_THEME.backgroundColor;
  const accent = theme.accentColor || DEFAULT_CRM_THEME.accentColor;

  root.style.setProperty("--color-primary", primary);
  root.style.setProperty("--color-primary-foreground", "#fff3e6");
  root.style.setProperty("--color-secondary", "#f6e4cf");
  root.style.setProperty("--color-ring", primary);
  root.style.setProperty("--color-primary-container", accent);
  root.style.setProperty("--color-on-primary-container", primary);
  root.style.setProperty("--color-primary-fixed", "#f6e4cf");
  root.style.setProperty("--color-secondary-container", accent);
  root.style.setProperty("--color-accent", accent);
  root.style.setProperty("--color-accent-foreground", primary);
  root.style.setProperty("--color-qa-accent", accent);
  root.style.setProperty("--color-background", background);
  root.style.setProperty("--color-foreground", "#2a1226");
  root.style.setProperty("--color-surface-container-lowest", "#FFFFFF");
  root.style.setProperty("--color-surface-container-low", "#fff8f0");
  root.style.setProperty("--color-surface-container", "#f6e4cf");
  root.style.setProperty("--color-surface-container-high", "#ebd5bf");
  root.style.setProperty("--color-tertiary", "#7a4f70");
  root.style.setProperty("--color-tertiary-container", "#e8d5e2");
  root.style.setProperty("--color-success", "#3d8b6e");
  root.style.setProperty("--color-outline-variant", "#ebd5bf");
  root.style.setProperty("--color-border", "#ebd5bf");
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
