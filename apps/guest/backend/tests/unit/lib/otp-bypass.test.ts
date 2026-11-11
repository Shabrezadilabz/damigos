import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isOtpBypassCode } from "../../../src/lib/otp-bypass.js";

describe("guest/backend otp-bypass", () => {
  const prev = process.env.OTP_BYPASS_CODE;

  beforeEach(() => {
    process.env.OTP_BYPASS_CODE = "000000";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.OTP_BYPASS_CODE;
    else process.env.OTP_BYPASS_CODE = prev;
  });

  describe("positive", () => {
    it("accepts full and shorthand bypass codes", () => {
      expect(isOtpBypassCode("000000")).toBe(true);
      expect(isOtpBypassCode("00000")).toBe(true);
    });
  });

  describe("negative", () => {
    it("rejects empty and wrong codes", () => {
      expect(isOtpBypassCode("")).toBe(false);
      expect(isOtpBypassCode("123456")).toBe(false);
      expect(isOtpBypassCode("abcdef")).toBe(false);
    });
  });
});
