import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://damigos:damigos@localhost:5432/damigos";

/** Neon + Vercel serverless: use pooler URL and prepare: false (see docs/NEON-VERCEL.md). */
const isServerless = Boolean(process.env.VERCEL);
const client = postgres(connectionString, {
  max: isServerless ? 1 : 10,
  prepare: false,
  idle_timeout: isServerless ? 10 : 20,
  connect_timeout: 20,
});

export const db = drizzle(client, { schema });

export type Db = typeof db;
