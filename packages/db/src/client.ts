import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema/index.ts";

type Schema = typeof schema;
type Database = PostgresJsDatabase<Schema>;

let sqlClient: Sql | undefined;
let drizzleDb: Database | undefined;

function resolveConnectionString(): string {
  return (
    process.env.DATABASE_URL?.trim() ??
    "postgresql://damigos:damigos@localhost:5432/damigos"
  );
}

function postgresOptions(): postgres.Options<Record<string, never>> {
  const isServerless = Boolean(process.env.VERCEL);
  return {
    max: isServerless ? 1 : 10,
    prepare: false,
    idle_timeout: isServerless ? 10 : 20,
    connect_timeout: 20,
  };
}

/** Lazy init so Vercel `DATABASE_URL` is read at query time, not esbuild bundle load. */
export function getDb(): Database {
  if (!drizzleDb) {
    sqlClient = postgres(resolveConnectionString(), postgresOptions());
    drizzleDb = drizzle(sqlClient, { schema });
  }
  return drizzleDb;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
});

export type Db = Database;
