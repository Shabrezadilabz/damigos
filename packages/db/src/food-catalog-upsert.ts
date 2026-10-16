import { foodCatalog } from "./schema/index.js";
import { db } from "./client.js";
import { FOOD_CATALOG_IMAGES, type FoodImageKey } from "./data/food-catalog-images.ts";
import { searchTextForEntry, slugForCatalogEntry } from "./data/food-catalog-entries.ts";

export type FoodCatalogUpsertRow = {
  name: string;
  cuisine: string;
  category: string;
  isVeg: boolean;
  imageUrl: string;
  aliases?: string[];
};

export function resolveCatalogImageUrl(input: { imageUrl?: string; imageKey?: string }): string {
  if (input.imageUrl?.trim()) return input.imageUrl.trim();
  const key = input.imageKey?.trim() as FoodImageKey | undefined;
  if (key && key in FOOD_CATALOG_IMAGES) return FOOD_CATALOG_IMAGES[key];
  throw new Error(`Catalog row needs imageUrl or valid imageKey (got ${input.imageKey ?? "none"})`);
}

function clamp(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function upsertFoodCatalogRows(rows: FoodCatalogUpsertRow[]) {
  let upserted = 0;
  for (const row of rows) {
    const name = clamp(row.name, 250);
    const cuisine = clamp(row.cuisine, 64);
    const category = clamp(row.category, 64);
    const aliases = row.aliases ?? [];
    const slug = slugForCatalogEntry(name, row.isVeg);
    const aliasesJson = JSON.stringify(aliases);
    const searchText = searchTextForEntry(name, aliases, cuisine, category);

    await db
      .insert(foodCatalog)
      .values({
        slug,
        name,
        cuisine,
        category,
        isVeg: row.isVeg,
        imageUrl: row.imageUrl,
        aliases: aliasesJson,
        searchText,
      })
      .onConflictDoUpdate({
        target: foodCatalog.slug,
        set: {
          name,
          cuisine,
          category,
          isVeg: row.isVeg,
          imageUrl: row.imageUrl,
          aliases: aliasesJson,
          searchText,
        },
      });
    upserted += 1;
  }
  return upserted;
}
