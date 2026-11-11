import { describe, it, expect } from "vitest";
import { normalizeBankInput, validateBankDetails } from "../../../src/lib/bank-validation.js";

const valid = {
  bankAccountName: "Raj Malhotra",
  bankAccountNumber: "123456789012",
  bankIfsc: "hdfc0001234",
  bankName: "HDFC Bank",
};

describe("crm/backend bank-validation", () => {
  describe("positive", () => {
    it("accepts normalized Indian bank details", () => {
      const res = validateBankDetails(valid);
      expect(res.ok).toBe(true);
      expect(res.normalized.bankIfsc).toBe("HDFC0001234");
      expect(Object.keys(res.errors)).toHaveLength(0);
    });

    it("strips spaces from account numbers", () => {
      expect(normalizeBankInput({ bankAccountNumber: "123 456 789" }).bankAccountNumber).toBe(
        "123456789",
      );
    });
  });

  describe("negative", () => {
    it("rejects missing name / bad IFSC / short account", () => {
      const res = validateBankDetails({
        bankAccountName: "A",
        bankAccountNumber: "123",
        bankIfsc: "BAD",
        bankName: "",
      });
      expect(res.ok).toBe(false);
      expect(res.errors.bankAccountName).toBeTruthy();
      expect(res.errors.bankAccountNumber).toBeTruthy();
      expect(res.errors.bankIfsc).toBeTruthy();
      expect(res.errors.bankName).toBeTruthy();
    });
  });
});
