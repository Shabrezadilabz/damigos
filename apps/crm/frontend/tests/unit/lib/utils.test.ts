import { describe, it, expect } from "vitest";
import { cn } from "../../../src/lib/utils";

describe("crm/frontend lib/utils cn", () => {
  describe("positive", () => {
    it("merges class names", () => {
      expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
    });
  });

  describe("negative", () => {
    it("drops empty tokens", () => {
      expect(cn("", "ok")).toBe("ok");
    });
  });
});
