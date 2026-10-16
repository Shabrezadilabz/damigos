import type { FastifyInstance } from "fastify";
import { pingRedis } from "@damigos/kitchen-bus";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const hasDb = Boolean(process.env.DATABASE_URL?.trim());
    const redisOk = process.env.REDIS_URL ? await pingRedis() : false;
    return {
      ok: hasDb,
      service: "crm-api",
      phase: "P2",
      dependencies: {
        database: hasDb ? "configured" : "missing_DATABASE_URL",
        redis: redisOk ? "up" : "down",
      },
    };
  });
}
