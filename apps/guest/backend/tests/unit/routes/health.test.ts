import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildGuestApp } from "../../../src/build-app.js";

describe("guest/backend routes/health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildGuestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe("positive", () => {
    it("GET /health returns guest-api payload", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { service: string; ok: boolean };
      expect(body.service).toBe("guest-api");
      expect(typeof body.ok).toBe("boolean");
    });
  });

  describe("negative", () => {
    it("unknown path is not healthy 200 with guest-api service", async () => {
      const res = await app.inject({ method: "GET", url: "/healthz-missing" });
      expect(res.statusCode).toBe(404);
    });
  });
});
