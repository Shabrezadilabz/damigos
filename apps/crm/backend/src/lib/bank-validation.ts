/** S1.2 — settlement bank validation (Indian bank account + IFSC) used by the activation gate. */

export type BankDetailsInput = {
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
};

export type BankFieldErrors = Partial<
  Record<"bankAccountName" | "bankAccountNumber" | "bankIfsc" | "bankName", string>
>;

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;

export function normalizeBankInput(input: BankDetailsInput) {
  return {
    bankAccountName: input.bankAccountName?.trim() ?? "",
    bankAccountNumber: (input.bankAccountNumber ?? "").replace(/\s/g, ""),
    bankIfsc: (input.bankIfsc ?? "").trim().toUpperCase(),
    bankName: input.bankName?.trim() ?? "",
  };
}

export function validateBankDetails(input: BankDetailsInput): {
  ok: boolean;
  errors: BankFieldErrors;
  normalized: ReturnType<typeof normalizeBankInput>;
} {
  const normalized = normalizeBankInput(input);
  const errors: BankFieldErrors = {};

  if (normalized.bankAccountName.length < 2) {
    errors.bankAccountName = "Account holder name is required";
  }
  if (!ACCOUNT_RE.test(normalized.bankAccountNumber)) {
    errors.bankAccountNumber = "Account number must be 9–18 digits";
  }
  if (!IFSC_RE.test(normalized.bankIfsc)) {
    errors.bankIfsc = "IFSC must look like HDFC0001234";
  }
  if (normalized.bankName.length < 2) {
    errors.bankName = "Bank name is required";
  }

  return { ok: Object.keys(errors).length === 0, errors, normalized };
}
