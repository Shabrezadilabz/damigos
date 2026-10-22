ALTER TABLE "wallet_transactions"
  ADD COLUMN IF NOT EXISTS "meta" text;
