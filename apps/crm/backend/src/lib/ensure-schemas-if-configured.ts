import type { FastifyInstance } from "fastify";
import { ensureBrandSchema } from "./ensure-brand-schema.js";
import { ensureGrowSchema } from "./ensure-grow-schema.js";
import { ensureMenuSchema } from "./ensure-menu-schema.js";
import { ensureOperationsSchema } from "./ensure-operations-schema.js";

export async function ensureSchemasIfConfigured(app: FastifyInstance) {
  if (!process.env.DATABASE_URL?.trim()) {
    app.log.warn("DATABASE_URL missing — configure on Vercel (damigos-crm-api) then redeploy");
    return;
  }
  await ensureMenuSchema();
  await ensureGrowSchema();
  await ensureBrandSchema();
  await ensureOperationsSchema();
}
