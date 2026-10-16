export { db, type Db } from "./client.js";
export * from "./schema/index.js";
export * from "./food-catalog-match.js";
export {
  slugForCatalogEntry,
  searchTextForEntry,
  buildFoodCatalogEntries,
} from "./data/food-catalog-entries.js";
export { upsertFoodCatalogRows, resolveCatalogImageUrl } from "./food-catalog-upsert.js";
export type { FoodCatalogUpsertRow } from "./food-catalog-upsert.js";
