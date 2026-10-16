ALTER TABLE "sticker_batches"
  ADD COLUMN IF NOT EXISTS "activated_at" timestamp with time zone;

UPDATE "sticker_batches"
  SET "activated_at" = COALESCE("activated_at", "created_at")
  WHERE "activated_at" IS NULL;
