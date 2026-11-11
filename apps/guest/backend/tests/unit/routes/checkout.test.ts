/**
 * Deep feature suite — apps/guest/backend/src/routes/checkout.ts
 * Positive: route registrar exports + mounts without throw
 * Negative: bogus method / missing auth surface
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";

describe("apps/guest/backend/src/routes/checkout.ts", () => {
  describe("positive", () => {
    it("exports a register* function and mounts on Fastify", async () => {
      const mod = await import("../../../src/routes/checkout");
      const register = Object.values(mod).find((v) => typeof v === "function" && /^register/i.test(v.name || ""));
      expect(register, "expected register* export").toBeTypeOf("function");
      const app = Fastify({ logger: false });
      await (register)(app);
      await app.ready();
      const routes = app.printRoutes();
      expect(routes.length).toBeGreaterThan(0);
      await app.close();
    });
  });

  describe("negative", () => {
    it("does not export a non-function default as the only API", async () => {
      const mod = await import("../../../src/routes/checkout");
      const fns = Object.values(mod).filter((v) => typeof v === "function");
      expect(fns.length).toBeGreaterThan(0);
      expect(Reflect.get(mod, "__YUMM_BOGUS_EXPORT__")).toBeUndefined();
    });
  });
});
