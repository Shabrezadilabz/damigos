import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const hasDb = Boolean(process.env.DATABASE_URL?.trim());
    return {
      ok: hasDb,
      service: "guest-api",
      phase: "P0",
      dependencies: {
        database: hasDb ? "configured" : "missing_DATABASE_URL",
      },
    };
  });
}
