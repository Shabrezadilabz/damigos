ALTER TABLE "carts"
  ADD COLUMN IF NOT EXISTS "applied_claim_id" uuid REFERENCES "reward_claims"("id");

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "discount_paise" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "reward_claim_id" uuid REFERENCES "reward_claims"("id");

ALTER TABLE "reward_claims"
  ADD COLUMN IF NOT EXISTS "redeemed_order_id" uuid REFERENCES "orders"("id");

ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "min_order_paise" integer DEFAULT 0 NOT NULL;

UPDATE "offers"
SET "min_order_paise" = 29900
WHERE "prize_type" = 'flat_off_paise' AND "min_order_paise" = 0;
