import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

export async function ensureGrowSchema() {
  try {
    await db.execute(sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS grow_loyalty_config text`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS guest_loyalty_credits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        balance_paise integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (customer_id, restaurant_id)
      )
    `);
  } catch (err) {
    console.warn("[ensure-grow-schema]", err);
  }
}
