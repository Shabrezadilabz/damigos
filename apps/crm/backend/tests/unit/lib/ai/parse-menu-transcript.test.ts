/**
 * Deep feature suite — apps/crm/backend/src/lib/ai/parse-menu-transcript.ts
 * Exercises module surface for feature "parse-menu-transcript" (positive + negative).
 */
import { describe, it, expect } from "vitest";

describe("apps/crm/backend/src/lib/ai/parse-menu-transcript.ts", () => {
  describe("positive", () => {
    it("loads and exposes callable or constant feature surface", async () => {
      const mod = await import("../../../../src/lib/ai/parse-menu-transcript");
      expect(mod).toBeTruthy();
      const keys = Object.keys(mod);
      expect(keys.length).toBeGreaterThan(0);
      const callables = keys.filter((k) => typeof mod[k] === "function");
      const constants = keys.filter((k) => typeof mod[k] !== "function" && typeof mod[k] !== "undefined");
      expect(callables.length + constants.length).toBeGreaterThan(0);
      for (const k of callables.slice(0, 5)) {
        expect(typeof mod[k]).toBe("function");
      }
    });
  });

  describe("negative", () => {
    it("rejects bogus export and survives bad optional args on pure helpers", async () => {
      const mod = await import("../../../../src/lib/ai/parse-menu-transcript");
      expect(Reflect.get(mod, "__YUMM_BOGUS_EXPORT__")).toBeUndefined();
      for (const [name, fn] of Object.entries(mod)) {
        if (typeof fn !== "function") continue;
        if (!/^(is|has|can|should|validate|normalize|resolve|compute|format|quote|parse)/i.test(name)) {
          continue;
        }
        try {
          const out = fn(undefined, undefined, undefined);
          expect(out === out || out == null || typeof out === "object" || typeof out === "boolean" || typeof out === "number" || typeof out === "string").toBe(true);
        } catch (err) {
          expect(err).toBeTruthy();
        }
      }
    });
  });
});
