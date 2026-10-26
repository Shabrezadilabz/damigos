export type CrmThemeColors = {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
};

export const DEFAULT_CRM_THEME: CrmThemeColors = {
  primaryColor: "#171717",
  backgroundColor: "#FAFAFA",
  accentColor: "#EAFF81",
};

const STORAGE_KEY = "damigos.crm.theme.qa";

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

/** Apply CRM brand colors — keeps iOS + CRED tactile luxury palette */
export function applyCrmTheme(_theme: CrmThemeColors): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--color-primary", "#0F1115");
  root.style.setProperty("--color-secondary", "#EEF0F5");
  root.style.setProperty("--color-ring", "#0F1115");
  root.style.setProperty("--color-primary-container", "#EAFF81");
  root.style.setProperty("--color-primary-fixed", "#EEF0F5");
  root.style.setProperty("--color-secondary-container", "#EAFF81");
  root.style.setProperty("--color-background", "#F4F5F8");
  root.style.setProperty("--color-surface-container-lowest", "#FFFFFF");
  root.style.setProperty("--color-surface-container-low", "#F8F9FB");
  root.style.setProperty("--color-surface-container", "#EEF0F5");
  root.style.setProperty("--color-surface-container-high", "#E5E8F0");
  root.style.setProperty("--color-tertiary", "#10B981");
  root.style.setProperty("--color-tertiary-container", "#D1FAE5");
  root.style.setProperty("--color-outline-variant", "#E2E5EE");
  root.style.setProperty("--color-border", "#E2E5EE");
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
