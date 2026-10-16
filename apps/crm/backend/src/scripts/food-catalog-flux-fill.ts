/**
 * Generate Hive Flux photos for menu items with no food_catalog match.
 *
 * Usage (from damigos_main, with .env HIVE_API_KEY):
 *   npm run food-catalog:flux -- --limit 25
 *   npm run food-catalog:flux -- --restaurant-id <uuid> --dry-run
 */
import { loadMonorepoEnv } from "@damigos/domain";
import {
  db,
  foodCatalog,
  invalidateFoodCatalogCache,
  loadFoodCatalogCache,
  matchFoodCatalogFromCache,
  menuItems,
  searchTextForEntry,
  slugForCatalogEntry,
} from "@damigos/db";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { hiveConfigured, hiveGenerateImage } from "../lib/ai/hive-client.js";

loadMonorepoEnv(import.meta.url);

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = Number(process.env.FOOD_CATALOG_FLUX_LIMIT ?? 20);
  let dryRun = false;
  let restaurantId: string | undefined;
  let minScore = Number(process.env.FOOD_CATALOG_FLUX_MIN_SCORE ?? 300);

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--limit" && args[i + 1]) limit = Number(args[++i]);
    else if (a === "--restaurant-id" && args[i + 1]) restaurantId = args[++i];
    else if (a === "--min-score" && args[i + 1]) minScore = Number(args[++i]);
  }
  return { limit, dryRun, restaurantId, minScore };
}

function photoPrompt(name: string, isVeg: boolean, description: string | null) {
  const diet = isVeg ? "vegetarian Indian restaurant dish" : "non-vegetarian Indian restaurant dish";
  const hint = description?.trim() ? `, ${description.trim().slice(0, 100)}` : "";
  return (
    `Professional food photography for a WhatsApp menu, ${diet}, "${name}"${hint}, ` +
    "appetizing, soft natural lighting, shallow depth of field, no text, no logo, no watermark, square crop"
  );
}

async function main() {
  const { limit, dryRun, restaurantId, minScore } = parseArgs();

  if (!hiveConfigured()) {
    console.error("Set HIVE_API_KEY in damigos_main/.env (POSTER_IMAGE_PROVIDER=hive).");
    process.exit(1);
  }

  const scope = restaurantId
    ? and(eq(menuItems.restaurantId, restaurantId))
    : sql`true`;

  const candidates = await db
    .select()
    .from(menuItems)
    .where(
      and(
        scope,
        or(isNull(menuItems.foodCatalogId), isNull(menuItems.imageUrl)),
      ),
    )
    .limit(Math.max(limit * 3, 50));

  const catalog = await loadFoodCatalogCache(true);
  const todo: (typeof candidates)[number][] = [];

  for (const row of candidates) {
    const match = matchFoodCatalogFromCache(catalog, row.name, row.description, row.isVeg);
    if (match && match.score >= minScore && row.foodCatalogId) continue;
    if (match && match.score >= minScore && row.imageUrl) continue;
    todo.push(row);
    if (todo.length >= limit) break;
  }

  console.log(
    `Flux fill: ${todo.length} menu item(s) to process (limit=${limit}, minScore=${minScore}, dryRun=${dryRun}).`,
  );

  let generated = 0;
  for (const item of todo) {
    const prompt = photoPrompt(item.name, item.isVeg, item.description);
    console.log(`→ ${item.name} (${item.isVeg ? "veg" : "non-veg"})`);

    if (dryRun) {
      console.log(`  prompt: ${prompt.slice(0, 120)}…`);
      continue;
    }

    const url = await hiveGenerateImage({ prompt, width: 1024, height: 1024 });
    if (!url) {
      console.warn("  skipped — Hive returned no URL");
      continue;
    }

    const slug = `flux-${slugForCatalogEntry(item.name, item.isVeg).slice(0, 100)}`;
    const aliasesJson = JSON.stringify([item.name.toLowerCase()]);
    const searchText = searchTextForEntry(item.name, [], "generated", "flux");

    const [catalogRow] = await db
      .insert(foodCatalog)
      .values({
        slug,
        name: item.name,
        cuisine: "generated",
        category: "flux",
        isVeg: item.isVeg,
        imageUrl: url,
        aliases: aliasesJson,
        searchText,
      })
      .onConflictDoUpdate({
        target: foodCatalog.slug,
        set: {
          imageUrl: url,
          searchText,
        },
      })
      .returning({ id: foodCatalog.id });

    await db
      .update(menuItems)
      .set({
        imageUrl: url,
        foodCatalogId: catalogRow!.id,
      })
      .where(eq(menuItems.id, item.id));

    generated += 1;
    invalidateFoodCatalogCache();
    console.log(`  saved catalog + menu item (${url.slice(0, 60)}…)`);

    await new Promise((r) => setTimeout(r, Number(process.env.FOOD_CATALOG_FLUX_DELAY_MS ?? 1200)));
  }

  console.log(`Done. Generated ${generated} image(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
