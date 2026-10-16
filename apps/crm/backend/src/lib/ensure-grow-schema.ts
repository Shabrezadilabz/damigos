import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

export async function ensureGrowSchema() {
  try {
    await db.execute(sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS grow_loyalty_config text`);
  } catch (err) {
    console.warn("[ensure-grow-schema]", err);
  }
}
