import { describe, it, expect } from "vitest";
import { computeOfferDiscountPaise } from "../../../src/lib/offer-discount.js";

describe("guest/backend offer-discount", () => {
  describe("positive", () => {
    it("applies flat off capped by subtotal", () => {
      expect(
        computeOfferDiscountPaise(
          { prizeType: "flat_off_paise", prizeValue: 5000, minOrderPaise: 0 },
          9900,
        ),
      ).toBe(5000);
    });

    it("applies percent with ₹75 max", () => {
      expect(
        computeOfferDiscountPaise(
          { prizeType: "percent", prizeValue: 50, minOrderPaise: 0 },
          50_000,
        ),
      ).toBe(7500);
    });

    it("free_item uses default ₹99 cap when prizeValue is 0", () => {
      expect(
        computeOfferDiscountPaise(
          { prizeType: "free_item", prizeValue: 0, minOrderPaise: 0 },
          20_000,
        ),
      ).toBe(9900);
    });
  });

  describe("negative", () => {
    it("returns 0 below min order or unknown prize", () => {
      expect(
        computeOfferDiscountPaise(
          { prizeType: "flat_off_paise", prizeValue: 5000, minOrderPaise: 10_000 },
          9900,
        ),
      ).toBe(0);
      expect(
        computeOfferDiscountPaise(
          { prizeType: "no_prize", prizeValue: 0, minOrderPaise: 0 },
          9900,
        ),
      ).toBe(0);
    });
  });
});
