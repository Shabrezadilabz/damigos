import { createHmac } from "node:crypto";

export type FssaiVerifyResult = {
  fssaiNumber: string;
  licenseStatus: "Active" | "Expired" | "Suspended" | "Cancelled" | "Unknown";
  licenseCategory: string | null;
  legalName: string | null;
  state: string | null;
  pincode: string | null;
  expiryDate: string | null;
  provider: "stub" | "attestr" | "eko";
  providerRef: string | null;
  raw?: unknown;
};

const FSSAI_DIGITS = /^\d{14}$/;

export function normalizeFssaiNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!FSSAI_DIGITS.test(digits)) return null;
  return digits;
}

/** C-01.01 — verify FSSAI against stub or licensed provider */
export async function verifyFssaiLicense(fssaiRaw: string): Promise<FssaiVerifyResult> {
  const fssai = normalizeFssaiNumber(fssaiRaw);
  if (!fssai) {
    throw new FssaiVerifyError("INVALID_FORMAT", "FSSAI number must be 14 digits");
  }

  const mode = (process.env.FSSAI_VERIFY_MODE ?? "stub").toLowerCase();
  if (mode === "attestr") return verifyViaAttestr(fssai);
  if (mode === "eko") return verifyViaEko(fssai);
  return verifyStub(fssai);
}

export class FssaiVerifyError extends Error {
  constructor(
    public code: "INVALID_FORMAT" | "NOT_FOUND" | "PROVIDER_ERROR" | "EXPIRED",
    message: string,
  ) {
    super(message);
    this.name = "FssaiVerifyError";
  }
}

function verifyStub(fssai: string): FssaiVerifyResult {
  const demo = process.env.FSSAI_STUB_ACTIVE_NUMBER ?? "11521998000045";
  if (fssai !== demo) {
    throw new FssaiVerifyError("NOT_FOUND", "License not found in registry (stub)");
  }
  return {
    fssaiNumber: fssai,
    licenseStatus: "Active",
    licenseCategory: "State License",
    legalName: "Demo Food Business Operator Pvt Ltd",
    state: "Karnataka",
    pincode: "560034",
    expiryDate: "2027-03-31",
    provider: "stub",
    providerRef: "stub-demo",
  };
}

async function verifyViaAttestr(fssai: string): Promise<FssaiVerifyResult> {
  const key = process.env.ATTESTR_API_KEY;
  if (!key) {
    throw new FssaiVerifyError("PROVIDER_ERROR", "ATTESTR_API_KEY not configured");
  }
  const res = await fetch("https://api.attestr.com/api/v1/public/checkx/fssai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    },
    body: JSON.stringify({ reg: fssai }),
  });
  if (!res.ok) {
    throw new FssaiVerifyError("PROVIDER_ERROR", `Attestr HTTP ${res.status}`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const status = String(raw.status ?? raw.licenseStatus ?? "Unknown") as FssaiVerifyResult["licenseStatus"];
  if (raw.valid === false || status === "Cancelled") {
    throw new FssaiVerifyError("NOT_FOUND", "License not found or invalid");
  }
  if (status === "Expired") {
    throw new FssaiVerifyError("EXPIRED", "FSSAI license expired");
  }
  return {
    fssaiNumber: fssai,
    licenseStatus: status === "Active" ? "Active" : "Unknown",
    licenseCategory: (raw.category as string) ?? null,
    legalName: (raw.companyName as string) ?? (raw.fboName as string) ?? null,
    state: (raw.state as string) ?? null,
    pincode: (raw.pincode as string) ?? null,
    expiryDate: (raw.expiryDate as string) ?? null,
    provider: "attestr",
    providerRef: (raw.requestId as string) ?? null,
    raw,
  };
}

async function verifyViaEko(fssai: string): Promise<FssaiVerifyResult> {
  const developerKey = process.env.EKO_DEVELOPER_KEY;
  const secret = process.env.EKO_SECRET;
  const initiatorId = process.env.EKO_INITIATOR_ID;
  if (!developerKey || !secret || !initiatorId) {
    throw new FssaiVerifyError("PROVIDER_ERROR", "EKO_DEVELOPER_KEY, EKO_SECRET, EKO_INITIATOR_ID required");
  }
  const clientRefId = `fssai${Date.now().toString().slice(-10)}`;
  const body = JSON.stringify({ initiator_id: initiatorId, client_ref_id: clientRefId, fssai });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const base = process.env.EKO_API_BASE ?? "https://staging.eko.in";
  const res = await fetch(`${base}/ekoapi/v3/tools/kyc/fetch-fssai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      developer_key: developerKey,
      signature,
    },
    body,
  });
  if (!res.ok) {
    throw new FssaiVerifyError("PROVIDER_ERROR", `Eko HTTP ${res.status}`);
  }
  const raw = (await res.json()) as { data?: Record<string, unknown>; response_type_id?: string };
  const data = raw.data ?? {};
  const licenseStatus = String(data.license_status ?? "Unknown");
  if (raw.response_type_id === "1388" || licenseStatus === "Expired") {
    throw new FssaiVerifyError(
      licenseStatus === "Expired" ? "EXPIRED" : "NOT_FOUND",
      licenseStatus === "Expired" ? "FSSAI license expired" : "Invalid or non-existent FSSAI license",
    );
  }
  return {
    fssaiNumber: fssai,
    licenseStatus: licenseStatus === "Active" ? "Active" : "Unknown",
    licenseCategory: (data.license_category as string) ?? null,
    legalName: (data.company_name as string) ?? (data.fbo_name as string) ?? null,
    state: (data.state as string) ?? null,
    pincode: (data.pincode as string) ?? null,
    expiryDate: (data.expiry_date as string) ?? null,
    provider: "eko",
    providerRef: clientRefId,
    raw,
  };
}
