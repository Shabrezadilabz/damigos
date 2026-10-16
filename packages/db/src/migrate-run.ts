import { loadMonorepoEnv } from "@damigos/domain";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

loadMonorepoEnv(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(__dirname, "../drizzle");
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://damigos:damigos@localhost:5432/damigos";

const files = readdirSync(drizzleDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = postgres(connectionString, { max: 1 });

try {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS _damigos_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  for (const file of files) {
    const [applied] = await client<{ name: string }[]>`
      SELECT name FROM _damigos_migrations WHERE name = ${file}
    `;
    if (applied) {
      console.log(`Skip (already applied): ${file}`);
      continue;
    }

    const sql = readFileSync(join(drizzleDir, file), "utf8");
    await client.unsafe(sql);
    await client`INSERT INTO _damigos_migrations (name) VALUES (${file})`;
    console.log(`Applied migration: ${file}`);
  }
} finally {
  await client.end();
}
