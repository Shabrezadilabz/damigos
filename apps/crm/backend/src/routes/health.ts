import type { FastifyInstance } from "fastify";
import { pingRedis } from "@damigos/kitchen-bus";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const hasDb = Boolean(process.env.DATABASE_URL?.trim());
    const redisOk = process.env.REDIS_URL ? await pingRedis() : false;
    const kapsoMode = (process.env.KAPSO_MODE ?? "mock").trim().toLowerCase();
    const foodConfigured = Boolean(
      process.env.KAPSO_FOOD_PHONE_NUMBER_ID?.trim() || process.env.KAPSO_PHONE_NUMBER_ID?.trim(),
    );
    const sparkConfigured = Boolean(
      process.env.KAPSO_SPARK_PHONE_NUMBER_ID?.trim() || process.env.KAPSO_PHONE_NUMBER_ID?.trim(),
    );
    const kapsoLive = kapsoMode === "live" && Boolean(process.env.KAPSO_API_KEY?.trim());
    return {
      ok: hasDb,
      service: "crm-api",
      phase: "P2",
      dependencies: {
        database: hasDb ? "configured" : "missing_DATABASE_URL",
        redis: redisOk ? "up" : "down",
        kapso: kapsoLive ? "live" : kapsoMode,
        foodPhone: foodConfigured ? "configured" : "missing",
        sparkPhone: sparkConfigured ? "configured" : "missing",
      },
    };
  });
}
