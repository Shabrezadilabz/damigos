/**
 * Applies local SQL patches when npm run db:migrate is behind the Drizzle schema.
 * Usage: node scripts/patch-menu-schema.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.DATABASE_URL ?? "postgresql://damigos:damigos@localhost:5432/damigos";

const sqlFile = join(root, "scripts", "patch-menu-reference-price.sql");
const ddl = readFileSync(sqlFile, "utf8");

const db = postgres(url, { max: 1 });
try {
  await db.unsafe(ddl);
  console.log("[patch-menu-schema] OK — reference_price_paise on menu_items");
} catch (err) {
  console.error("[patch-menu-schema] failed:", err);
  process.exitCode = 1;
} finally {
  await db.end();
}
