import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Guest ratings / feedback — mapped to restaurant when known (hub + WA later). */
export async function ensureFeedbackSchema() {
  const statements = [
    sql`CREATE TABLE IF NOT EXISTS guest_feedback (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
      restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
      order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
      rating integer CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
      message text NOT NULL,
      reply_email varchar(255),
      guest_name varchar(120),
      source varchar(64) NOT NULL DEFAULT 'guest_me_feedback',
      channel varchar(32) NOT NULL DEFAULT 'app',
      emailed boolean NOT NULL DEFAULT false,
      wa_notified boolean NOT NULL DEFAULT false,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    sql`CREATE INDEX IF NOT EXISTS guest_feedback_restaurant_idx ON guest_feedback (restaurant_id, created_at DESC)`,
    sql`CREATE INDEX IF NOT EXISTS guest_feedback_customer_idx ON guest_feedback (customer_id, created_at DESC)`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email varchar(255)`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender varchar(32)`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS dietary_pref varchar(64)`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_of_birth date`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS previous_phone_e164 varchar(20)`,
    sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS previous_phone_last4 varchar(4)`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-feedback-schema]", err);
    }
  }
}
