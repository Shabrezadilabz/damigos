# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: crm\campaign-schedule.spec.ts >> Campaign schedule + wallet >> TC-C-049 insufficient wallet surfaces in wizard
- Location: crm\campaign-schedule.spec.ts:29:7

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation to "/" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - heading "New restaurant" [level=1] [ref=e4]
      - paragraph [ref=e5]: Onboarding form — P1
      - button "Continue" [disabled]
    - generic [ref=e6]:
      - heading "Owner login" [level=2] [ref=e7]
      - paragraph [ref=e8]: "Dev OTP: 000000 · seed owner 9876543210"
      - generic [ref=e9]:
        - textbox "Phone" [ref=e10]: "9876543210"
        - textbox "OTP" [ref=e11]: "000000"
        - button "Verify & enter CRM" [ref=e12]
      - paragraph [ref=e13]: Failed to fetch
      - link "Skip (menu may 401)" [ref=e14] [cursor=pointer]:
        - /url: /
  - button "Open Next.js Dev Tools" [ref=e20] [cursor=pointer]
  - alert [ref=e24]
```

# Test source

```ts
  85  |     headers: {
  86  |       "Content-Type": "application/json",
  87  |       Authorization: `Bearer ${guestToken}`,
  88  |     },
  89  |     body: JSON.stringify({ restaurantId, menuItemId, quantity: 1 }),
  90  |   });
  91  | 
  92  |   const deliveryCfg = await fetch(`${guestApi}/v1/delivery/config`, { cache: "no-store" });
  93  |   const dcfg = (await deliveryCfg.json()) as { mode: string };
  94  |   if (dcfg.mode === "mock") {
  95  |     await fetch(`${guestApi}/v1/delivery/quote`, {
  96  |       method: "POST",
  97  |       headers: {
  98  |         "Content-Type": "application/json",
  99  |         Authorization: `Bearer ${guestToken}`,
  100 |       },
  101 |       body: JSON.stringify({ restaurantId, pincode: "560034" }),
  102 |     });
  103 |   }
  104 | 
  105 |   const idempotencyKey = crypto.randomUUID();
  106 |   const prep = await fetch(`${guestApi}/v1/checkout/prepare`, {
  107 |     method: "POST",
  108 |     headers: {
  109 |       "Content-Type": "application/json",
  110 |       Authorization: `Bearer ${guestToken}`,
  111 |       "Idempotency-Key": idempotencyKey,
  112 |     },
  113 |     body: JSON.stringify({ restaurantId }),
  114 |   });
  115 |   const prepData = (await prep.json()) as {
  116 |     orderId?: string;
  117 |     razorpayOrderId?: string;
  118 |     error?: { message: string };
  119 |   };
  120 |   if (!prep.ok || !prepData.orderId || !prepData.razorpayOrderId) {
  121 |     throw new Error(prepData.error?.message ?? "Prepare checkout failed");
  122 |   }
  123 |   return { orderId: prepData.orderId, razorpayOrderId: prepData.razorpayOrderId };
  124 | }
  125 | 
  126 | export async function crmTopUpWallet(restaurantId: string, token: string) {
  127 |   const res = await fetch(`${crmApi}/v1/wallet/topup`, {
  128 |     method: "POST",
  129 |     headers: {
  130 |       "Content-Type": "application/json",
  131 |       Authorization: `Bearer ${token}`,
  132 |       "Idempotency-Key": crypto.randomUUID(),
  133 |     },
  134 |     body: JSON.stringify({ restaurantId, amountPaise: 99900 }),
  135 |   });
  136 |   if (!res.ok) {
  137 |     const data = (await res.json()) as { error?: { message: string } };
  138 |     throw new Error(data.error?.message ?? "CRM wallet top-up failed");
  139 |   }
  140 | }
  141 | 
  142 | export async function crmOtpToken(ownerPhone: string, otp: string): Promise<string> {
  143 |   const res = await fetch(`${crmApi}/v1/auth/otp/verify`, {
  144 |     method: "POST",
  145 |     headers: { "Content-Type": "application/json" },
  146 |     body: JSON.stringify({ phone: ownerPhone, code: otp }),
  147 |   });
  148 |   const data = (await res.json()) as { token?: string; error?: { message: string } };
  149 |   if (!res.ok || !data.token) throw new Error(data.error?.message ?? "CRM login failed");
  150 |   return data.token;
  151 | }
  152 | 
  153 | export async function publishMenuItemIds(
  154 |   restaurantId: string,
  155 |   token: string,
  156 |   itemIds: string[],
  157 | ): Promise<void> {
  158 |   const res = await fetch(`${crmApi}/v1/menu/publish`, {
  159 |     method: "POST",
  160 |     headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  161 |     body: JSON.stringify({ restaurantId, itemIds }),
  162 |   });
  163 |   if (!res.ok) {
  164 |     const data = (await res.json()) as { error?: { message: string } };
  165 |     throw new Error(data.error?.message ?? "Publish failed");
  166 |   }
  167 | }
  168 | 
  169 | export async function fetchGuestMenuNames(restaurantId: string): Promise<string[]> {
  170 |   const res = await fetch(`${guestApi}/v1/restaurants/${restaurantId}/menu`, { cache: "no-store" });
  171 |   if (!res.ok) return [];
  172 |   const data = (await res.json()) as { items: { name: string }[] };
  173 |   return data.items.map((i) => i.name);
  174 | }
  175 | 
  176 | export async function crmLoginViaUi(
  177 |   page: import("@playwright/test").Page,
  178 |   ownerPhone: string,
  179 |   otp: string,
  180 | ) {
  181 |   await page.goto("/start");
  182 |   await page.getByPlaceholder("Phone").fill(ownerPhone);
  183 |   await page.getByPlaceholder("OTP").fill(otp);
  184 |   await page.getByRole("button", { name: /Verify & enter CRM/i }).click();
> 185 |   await page.waitForURL("/", { timeout: 15_000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  186 | }
  187 | 
  188 | export type E2eFixturesLoaded = NonNullable<Awaited<ReturnType<typeof loadE2eFixtures>>>;
  189 | 
  190 | async function ensureMockDeliveryQuoteIfEnabled(restaurantId: string, page: import("@playwright/test").Page) {
  191 |   const configRes = await fetch(`${guestApi}/v1/delivery/config`, { cache: "no-store" });
  192 |   const config = (await configRes.json()) as { mode: string };
  193 |   if (config.mode !== "mock") return;
  194 | 
  195 |   const token = await page.evaluate(() => localStorage.getItem("damigos_guest_token"));
  196 |   if (!token) return;
  197 | 
  198 |   await fetch(`${guestApi}/v1/delivery/quote`, {
  199 |     method: "POST",
  200 |     headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  201 |     body: JSON.stringify({ restaurantId, pincode: "560034" }),
  202 |   });
  203 | }
  204 | 
  205 | /** Menu → cart → mock/stub pay → order track. Returns order UUID from URL. */
  206 | export async function guestMockCheckoutUi(
  207 |   page: import("@playwright/test").Page,
  208 |   fx: E2eFixturesLoaded,
  209 | ): Promise<string> {
  210 |   const { expect } = await import("@playwright/test");
  211 | 
  212 |   await page.goto(`/r/${fx.restaurantId}/menu`);
  213 |   await expect(page.getByText("Hyderabadi Chicken Biryani", { exact: true })).toBeVisible({
  214 |     timeout: 10_000,
  215 |   });
  216 | 
  217 |   await page.getByRole("button", { name: "ADD" }).first().click();
  218 |   await page.getByRole("button", { name: "Add to cart" }).click();
  219 | 
  220 |   if (
  221 |     await page
  222 |       .getByRole("heading", { name: /Verify your phone|Complete your profile once/i })
  223 |       .isVisible({ timeout: 5000 })
  224 |       .catch(() => false)
  225 |   ) {
  226 |     await guestLoginViaUi(page, fx.devGuestPhone, fx.otpBypass);
  227 |   }
  228 | 
  229 |   const cartLink = page.getByRole("link", { name: /Cart \(\d+\)/ });
  230 |   await expect(cartLink).toBeVisible({ timeout: 20_000 });
  231 |   await cartLink.click();
  232 | 
  233 |   await ensureMockDeliveryQuoteIfEnabled(fx.restaurantId, page);
  234 | 
  235 |   const payBtn = page.getByRole("button", { name: /Pay \(mock UPI\)|Pay with UPI \(test\)/i });
  236 |   await expect(payBtn).toBeVisible();
  237 |   await payBtn.click();
  238 |   if (await page.getByPlaceholder(/Phone/i).isVisible({ timeout: 2000 }).catch(() => false)) {
  239 |     await guestLoginViaUi(page, fx.devGuestPhone, fx.otpBypass);
  240 |     await payBtn.click();
  241 |   }
  242 | 
  243 |   await page.waitForURL(/\/orders\/[0-9a-f-]+/, { timeout: 25_000 });
  244 |   const match = page.url().match(/\/orders\/([0-9a-f-]+)/i);
  245 |   if (!match) throw new Error("Order id not found in URL");
  246 |   await expect(page.getByText(/Order tracking|Status/i)).toBeVisible();
  247 |   return match[1];
  248 | }
  249 | 
  250 | export async function guestLoginViaUi(
  251 |   page: import("@playwright/test").Page,
  252 |   phone: string,
  253 |   otp: string,
  254 |   name = "E2E Guest",
  255 | ) {
  256 |   const phoneInput = page.getByPlaceholder(/Phone/i);
  257 |   if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
  258 |     await phoneInput.fill(phone);
  259 |     await page.getByPlaceholder(/OTP/i).fill(otp);
  260 |     await page.getByRole("button", { name: /^Verify$/i }).click();
  261 |   }
  262 | 
  263 |   const nameInput = page.getByPlaceholder("Your name");
  264 |   if (await nameInput.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false)) {
  265 |     await nameInput.fill(name);
  266 |     await page.getByLabel(/transactional messages/i).check();
  267 |     await page.getByRole("button", { name: /Save & continue/i }).click();
  268 |   }
  269 | 
  270 |   await page
  271 |     .getByRole("heading", { name: /Verify your phone|Complete your profile once/i })
  272 |     .waitFor({ state: "hidden", timeout: 20_000 });
  273 | }
  274 | 
```