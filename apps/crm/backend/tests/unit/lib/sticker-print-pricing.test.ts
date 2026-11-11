import { describe, it, expect } from "vitest";
import {
  STICKER_DELIVERY_PAISE,
  STICKER_GST_RATE,
  STICKER_UNIT_PAISE,
  formatInrPaise,
  quoteStickerPrint,
} from "../../../src/lib/sticker-print-pricing.js";

describe("crm/backend sticker-print-pricing", () => {
  describe("positive", () => {
    it("quotes qty × ₹1 + ₹49 delivery + 18% GST", () => {
      const q = quoteStickerPrint(100);
      expect(q.quantity).toBe(100);
      expect(q.stickersPaise).toBe(100 * STICKER_UNIT_PAISE);
      expect(q.deliveryPaise).toBe(STICKER_DELIVERY_PAISE);
      expect(q.gstRate).toBe(STICKER_GST_RATE);
      expect(q.totalPaise).toBe(q.taxablePaise + q.gstPaise);
      expect(formatInrPaise(10000)).toBe("₹100.00");
    });
  });

  describe("negative", () => {
    it("clamps invalid qty to [1, 2000]", () => {
      expect(quoteStickerPrint(0).quantity).toBe(1);
      expect(quoteStickerPrint(-10).quantity).toBe(1);
      expect(quoteStickerPrint(99999).quantity).toBe(2000);
      expect(quoteStickerPrint(Number.NaN).quantity).toBe(1);
    });
  });
});
