import { describe, it, expect } from "vitest";
import { haversineKm, riderModeForDistanceKm } from "../../../src/lib/haversine.js";

describe("crm/backend haversine", () => {
  describe("positive", () => {
    it("computes non-zero distance for distinct points", () => {
      const km = haversineKm(12.97, 77.59, 12.98, 77.6);
      expect(km).toBeGreaterThan(0);
      expect(km).toBeLessThan(5);
    });
  });

  describe("negative", () => {
    it("does not treat far kitchens as SINGLE rider", () => {
      expect(riderModeForDistanceKm(2.5)).toBe("SPLIT");
    });
  });
});
