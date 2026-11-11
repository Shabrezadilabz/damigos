import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

export async function ensureMenuSchema() {
  const statements = [
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS reference_price_paise integer`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_confidence integer`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_job_id uuid`,
    // S2.1 — guest-facing image; S2.2 — category grouping
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS guest_image_url text`,
    sql`CREATE TABLE IF NOT EXISTS menu_categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id uuid NOT NULL REFERENCES restaurants(id),
      name varchar(128) NOT NULL,
      sort_order integer NOT NULL DEFAULT 0
    )`,
    sql`ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category_id uuid`,
  ];

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-menu-schema]", err);
    }
  }
}
