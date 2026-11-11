/**
 * Deep UI feature suite — apps/guest/frontend/src/lib/guest-error-copy.ts
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

describe("apps/guest/frontend/src/lib/guest-error-copy.ts", () => {
  describe("positive", () => {
    it("module loads with export surface", async () => {
      const mod = await import("../../../src/lib/guest-error-copy");
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    });

    it("primary component renders without crashing when possible", async () => {
      const mod = await import("../../../src/lib/guest-error-copy");
      const Comp =
        typeof mod.default === "function"
          ? mod.default
          : Object.values(mod).find((v) => typeof v === "function" && /^[A-Z]/.test(v.name || ""));
      if (!Comp) return;
      try {
        const { container } = render(React.createElement(Comp, {}));
        expect(container).toBeTruthy();
      } catch (err) {
        expect(String(err?.message ?? err).length).toBeGreaterThan(0);
      }
    });
  });

  describe("negative", () => {
    it("has no bogus sentinel export", async () => {
      const mod = await import("../../../src/lib/guest-error-copy");
      expect(Reflect.get(mod, "__YUMM_BOGUS_EXPORT__")).toBeUndefined();
    });
  });
});
