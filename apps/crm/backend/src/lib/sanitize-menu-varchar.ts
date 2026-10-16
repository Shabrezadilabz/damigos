/** Postgres `varchar(255)` safety for menu import + CRM writes. */

export const MENU_ITEM_NAME_MAX = 250;
export const MENU_IMPORT_FILENAME_MAX = 255;
export const FOOD_CATALOG_NAME_MAX = 250;
export const FOOD_CATALOG_TAG_MAX = 64;

export function clampVarchar(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  if (max <= 1) return t.slice(0, max);
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Split pipe-heavy OCR lines; keep short title for `menu_items.name`. */
export function normalizeMenuItemName(raw: string): { name: string; extraDescription: string | null } {
  let line = raw.trim().replace(/\s+/g, " ");
  if (!line) return { name: "Menu item", extraDescription: null };

  if (line.includes("|")) {
    const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
    const title = parts[0] ?? line;
    const rest = parts.slice(1).join(" · ");
    const name = clampVarchar(title, MENU_ITEM_NAME_MAX);
    return { name, extraDescription: rest || null };
  }

  if (line.length <= MENU_ITEM_NAME_MAX) {
    return { name: line, extraDescription: null };
  }

  const cut = line.slice(0, MENU_ITEM_NAME_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  const name = (lastSpace > 32 ? cut.slice(0, lastSpace) : cut).trim();
  const extra = line.slice(name.length).trim();
  return {
    name: clampVarchar(name, MENU_ITEM_NAME_MAX),
    extraDescription: extra || null,
  };
}

export function mergeDescription(
  primary: string | null | undefined,
  extra: string | null,
): string | null {
  const a = primary?.trim();
  const b = extra?.trim();
  if (a && b) return `${a} ${b}`.trim();
  return a || b || null;
}
