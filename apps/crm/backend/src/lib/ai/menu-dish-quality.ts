/** Reject AI planning / prompt echo lines mistaken for menu dish names. */

const JUNK_NAME = [
  /^item name$/i,
  /^dish name$/i,
  /^name$/i,
  /^menu item$/i,
  /^up to \d+/i,
  /^inb?r prices?\.?$/i,
  /^max \d+/i,
  /^we need\b/i,
  /^need (to|extract|include|output|copy|fill|list)\b/i,
  /^must\b/i,
  /^plain text only/i,
  /\bnot json\b/i,
  /\buser requested\b/i,
  /^the task\b/i,
  /^analyze\b/i,
  /^let'?s\b/i,
  /^convert this menu/i,
  /^transcript/i,
  /^dishes:?$/i,
  /^colors:?$/i,
  /^restaurant:?$/i,
  /^logo:?$/i,
  /primary #_{2,}/i,
  /background #_{2,}/i,
  /image has sections/i,
  /^sections:/i,
  /\bvision model\b/i,
  /\bocr\b/i,
  /^could use #/i,
  /^continue\b/i,
  /\bevery item you see\b/i,
  /\(name\s*\|/i,
  /\bformat:\s*-/i,
  /^\(one line per dish/i,
  /^one line per dish/i,
  /^[\.\u2026…]+$/,
  /^<name on menu>/i,
  /^xxx/i,
  /^full dish name$/i,
  /^full item name$/i,
  /\bfull dish name\b/i,
  /^dish from photo$/i,
  /^name from menu$/i,
  /^example_from_photo$/i,
];

const SIZE_COLUMN = /^(mini|min|reg|regular|jumbo|large|medium|small|half|full)$/i;

const SECTION_SINGLE =
  /^(biryani|curries|curry|starters|desserts|beverages|drinks|roti|rice|bread|maharaja|combo|specials?|sides?|soup|salad|raita|thali|meals?|breakfast|lunch|dinner|noodles|pizza|burger|sandwich|wraps?)$/i;

/** Column headers, section titles, portion blurbs — not sellable dish names. */
export function isMenuMetaLabel(name: string): boolean {
  const n = name.trim();
  if (!n) return true;
  if (SIZE_COLUMN.test(n)) return true;
  if (/^\([^)]+\)(\s*\([^)]+\))*$/.test(n)) return true;
  if (/\(\s*light eater/i.test(n) || /\bserves\s+\d/i.test(n)) return true;
  if (n.length <= 28 && SECTION_SINGLE.test(n)) return true;
  if (n.length <= 32 && /^[A-Z][A-Z0-9 &/'-]+$/.test(n) && !/\d/.test(n)) {
    const words = n.split(/\s+/).filter(Boolean);
    if (words.length === 1 && SECTION_SINGLE.test(words[0]!)) return true;
    if (words.length <= 4 && /^(roti|rice|bread)\s*&\s*(rice|roti)/i.test(n)) return true;
  }
  return false;
}

function validInr(n: number): boolean {
  return Number.isFinite(n) && n >= 15 && n <= 15_000;
}

export type ParsedDishPrices = {
  name: string;
  miniInr: number | null;
  regularInr: number | null;
  singleInr: number | null;
};

/** Remove mini/reg tokens like `109/189` or `159/249 179/219` from OCR dish titles. */
export function parseDishNameAndPrices(raw: string): ParsedDishPrices {
  let name = raw.trim().replace(/\s+/g, " ");
  let miniInr: number | null = null;
  let regularInr: number | null = null;
  let singleInr: number | null = null;

  const slashSuffix = name.match(/((?:\s+\d{2,4}\/\d{2,4})+)\s*$/);
  if (slashSuffix?.[1]) {
    const groups = [...slashSuffix[1].matchAll(/(\d{2,4})\/(\d{2,4})/g)];
    name = name.slice(0, slashSuffix.index).trim();
    const g = groups[0];
    if (g) {
      const a = parseInt(g[1]!, 10);
      const b = parseInt(g[2]!, 10);
      if (validInr(a) && validInr(b)) {
        miniInr = Math.min(a, b);
        regularInr = Math.max(a, b);
      }
    }
  }

  if (miniInr == null) {
    const space = name.match(/^(.+?)\s+(\d{2,4}(?:\.\d{1,2})?)(?:\s+(\d{2,4}(?:\.\d{1,2})?))?\s*$/);
    if (space) {
      const title = space[1]!.trim();
      const p1 = parseFloat(space[2]!);
      const p2 = space[3] != null ? parseFloat(space[3]) : null;
      if (title && !/^\d/.test(title) && validInr(p1)) {
        name = title;
        if (p2 != null && validInr(p2)) {
          miniInr = Math.min(p1, p2);
          regularInr = Math.max(p1, p2);
        } else {
          singleInr = p1;
        }
      }
    }
  }

  name = name.replace(/\s+\d{2,4}\/\d{2,4}(?:\s+\d{2,4}\/\d{2,4})*\s*$/g, "").trim();
  return { name, miniInr, regularInr, singleInr };
}

/** "Veg Biryani 119 179" → title + mini/reg prices (INR, no ₹). */
export function extractTrailingInrFromTitle(raw: string): {
  name: string;
  priceInr: number;
  priceInrAlt: number | null;
} | null {
  const p = parseDishNameAndPrices(raw);
  if (!p.name || isMenuMetaLabel(p.name)) return null;
  if (p.miniInr != null && p.regularInr != null) {
    return { name: p.name, priceInr: p.miniInr, priceInrAlt: p.regularInr };
  }
  if (p.singleInr != null) return { name: p.name, priceInr: p.singleInr, priceInrAlt: null };
  return null;
}

/** Strip trailing " veg" / " nonveg" mistakenly left in the title. */
export function cleanDishTitle(raw: string): { name: string; isVegHint: boolean | null } {
  let name = parseDishNameAndPrices(raw).name.trim().replace(/\s+/g, " ");
  let isVegHint: boolean | null = null;
  const m = name.match(/\s+(non\s*-?\s*veg|nonveg|veg)\.?\s*$/i);
  if (m) {
    isVegHint = !/non/i.test(m[1]!);
    name = name.slice(0, -m[0].length).trim();
  }
  return { name, isVegHint };
}

export function isJunkMenuDishName(name: string, description?: string | null): boolean {
  const n = name.trim();
  if (n.length < 2) return true;
  if (/^[\.\u2026…\s]+$/.test(n)) return true;
  if (isMenuMetaLabel(n)) return true;

  const lower = n.toLowerCase();
  const hay = `${lower} ${(description ?? "").toLowerCase()}`;

  for (const re of JUNK_NAME) {
    if (re.test(n) || re.test(hay)) return true;
  }

  const instructionHits =
    lower.match(/\b(need|must|should|output|json|plain text|extract|prompt|requested|planning|transcribe)\b/g)?.length ?? 0;
  if (instructionHits >= 2) return true;
  if (n.length > 60 && instructionHits >= 1) return true;

  return false;
}

export function looksLikeMenuDishName(name: string, priceInr?: number, description?: string | null): boolean {
  if (isJunkMenuDishName(name, description)) return false;
  const n = name.trim();
  if (n.length > 85) return false;
  if (/^[\d₹$]/.test(n)) return false;
  if (/\d{2,4}\/\d{2,4}/.test(n)) return false;
  if (/\s\d{2,4}\s*$/.test(n) && !priceInr) return false;
  const hasPrice = priceInr != null && priceInr > 0;
  if (n.includes(";")) return false;
  if (!hasPrice && n.includes(":")) return false;
  if (hasPrice) return n.length >= 2 && n.length <= 85;
  if (isMenuMetaLabel(n)) return false;
  const words = n.split(/\s+/).filter(Boolean);
  if (words.length === 1 && n.length <= 12 && /^[A-Z0-9]+$/i.test(n)) return false;
  if (n.length >= 4 && n.length <= 56 && words.length >= 2) return true;
  if (n.length >= 5 && n.length <= 56 && /[a-z]/.test(n)) return true;
  return false;
}

/** Split "Veg Biryani 119 179" rows when price was left in the title (JSON / OCR). */
function titleCaseDishName(raw: string): string {
  const lower = raw.toLowerCase();
  return lower.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function expandEmbeddedPriceDishes<
  T extends {
    name: string;
    description?: string | null;
    priceInr?: number;
    pricePaise?: number;
    isVeg?: boolean;
    category?: string | null;
    confidence?: number;
  },
>(dishes: T[]): T[] {
  const out: T[] = [];
  for (const d of dishes) {
    const parsed = parseDishNameAndPrices(d.name);
    const baseName = titleCaseDishName(parsed.name);
    const fromTitle =
      parsed.miniInr != null && parsed.regularInr != null
        ? { mini: parsed.miniInr, reg: parsed.regularInr }
        : parsed.singleInr != null
          ? { single: parsed.singleInr }
          : null;

    if (fromTitle && "mini" in fromTitle && fromTitle.mini != null && fromTitle.reg != null) {
      out.push({
        ...d,
        name: `${baseName} (Mini)`,
        priceInr: fromTitle.mini,
        pricePaise: Math.round(fromTitle.mini * 100),
        confidence: Math.min(d.confidence ?? 85, 88),
      });
      out.push({
        ...d,
        name: `${baseName} (Regular)`,
        priceInr: fromTitle.reg,
        pricePaise: Math.round(fromTitle.reg * 100),
        confidence: Math.min(d.confidence ?? 85, 88),
      });
      continue;
    }

    if (fromTitle && "single" in fromTitle && fromTitle.single != null) {
      out.push({
        ...d,
        name: baseName,
        priceInr: fromTitle.single,
        pricePaise: Math.round(fromTitle.single * 100),
      });
      continue;
    }

    const priced =
      (typeof d.pricePaise === "number" && d.pricePaise > 0) ||
      (typeof d.priceInr === "number" && d.priceInr > 0);
    if (!priced) {
      const embedded = extractTrailingInrFromTitle(d.name);
      if (embedded?.priceInrAlt != null) {
        const n = titleCaseDishName(embedded.name);
        out.push({
          ...d,
          name: `${n} (Mini)`,
          priceInr: embedded.priceInr,
          pricePaise: Math.round(embedded.priceInr * 100),
        });
        out.push({
          ...d,
          name: `${n} (Regular)`,
          priceInr: embedded.priceInrAlt,
          pricePaise: Math.round(embedded.priceInrAlt * 100),
        });
        continue;
      }
      if (embedded) {
        out.push({
          ...d,
          name: titleCaseDishName(embedded.name),
          priceInr: embedded.priceInr,
          pricePaise: Math.round(embedded.priceInr * 100),
        });
        continue;
      }
    }

    out.push({ ...d, name: baseName !== parsed.name ? baseName : d.name });
  }
  return out;
}

export function dedupeMenuImportDishes<
  T extends { name: string; pricePaise?: number; priceInr?: number },
>(dishes: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const d of dishes) {
    const paise =
      typeof d.pricePaise === "number"
        ? d.pricePaise
        : typeof d.priceInr === "number"
          ? Math.round(d.priceInr * 100)
          : 0;
    const key = `${d.name.toLowerCase().replace(/\s+/g, " ").trim()}|${paise}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

export function filterValidDishes<T extends { name: string; description?: string | null; priceInr?: number; pricePaise?: number }>(
  dishes: T[],
): T[] {
  return dishes.filter((d) => {
    const price =
      typeof d.priceInr === "number"
        ? d.priceInr
        : typeof d.pricePaise === "number"
          ? d.pricePaise / 100
          : undefined;
    return looksLikeMenuDishName(d.name, price, d.description ?? null);
  });
}
