import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, foodCatalog } from "./index.ts";
import { FOOD_CATALOG_IMAGES } from "./data/food-catalog-images.ts";
import { resolveCatalogImageUrl, upsertFoodCatalogRows } from "./food-catalog-upsert.ts";

const rowSchema = z.object({
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

const fileSchema = z.object({
  items: z.array(rowSchema).min(1),
});

async function main() {
  const pathArg = process.argv[2];
  if (!pathArg) {
    console.error("Usage: npm run import:food-catalog -- <path-to.json>");
    process.exit(1);
  }

  const path = resolve(pathArg);
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const parsed = fileSchema.parse(raw);

  const rows = parsed.items.map((item) => ({
    name: item.name.trim(),
    cuisine: item.cuisine.trim().toLowerCase(),
    category: item.category.trim().toLowerCase(),
    isVeg: item.isVeg,
    imageUrl: resolveCatalogImageUrl({ imageUrl: item.imageUrl, imageKey: item.imageKey }),
    aliases: item.aliases?.map((a) => a.trim()).filter(Boolean),
  }));

  console.log(`Importing ${rows.length} catalog rows from ${path}…`);
  const upserted = await upsertFoodCatalogRows(rows);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(foodCatalog);
  console.log(`Done: ${upserted} upserted. food_catalog total = ${total}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
