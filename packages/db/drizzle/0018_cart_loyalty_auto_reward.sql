-- Auto-reward opt-out + optional loyalty apply on cart; guest kitchen loyalty balances
ALTER TABLE carts ADD COLUMN IF NOT EXISTS auto_reward_declined boolean NOT NULL DEFAULT false;
ALTER TABLE carts ADD COLUMN IF NOT EXISTS loyalty_applied_paise integer NOT NULL DEFAULT 0;
ALTER TABLE payment_intents ADD COLUMN IF NOT EXISTS loyalty_applied_paise integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS guest_loyalty_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  balance_paise integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, restaurant_id)
);
