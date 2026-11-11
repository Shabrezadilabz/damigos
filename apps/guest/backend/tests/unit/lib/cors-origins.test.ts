import { describe, it, expect } from "vitest";
import { resolveCorsOrigin } from "../../../src/lib/cors-origins.js";

describe("guest/backend cors-origins", () => {
  describe("positive", () => {
    it("parses single origin and multi-origin lists", () => {
      expect(resolveCorsOrigin("http://localhost:3000", "x")).toBe("http://localhost:3000");
      expect(resolveCorsOrigin("http://a.com, http://b.com", "x")).toEqual([
        "http://a.com",
        "http://b.com",
      ]);
    });

    it("treats * as reflect-all", () => {
      expect(resolveCorsOrigin("*", "x")).toBe(true);
    });
  });

  describe("negative", () => {
    it("falls back when env empty", () => {
      expect(resolveCorsOrigin(undefined, "http://fallback")).toBe("http://fallback");
      expect(resolveCorsOrigin("   ", "http://fallback")).toBe("http://fallback");
    });
  });
});
