import {
  cleanDishTitle,
  extractTrailingInrFromTitle,
  isJunkMenuDishName,
  isMenuMetaLabel,
  looksLikeMenuDishName,
} from "./menu-dish-quality.js";
import { clampVarchar, normalizeMenuItemName } from "../sanitize-menu-varchar.js";

/** Parse plain-text menu vision output (RESTAURANT / COLORS / DISHES sections). */

export type ParsedMenuDraft = {
  restaurantName: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  logoNotes: string | null;
  dishes: {
    name: string;
    description: string | null;
    priceInr: number;
    isVeg: boolean;
    category: string | null;
    confidence: number;
  }[];
};

function normalizeHex(c: string, fallback: string): string {
  const s = c.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s;
  if (/^[0-9A-Fa-f]{6}$/.test(s)) return `#${s}`;
  return fallback;
}

function parsePrice(token: string): number {
  const n = parseFloat(token.replace(/[,₹\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseVeg(token: string | undefined): boolean {
  if (!token) return true;
  const t = token.toLowerCase();
  if (/non\s*-?\s*veg|nonveg|chicken|mutton|fish|prawn|egg|meat/.test(t)) return false;
  return true;
}

/** Split "Section: A veg; B veg; C" into separate pseudo-lines. */
function expandMenuLines(line: string): string[] {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();
  if (!trimmed || isJunkMenuDishName(trimmed)) return [];
  const semis = (trimmed.match(/;/g) ?? []).length;
  if (semis === 0) return [line];

  const colon = trimmed.indexOf(":");
  const category = colon > 0 && colon < 48 ? trimmed.slice(0, colon).trim() : null;
  const body = colon > 0 ? trimmed.slice(colon + 1) : trimmed;
  const parts = body
    .split(";")
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && !isJunkMenuDishName(p));
  if (parts.length < 2) return [line];

  return parts.map((p) => {
    const cat = category ? clampVarchar(category, 64) : "";
    return cat ? `- ${p} | | | ${cat}` : `- ${p}`;
  });
}

function dishFromParts(
  rawName: string,
  priceInr: number,
  isVeg: boolean,
  category: string | null,
  confidence: number,
): ParsedMenuDraft["dishes"][number] | null {
  if (!rawName || isJunkMenuDishName(rawName)) return null;
  const normalized = normalizeMenuItemName(rawName);
  if (!looksLikeMenuDishName(normalized.name, priceInr, normalized.extraDescription)) return null;
  return {
    name: normalized.name,
    description: normalized.extraDescription,
    priceInr,
    isVeg,
    category,
    confidence,
  };
}

function parseDishLines(line: string, defaultCategory: string | null): ParsedMenuDraft["dishes"] {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();
  if (!trimmed || trimmed.length < 2) return [];
  if (/^dishes:?$/i.test(trimmed)) return [];
  if (/^\(.*format/i.test(trimmed)) return [];
  if (isMenuMetaLabel(trimmed)) return [];

  const inline = extractTrailingInrFromTitle(trimmed);
  if (inline) {
    const titleClean = cleanDishTitle(inline.name);
    const isVeg = titleClean.isVegHint ?? parseVeg(titleClean.name);
    const cat = defaultCategory;
    const out: ParsedMenuDraft["dishes"] = [];
    if (inline.priceInrAlt != null) {
      const mini = dishFromParts(`${titleClean.name} (Mini)`, inline.priceInr, isVeg, cat, 82);
      const reg = dishFromParts(`${titleClean.name} (Regular)`, inline.priceInrAlt, isVeg, cat, 82);
      if (mini) out.push(mini);
      if (reg) out.push(reg);
    } else {
      const one = dishFromParts(titleClean.name, inline.priceInr, isVeg, cat, 85);
      if (one) out.push(one);
    }
    return out;
  }

  const pipe = trimmed.split("|").map((p) => p.trim());
  if (pipe.length >= 2) {
    const titleClean = cleanDishTitle(pipe[0]!);
    const name = titleClean.name;
    const priceInr = parsePrice(pipe[1]!);
    const isVeg = pipe[2] ? parseVeg(pipe[2]) : titleClean.isVegHint ?? parseVeg(name);
    let category = pipe[3]?.trim() || defaultCategory;
    const pipeInline = !pipe[1] || parsePrice(pipe[1]) === 0 ? extractTrailingInrFromTitle(name) : null;
    if (pipeInline) {
      return parseDishLines(`- ${pipeInline.name} ${pipeInline.priceInr}${pipeInline.priceInrAlt != null ? ` ${pipeInline.priceInrAlt}` : ""}`, category);
    }
    const one = dishFromParts(name, priceInr, isVeg, category, priceInr > 0 ? 85 : 55);
    return one ? [one] : [];
  }

  const priceMatch = trimmed.match(/(.+?)\s+₹\s*([\d,]+(?:\.\d+)?)\s*$/);
  if (priceMatch) {
    const titleClean = cleanDishTitle(priceMatch[1]!.trim());
    const name = titleClean.name;
    const priceInr = parsePrice(priceMatch[2]!);
    const one = dishFromParts(name, priceInr, titleClean.isVegHint ?? parseVeg(name), defaultCategory, 82);
    return one ? [one] : [];
  }

  if (trimmed.length >= 3 && !/^(restaurant|colors|logo|dishes)/i.test(trimmed)) {
    const titleClean = cleanDishTitle(trimmed);
    const one = dishFromParts(titleClean.name, 0, titleClean.isVegHint ?? parseVeg(trimmed), defaultCategory, 50);
    return one ? [one] : [];
  }

  return [];
}

function sectionLineAction(line: string): "skip" | { setCategory: string } | null {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();
  if (!trimmed) return "skip";
  if (/^(mini|min|reg|regular|jumbo|large|medium|small)$/i.test(trimmed)) return "skip";
  if (/^\([^)]+\)(\s*\([^)]+\))*$/.test(trimmed)) return "skip";
  if (extractTrailingInrFromTitle(trimmed)) return null;
  if (isMenuMetaLabel(trimmed)) return { setCategory: clampVarchar(trimmed, 64) };
  return null;
}

export function parseMenuTranscript(raw: string): ParsedMenuDraft | null {
  const text = raw.trim();
  if (!text || text.length < 8) return null;

  let restaurantName = "Restaurant";
  const restLine = text.match(/RESTAURANT:\s*(.+)/i);
  if (restLine?.[1]) restaurantName = clampVarchar(restLine[1].trim().split("\n")[0]!.trim(), 250);

  const titleGuess = text.match(/^["']?([A-Za-z0-9][A-Za-z0-9 '&.-]{2,60})["']?\s*(?:menu|restaurant)?/im);
  if (restaurantName === "Restaurant" && titleGuess?.[1]) {
    restaurantName = titleGuess[1].trim();
  }

  const hexes = [...text.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => `#${m[1]}`);
  const primaryColor = normalizeHex(hexes[0] ?? "", "#B7122A");
  const backgroundColor = normalizeHex(hexes[1] ?? "", "#1B1B1B");
  const accentColor = normalizeHex(hexes[2] ?? "", "#775600");

  const logoMatch = text.match(/LOGO:\s*(.+)/i);
  const logoNotes = logoMatch?.[1]?.trim().split("\n")[0]?.trim() || null;

  const dishesPart = text.split(/DISHES:\s*/i)[1] ?? text;
  const lines = dishesPart.split(/\n/);
  const dishes: ParsedMenuDraft["dishes"] = [];

  let currentCategory: string | null = null;

  const pushFromLine = (line: string, category: string | null) => {
    for (const sub of expandMenuLines(line)) {
      for (const dish of parseDishLines(sub, category)) {
        if (dish.name.length >= 2 && !isJunkMenuDishName(dish.name, dish.description)) {
          dishes.push(dish);
        }
        if (dishes.length >= 40) return;
      }
    }
  };

  for (const line of lines) {
    const section = sectionLineAction(line);
    if (section === "skip") continue;
    if (section) {
      currentCategory = section.setCategory;
      continue;
    }
    pushFromLine(line, currentCategory);
    if (dishes.length >= 40) break;
  }

  if (dishes.length === 0) {
    for (const line of text.split(/\n/)) {
      const section = sectionLineAction(line);
      if (section === "skip") continue;
      if (section) {
        currentCategory = section.setCategory;
        continue;
      }
      pushFromLine(line, currentCategory);
      if (dishes.length >= 40) break;
    }
  }

  if (dishes.length === 0) return null;

  return {
    restaurantName,
    primaryColor,
    backgroundColor,
    accentColor,
    logoNotes,
    dishes,
  };
}
