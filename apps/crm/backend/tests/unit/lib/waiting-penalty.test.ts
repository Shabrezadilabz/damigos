import { describe, it, expect } from "vitest";
import { computeWaitingPenaltyPaise } from "../../../src/lib/waiting-penalty.js";

describe("crm/backend waiting-penalty", () => {
  describe("positive", () => {
    it("charges ₹2/min after grace, capped at ₹60", () => {
      const riderArrivedAt = new Date("2026-01-01T12:00:00Z");
      const now = new Date("2026-01-01T12:40:00Z"); // 40 min waited
      const { penaltyPaise, overtimeMin, graceMin } = computeWaitingPenaltyPaise({
        riderArrivedAt,
        readyForPickupAt: null,
        committedPrepMinutes: 15,
        extendedPrepMinutes: 0,
        now,
      });
      expect(graceMin).toBe(18); // 15 + 3
      expect(overtimeMin).toBe(22);
      expect(penaltyPaise).toBe(Math.min(22 * 200, 6000));
    });
  });

  describe("negative", () => {
    it("is zero if rider never arrived or already ready", () => {
      expect(
        computeWaitingPenaltyPaise({
          riderArrivedAt: null,
          readyForPickupAt: null,
          committedPrepMinutes: 15,
          extendedPrepMinutes: 0,
        }).penaltyPaise,
      ).toBe(0);
      expect(
        computeWaitingPenaltyPaise({
          riderArrivedAt: new Date(),
          readyForPickupAt: new Date(),
          committedPrepMinutes: 15,
          extendedPrepMinutes: 0,
        }).penaltyPaise,
      ).toBe(0);
    });
  });
});
