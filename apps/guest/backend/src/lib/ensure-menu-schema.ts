import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

export async function ensureMenuSchema() {
  const statements = [
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS reference_price_paise integer`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_confidence integer`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_job_id uuid`,
  ];

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-menu-schema]", err);
    }
  }
}
