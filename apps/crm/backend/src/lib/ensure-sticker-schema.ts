import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Print-request tracking + design metadata on sticker batches. */
export async function ensureStickerSchema() {
  try {
    await db.execute(
      sql`ALTER TABLE sticker_batches ADD COLUMN IF NOT EXISTS print_requested_at timestamptz`,
    );
    await db.execute(sql`ALTER TABLE sticker_batches ADD COLUMN IF NOT EXISTS design_id integer`);
    await db.execute(
      sql`ALTER TABLE sticker_batches ADD COLUMN IF NOT EXISTS design_name varchar(120)`,
    );
  } catch (err) {
    console.warn("[ensure-sticker-schema]", err);
  }
}
