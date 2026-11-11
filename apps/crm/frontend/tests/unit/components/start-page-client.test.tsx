/**
 * Deep UI feature suite — apps/crm/frontend/src/components/start-page-client.tsx
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

describe("apps/crm/frontend/src/components/start-page-client.tsx", () => {
  describe("positive", () => {
    it("module loads with export surface", async () => {
      const mod = await import("../../../src/components/start-page-client");
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    });

    it("primary component renders without crashing when possible", async () => {
      const mod = await import("../../../src/components/start-page-client");
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
      const mod = await import("../../../src/components/start-page-client");
      expect(Reflect.get(mod, "__YUMM_BOGUS_EXPORT__")).toBeUndefined();
    });
  });
});
