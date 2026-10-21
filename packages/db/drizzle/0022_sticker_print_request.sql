ALTER TABLE "sticker_batches"
  ADD COLUMN IF NOT EXISTS "print_requested_at" timestamp with time zone;

ALTER TABLE "sticker_batches"
  ADD COLUMN IF NOT EXISTS "design_id" integer;

ALTER TABLE "sticker_batches"
  ADD COLUMN IF NOT EXISTS "design_name" varchar(120);
