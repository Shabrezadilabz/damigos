import { describe, it, expect } from "vitest";
import { MAX_UNREDEEMED_WINS } from "../../../src/lib/rewards-limits.js";

describe("guest/backend rewards-limits", () => {
  describe("positive", () => {
    it("caps unredeemed wins at 5 (5-in-1 bible)", () => {
      expect(MAX_UNREDEEMED_WINS).toBe(5);
    });
  });

  describe("negative", () => {
    it("cap is a positive finite integer", () => {
      expect(Number.isFinite(MAX_UNREDEEMED_WINS)).toBe(true);
      expect(MAX_UNREDEEMED_WINS).toBeGreaterThan(0);
      expect(MAX_UNREDEEMED_WINS).not.toBe(Infinity);
    });
  });
});
