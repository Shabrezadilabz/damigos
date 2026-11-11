import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildCrmApp } from "../../../src/build-app.js";

/**
 * Contract: unauthenticated menu writes are rejected (negative).
 * Authenticated 49/99 enforcement is covered in guest-price-bands unit + e2e.
 */
describe("crm/backend routes/menu price-band gate", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildCrmApp({ serverless: true });
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  describe("negative", () => {
    it("POST /v1/menu/items without auth is blocked", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/menu/items",
        payload: {
          restaurantId: "00000000-0000-4000-8000-000000000001",
          name: "Test Dish",
          pricePaise: 12500,
        },
      });
      expect(res.statusCode).toBeGreaterThanOrEqual(401);
    });

    it("off-band price alone is not accepted anonymously", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/v1/menu/items",
        payload: {
          restaurantId: "00000000-0000-4000-8000-000000000001",
          name: "Illegal",
          pricePaise: 4900,
        },
      });
      expect([401, 403, 400, 422]).toContain(res.statusCode);
    });
  });

  describe("positive", () => {
    it("menu items route exists (not 404)", async () => {
      const res = await app.inject({ method: "GET", url: "/v1/menu/items" });
      expect(res.statusCode).not.toBe(404);
    });
  });
});
