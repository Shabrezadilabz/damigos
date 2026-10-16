import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/**
 * Local DBs often lag @damigos/db Drizzle schema. Run every time (IF NOT EXISTS is cheap).
 * Do not use a single "ensured" flag — one successful ALTER must not skip later columns.
 */
export async function ensureMenuSchema() {
  const statements = [
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS reference_price_paise integer`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_confidence integer`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_job_id uuid`,
    sql`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS draft boolean`,
  ];

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-menu-schema]", err);
    }
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS menu_import_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id uuid NOT NULL,
        status text NOT NULL DEFAULT 'queued',
        progress_pct integer NOT NULL DEFAULT 0,
        source_filename text NOT NULL,
        error_message text,
        items_created integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz
      )
    `);
  } catch (err) {
    console.warn("[ensure-menu-schema] menu_import_jobs:", err);
  }
}
