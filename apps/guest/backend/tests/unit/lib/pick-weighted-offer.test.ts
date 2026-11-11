import { describe, it, expect } from "vitest";
import { NO_PRIZE_TYPE } from "../../../src/lib/pick-weighted-offer.js";

describe("guest/backend pick-weighted-offer", () => {
  describe("positive", () => {
    it("exposes Better luck no_prize type", () => {
      expect(NO_PRIZE_TYPE).toBe("no_prize");
    });
  });

  describe("negative", () => {
    it("no_prize is not a redeemable prize type alias", () => {
      expect(NO_PRIZE_TYPE).not.toBe("percent");
      expect(NO_PRIZE_TYPE).not.toBe("flat_off_paise");
      expect(NO_PRIZE_TYPE).not.toBe("free_item");
    });
  });
});
