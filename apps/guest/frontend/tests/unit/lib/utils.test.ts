import { describe, it, expect } from "vitest";
import { cn } from "../../../src/lib/utils";

describe("guest/frontend lib/utils cn", () => {
  describe("positive", () => {
    it("merges class names", () => {
      expect(cn("px-2", "py-1")).toContain("px-2");
      expect(cn("px-2", "py-1")).toContain("py-1");
    });

    it("resolves tailwind conflicts with later wins", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
    });
  });

  describe("negative", () => {
    it("ignores falsy values", () => {
      expect(cn("a", false && "b", null as unknown as string, undefined, "c")).toBe("a c");
    });
  });
});
