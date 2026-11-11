import { describe, it, expect } from "vitest";
import { findStaleCartLines, staleCartMessage } from "../../../src/lib/cart-price-lock.js";

describe("guest/backend cart-price-lock", () => {
  describe("positive", () => {
    it("returns empty when prices match and dish is live", () => {
      expect(
        findStaleCartLines([
          {
            name: "Idli",
            unitPricePaise: 4900,
            livePricePaise: 4900,
            available: true,
            draft: false,
          },
        ]),
      ).toEqual([]);
    });
  });

  describe("negative", () => {
    it("flags PRICE_CHANGED when snapshot drifts", () => {
      const stale = findStaleCartLines([
        {
          name: "Dosa",
          unitPricePaise: 4900,
          livePricePaise: 9900,
          available: true,
          draft: false,
        },
      ]);
      expect(stale).toHaveLength(1);
      expect(stale[0]?.reason).toBe("PRICE_CHANGED");
      expect(staleCartMessage(stale)).toMatch(/Dosa/);
    });

    it("flags UNAVAILABLE for draft or unavailable dishes", () => {
      const stale = findStaleCartLines([
        {
          name: "Hidden",
          unitPricePaise: 9900,
          livePricePaise: 9900,
          available: false,
          draft: false,
        },
        {
          name: "Draft",
          unitPricePaise: 9900,
          livePricePaise: 9900,
          available: true,
          draft: true,
        },
      ]);
      expect(stale.every((s) => s.reason === "UNAVAILABLE")).toBe(true);
    });
  });
});
