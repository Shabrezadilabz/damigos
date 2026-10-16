import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Applies food_catalog + menu item image columns when DB lags migrations. */
export async function ensureFoodCatalogSchema() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS food_catalog (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(160) NOT NULL UNIQUE,
        name varchar(255) NOT NULL,
        cuisine varchar(64) NOT NULL,
        category varchar(64) NOT NULL,
        is_veg boolean NOT NULL,
        image_url text NOT NULL,
        aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
        search_text text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url text`);
    await db.execute(sql`
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS food_catalog_id uuid
        REFERENCES food_catalog(id)
    `);
  } catch (err) {
    console.warn("[ensure-food-catalog-schema]", err);
  }
}
