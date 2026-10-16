import { authHeaders } from "./session";

const base = process.env.NEXT_PUBLIC_GUEST_API_URL ?? "http://localhost:4000";

function guestApiUnreachableMessage() {
  return (
    "Guest API is not responding. On Vercel: project damigos-guest-api → set DATABASE_URL + JWT_SECRET (same as CRM) → redeploy → db:migrate + db:seed. " +
    `URL: ${base}`
  );
}

async function readGuestApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (/server error|invocation failed|502|504|503/i.test(text)) {
      throw new Error(guestApiUnreachableMessage());
    }
    throw new Error(`Guest API returned non-JSON (${res.status}): ${text.slice(0, 120)}`);
  }
}

export async function resolveScanToken(token: string) {
  const res = await fetch(`${base}/v1/scan/resolve?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message ?? "Scan failed"), { data, status: res.status });
  }
  return data as { restaurantId: string; redirectPath: string; scanEventId?: string };
}

export type RewardOutcome = {
  title: string;
  description: string | null;
  prizeType: string;
  prizeValue: number;
  terms: string | null;
  expiresDays: number;
};

export async function fetchActiveOffers(restaurantId: string) {
  const res = await fetch(`${base}/v1/restaurants/${restaurantId}/offers/active`, {
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Offers failed");
  return data.offers as { id: string; title: string; description: string | null; terms: string | null }[];
}

export async function fetchPlayByScan(scanId: string) {
  const res = await fetch(`${base}/v1/rewards/plays/by-scan/${scanId}`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Play lookup failed");
  return data as {
    play: {
      playId: string;
      mode: string;
      claimed: boolean;
      outcome: RewardOutcome | null;
    } | null;
  };
}

export async function spinReward(input: {
  restaurantId: string;
  scanId: string;
  mode: "spin" | "scratch";
}) {
  const res = await fetch(`${base}/v1/rewards/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Spin failed");
  return data as { playId: string; alreadyPlayed: boolean; outcome: RewardOutcome };
}

export async function claimReward(playId: string) {
  const res = await fetch(`${base}/v1/rewards/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ playId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Claim failed");
  return data;
}

export type GuestMenuItem = {
  id: string;
  name: string;
  description: string | null;
  pricePaise: number;
  referencePricePaise: number | null;
  isVeg: boolean;
  available: boolean;
};

export async function fetchGuestMenu(restaurantId: string) {
  const res = await fetch(`${base}/v1/restaurants/${restaurantId}/menu`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message ?? "Menu failed"), {
      data,
      status: res.status,
      restaurant: data.restaurant as { id: string; name: string } | undefined,
      items: data.items as GuestMenuItem[] | undefined,
    });
  }
  return data as {
    restaurant: {
      id: string;
      name: string;
      brand?: {
        displayName: string;
        primaryColor: string;
        backgroundColor: string;
        accentColor: string;
        logoDataUrl: string | null;
      } | null;
    };
    items: GuestMenuItem[];
  };
}

export type GuestRestaurantBrand = NonNullable<
  Awaited<ReturnType<typeof fetchGuestMenu>>["restaurant"]["brand"]
>;

export function formatInr(paise: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);
}

export async function verifyGuestOtp(phone: string, code: string) {
  const res = await fetch(`${base}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "OTP failed");
  return data as { token: string; customerId: string };
}

export async function fetchMe(token: string) {
  const res = await fetch(`${base}/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Me failed");
  return data as {
    profileComplete: boolean;
    name: string | null;
    consents: { transactional: boolean; marketing: boolean; game: boolean };
  };
}

export async function saveGuestProfile(token: string, name: string) {
  const res = await fetch(`${base}/v1/me/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Profile failed");
  return data;
}

export type CartAppliedClaim = {
  claimId: string;
  title: string;
  discountPaise: number;
  eligible: boolean;
  minOrderPaise: number;
};

export type CartResponse = {
  cartId: string;
  restaurantId: string;
  items: {
    id: string;
    menuItemId: string;
    quantity: number;
    unitPricePaise: number;
    name: string;
    isVeg: boolean;
  }[];
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise?: number;
  deliveryPincode?: string | null;
  convenienceFeePaise: number;
  totalPaise: number;
  appliedClaim: CartAppliedClaim | null;
  itemCount: number;
};

export type RewardClaimOption = {
  claimId: string;
  title: string;
  description: string | null;
  prizeType: string;
  minOrderPaise: number;
  claimedAt: string;
};

export async function fetchRewardClaims(restaurantId: string) {
  const res = await fetch(`${base}/v1/me/reward-claims?restaurantId=${restaurantId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Claims failed");
  return data.claims as RewardClaimOption[];
}

export async function applyCartClaim(restaurantId: string, claimId: string | null) {
  const res = await fetch(`${base}/v1/cart/claim`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ restaurantId, claimId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Apply offer failed");
  return data;
}

export async function fetchCart(restaurantId: string) {
  const res = await fetch(`${base}/v1/cart?restaurantId=${restaurantId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Cart failed");
  return data as CartResponse;
}

export async function addCartItem(restaurantId: string, menuItemId: string, quantity: number) {
  const res = await fetch(`${base}/v1/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ restaurantId, menuItemId, quantity }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Add failed");
  return data;
}

export async function fetchDeliveryConfig() {
  const res = await fetch(`${base}/v1/delivery/config`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  return data as { mode: "off" | "mock"; platformMarkupPaise: number };
}

export async function requestDeliveryQuote(restaurantId: string, pincode: string) {
  const res = await fetch(`${base}/v1/delivery/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ restaurantId, pincode }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Delivery quote failed");
  return data as {
    carrier: string;
    shiprocketRatePaise: number;
    platformMarkupPaise: number;
    deliveryFeePaise: number;
    etaMinutes: number;
    pincode: string;
  };
}

export type HubRestaurant = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  orderingEnabled: boolean;
  menuPath: string;
};

export type OpenCartSummary = {
  cartId: string;
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  subtotalPaise: number;
};

export async function fetchOpenCart(): Promise<OpenCartSummary | null> {
  const res = await fetch(`${base}/v1/cart/open`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (res.status === 401) return null;
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Open cart failed");
  return (data.openCart as OpenCartSummary | null) ?? null;
}

export async function clearOpenCart() {
  const res = await fetch(`${base}/v1/cart/open`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Clear cart failed");
  return data as { cleared: boolean };
}

export async function fetchHubRestaurants(city = "bangalore", q?: string) {
  const params = new URLSearchParams({ city });
  if (q?.trim()) params.set("q", q.trim());
  const res = await fetch(`${base}/v1/hub/restaurants?${params}`, {
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Hub failed");
  return data.restaurants as HubRestaurant[];
}

export async function fetchCheckoutConfig() {
  const res = await fetch(`${base}/v1/checkout/config`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  return data as { paymentMode: "mock" | "stub" | "razorpay"; razorpayKeyId: string | null };
}

export async function mockPay(restaurantId: string) {
  const res = await fetch(`${base}/v1/checkout/mock-pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ restaurantId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Payment failed");
  return data as { orderId: string; trackPath: string; totalPaise: number };
}

function checkoutIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `idem-${Date.now()}`;
}

export async function prepareCheckout(restaurantId: string) {
  const res = await fetch(`${base}/v1/checkout/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": checkoutIdempotencyKey(),
      ...authHeaders(),
    },
    body: JSON.stringify({ restaurantId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Prepare failed");
  return data as {
    orderId: string;
    trackPath: string;
    totalPaise: number;
    razorpayOrderId: string;
    status: string;
  };
}

export async function confirmStubCheckout(orderId: string) {
  const res = await fetch(`${base}/v1/checkout/confirm-stub`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ orderId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Confirm failed");
  return data as { trackPath: string; orderId: string };
}

export async function verifyRazorpayCheckout(input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const res = await fetch(`${base}/v1/checkout/verify-razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      orderId: input.orderId,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Payment verify failed");
  return data as { trackPath: string; orderId: string; status: string };
}

export type GuestOrderSummary = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: string;
  totalPaise: number;
  createdAt: string;
};

export async function fetchMyOrders(status?: "active" | "past") {
  const q = status ? `?status=${status}` : "";
  const res = await fetch(`${base}/v1/me/orders${q}`, { headers: authHeaders(), cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Orders failed");
  return data.orders as GuestOrderSummary[];
}

export async function saveGuestConsents(
  token: string,
  input: { transactional: boolean; marketing: boolean; game: boolean },
) {
  const res = await fetch(`${base}/v1/me/consents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(data?.error?.message ?? "Consents failed");
  return data;
}
