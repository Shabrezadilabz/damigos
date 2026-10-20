const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";
const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

export type E2eFixtures = {
  restaurantId: string;
  sampleScanToken: string;
  alternateScanToken?: string | null;
  expiredScanToken?: string | null;
  revokedScanToken?: string | null;
  pausedRestaurantId?: string | null;
  hubSecondRestaurantId?: string | null;
  hubSecondRestaurantName?: string | null;
  devGuestPhone: string;
  otpBypass: string;
  devOwnerPhone: string;
};

export async function loadE2eFixtures(): Promise<E2eFixtures | null> {
  try {
    const res = await fetch(`${guestApi}/v1/dev/e2e-fixtures`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      restaurantId: string;
      sampleScanToken: string | null;
      alternateScanToken?: string | null;
      expiredScanToken?: string | null;
      revokedScanToken?: string | null;
      pausedRestaurantId?: string | null;
      hubSecondRestaurantId?: string | null;
      hubSecondRestaurantName?: string | null;
      devGuestPhone: string;
      otpBypass: string;
      devOwnerPhone: string;
    };
    if (!data.sampleScanToken) return null;
    return {
      restaurantId: data.restaurantId,
      sampleScanToken: data.sampleScanToken,
      alternateScanToken: data.alternateScanToken,
      expiredScanToken: data.expiredScanToken,
      revokedScanToken: data.revokedScanToken,
      pausedRestaurantId: data.pausedRestaurantId,
      hubSecondRestaurantId: data.hubSecondRestaurantId,
      hubSecondRestaurantName: data.hubSecondRestaurantName,
      devGuestPhone: data.devGuestPhone,
      otpBypass: data.otpBypass,
      devOwnerPhone: data.devOwnerPhone,
    };
  } catch {
    return null;
  }
}

export async function guestResolveScan(token: string): Promise<{ scanEventId: string; restaurantId: string }> {
  const res = await fetch(`${guestApi}/v1/scan/resolve?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as {
    scanEventId?: string;
    restaurantId?: string;
    error?: { message: string };
  };
  if (!res.ok || !data.scanEventId || !data.restaurantId) {
    throw new Error(data.error?.message ?? "Scan resolve failed");
  }
  return { scanEventId: data.scanEventId, restaurantId: data.restaurantId };
}

export async function guestEnsureProfileAndGameConsent(token: string, name = "E2E Guest") {
  await fetch(`${guestApi}/v1/me/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  await fetch(`${guestApi}/v1/me/consents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transactional: true, marketing: false, game: true }),
  });
}

export type GuestSpinResult = {
  playId: string;
  prizeType: string;
  claimId: string;
  restaurantId: string;
  scanEventId: string;
};

/** Spin + claim on a fresh scan (requires unused scan token for same-day limit isolation). */
export async function guestSpinAndClaim(
  guestToken: string,
  scanToken: string,
  mode: "spin" | "scratch" = "spin",
): Promise<GuestSpinResult> {
  const scan = await guestResolveScan(scanToken);
  const spinRes = await fetch(`${guestApi}/v1/rewards/spin`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${guestToken}` },
    body: JSON.stringify({
      restaurantId: scan.restaurantId,
      scanId: scan.scanEventId,
      mode,
    }),
  });
  if (!spinRes.ok) {
    const err = (await spinRes.json()) as { error?: { message: string } };
    throw new Error(err.error?.message ?? "Spin failed");
  }
  const spin = (await spinRes.json()) as {
    playId: string;
    outcome: { prizeType: string } | null;
  };
  const claimRes = await fetch(`${guestApi}/v1/rewards/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${guestToken}` },
    body: JSON.stringify({ playId: spin.playId }),
  });
  if (!claimRes.ok) {
    const err = (await claimRes.json()) as { error?: { message: string } };
    throw new Error(err.error?.message ?? "Claim failed");
  }
  const claim = (await claimRes.json()) as { claimId: string };
  return {
    playId: spin.playId,
    prizeType: spin.outcome?.prizeType ?? "unknown",
    claimId: claim.claimId,
    restaurantId: scan.restaurantId,
    scanEventId: scan.scanEventId,
  };
}

export async function guestOtpToken(phone: string, otp: string): Promise<string> {
  const res = await fetch(`${guestApi}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, code: otp }),
  });
  const data = (await res.json()) as { token?: string; error?: { message: string } };
  if (!res.ok || !data.token) throw new Error(data.error?.message ?? "Guest login failed");
  return data.token;
}

async function guestAddOneItemAndQuote(restaurantId: string, guestToken: string) {
  const menuRes = await fetch(`${guestApi}/v1/restaurants/${restaurantId}/menu`, { cache: "no-store" });
  const menu = (await menuRes.json()) as { items: { id: string }[] };
  const menuItemId = menu.items[0]?.id;
  if (!menuItemId) throw new Error(`No menu items for ${restaurantId}`);

  await fetch(`${guestApi}/v1/cart/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${guestToken}`,
    },
    body: JSON.stringify({ restaurantId, menuItemId, quantity: 1 }),
  });

  const deliveryCfg = await fetch(`${guestApi}/v1/delivery/config`, { cache: "no-store" });
  const dcfg = (await deliveryCfg.json()) as { mode: string };
  if (dcfg.mode === "mock") {
    await fetch(`${guestApi}/v1/delivery/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${guestToken}`,
      },
      body: JSON.stringify({ restaurantId, pincode: "560034" }),
    });
  }
}

export async function guestStubPrepareOrder(
  restaurantId: string,
  guestToken: string,
): Promise<{ orderId: string; razorpayOrderId: string }> {
  await guestAddOneItemAndQuote(restaurantId, guestToken);

  const idempotencyKey = crypto.randomUUID();
  const prep = await fetch(`${guestApi}/v1/checkout/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${guestToken}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ restaurantId }),
  });
  const prepData = (await prep.json()) as {
    orderId?: string;
    razorpayOrderId?: string;
    error?: { message: string };
  };
  if (!prep.ok || !prepData.orderId || !prepData.razorpayOrderId) {
    throw new Error(prepData.error?.message ?? "Prepare checkout failed");
  }
  return { orderId: prepData.orderId, razorpayOrderId: prepData.razorpayOrderId };
}

/** Cross-By: two kitchen carts → one checkout_group prepare (stub Razorpay order). */
export async function guestStubPrepareCheckoutGroup(
  restaurantIdA: string,
  restaurantIdB: string,
  guestToken: string,
): Promise<{ checkoutGroupId: string; orderIds: string[]; razorpayOrderId: string }> {
  await guestAddOneItemAndQuote(restaurantIdA, guestToken);
  await guestAddOneItemAndQuote(restaurantIdB, guestToken);

  const idempotencyKey = crypto.randomUUID();
  const prep = await fetch(`${guestApi}/v1/checkout-groups/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${guestToken}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({}),
  });
  const prepData = (await prep.json()) as {
    checkoutGroupId?: string;
    orderIds?: string[];
    razorpayOrderId?: string;
    error?: { message: string };
  };
  if (
    !prep.ok ||
    !prepData.checkoutGroupId ||
    !prepData.orderIds?.length ||
    !prepData.razorpayOrderId
  ) {
    throw new Error(prepData.error?.message ?? "Prepare checkout group failed");
  }
  return {
    checkoutGroupId: prepData.checkoutGroupId,
    orderIds: prepData.orderIds,
    razorpayOrderId: prepData.razorpayOrderId,
  };
}

export async function crmTopUpWallet(restaurantId: string, token: string) {
  const res = await fetch(`${crmApi}/v1/wallet/topup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ restaurantId, amountPaise: 99900 }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: { message: string } };
    throw new Error(data.error?.message ?? "CRM wallet top-up failed");
  }
}

export type CrmOtpResult = {
  token: string;
  restaurantId: string | null;
  roles: string[];
};

export async function crmOtpVerify(ownerPhone: string, otp: string): Promise<CrmOtpResult> {
  const res = await fetch(`${crmApi}/v1/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: ownerPhone, code: otp }),
  });
  const data = (await res.json()) as {
    token?: string;
    restaurantId?: string | null;
    roles?: string[];
    error?: { message: string };
  };
  if (!res.ok || !data.token) throw new Error(data.error?.message ?? "CRM login failed");
  return {
    token: data.token,
    restaurantId: data.restaurantId ?? null,
    roles: data.roles ?? [],
  };
}

export async function crmOtpToken(ownerPhone: string, otp: string): Promise<string> {
  const r = await crmOtpVerify(ownerPhone, otp);
  return r.token;
}

async function guestCompleteProfileViaApi(token: string, name: string) {
  await fetch(`${guestApi}/v1/me/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });
  await fetch(`${guestApi}/v1/me/consents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ transactional: true, marketing: false, game: true }),
  });
}

export async function guestSeedSession(
  page: import("@playwright/test").Page,
  phone: string,
  otp: string,
  name = "E2E Guest",
) {
  const token = await guestOtpToken(phone, otp);
  await guestCompleteProfileViaApi(token, name);
  const base = process.env.GUEST_WEB_URL ?? "http://localhost:3000";
  if (!page.url().startsWith("http")) {
    await page.goto(base);
  }
  await page.evaluate((t) => localStorage.setItem("damigos_guest_token", t), token);
  await page.reload({ waitUntil: "domcontentloaded" });
}

export async function crmSeedSession(page: import("@playwright/test").Page, ownerPhone: string, otp: string) {
  const { token, restaurantId, roles } = await crmOtpVerify(ownerPhone, otp);
  const base = process.env.CRM_WEB_URL ?? "http://localhost:3001";
  await page.goto(`${base}/start`);
  await page.evaluate(
    (payload) => {
      localStorage.setItem("damigos_crm_token", payload.token);
      localStorage.setItem(
        "damigos_crm_session",
        JSON.stringify({ restaurantId: payload.restaurantId, roles: payload.roles }),
      );
    },
    { token, restaurantId, roles },
  );
  await page.goto(`${base}/`);
  await page.waitForURL(/\/(menu|orders|grow|settings)?(\?|$)/, { timeout: 20_000 }).catch(() =>
    page.waitForURL(`${base}/`, { timeout: 5_000 }),
  );
}

export async function publishMenuItemIds(
  restaurantId: string,
  token: string,
  itemIds: string[],
): Promise<void> {
  const res = await fetch(`${crmApi}/v1/menu/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ restaurantId, itemIds }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: { message: string } };
    throw new Error(data.error?.message ?? "Publish failed");
  }
}

export async function fetchGuestMenuNames(restaurantId: string): Promise<string[]> {
  const res = await fetch(`${guestApi}/v1/restaurants/${restaurantId}/menu`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items: { name: string }[] };
  return data.items.map((i) => i.name);
}

export async function crmLoginViaUi(
  page: import("@playwright/test").Page,
  ownerPhone: string,
  otp: string,
) {
  await crmSeedSession(page, ownerPhone, otp);
}

export type E2eFixturesLoaded = NonNullable<Awaited<ReturnType<typeof loadE2eFixtures>>>;

async function ensureMockDeliveryQuoteIfEnabled(restaurantId: string, page: import("@playwright/test").Page) {
  const configRes = await fetch(`${guestApi}/v1/delivery/config`, { cache: "no-store" });
  const config = (await configRes.json()) as { mode: string };
  if (config.mode !== "mock") return;

  const token = await page.evaluate(() => localStorage.getItem("damigos_guest_token"));
  if (!token) return;

  await fetch(`${guestApi}/v1/delivery/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ restaurantId, pincode: "560034" }),
  });
}

/** Menu → cart → mock/stub pay → order track. Returns order UUID from URL. */
export async function guestMockCheckoutUi(
  page: import("@playwright/test").Page,
  fx: E2eFixturesLoaded,
): Promise<string> {
  const { expect } = await import("@playwright/test");

  await page.goto(`/r/${fx.restaurantId}/menu`);
  await expect(page.getByText("Hyderabadi Chicken Biryani", { exact: true })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "ADD" }).first().click();
  await page.getByRole("button", { name: "Add to cart" }).click();

  if (
    await page
      .getByRole("heading", { name: /Verify your phone|Complete your profile once/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  ) {
    await guestLoginViaUi(page, fx.devGuestPhone, fx.otpBypass);
  }

  const cartLink = page.getByRole("link", { name: /Cart \(\d+\)/ });
  await expect(cartLink).toBeVisible({ timeout: 20_000 });
  await cartLink.click();

  await ensureMockDeliveryQuoteIfEnabled(fx.restaurantId, page);

  const payBtn = page.getByRole("button", { name: /Pay \(mock UPI\)|Pay with UPI \(test\)/i });
  await expect(payBtn).toBeVisible();
  await payBtn.click();
  if (await page.getByPlaceholder(/Phone/i).isVisible({ timeout: 2000 }).catch(() => false)) {
    await guestLoginViaUi(page, fx.devGuestPhone, fx.otpBypass);
    await payBtn.click();
  }

  await page.waitForURL(/\/orders\/[0-9a-f-]+/, { timeout: 25_000 });
  const match = page.url().match(/\/orders\/([0-9a-f-]+)/i);
  if (!match) throw new Error("Order id not found in URL");
  await expect(page.getByText(/Order tracking|Status/i)).toBeVisible();
  return match[1];
}

export async function guestLoginViaUi(
  page: import("@playwright/test").Page,
  phone: string,
  otp: string,
  name = "E2E Guest",
) {
  await guestSeedSession(page, phone, otp, name);
}
