import { describe, it, expect } from "vitest";
import {
  CROSS_BY_SINGLE_RIDER_KM,
  haversineKm,
  riderModeForDistanceKm,
} from "../../../src/lib/haversine.js";

describe("guest/backend haversine", () => {
  describe("positive", () => {
    it("returns ~0 for same point", () => {
      expect(haversineKm(12.97, 77.59, 12.97, 77.59)).toBeCloseTo(0, 5);
    });

    it("uses SINGLE rider within 1km Cross-By rule", () => {
      expect(CROSS_BY_SINGLE_RIDER_KM).toBe(1);
      expect(riderModeForDistanceKm(0.5)).toBe("SINGLE");
      expect(riderModeForDistanceKm(1.0)).toBe("SINGLE");
    });
  });

  describe("negative", () => {
    it("splits rider beyond 1km", () => {
      expect(riderModeForDistanceKm(1.01)).toBe("SPLIT");
      expect(riderModeForDistanceKm(5)).toBe("SPLIT");
    });
  });
});
