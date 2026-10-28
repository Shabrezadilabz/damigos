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

function guestApiErrorMessage(data: Record<string, unknown>, fallback: string): string {
  const err = data.error;
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

export async function resolveScanToken(token: string) {
  const res = await fetch(`${base}/v1/scan/resolve?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) {
    throw Object.assign(new Error(guestApiErrorMessage(data, "Scan failed")), { data, status: res.status });
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
  minOrderPaise?: number;
  scope?: "RESTAURANT_SCOPED" | "PLATFORM_WIDE";
  billLabel?: string;
};

export async function fetchActiveOffers(restaurantId: string) {
  const res = await fetch(`${base}/v1/restaurants/${restaurantId}/offers/active`, {
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Offers failed"));
  return data.offers as {
    id: string;
    title: string;
    description: string | null;
    terms: string | null;
    prizeType?: string;
    prizeValue?: number;
    minOrderPaise?: number;
    scope?: string;
  }[];
}

export async function fetchPlayByScan(scanId: string) {
  const res = await fetch(`${base}/v1/rewards/plays/by-scan/${scanId}`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Play lookup failed"));
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
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Spin failed"));
  return data as { playId: string; alreadyPlayed: boolean; outcome: RewardOutcome };
}

export async function claimReward(playId: string) {
  const res = await fetch(`${base}/v1/rewards/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ playId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Claim failed"));
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
  imageUrl?: string | null;
};

export async function fetchGuestMenu(restaurantId: string) {
  const res = await fetch(`${base}/v1/restaurants/${restaurantId}/menu`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) {
    throw Object.assign(new Error(guestApiErrorMessage(data, "Menu failed")), {
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
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "OTP failed"));
  return data as { token: string; customerId: string };
}

/** Spark marketing opt-in — stores phone_e164 + consent; returns play URL */
export async function sparkOptIn(input: {
  phone: string;
  restaurantId: string;
  scanId?: string | null;
}) {
  const res = await fetch(`${base}/v1/wa/spark/opt-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: input.phone,
      restaurantId: input.restaurantId,
      scanId: input.scanId || undefined,
    }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Spark opt-in failed"));
  return data as {
    ok: boolean;
    playUrl: string;
    playPath?: string;
    token: string;
    customerId: string;
    restaurantName?: string;
  };
}

export async function sparkInvite(input: {
  phone: string;
  restaurantId: string;
  scanId?: string | null;
}) {
  const res = await fetch(`${base}/v1/wa/spark/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: input.phone,
      restaurantId: input.restaurantId,
      scanId: input.scanId || undefined,
    }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Spark invite failed"));
  return data as { ok: boolean; playUrl: string; mode: string; messageId: string | null };
}

export async function fetchWaStatus() {
  const res = await fetch(`${base}/v1/wa/status`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "WA status failed"));
  return data as {
    mode: string;
    sparkWaMeE164?: string | null;
    sandbox: boolean;
  };
}

export async function fetchMe(token: string) {
  const res = await fetch(`${base}/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Me failed"));
  return data as {
    profileComplete: boolean;
    name: string | null;
    phoneLast4?: string | null;
    phoneE164?: string | null;
    email?: string | null;
    gender?: string | null;
    dietaryPref?: string | null;
    dateOfBirth?: string | null;
    previousPhoneLast4?: string | null;
    consents: { transactional: boolean; marketing: boolean; game: boolean };
  };
}

export async function saveGuestProfile(
  token: string,
  input: {
    name?: string;
    email?: string | null;
    gender?: string | null;
    dietaryPref?: string | null;
    dateOfBirth?: string | null;
    newPhoneE164?: string;
  },
) {
  const res = await fetch(`${base}/v1/me/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Profile failed"));
  return data;
}

/** Profile feedback → partners@damigos.in + DB (restaurant-mapped when known). */
export async function sendGuestFeedback(input: {
  message: string;
  rating?: number;
  email?: string;
  name?: string;
  restaurantId?: string;
  orderId?: string;
  token?: string | null;
}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.token) headers.Authorization = `Bearer ${input.token}`;
  const res = await fetch(`${base}/v1/me/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: input.message,
      rating: input.rating,
      email: input.email,
      name: input.name,
      restaurantId: input.restaurantId,
      orderId: input.orderId,
    }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Feedback failed"));
  return data as { ok: boolean; emailed: boolean; to: string };
}

export type CartAppliedClaim = {
  claimId: string;
  title: string;
  discountPaise: number;
  eligible: boolean;
  minOrderPaise: number;
  scope?: "RESTAURANT_SCOPED" | "PLATFORM_WIDE";
  billLabel?: string;
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
  loyaltyAvailablePaise?: number;
  loyaltyAppliedPaise?: number;
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
  scope?: "RESTAURANT_SCOPED" | "PLATFORM_WIDE";
  billLabel?: string;
};

export async function fetchRewardClaims(restaurantId: string) {
  const res = await fetch(`${base}/v1/me/reward-claims?restaurantId=${restaurantId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Claims failed"));
  return data.claims as RewardClaimOption[];
}

export async function applyCartClaim(restaurantId: string, claimId: string | null) {
  const res = await fetch(`${base}/v1/cart/claim`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ restaurantId, claimId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Apply offer failed"));
  return data;
}

export async function applyCartLoyalty(restaurantId: string, apply: boolean) {
  const res = await fetch(`${base}/v1/cart/loyalty`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ restaurantId, apply }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Loyalty apply failed"));
  return data as {
    loyaltyAvailablePaise: number;
    loyaltyAppliedPaise: number;
    apply: boolean;
  };
}

export async function fetchCart(restaurantId: string) {
  const res = await fetch(`${base}/v1/cart?restaurantId=${restaurantId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Cart failed"));
  return data as CartResponse;
}

export type CrossByNearby = {
  restaurantId: string;
  name: string;
  distanceKm: number;
  distanceMeters: number;
  riderMode: "SINGLE" | "SPLIT";
  menuPath: string;
};

export async function fetchCrossByNearby(restaurantId: string, radiusKm = 1) {
  const q = new URLSearchParams({ restaurantId, radiusKm: String(radiusKm) });
  const res = await fetch(`${base}/v1/cart/cross-by/nearby?${q}`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Cross-By nearby failed"));
  return data as {
    restaurantId: string;
    radiusKm: number;
    pinMissing: boolean;
    singleRiderMaxKm?: number;
    nearby: CrossByNearby[];
  };
}

export async function addCartItem(restaurantId: string, menuItemId: string, quantity: number) {
  const res = await fetch(`${base}/v1/cart/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ restaurantId, menuItemId, quantity }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Add failed"));
  return data;
}

/** Set quantity; `0` deletes the line. */
export async function updateCartItemQuantity(lineId: string, quantity: number) {
  const res = await fetch(`${base}/v1/cart/items/${encodeURIComponent(lineId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ quantity }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Update cart failed"));
  return data as { deleted?: boolean; line?: unknown };
}

export async function removeCartItem(lineId: string) {
  return updateCartItemQuantity(lineId, 0);
}

export async function fetchDeliveryConfig() {
  const res = await fetch(`${base}/v1/delivery/config`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  return data as { mode: "off" | "mock"; platformMarkupPaise: number };
}

export async function requestDeliveryQuote(
  restaurantId: string,
  pincode: string,
  addressText?: string | null,
) {
  const res = await fetch(`${base}/v1/delivery/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      restaurantId,
      pincode,
      ...(addressText?.trim() ? { addressText: addressText.trim().slice(0, 240) } : {}),
    }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Delivery quote failed"));
  return data as {
    carrier: string;
    courierName?: string | null;
    foodFriendly?: boolean;
    foodDeliveryLabel?: string | null;
    shiprocketRatePaise: number;
    platformMarkupPaise: number;
    grossDeliveryFeePaise?: number;
    deliveryFeePaise: number;
    firstOrderFree?: boolean;
    platformSubsidyPaise?: number;
    subsidyLabel?: string | null;
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
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  dietType?: "veg" | "non_veg" | "both" | null;
  vegFriendly?: boolean;
  pureVeg?: boolean;
  matchedBy?: "kitchen" | "dish" | "both" | null;
  sampleDishes?: Array<{
    id: string;
    name: string;
    pricePaise: number;
    isVeg: boolean;
    imageUrl: string | null;
  }>;
};

export type HubBestsellerItem = {
  id: string;
  name: string;
  pricePaise: number;
  isVeg: boolean;
  imageUrl: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  menuPath: string;
  bestseller?: boolean;
};

export type OpenCartSummary = {
  cartId: string;
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  subtotalPaise: number;
};

export type CrossBySession = {
  kitchenCount: number;
  maxKitchens: number;
  distanceMeters: number | null;
  riderMode: "SINGLE" | "SPLIT";
  canAddKitchen: boolean;
};

export async function fetchOpenCartSession(): Promise<{
  openCart: OpenCartSummary | null;
  openCarts: OpenCartSummary[];
  crossBy: CrossBySession;
}> {
  const res = await fetch(`${base}/v1/cart/open`, {
    cache: "no-store",
    headers: authHeaders(),
  });
  if (res.status === 401) {
    return {
      openCart: null,
      openCarts: [],
      crossBy: {
        kitchenCount: 0,
        maxKitchens: 2,
        distanceMeters: null,
        riderMode: "SINGLE",
        canAddKitchen: true,
      },
    };
  }
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Open cart failed"));
  const openCarts = (data.openCarts as OpenCartSummary[] | undefined) ?? [];
  return {
    openCart: (data.openCart as OpenCartSummary | null) ?? openCarts[0] ?? null,
    openCarts,
    crossBy: (data.crossBy as CrossBySession) ?? {
      kitchenCount: openCarts.length,
      maxKitchens: 2,
      distanceMeters: null,
      riderMode: "SINGLE",
      canAddKitchen: openCarts.length < 2,
    },
  };
}

export async function fetchOpenCart(): Promise<OpenCartSummary | null> {
  const session = await fetchOpenCartSession();
  return session.openCart;
}

export async function clearOpenCart(restaurantId?: string) {
  const q = restaurantId ? `?restaurantId=${encodeURIComponent(restaurantId)}` : "";
  const res = await fetch(`${base}/v1/cart/open${q}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Clear cart failed"));
  return data as { cleared: boolean };
}

export type CheckoutGroupPreview = {
  legs: {
    restaurantId: string;
    restaurantName: string;
    legIndex: number;
    itemCount: number;
    subtotalPaise: number;
    discountPaise: number;
    loyaltyAppliedPaise?: number;
    appliedClaimTitle?: string | null;
    appliedClaimBillLabel?: string | null;
    deliveryFeePaise: number;
    lines: { name: string; quantity: number; unitPricePaise: number }[];
  }[];
  crossBy: CrossBySession;
  convenienceFeePaise: number;
  deliveryFeePaise: number;
  grossDeliveryFeePaise?: number;
  firstOrderFree?: boolean;
  platformSubsidyPaise?: number;
  subsidyLabel?: string | null;
  totalPaise: number;
};

export async function fetchCheckoutGroupPreview() {
  const res = await fetch(`${base}/v1/checkout-groups/preview`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Cross-By preview failed"));
  return data as CheckoutGroupPreview;
}

export async function mockPayCheckoutGroup() {
  const res = await fetch(`${base}/v1/checkout-groups/mock-pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({}),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Cross-By pay failed"));
  return data as {
    checkoutGroupId: string;
    orderIds: string[];
    status: string;
    trackPath: string;
    riderMode: string;
  };
}

export async function prepareCheckoutGroup() {
  const res = await fetch(`${base}/v1/checkout-groups/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({}),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Cross-By prepare failed"));
  return data as {
    checkoutGroupId: string;
    orderIds: string[];
    totalPaise: number;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
    paymentMode: string;
    trackPath: string;
    riderMode: string;
  };
}

export async function confirmStubCheckoutGroup(checkoutGroupId: string) {
  const res = await fetch(`${base}/v1/checkout-groups/confirm-stub`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ checkoutGroupId }),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Cross-By stub confirm failed"));
  return data as { checkoutGroupId: string; orderIds: string[]; trackPath: string; status: string };
}

export async function verifyRazorpayCheckoutGroup(input: {
  checkoutGroupId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const res = await fetch(`${base}/v1/checkout-groups/verify-razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Cross-By verify failed"));
  return data as { checkoutGroupId: string; orderIds: string[]; trackPath: string; status: string };
}

export type HubPerkRailItem = {
  id: string;
  kitchenName: string;
  title: string;
  badge: string;
  coinsHint: number;
  href: string;
  kind: "claim" | "kitchen" | "platform";
};

export async function fetchHubPerks() {
  const res = await fetch(`${base}/v1/hub/perks`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Perks failed"));
  return data as { rail: HubPerkRailItem[] };
}

export async function fetchHubRestaurants(city = "bangalore", q?: string, vegOnly = false) {
  const params = new URLSearchParams({ city });
  if (q?.trim()) params.set("q", q.trim());
  if (vegOnly) params.set("veg", "1");
  const res = await fetch(`${base}/v1/hub/restaurants?${params}`, {
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Hub failed"));
  return data.restaurants as HubRestaurant[];
}

export async function fetchHubBestsellers(vegOnly = false) {
  const params = new URLSearchParams();
  if (vegOnly) params.set("veg", "1");
  const qs = params.toString();
  const res = await fetch(`${base}/v1/hub/bestsellers${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Bestsellers failed"));
  return data as { title: string; maxPricePaise: number; items: HubBestsellerItem[] };
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
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Payment failed"));
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
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Prepare failed"));
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
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Confirm failed"));
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
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Payment verify failed"));
  return data as { trackPath: string; orderId: string; status: string };
}

export type GuestOrderSummary = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  checkoutGroupId?: string | null;
  legIndex?: number | null;
  prepDeadlineAt?: string | null;
  discountPaise?: number | null;
};

export async function fetchMyOrders(status?: "active" | "past") {
  const q = status ? `?status=${status}` : "";
  const res = await fetch(`${base}/v1/me/orders${q}`, { headers: authHeaders(), cache: "no-store" });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Orders failed"));
  return data.orders as GuestOrderSummary[];
}

export type CheckoutGroupTrack = {
  group: {
    id: string;
    status: string;
    riderMode: string;
    distanceMeters: number | null;
  };
  orders: {
    id: string;
    restaurantId: string;
    status: string;
    legIndex: number | null;
    totalPaise: number;
    prepDeadlineAt: string | null;
    trackPath: string;
  }[];
};

export async function fetchOrderGroup(groupId: string) {
  const res = await fetch(`${base}/v1/orders/group/${groupId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await readGuestApiJson(res);
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Group load failed"));
  return data as CheckoutGroupTrack;
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
  if (!res.ok) throw new Error(guestApiErrorMessage(data, "Consents failed"));
  return data;
}
