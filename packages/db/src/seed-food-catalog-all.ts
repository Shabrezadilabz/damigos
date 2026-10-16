import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db, foodCatalog } from "./index.ts";
import { buildFoodCatalogBulkEntries } from "./data/food-catalog-bulk-entries.ts";
import {
  buildFoodCatalogEntries,
  imageUrlForKey,
} from "./data/food-catalog-entries.ts";
import { FOOD_CATALOG_IMAGES } from "./data/food-catalog-images.ts";
import { resolveCatalogImageUrl, upsertFoodCatalogRows } from "./food-catalog-upsert.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "../data");

const bulkRowSchema = z.object({
  name: z.string().min(1),
  cuisine: z.string().min(1),
  category: z.string().min(1),
  isVeg: z.boolean(),
  imageUrl: z.string().url().optional(),
  imageKey: z
    .string()
    .optional()
    .refine((k) => !k || k in FOOD_CATALOG_IMAGES, { message: "Unknown imageKey" }),
  aliases: z.array(z.string()).optional(),
});

async function loadBulkJsonFiles() {
  const out: import("./food-catalog-upsert.js").FoodCatalogUpsertRow[] = [];
  const files = ["food-catalog.bulk.json", "food-catalog.custom.json"];
  for (const file of files) {
    const path = join(dataDir, file);
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    const parsed = z.object({ items: z.array(bulkRowSchema) }).parse(raw);
    for (const item of parsed.items) {
      out.push({
        name: item.name.trim(),
        cuisine: item.cuisine.trim().toLowerCase(),
        category: item.category.trim().toLowerCase(),
        isVeg: item.isVeg,
        imageUrl: resolveCatalogImageUrl({ imageUrl: item.imageUrl, imageKey: item.imageKey }),
        aliases: item.aliases?.map((a) => a.trim()).filter(Boolean),
      });
    }
    console.log(`Loaded ${parsed.items.length} rows from ${file}`);
  }
  return out;
}

async function main() {
  const toUpsert = (drafts: ReturnType<typeof buildFoodCatalogEntries>) =>
    drafts.map((row) => ({
      name: row.name,
      cuisine: row.cuisine,
      category: row.category,
      isVeg: row.isVeg,
      imageUrl: imageUrlForKey(row.imageKey),
      aliases: row.aliases,
    }));

  const builtIn = toUpsert(buildFoodCatalogEntries());
  const bulkTs = toUpsert(buildFoodCatalogBulkEntries());
  const bulkJson = await loadBulkJsonFiles();
  const merged = [...builtIn, ...bulkTs, ...bulkJson];
  console.log(`Upserting ${merged.length} food catalog rows (builtin + JSON)…`);

  const upserted = await upsertFoodCatalogRows(merged);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(foodCatalog);
  console.log(`Food catalog ready: ${total} rows (${upserted} upserted this run).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
