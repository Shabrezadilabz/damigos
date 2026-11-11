import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildCrmApp } from "../../../src/build-app.js";

describe("crm/backend routes/health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildCrmApp({ serverless: true });
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe("positive", () => {
    it("GET /health returns crm-api payload", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      const body = res.json() as { service: string; dependencies: Record<string, string> };
      expect(body.service).toBe("crm-api");
      expect(body.dependencies).toBeTruthy();
    });
  });

  describe("negative", () => {
    it("POST /health is not allowed", async () => {
      const res = await app.inject({ method: "POST", url: "/health" });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
