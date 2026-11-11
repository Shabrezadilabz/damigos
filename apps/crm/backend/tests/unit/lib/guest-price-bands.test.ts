import { describe, it, expect } from "vitest";
import {
  GUEST_PRICE_BAND_MESSAGE,
  GUEST_PRICE_BANDS_PAISE,
  isAllowedGuestPricePaise,
} from "../../../src/lib/guest-price-bands.js";

describe("crm/backend guest-price-bands", () => {
  describe("positive", () => {
    it("allows ₹49 and ₹99 only", () => {
      expect(isAllowedGuestPricePaise(4900)).toBe(true);
      expect(isAllowedGuestPricePaise(9900)).toBe(true);
      expect(GUEST_PRICE_BANDS_PAISE).toEqual([4900, 9900]);
    });
  });

  describe("negative", () => {
    it("rejects off-band prices including legacy aggregator amounts", () => {
      expect(isAllowedGuestPricePaise(0)).toBe(false);
      expect(isAllowedGuestPricePaise(10000)).toBe(false);
      expect(isAllowedGuestPricePaise(12500)).toBe(false);
      expect(isAllowedGuestPricePaise(14900)).toBe(false);
      expect(GUEST_PRICE_BAND_MESSAGE).toMatch(/₹49 or ₹99/);
    });
  });
});
