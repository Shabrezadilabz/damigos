import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Cart auto-reward opt-out, loyalty apply, guest_loyalty_credits. */
export async function ensureCartLoyaltySchema() {
  const statements = [
    sql`ALTER TABLE carts ADD COLUMN IF NOT EXISTS auto_reward_declined boolean NOT NULL DEFAULT false`,
    sql`ALTER TABLE carts ADD COLUMN IF NOT EXISTS loyalty_applied_paise integer NOT NULL DEFAULT 0`,
    sql`ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS loyalty_applied_paise integer NOT NULL DEFAULT 0`,
    sql`CREATE TABLE IF NOT EXISTS guest_loyalty_credits (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      balance_paise integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (customer_id, restaurant_id)
    )`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-cart-loyalty-schema]", err);
    }
  }
}
