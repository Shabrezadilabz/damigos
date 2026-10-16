import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://damigos:damigos@localhost:5432/damigos";

const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });

export type Db = typeof db;
