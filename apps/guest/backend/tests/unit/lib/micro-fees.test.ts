import { describe, it, expect } from "vitest";
import {
  MICRO_FEE_DELIVERY_RAIL_PAISE,
  MICRO_FEE_PER_ITEM_PAISE,
  MICRO_FEE_WHATSAPP_PAISE,
  legMicroFeesPaise,
  microFeeFixedPaise,
  microFeesPaise,
} from "../../../src/lib/micro-fees.js";

describe("guest/backend micro-fees", () => {
  describe("positive", () => {
    it("charges ₹2/item + ₹2 WA + ₹3 rail for delivery", () => {
      expect(microFeesPaise(3)).toBe(
        MICRO_FEE_PER_ITEM_PAISE * 3 + MICRO_FEE_WHATSAPP_PAISE + MICRO_FEE_DELIVERY_RAIL_PAISE,
      );
      expect(microFeesPaise(3)).toBe(600 + 200 + 300);
    });

    it("omits delivery rail for pickup", () => {
      expect(microFeesPaise(2, { includeDeliveryRail: false })).toBe(400 + 200);
      expect(microFeeFixedPaise(false)).toBe(MICRO_FEE_WHATSAPP_PAISE);
    });

    it("Cross-By puts fixed fees only on leg 1", () => {
      expect(legMicroFeesPaise(2, 1)).toBe(400 + 500);
      expect(legMicroFeesPaise(2, 2)).toBe(400);
    });
  });

  describe("negative", () => {
    it("floors negative / fractional qty to zero items", () => {
      expect(microFeesPaise(-5)).toBe(MICRO_FEE_WHATSAPP_PAISE + MICRO_FEE_DELIVERY_RAIL_PAISE);
      expect(microFeesPaise(1.9)).toBe(200 + 500);
    });
  });
});
