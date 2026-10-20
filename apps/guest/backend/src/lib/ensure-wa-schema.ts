import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Add WA phone storage for Kapso dual agents (DEC-005 / DEC-010) */
export async function ensureWaSchema() {
  const statements = [
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_e164 varchar(20)`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS wa_opt_in_source varchar(32)`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS wa_opt_in_at timestamptz`,
    sql`ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS order_nudge_sent_at timestamptz`,
    sql`CREATE TABLE IF NOT EXISTS spark_play_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_e164 varchar(20),
      restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      scan_event_id uuid REFERENCES scan_events(id) ON DELETE SET NULL,
      play_path varchar(512) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL
    )`,
    sql`CREATE INDEX IF NOT EXISTS spark_play_sessions_phone_idx ON spark_play_sessions (phone_e164)`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-wa-schema]", err);
    }
  }
}
