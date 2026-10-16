import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Guest storefront toggle (ordering_enabled on restaurants). */
export async function ensureOperationsSchema() {
  try {
    await db.execute(
      sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS ordering_enabled boolean NOT NULL DEFAULT true`,
    );
  } catch (err) {
    console.warn("[ensure-operations-schema]", err);
  }
}
