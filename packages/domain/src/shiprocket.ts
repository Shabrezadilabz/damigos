/**
 * Shiprocket External API — Bangalore food / hyperlocal-oriented.
 * Docs: https://apidocs.shiprocket.in/
 * Quick product (food, ≤50km): https://www.shiprocket.in/quick/food-delivery-services/
 *
 * Same JWT auth as standard Shiprocket. Prefer Instant / local couriers when
 * Quick hyperlocal partners are not yet enabled on the account.
 */

const DEFAULT_BASE = "https://apiv2.shiprocket.in/v1/external";

export type ShiprocketMode = "off" | "mock" | "sandbox" | "live";

export function shiprocketApiBase(): string {
  return (process.env.SHIPROCKET_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "");
}

export function deliveryMode(): ShiprocketMode {
  const mode = (process.env.DELIVERY_MODE ?? "off").toLowerCase();
  if (mode === "mock" || mode === "sandbox" || mode === "live") return mode;
  return "off";
}

export function deliveryQuoteRequired(): boolean {
  const m = deliveryMode();
  return m === "mock" || m === "sandbox" || m === "live";
}

export function shiprocketCredentialsConfigured(): boolean {
  return Boolean(
    process.env.SHIPROCKET_EMAIL?.trim() && process.env.SHIPROCKET_PASSWORD?.trim(),
  );
}

export function shiprocketPickupPostcode(): string {
  const p = process.env.SHIPROCKET_PICKUP_POSTCODE?.trim() ?? "560034";
  return /^\d{6}$/.test(p) ? p : "560034";
}

export function shiprocketPickupLocationName(): string {
  return process.env.SHIPROCKET_PICKUP_LOCATION?.trim() || "Primary";
}

/** Prefer food / Quick-style riders when ranking serviceability. */
export function isFoodFriendlyCourier(name: string | null | undefined): boolean {
  if (!name) return false;
  return /instant|hyper.?local|local|quick|same.?day|borzo|ola|shadowfax|dunzo|porter|food/i.test(
    name,
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function shiprocketLogin(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD required");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${shiprocketApiBase()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    token?: string;
    message?: string;
    error?: string;
  };
  if (!res.ok || !data.token) {
    throw new Error(data.message ?? data.error ?? `Shiprocket login failed (${res.status})`);
  }

  cachedToken = { token: data.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return data.token;
}

async function shiprocketFetch<T>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const token = await shiprocketLogin();
  const { query, ...rest } = init;
  let url = `${shiprocketApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(rest.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    status_code?: number;
  };
  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ?? `Shiprocket ${path} failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

type CourierRow = {
  courier_company_id?: number;
  courier_name?: string;
  rate?: number;
  freight_charge?: number;
  etd?: string;
  etd_hours?: number;
  estimated_delivery_days?: number;
  is_local?: boolean;
  is_hyperlocal?: boolean;
};

function rankCouriers(companies: CourierRow[]): CourierRow[] {
  return [...companies].sort((a, b) => {
    const aFood =
      isFoodFriendlyCourier(a.courier_name) || a.is_local === true || a.is_hyperlocal === true
        ? 0
        : 1;
    const bFood =
      isFoodFriendlyCourier(b.courier_name) || b.is_local === true || b.is_hyperlocal === true
        ? 0
        : 1;
    if (aFood !== bFood) return aFood - bFood;
    return (a.rate ?? a.freight_charge ?? 9999) - (b.rate ?? b.freight_charge ?? 9999);
  });
}

function etaMinutesFromCourier(c: CourierRow): number {
  if (typeof c.etd_hours === "number" && c.etd_hours > 0) {
    return Math.round(c.etd_hours * 60);
  }
  if (isFoodFriendlyCourier(c.courier_name)) return 45;
  const days = c.estimated_delivery_days ?? 1;
  return Math.max(45, days * 24 * 60);
}

export type ServiceabilityResult = {
  serviceable: boolean;
  ratePaise: number;
  etaMinutes: number;
  courierCompanyId: number | null;
  courierName: string | null;
  foodFriendly: boolean;
  raw?: unknown;
};

/** GET /courier/serviceability/ — prefers Instant / local for food. */
export async function checkShiprocketServiceability(input: {
  deliveryPostcode: string;
  pickupPostcode?: string;
  weightKg?: number;
  cod?: boolean;
  orderValueInr?: number;
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
}): Promise<ServiceabilityResult> {
  const pickup = input.pickupPostcode ?? shiprocketPickupPostcode();
  const query: Record<string, string | number | undefined> = {
    pickup_postcode: pickup,
    delivery_postcode: input.deliveryPostcode,
    weight: input.weightKg ?? 0.5,
    cod: input.cod ? 1 : 0,
    order_value: input.orderValueInr ?? 299,
  };
  if (input.pickupLat != null && input.pickupLng != null) {
    query.pickup_lat = input.pickupLat;
    query.pickup_long = input.pickupLng;
  }
  if (input.deliveryLat != null && input.deliveryLng != null) {
    query.delivery_lat = input.deliveryLat;
    query.delivery_long = input.deliveryLng;
  }

  const data = await shiprocketFetch<{
    data?: { available_courier_companies?: CourierRow[] };
  }>("/courier/serviceability/", { method: "GET", query });

  const companies = data.data?.available_courier_companies ?? [];
  if (!companies.length) {
    return {
      serviceable: false,
      ratePaise: 0,
      etaMinutes: 0,
      courierCompanyId: null,
      courierName: null,
      foodFriendly: false,
      raw: data,
    };
  }

  const best = rankCouriers(companies)[0]!;
  const rateInr = best.rate ?? best.freight_charge ?? 40;
  const foodFriendly =
    isFoodFriendlyCourier(best.courier_name) ||
    best.is_local === true ||
    best.is_hyperlocal === true;

  return {
    serviceable: true,
    ratePaise: Math.round(Number(rateInr) * 100),
    etaMinutes: etaMinutesFromCourier(best),
    courierCompanyId: best.courier_company_id ?? null,
    courierName: best.courier_name ?? null,
    foodFriendly,
    raw: data,
  };
}

export type CreateAdhocOrderInput = {
  orderId: string;
  orderDateIso: string;
  pickupLocation?: string;
  billingCustomerName: string;
  billingPhone: string;
  billingAddress: string;
  billingCity: string;
  billingPincode: string;
  billingState: string;
  shippingIsBilling?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  subTotalInr: number;
  paymentMethod?: "Prepaid" | "COD";
  weightKg?: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  items: Array<{
    name: string;
    sku: string;
    units: number;
    sellingPriceInr: number;
  }>;
};

export type CreateAdhocOrderResult = {
  shiprocketOrderId: number | string;
  shipmentId: number | string;
  status: string;
};

/** POST /orders/create/adhoc — food parcel (2-wheeler weight default 0.5–2 kg). */
export async function createShiprocketAdhocOrder(
  input: CreateAdhocOrderInput,
): Promise<CreateAdhocOrderResult> {
  const body: Record<string, unknown> = {
    order_id: input.orderId.slice(0, 50),
    order_date: input.orderDateIso.slice(0, 19).replace("T", " "),
    pickup_location: input.pickupLocation ?? shiprocketPickupLocationName(),
    billing_customer_name: input.billingCustomerName,
    billing_last_name: "",
    billing_address: input.billingAddress,
    billing_address_2: "",
    billing_city: input.billingCity,
    billing_pincode: input.billingPincode,
    billing_state: input.billingState,
    billing_country: "India",
    billing_email: process.env.SHIPROCKET_BILLING_EMAIL?.trim() || "guest@damigos.in",
    billing_phone: input.billingPhone.replace(/\D/g, "").slice(-10),
    shipping_is_billing: input.shippingIsBilling ?? true,
    order_items: input.items.map((it) => ({
      name: it.name.slice(0, 200),
      sku: it.sku.slice(0, 50),
      units: it.units,
      selling_price: it.sellingPriceInr,
      discount: 0,
      tax: 0,
      hsn: 0,
    })),
    payment_method: input.paymentMethod ?? "Prepaid",
    sub_total: input.subTotalInr,
    length: input.lengthCm ?? 20,
    breadth: input.breadthCm ?? 15,
    height: input.heightCm ?? 10,
    weight: input.weightKg ?? 0.5,
  };
  if (input.latitude != null && input.longitude != null) {
    body.latitude = input.latitude;
    body.longitude = input.longitude;
  }

  const data = await shiprocketFetch<{
    order_id?: number | string;
    shipment_id?: number | string;
    status?: string;
    message?: string;
  }>("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (data.order_id == null || data.shipment_id == null) {
    throw new Error(data.message ?? "Shiprocket create order missing ids");
  }

  return {
    shiprocketOrderId: data.order_id,
    shipmentId: data.shipment_id,
    status: data.status ?? "NEW",
  };
}

/** POST /courier/assign/awb */
export async function assignShiprocketAwb(input: {
  shipmentId: number | string;
  courierId?: number | null;
}): Promise<{ awbCode: string; courierName: string | null }> {
  const data = await shiprocketFetch<{
    response?: { data?: { awb_code?: string; courier_name?: string } };
    awb_code?: string;
    message?: string;
  }>("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({
      shipment_id: input.shipmentId,
      ...(input.courierId != null ? { courier_id: input.courierId } : {}),
    }),
  });

  const awb = data.response?.data?.awb_code ?? data.awb_code;
  if (!awb) {
    throw new Error(data.message ?? "Shiprocket AWB assign failed");
  }
  return {
    awbCode: String(awb),
    courierName: data.response?.data?.courier_name ?? null,
  };
}

/** POST /courier/generate/pickup — notify rider to kitchen. */
export async function generateShiprocketPickup(shipmentIds: Array<number | string>): Promise<void> {
  await shiprocketFetch("/courier/generate/pickup", {
    method: "POST",
    body: JSON.stringify({
      shipment_id: shipmentIds.map((id) => Number(id)),
    }),
  });
}

export function shiprocketTrackingUrl(awb: string): string {
  return `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
}

/** Full food-delivery dispatch: create → prefer Instant courier → AWB → pickup. */
export async function createShiprocketShipmentBundle(input: {
  orderId: string;
  deliveryPincode: string;
  customerName: string;
  customerPhone: string;
  subTotalPaise: number;
  items: Array<{ name: string; quantity: number; unitPricePaise: number }>;
  assignAwb?: boolean;
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
}): Promise<{
  shiprocketOrderId: string;
  shipmentId: string;
  awb: string | null;
  courierName: string | null;
  courierCompanyId: number | null;
  trackingUrl: string | null;
  foodFriendly: boolean;
  pickupRequested: boolean;
}> {
  const quote = await checkShiprocketServiceability({
    deliveryPostcode: input.deliveryPincode,
    orderValueInr: Math.max(1, Math.round(input.subTotalPaise / 100)),
    pickupLat: input.pickupLat,
    pickupLng: input.pickupLng,
    deliveryLat: input.deliveryLat,
    deliveryLng: input.deliveryLng,
  });

  const created = await createShiprocketAdhocOrder({
    orderId: input.orderId.replace(/-/g, "").slice(0, 40),
    orderDateIso: new Date().toISOString(),
    billingCustomerName: input.customerName || "Guest",
    billingPhone: input.customerPhone || "9999999999",
    billingAddress: `Food delivery · pincode ${input.deliveryPincode}`,
    billingCity: "Bengaluru",
    billingPincode: input.deliveryPincode,
    billingState: "Karnataka",
    latitude: input.deliveryLat,
    longitude: input.deliveryLng,
    subTotalInr: Math.max(1, Math.round(input.subTotalPaise / 100)),
    weightKg: 0.5,
    items: input.items.map((it, i) => ({
      name: it.name,
      sku: `FOOD${i + 1}`,
      units: it.quantity,
      sellingPriceInr: Math.max(1, Math.round(it.unitPricePaise / 100)),
    })),
  });

  let awb: string | null = null;
  let courierName: string | null = quote.courierName;
  let courierCompanyId: number | null = quote.courierCompanyId;
  let pickupRequested = false;

  if (input.assignAwb !== false) {
    try {
      const assigned = await assignShiprocketAwb({
        shipmentId: created.shipmentId,
        courierId: quote.courierCompanyId,
      });
      awb = assigned.awbCode;
      courierName = assigned.courierName ?? courierName;
      try {
        await generateShiprocketPickup([created.shipmentId]);
        pickupRequested = true;
      } catch (err) {
        console.warn("[shiprocket] generate pickup deferred", err);
      }
    } catch (err) {
      console.warn("[shiprocket] AWB assign deferred", err);
    }
  }

  return {
    shiprocketOrderId: String(created.shiprocketOrderId),
    shipmentId: String(created.shipmentId),
    awb,
    courierName,
    courierCompanyId,
    trackingUrl: awb ? shiprocketTrackingUrl(awb) : null,
    foodFriendly: quote.foodFriendly,
    pickupRequested,
  };
}
