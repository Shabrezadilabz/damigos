import type { FastifyInstance } from "fastify";
import { pingRedis } from "@damigos/kitchen-bus";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const redisOk = await pingRedis();
    return {
      ok: true,
      service: "crm-api",
      phase: "P2",
      dependencies: {
        redis: redisOk ? "up" : "down",
      },
    };
  });
}
