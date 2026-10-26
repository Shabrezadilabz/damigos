import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Columns used by testing auto-approve (safe on older local DBs). */
export async function ensureOnboardingSchema() {
  const statements = [
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug text`,
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS hub_listed boolean NOT NULL DEFAULT false`,
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz`,
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS fssai_number text`,
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS fssai_verified_at timestamptz`,
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS diet_type varchar(16)`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-onboarding-schema]", err);
    }
  }
}
