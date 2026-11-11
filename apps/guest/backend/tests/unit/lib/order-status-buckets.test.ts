import { describe, it, expect } from "vitest";
import { ACTIVE_ORDER_STATUSES, PAST_ORDER_STATUSES } from "../../../src/lib/order-status-buckets.js";

describe("guest/backend order-status-buckets", () => {
  describe("positive", () => {
    it("lists in-flight paid kitchen states", () => {
      expect(ACTIVE_ORDER_STATUSES).toContain("PAID");
      expect(ACTIVE_ORDER_STATUSES).toContain("DISPATCHED");
      expect(ACTIVE_ORDER_STATUSES).not.toContain("CREATED");
    });

    it("lists terminal past states", () => {
      expect(PAST_ORDER_STATUSES).toEqual(
        expect.arrayContaining(["DELIVERED", "CLOSED", "CANCELLED", "PAYMENT_FAILED", "REFUNDED"]),
      );
    });
  });

  describe("negative", () => {
    it("active and past sets do not overlap", () => {
      const overlap = ACTIVE_ORDER_STATUSES.filter((s) =>
        (PAST_ORDER_STATUSES as string[]).includes(s),
      );
      expect(overlap).toEqual([]);
    });
  });
});
