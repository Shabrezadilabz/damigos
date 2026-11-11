import { describe, it, expect } from "vitest";
import {
  SESSION_TTL_MS,
  SESSION_TTL_ULTRA_SHORT_MS,
  sparkSessionTtlMs,
} from "../../../src/lib/spark-play-session.js";

describe("guest/backend spark-play-session", () => {
  describe("positive", () => {
    it("defaults to 6h marketing TTL", () => {
      expect(SESSION_TTL_MS).toBe(6 * 60 * 60 * 1000);
      expect(sparkSessionTtlMs()).toBe(SESSION_TTL_MS);
      expect(sparkSessionTtlMs("6h")).toBe(SESSION_TTL_MS);
    });

    it("supports 1h ultra-short TTL", () => {
      expect(SESSION_TTL_ULTRA_SHORT_MS).toBe(60 * 60 * 1000);
      expect(sparkSessionTtlMs("1h")).toBe(SESSION_TTL_ULTRA_SHORT_MS);
    });
  });

  describe("negative", () => {
    it("non-1h ttl values fall back to 6h (not 24h legacy)", () => {
      expect(sparkSessionTtlMs(null)).toBe(SESSION_TTL_MS);
      expect(sparkSessionTtlMs(undefined)).toBe(SESSION_TTL_MS);
      expect(sparkSessionTtlMs("bogus" as "6h")).toBe(SESSION_TTL_MS);
    });
  });
});
