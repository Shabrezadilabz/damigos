import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isOtpBypassCode } from "../../../src/lib/otp-bypass.js";

describe("crm/backend otp-bypass", () => {
  const prev = process.env.OTP_BYPASS_CODE;

  beforeEach(() => {
    process.env.OTP_BYPASS_CODE = "000000";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.OTP_BYPASS_CODE;
    else process.env.OTP_BYPASS_CODE = prev;
  });

  describe("positive", () => {
    it("accepts bypass OTP", () => {
      expect(isOtpBypassCode("000000")).toBe(true);
    });
  });

  describe("negative", () => {
    it("rejects wrong OTP", () => {
      expect(isOtpBypassCode("999999")).toBe(false);
      expect(isOtpBypassCode("")).toBe(false);
    });
  });
});
