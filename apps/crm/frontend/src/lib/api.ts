import {
  normalizeGrowLoyaltyConfig,
  type GrowLoyaltyConfig,
} from "@/components/grow/grow-loyalty-constants";
import { crmAuthHeaders } from "./session";

/** Browser: same-origin proxy (/api/crm). Override with NEXT_PUBLIC_CRM_API_URL if needed. */
function crmApiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_CRM_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "/api/crm";
}

const base = crmApiBase();

function crmApiUnreachableMessage() {
  if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_CRM_API_URL?.trim()) {
    return (
      "CRM API is not responding. On Vercel: open project damigos-crm-api → set DATABASE_URL + JWT_SECRET → redeploy → run db:migrate and db:seed. " +
      `Proxy: ${base} → CRM_API_PROXY_TARGET.`
    );
  }
  return (
    `Could not reach CRM API (proxy ${base} → port 4001). From damigos_main run: ` +
    `npm run dev:crm-api — or npm run dev:api for both APIs. ` +
    `Ensure Docker/Postgres is up (npm run dev:infra) and .env exists.`
  );
}

/** Vercel returns plain text "A server error…" when the API function crashes — avoid JSON.parse errors. */
async function readCrmApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (/server error|invocation failed|502|504|503/i.test(text)) {
      throw new Error(crmApiUnreachableMessage());
    }
    throw new Error(`CRM API returned non-JSON (${res.status}): ${text.slice(0, 120)}`);
  }
}

function crmApiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const err = data.error;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

function crmApiErrorCode(data: Record<string, unknown>): string | undefined {
  const err = data.error;
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export async function verifyCrmOtp(phone: string, code: string) {
  const res = await fetch(`${base}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "OTP failed"));
  return data as { token: string; roles: string[]; restaurantId: string | null };
}

export type RestaurantOperations = {
  restaurantId: string;
  name: string;
  city: string | null;
  orderingEnabled: boolean;
  liveMenuCount: number;
  guestVisible: boolean;
};

export async function fetchRestaurantOperations(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/settings/operations?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load operations"));
  return data as RestaurantOperations;
}

export async function patchRestaurantOperations(restaurantId: string, orderingEnabled: boolean) {
  const res = await fetch(`${base}/v1/settings/operations`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, orderingEnabled }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to update operations"));
  return data as RestaurantOperations;
}

export type RestaurantLocation = {
  restaurantId: string;
  name?: string;
  lat: number | null;
  lng: number | null;
  geoUpdatedAt: string | null;
  pinRequired?: boolean;
};

export async function fetchRestaurantLocation(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/settings/location?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load location"));
  return data as RestaurantLocation;
}

export async function patchRestaurantLocation(restaurantId: string, lat: number, lng: number) {
  const res = await fetch(`${base}/v1/settings/location`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, lat, lng }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to save location"));
  return data as RestaurantLocation;
}

export async function fetchCrmMe() {
  const res = await fetch(`${base}/v1/me`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Session expired"));
  return data as { userId: string; roles: string[]; restaurantId: string | null };
}

export type CrmConnectivityPing = {
  ok: boolean;
  latencyMs: number;
  kapso: string;
  foodPhone: string;
  sparkPhone: string;
  database: string;
  redis: string;
};

/** Home “Test ping” — CRM API health + session round-trip. */
export async function pingCrmConnectivity(): Promise<CrmConnectivityPing> {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const healthRes = await fetch(`${base}/health`, { cache: "no-store" });
  const health = await readCrmApiJson(healthRes);
  if (!healthRes.ok) {
    throw new Error(crmApiErrorMessage(health, "CRM health check failed"));
  }
  await fetchCrmMe();
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const deps =
    health.dependencies && typeof health.dependencies === "object"
      ? (health.dependencies as Record<string, unknown>)
      : {};
  const str = (k: string, fallback = "unknown") =>
    typeof deps[k] === "string" ? (deps[k] as string) : fallback;
  return {
    ok: health.ok === true,
    latencyMs: Math.max(1, Math.round(t1 - t0)),
    kapso: str("kapso", "unknown"),
    foodPhone: str("foodPhone", "unknown"),
    sparkPhone: str("sparkPhone", "unknown"),
    database: str("database", "unknown"),
    redis: str("redis", "unknown"),
  };
}

export type FssaiVerifyResponse = {
  verified: boolean;
  fssaiNumber: string;
  licenseStatus: string;
  licenseCategory: string | null;
  legalName: string | null;
  state: string | null;
  expiryDate: string | null;
  provider: string;
};

export async function verifyFssaiLicense(fssai: string) {
  const res = await fetch(`${base}/v1/onboarding/fssai/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fssai }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "FSSAI verification failed"));
  return data as FssaiVerifyResponse;
}

export type OnboardingApplicationResponse = {
  applicationId: string;
  status: "ACTIVE" | "PENDING";
  message: string;
  restaurantId?: string;
  restaurantSlug?: string;
  phone?: string;
  fssaiVerification?: FssaiVerifyResponse | null;
};

export async function submitOnboardingApplication(payload: {
  legalName: string;
  operatorName: string;
  phone: string;
  email: string;
  city: string;
  cuisineTags: string[];
  fssai?: string;
  dpdpAccepted: true;
  whatsappGatewayAccepted: true;
}) {
  const res = await fetch(`${base}/v1/onboarding/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Could not submit application"));
  return data as OnboardingApplicationResponse;
}

export async function fetchOnboardingStatus() {
  const res = await fetch(`${base}/v1/onboarding/status`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Onboarding status unavailable"));
  return data as {
    restaurantId: string;
    onboardingComplete: boolean;
    fssaiNumber: string | null;
    fssaiVerifiedAt: string | null;
    tenantStatus: string;
  };
}

export type StickerBatchSummary = {
  id: string;
  batchCode: string;
  quantity: number;
  validFrom: string;
  validTo: string;
  activatedAt: string | null;
  revokedAt?: string | null;
  printRequestedAt?: string | null;
  designId?: number | null;
  designName?: string | null;
};

export type StickerBatchStatusFilter = "all" | "active" | "minted" | "expired";

async function stickerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: { ...crmAuthHeaders(), ...init?.headers },
    });
  } catch {
    throw new Error(crmApiUnreachableMessage());
  }
  const data = await readCrmApiJson(res).catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500 && !crmApiErrorMessage(data, "")) {
      throw new Error(crmApiUnreachableMessage());
    }
    throw new Error(crmApiErrorMessage(data, "Sticker request failed"));
  }
  return data as T;
}

export async function fetchActiveStickerBatches(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const data = await stickerFetch<{ batches: StickerBatchSummary[] }>(`/v1/stickers/active?${q}`);
  return data.batches;
}

export async function fetchStickerBatches(restaurantId: string, status: StickerBatchStatusFilter = "all") {
  const q = new URLSearchParams({ restaurantId, status });
  const data = await stickerFetch<{ batches: StickerBatchSummary[] }>(`/v1/stickers/batches?${q}`);
  return data.batches;
}

export async function activateStickerBatch(batchCode: string, restaurantId: string) {
  return stickerFetch<{ activated?: boolean; alreadyActive?: boolean }>(`/v1/stickers/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchCode, restaurantId }),
  });
}

export async function mintStickerBatch(input: {
  restaurantId: string;
  quantity: number;
  validDays?: number;
  notes?: string;
  opsKey: string;
}) {
  return stickerFetch<{
    batchId: string;
    batchCode: string;
    quantity: number;
    validFrom: string;
    validTo: string;
  }>(`/v1/admin/sticker-batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Owner-side generate (same account) — returns up to 3 testable samples; no full download. */
export async function generateStickerBatch(input: {
  restaurantId: string;
  quantity: number;
  validDays?: number;
  designId?: number;
  designName?: string;
  notes?: string;
}) {
  return stickerFetch<{
    batchId: string;
    batchCode: string;
    quantity: number;
    validFrom: string;
    validTo: string;
    activated: boolean;
    designId: number | null;
    designName: string | null;
    restaurantName: string;
    samples: { label: string; scanPath: string; scanUrl: string }[];
    sampleOnly: boolean;
  }>(`/v1/stickers/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export type StickerPrintQuoteDto = {
  quantity: number;
  unitPaise: number;
  stickersPaise: number;
  deliveryPaise: number;
  taxablePaise: number;
  gstPaise: number;
  gstRate: number;
  totalPaise: number;
};

export async function requestStickerPrint(input: {
  restaurantId: string;
  batchId: string;
  quantity: number;
  designId: number;
  designName: string;
  sampleCount?: number;
  notes?: string;
  /** Must match server quote for the quantity */
  totalPaise: number;
  paymentConfirmed: boolean;
  paymentMethod?: "wallet" | "external";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}) {
  return stickerFetch<{
    ok: boolean;
    emailed: boolean;
    to: string;
    sampleAttached: number;
    printRequestedAt?: string;
    quote?: StickerPrintQuoteDto;
    paymentStatus?: string;
    paymentMethod?: string;
    walletTxnId?: string | null;
  }>(`/v1/stickers/print-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export type StickerPrintSheet = {
  restaurantName: string;
  batchCode: string;
  validTo: string;
  sampleOnly?: boolean;
  quantity?: number;
  stickers: { label: string; scanPath: string; scanUrl: string }[];
};

export async function fetchStickerPrintSheet(batchId: string, restaurantId: string, limit = 3) {
  const q = new URLSearchParams({ restaurantId, limit: String(limit) });
  return stickerFetch<StickerPrintSheet>(`/v1/stickers/batches/${batchId}/print-sheet?${q}`);
}

export type MenuItemRow = {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  pricePaise: number;
  referencePricePaise: number | null;
  isVeg: boolean;
  available: boolean;
  draft: boolean;
  importConfidence: number | null;
  importJobId: string | null;
  imageUrl?: string | null;
  /** Kitchen Accept SLA — READY_10M | COOKED_15M */
  prepCategory?: "READY_10M" | "COOKED_15M";
  prepMinutes?: number | null;
};

export const MENU_IMPORT_LOW_CONFIDENCE = 70;

export async function fetchMenuItems(restaurantId: string, draft?: boolean) {
  const q = new URLSearchParams({ restaurantId });
  if (draft !== undefined) q.set("draft", String(draft));
  let res: Response;
  try {
    res = await fetch(`${base}/v1/menu/items?${q}`, {
      cache: "no-store",
      headers: crmAuthHeaders(),
    });
  } catch {
    throw new Error(`Failed to fetch menu from ${base}`);
  }
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, `Failed to load menu (${res.status})`));
  return data.items as MenuItemRow[];
}

export async function createMenuItem(input: {
  restaurantId: string;
  name: string;
  pricePaise: number;
  isVeg: boolean;
  description?: string;
}) {
  const res = await fetch(`${base}/v1/menu/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Create failed"));
  return data.item as MenuItemRow;
}

export async function deleteMenuItem(restaurantId: string, itemId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/menu/items/${itemId}?${q}`, {
    method: "DELETE",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Delete failed"));
  return data as { deleted: boolean; id: string };
}

export async function purgeTestMenuItems(restaurantId: string) {
  const res = await fetch(`${base}/v1/menu/items/purge-test-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Purge failed"));
  return data as { deletedCount: number };
}

export async function revertMenuDrafts(restaurantId: string) {
  const res = await fetch(`${base}/v1/menu/drafts/revert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Revert failed"));
  return data as { deletedCount: number; restaurantId: string };
}

export async function publishMenu(restaurantId: string, itemIds?: string[]) {
  const res = await fetch(`${base}/v1/menu/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, itemIds }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Publish failed"));
  return data;
}

export type MenuImportJobRow = {
  id: string;
  restaurantId: string;
  status: string;
  progressPct: number;
  sourceFilename: string;
  errorMessage: string | null;
  itemsCreated: number;
  createdAt: string;
  completedAt: string | null;
};

export async function startMenuPdfImport(
  restaurantId: string,
  fileName: string,
  opts?: {
    imageBase64?: string;
    mimeType?: "image/jpeg" | "image/png" | "image/webp";
  },
) {
  let res: Response;
  try {
    res = await fetch(`${base}/v1/menu/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
      body: JSON.stringify({ restaurantId, fileName, ...opts }),
    });
  } catch {
    throw new Error(
      `${crmApiUnreachableMessage()} If the API is running, the menu photo may exceed the upload limit — retry after restarting CRM API.`,
    );
  }
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Import start failed"));
  return data.job as MenuImportJobRow;
}

export async function fetchMenuImportJob(jobId: string) {
  let res: Response;
  try {
    res = await fetch(`${base}/v1/menu/import/${jobId}`, {
      cache: "no-store",
      headers: crmAuthHeaders(),
    });
  } catch {
    throw new Error(crmApiUnreachableMessage());
  }
  if (res.status === 404) {
    throw new Error("Import job not found — it may have been cleared. Refresh the page.");
  }
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Import status failed"));
  return {
    job: data.job as MenuImportJobRow,
    reviewItems: (data.reviewItems ?? []) as MenuItemRow[],
  };
}

export async function updateMenuItem(
  itemId: string,
  input: {
    restaurantId: string;
    name?: string;
    pricePaise?: number;
    isVeg?: boolean;
    description?: string | null;
    importConfidence?: number | null;
    available?: boolean;
    referencePricePaise?: number | null;
    prepCategory?: "READY_10M" | "COOKED_15M";
    prepMinutes?: 10 | 15 | null;
    imageUrl?: string | null;
  },
) {
  const res = await fetch(`${base}/v1/menu/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Update failed"));
  return data.item as MenuItemRow;
}

export function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export type CrmOrderLine = {
  id: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
};

export type CrmOrder = {
  id: string;
  restaurantId: string;
  status: string;
  subtotalPaise: number;
  convenienceFeePaise: number;
  totalPaise: number;
  discountPaise: number;
  createdAt: string;
  customerPhoneLast4: string | null;
  items: CrmOrderLine[];
  committedPrepMinutes?: number | null;
  extendedPrepMinutes?: number | null;
  prepDeadlineAt?: string | null;
  /** Pre-Accept SLA from menu lines (10 | 15) */
  suggestedPrepMinutes?: 10 | 15 | null;
  waitingPenaltyPaise?: number | null;
  riderArrivedAt?: string | null;
  readyForPickupAt?: string | null;
  shipment?: {
    awb: string | null;
    status: string;
    carrier: string;
    trackingUrl?: string | null;
    lastTrackingStatus?: string | null;
    lastTrackingAt?: string | null;
    foodDelivery?: boolean | null;
    shiprocketShipmentId?: string | null;
  } | null;
  shortOrderId?: string | null;
  pickupCode?: string | null;
  pickupVerifiedAt?: string | null;
  deliveryOtpSentAt?: string | null;
  deliveryOtpVerifiedAt?: string | null;
  deliveryVerifySource?: string | null;
};

export type DashboardOverview = {
  restaurantId: string;
  kpis: {
    ordersToday: number;
    scans7d: number;
    walletBalancePaise: number;
    campaignSendsRemaining: number;
  };
  settlement7d?: {
    paidOrders: number;
    grossSalesPaise: number;
    waitingPenaltyPaise: number;
    ledgerPenaltyDebitsPaise: number;
    netEstimatePaise: number;
  };
  alerts: Array<{ code: string; severity: "info" | "warning"; message: string }>;
};

export type DashboardAnalytics = {
  restaurantId: string;
  range: string;
  since: string;
  funnel: Array<{ step: string; label: string; count: number }>;
  ordersByHour: Array<{ hour: number; count: number }>;
};

export async function fetchDashboardOverview(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/dashboard/overview?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load dashboard"));
  return data as DashboardOverview;
}

export async function fetchDashboardAnalytics(restaurantId: string, range: "7d" | "30d" = "30d") {
  const q = new URLSearchParams({ restaurantId, range });
  const res = await fetch(`${base}/v1/dashboard/analytics?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load analytics"));
  return data as DashboardAnalytics;
}

export async function downloadDashboardAnalyticsCsv(restaurantId: string, range: "7d" | "30d" = "30d") {
  const q = new URLSearchParams({ restaurantId, range, format: "csv" });
  const res = await fetch(`${base}/v1/dashboard/analytics?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  if (!res.ok) {
    const data = await readCrmApiJson(res).catch(() => ({}));
    throw new Error(crmApiErrorMessage(data, "CSV export failed"));
  }
  return res.text();
}

export async function fetchCrmOrders(restaurantId: string, activeKitchen?: boolean, limit?: number) {
  const q = new URLSearchParams({ restaurantId });
  if (activeKitchen) q.set("activeKitchen", "true");
  if (limit != null) q.set("limit", String(limit));
  const res = await fetch(`${base}/v1/orders?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load orders"));
  return data.orders as CrmOrder[];
}

export async function acceptCrmOrder(orderId: string, prepMinutes?: 10 | 15) {
  const res = await fetch(`${base}/v1/orders/${orderId}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify(prepMinutes ? { prepMinutes } : {}),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Accept failed"));
  return data.order as CrmOrder;
}

export async function extendCrmOrderPrep(orderId: string) {
  const res = await fetch(`${base}/v1/orders/${orderId}/extend-prep`, {
    method: "POST",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Extend failed"));
  return data.order as CrmOrder;
}

export async function markCrmRiderArrived(orderId: string) {
  const res = await fetch(`${base}/v1/orders/${orderId}/rider-arrived`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({}),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Rider arrived failed"));
  return data.order as CrmOrder;
}

/** Mirrors BE waiting-penalty.ts — ₹2/min after grace, cap ₹60 */
export function computeWaitingPenaltyPaiseClient(input: {
  riderArrivedAt: string | null | undefined;
  readyForPickupAt: string | null | undefined;
  committedPrepMinutes: number | null | undefined;
  extendedPrepMinutes: number | null | undefined;
  nowMs?: number;
}): { penaltyPaise: number; overtimeMin: number; graceMin: number } {
  if (!input.riderArrivedAt || input.readyForPickupAt) {
    return { penaltyPaise: 0, overtimeMin: 0, graceMin: 0 };
  }
  const committed = input.committedPrepMinutes ?? 15;
  const graceMin = committed + (input.extendedPrepMinutes || 0) + 3;
  const now = input.nowMs ?? Date.now();
  const waitedMin = Math.floor((now - new Date(input.riderArrivedAt).getTime()) / 60_000);
  const overtimeMin = Math.max(0, waitedMin - graceMin);
  const penaltyPaise = Math.min(overtimeMin * 200, 6000);
  return { penaltyPaise, overtimeMin, graceMin };
}

export async function patchCrmOrderStatus(
  orderId: string,
  status: string,
  opts?: { pickupToken?: string; deliveryOtp?: string },
) {
  const res = await fetch(`${base}/v1/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({
      status,
      ...(opts?.pickupToken ? { pickupToken: opts.pickupToken } : {}),
      ...(opts?.deliveryOtp ? { deliveryOtp: opts.deliveryOtp } : {}),
    }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Status update failed"));
  return data.order as CrmOrder;
}

export async function resendCrmDeliveryOtp(orderId: string) {
  const res = await fetch(`${base}/v1/orders/${orderId}/resend-delivery-otp`, {
    method: "POST",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Resend OTP failed"));
  return data as { ok: boolean; mockOtp?: string | null };
}

export type GrowOffersGame = {
  dailySpinLimit: number;
  scratchEnabled: boolean;
  segments: {
    offerId: string;
    title: string;
    weight: number;
    prizeType: string;
    prizeValue: number;
  }[];
  weightSum: number;
  weightsValid: boolean;
};

export type GrowOffersGamePayload = GrowOffersGame & {
  config: GrowLoyaltyConfig;
};

export async function fetchGrowOffersGame(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/grow/offers-game?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load offers"));
  return normalizeGrowOffersPayload(data);
}

/** Coerce API or stale client state into a safe Grow offers payload (always includes config). */
export function normalizeGrowOffersPayload(raw: unknown): GrowOffersGamePayload {
  const data =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const segments = Array.isArray(data.segments) ? data.segments : [];
  const weightSum =
    typeof data.weightSum === "number"
      ? data.weightSum
      : segments.reduce((s: number, x) => {
          const row = x as { weight?: number };
          return s + (typeof row.weight === "number" ? row.weight : 0);
        }, 0);
  return {
    dailySpinLimit: typeof data.dailySpinLimit === "number" ? data.dailySpinLimit : 1,
    scratchEnabled: data.scratchEnabled !== false,
    segments: segments as GrowOffersGamePayload["segments"],
    weightSum,
    weightsValid: data.weightsValid !== false && weightSum > 0,
    config: normalizeGrowLoyaltyConfig(data.config),
  };
}

export async function saveGrowOffersGame(restaurantId: string, config: GrowLoyaltyConfig) {
  const res = await fetch(`${base}/v1/grow/offers-game`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, config }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to save loyalty configuration"));
  return normalizeGrowOffersPayload(data);
}

export type CrmCustomerRow = {
  id: string;
  phoneMasked: string;
  name: string | null;
  lastOrderAt: string;
  orderCount: number;
  marketingOptIn: boolean | null;
  creditsPaise: number;
};

export async function fetchCrmCustomers(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/customers?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load customers"));
  return data.customers as CrmCustomerRow[];
}

export type CrmCustomerDetail = {
  customer: CrmCustomerRow & { gameOptIn: boolean | null; activeRewardClaims: number };
  recentOrders: {
    id: string;
    status: string;
    totalPaise: number;
    createdAt: string;
  }[];
};

export async function fetchCrmCustomerDetail(restaurantId: string, customerId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/customers/${customerId}?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load customer"));
  return data as CrmCustomerDetail;
}

export type CrmWalletTxnMeta = {
  paymentMethod?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  utr?: string | null;
  transactionId?: string | null;
  orderId?: string | null;
  batchId?: string | null;
  batchCode?: string | null;
  quantity?: number | null;
  designName?: string | null;
  stickersPaise?: number | null;
  deliveryPaise?: number | null;
  gstPaise?: number | null;
  totalPaise?: number | null;
  note?: string | null;
};

export type CrmWalletLedgerRow = {
  id: string;
  kind: string;
  amountPaise: number;
  reference: string | null;
  meta?: CrmWalletTxnMeta | null;
  createdAt: string;
};

export type CrmWallet = {
  balancePaise: number;
  approxBroadcastCredits?: number;
  msgCostPaise?: number;
  minBalancePaise?: number;
  spendablePaise?: number;
  lowBalance: boolean;
  ledger: CrmWalletLedgerRow[];
  topupMode?: "stub" | "live";
  packsPaise?: number[];
};

export type GrowPosterJob = {
  id: string;
  restaurantId: string;
  headline: string;
  offerLine: string;
  status: "draft" | "approved";
  previewLines: string[];
  theme?: {
    primaryColor: string;
    backgroundColor: string;
    accentColor: string;
    layoutHint?: string;
    foodHeroLine?: string;
    imageMood?: string;
    typographyId?: string;
  };
  previewImageDataUrl?: string;
  previewImageUrl?: string;
  previewSource?: "deepseek" | "hive" | "local";
  previewNote?: string;
  marketingMessage?: string;
  campaignTemplateKey?: string;
  createdAt: string;
  approvedAt: string | null;
};

export async function generateGrowPoster(input: {
  restaurantId: string;
  headline: string;
  offerLine: string;
}) {
  const res = await fetch(`${base}/v1/grow/poster/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Poster generate failed"));
  return data.poster as GrowPosterJob;
}

export async function fetchGrowPoster(restaurantId: string, posterId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/grow/poster/${posterId}?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Poster load failed"));
  return data.poster as GrowPosterJob;
}

export async function approveGrowPoster(restaurantId: string, posterId: string) {
  const res = await fetch(`${base}/v1/grow/poster/${posterId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Poster approve failed"));
  return data.poster as GrowPosterJob;
}

export async function fetchCrmWallet(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/wallet?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load wallet"));
  return data as CrmWallet;
}

export async function topUpCrmWallet(
  restaurantId: string,
  idempotencyKey: string,
  amountPaise = 99900,
) {
  const res = await fetch(`${base}/v1/wallet/topup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      ...crmAuthHeaders(),
    },
    body: JSON.stringify({ restaurantId, amountPaise }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Top-up failed"));
  return data.wallet as CrmWallet;
}

export async function prepareCrmWalletTopUp(restaurantId: string, amountPaise: number) {
  const res = await fetch(`${base}/v1/wallet/topup/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, amountPaise }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Prepare top-up failed"));
  return data as {
    mode: "live";
    amountPaise: number;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
  };
}

export async function verifyCrmWalletTopUp(input: {
  restaurantId: string;
  amountPaise: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const res = await fetch(`${base}/v1/wallet/topup/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Verify top-up failed"));
  return data.wallet as CrmWallet;
}

export type CampaignProgramRow = {
  id: string;
  title: string;
  description: string;
  templateKey: string | null;
  icon: string;
  enabled: boolean;
  offerSummary: string;
};

export async function fetchCampaignPrograms(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/grow/campaign-programs?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load campaign programs"));
  return data as { programs: CampaignProgramRow[]; enabledCount: number };
}

export async function setCampaignProgramEnabled(
  restaurantId: string,
  programId: string,
  enabled: boolean,
) {
  const res = await fetch(`${base}/v1/grow/campaign-programs/${programId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, enabled }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to update program"));
  return data as { programId: string; enabled: boolean; programs: CampaignProgramRow[] };
}

export type CampaignStatus = "Draft" | "Scheduled" | "Sending" | "Sent" | "Failed";

export type CrmCampaign = {
  id: string;
  restaurantId: string;
  name: string;
  status: CampaignStatus;
  audience: "all" | "marketing_opt_in";
  templateKey: string | null;
  scheduledAt: string | null;
  estimatedRecipients: number;
  skippedSevenDayCap: number;
  createdAt: string;
};

export async function fetchCrmCampaigns(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/campaigns?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load campaigns"));
  return data.campaigns as CrmCampaign[];
}

export type CampaignTemplate = { key: string; label: string };

export async function fetchCampaignTemplates() {
  const res = await fetch(`${base}/v1/campaigns/templates`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load templates"));
  return data.templates as CampaignTemplate[];
}

export type AudiencePreview = {
  audience: string;
  eligibleCount: number;
  skippedSevenDayCap: number;
  skippedOptIn?: number;
  willSend: number;
  sevenDayCapEnabled: boolean;
  costPerMessagePaise?: number;
  estimatedCostPaise?: number;
  balancePaise?: number;
  balanceAfterPaise?: number;
  canAfford?: boolean;
};

export async function fetchCampaignAudiencePreview(
  restaurantId: string,
  audience: "all" | "marketing_opt_in",
) {
  const q = new URLSearchParams({ restaurantId, audience });
  const res = await fetch(`${base}/v1/campaigns/audience-preview?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Preview failed"));
  return data as AudiencePreview;
}

export async function createCrmCampaign(input: {
  restaurantId: string;
  name: string;
  audience: "all" | "marketing_opt_in";
  templateKey?: string;
  scheduledAt?: string;
}) {
  const res = await fetch(`${base}/v1/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Create campaign failed"));
  return data.campaign as CrmCampaign;
}

export async function dispatchCrmCampaign(campaignId: string, restaurantId: string) {
  const res = await fetch(`${base}/v1/campaigns/${campaignId}/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Dispatch failed"));
  return data as { sent: number; campaign: CrmCampaign };
}

export async function scheduleCrmCampaign(
  campaignId: string,
  restaurantId: string,
  scheduledAt: string,
) {
  const res = await fetch(`${base}/v1/campaigns/${campaignId}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, scheduledAt }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) {
    const msg = crmApiErrorMessage(data, "Schedule failed");
    const err = new Error(msg) as Error & { code?: string };
    err.code = crmApiErrorCode(data);
    throw err;
  }
  return data.campaign as CrmCampaign;
}

export type DayEarnings = {
  businessDate: string;
  orderCount: number;
  paymentsCount: number;
  grossSalesPaise: number;
  restaurantSharePaise: number;
  platformFeePaise: number;
  deliveryFeePaise: number;
  waitingPenaltyPaise: number;
};

export type PayoutSettlementRow = {
  id: string;
  businessDate: string;
  orderCount: number;
  paymentsCount: number;
  grossSalesPaise: number;
  restaurantSharePaise: number;
  platformFeePaise: number;
  deliveryFeePaise: number;
  waitingPenaltyPaise: number;
  status: string;
  invoiceNumber: string | null;
  invoice: unknown;
  settledAt: string | null;
  freezeNote: string | null;
};

export type PayoutSettings = {
  restaurantId: string;
  razorpay: {
    linkedAccountId: string | null;
    kycStatus: string;
    kycLabel: string;
    mode: string;
  };
  bank?: {
    accountName: string | null;
    accountNumberMasked: string | null;
    accountNumberLast4: string | null;
    ifsc: string | null;
    bankName: string | null;
    updatedAt: string | null;
    hasBank: boolean;
  };
  payout?: {
    frozen: boolean;
    frozenUntil: string | null;
    freezeReason: string | null;
    eodNote: string;
  };
  today?: DayEarnings;
  pos: {
    petpoojaOutletId: string | null;
    restroworksLocationId: string | null;
    syncMode: string;
  };
};

export async function fetchPayoutSettings(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/settings/payout?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load payout settings"));
  return data as PayoutSettings;
}

export async function patchPayoutPos(
  restaurantId: string,
  input: {
    petpoojaOutletId?: string | null;
    restroworksLocationId?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    bankIfsc?: string | null;
    bankName?: string | null;
  },
) {
  const res = await fetch(`${base}/v1/settings/payout`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, ...input }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Save failed"));
  return data as PayoutSettings;
}

export async function fetchPayoutSettlements(restaurantId: string, limit = 14) {
  const q = new URLSearchParams({ restaurantId, limit: String(limit) });
  const res = await fetch(`${base}/v1/settings/payout/settlements?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load settlements"));
  return data as { settlements: PayoutSettlementRow[] };
}

export type CrmTeamMember = {
  userId: string;
  phoneLast4: string | null;
  displayName: string | null;
  role: string;
};

export async function fetchCrmTeam(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/settings/team?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load team"));
  return data.members as CrmTeamMember[];
}

export async function inviteCrmTeamMember(input: {
  restaurantId: string;
  phone: string;
  role?: "KITCHEN" | "REDEEM";
  displayName?: string;
}) {
  const res = await fetch(`${base}/v1/settings/team/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Invite failed"));
  return data as {
    invited: boolean;
    alreadyMember: boolean;
    phoneLast4: string | null;
    displayName: string | null;
    role: string;
    loginHint: string;
  };
}

export type CrmBrandKitColors = {
  displayName: string;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
};

export async function fetchCrmBrandKit(restaurantId: string) {
  const q = new URLSearchParams({ restaurantId });
  const res = await fetch(`${base}/v1/settings/brand-kit?${q}`, {
    cache: "no-store",
    headers: crmAuthHeaders(),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Failed to load brand kit"));
  return data.brandKit as CrmBrandKitColors;
}

export async function patchCrmBrandKit(
  restaurantId: string,
  input: {
    primaryColor: string;
    backgroundColor?: string;
    accentColor?: string;
    displayName?: string;
  },
) {
  const res = await fetch(`${base}/v1/settings/brand-kit`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...crmAuthHeaders() },
    body: JSON.stringify({ restaurantId, ...input }),
  });
  const data = await readCrmApiJson(res);
  if (!res.ok) throw new Error(crmApiErrorMessage(data, "Save theme failed"));
  return data.brandKit as CrmBrandKitColors;
}
