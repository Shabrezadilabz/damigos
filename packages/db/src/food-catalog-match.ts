import { db } from "./client.js";
import { foodCatalog } from "./schema/index.js";

export type FoodCatalogRow = {
  id: string;
  name: string;
  nameNorm: string;
  cuisine: string;
  category: string;
  isVeg: boolean;
  imageUrl: string;
  aliasNorms: string[];
  searchText: string;
};

let cache: FoodCatalogRow[] | null = null;
let loadedAt = 0;
const TTL_MS = 5 * 60_000;

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAliases(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

export function invalidateFoodCatalogCache() {
  cache = null;
  loadedAt = 0;
}

export async function loadFoodCatalogCache(force = false): Promise<FoodCatalogRow[]> {
  if (!force && cache && Date.now() - loadedAt < TTL_MS) return cache;

  let rows: (typeof foodCatalog.$inferSelect)[];
  try {
    rows = await db.select().from(foodCatalog);
  } catch (err) {
    console.warn("[food-catalog-cache] load failed (run db:migrate + db:seed-food-catalog):", err);
    cache = [];
    loadedAt = Date.now();
    return cache;
  }
  cache = rows.map((r) => ({
    id: r.id,
    name: r.name,
    nameNorm: normalize(r.name),
    cuisine: r.cuisine,
    category: r.category,
    isVeg: r.isVeg,
    imageUrl: r.imageUrl,
    aliasNorms: parseAliases(r.aliases).map(normalize),
    searchText: r.searchText,
  }));
  loadedAt = Date.now();
  return cache;
}

export type FoodCatalogMatch = {
  id: string;
  imageUrl: string;
  catalogName: string;
  score: number;
};

/** Minimum match score before we show a catalog photo (name-aligned, not generic). */
export const FOOD_CATALOG_IMAGE_MIN_SCORE = 700;

export function catalogImageForMatch(match: FoodCatalogMatch | null): string | null {
  if (!match || match.score < FOOD_CATALOG_IMAGE_MIN_SCORE) return null;
  return match.imageUrl;
}

export function matchFoodCatalogFromCache(
  catalog: FoodCatalogRow[],
  name: string,
  description: string | null | undefined,
  isVeg: boolean,
): FoodCatalogMatch | null {
  if (catalog.length === 0) return null;

  const hay = normalize(`${name} ${description ?? ""}`);
  const nameNorm = normalize(name);
  let best: FoodCatalogMatch | null = null;

  for (const row of catalog) {
    if (row.isVeg !== isVeg) continue;

    let score = 0;
    if (nameNorm === row.nameNorm) score = 1000;
    else if (hay.includes(row.nameNorm) && row.nameNorm.length >= 4) score = 800 + row.nameNorm.length;
    else if (row.nameNorm.includes(nameNorm) && nameNorm.length >= 4) score = 700 + nameNorm.length;

    for (const alias of row.aliasNorms) {
      if (alias.length < 4) continue;
      if (hay.includes(alias)) score = Math.max(score, 500 + alias.length);
      if (nameNorm.includes(alias)) score = Math.max(score, 450 + alias.length);
    }

    if (score <= 0) {
      const tokens = nameNorm.split(" ").filter((t) => t.length > 2);
      let tokenHits = 0;
      for (const t of tokens) {
        if (row.searchText.includes(t)) tokenHits += 1;
      }
      if (tokenHits >= 2) score = 200 + tokenHits * 20;
    }

    if (score <= 0) continue;
    if (!best || score > best.score) {
      best = { id: row.id, imageUrl: row.imageUrl, catalogName: row.name, score };
    }
  }

  return best;
}

export async function matchFoodCatalog(
  name: string,
  description: string | null | undefined,
  isVeg: boolean,
): Promise<FoodCatalogMatch | null> {
  const catalog = await loadFoodCatalogCache();
  return matchFoodCatalogFromCache(catalog, name, description, isVeg);
}
