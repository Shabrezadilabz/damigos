import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

export async function ensureBrandSchema() {
  const statements = [
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS brand_kit text`,
    sql`ALTER TABLE menu_import_jobs ADD COLUMN IF NOT EXISTS source_image_data_url text`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-brand-schema]", err);
    }
  }
}
