import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildGuestApp } from "../../../src/build-app.js";

describe("guest/backend routes/scan", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildGuestApp();
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe("negative", () => {
    it("resolve without token fails validation", async () => {
      const res = await app.inject({ method: "GET", url: "/v1/scan/resolve" });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.statusCode).toBeLessThan(500);
    });

    it("resolve with empty token fails", async () => {
      const res = await app.inject({ method: "GET", url: "/v1/scan/resolve?token=" });
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe("positive", () => {
    it("unknown token returns STICKER_NOT_FOUND (route wired)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/v1/scan/resolve?token=not-a-real-token-xyz",
      });
      expect(res.statusCode).toBe(404);
      const body = res.json() as { error?: { code?: string } };
      expect(body.error?.code).toBe("STICKER_NOT_FOUND");
    });
  });
});

