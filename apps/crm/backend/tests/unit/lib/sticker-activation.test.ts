import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  STICKER_VALID_DAYS_MAX,
  STICKER_VALID_DAYS_MIN,
  rebaseValidityOnActivation,
  stickerAutoActivateAllowed,
} from "../../../src/lib/sticker-activation.js";

describe("crm/backend sticker-activation", () => {
  const prevAuto = process.env.STICKER_AUTO_ACTIVATE;
  const prevNode = process.env.NODE_ENV;
  const prevVercel = process.env.VERCEL_ENV;

  afterEach(() => {
    if (prevAuto === undefined) delete process.env.STICKER_AUTO_ACTIVATE;
    else process.env.STICKER_AUTO_ACTIVATE = prevAuto;
    process.env.NODE_ENV = prevNode;
    if (prevVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = prevVercel;
  });

  describe("positive", () => {
    it("rebases validity to 10–15 day window from activation", () => {
      const from = new Date("2026-01-01T00:00:00Z");
      const to = new Date("2026-01-12T00:00:00Z");
      const activated = new Date("2026-01-05T00:00:00Z");
      const next = rebaseValidityOnActivation(from, to, activated);
      expect(next.validFrom).toEqual(activated);
      const days = Math.round((next.validTo.getTime() - next.validFrom.getTime()) / 86_400_000);
      expect(days).toBeGreaterThanOrEqual(STICKER_VALID_DAYS_MIN);
      expect(days).toBeLessThanOrEqual(STICKER_VALID_DAYS_MAX);
    });

    it("allows auto-activate when flag true", () => {
      process.env.STICKER_AUTO_ACTIVATE = "true";
      process.env.NODE_ENV = "production";
      expect(stickerAutoActivateAllowed()).toBe(true);
    });
  });

  describe("negative", () => {
    beforeEach(() => {
      delete process.env.STICKER_AUTO_ACTIVATE;
    });

    it("blocks auto-activate in production when flag unset", () => {
      process.env.NODE_ENV = "production";
      delete process.env.VERCEL_ENV;
      expect(stickerAutoActivateAllowed()).toBe(false);
    });

    it("blocks when flag explicitly false", () => {
      process.env.STICKER_AUTO_ACTIVATE = "false";
      process.env.NODE_ENV = "development";
      expect(stickerAutoActivateAllowed()).toBe(false);
    });
  });
});
