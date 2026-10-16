# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cross\kitchen-flow.spec.ts >> Kitchen accept after guest pay >> mock checkout → CRM Accept → guest track ACCEPTED
- Location: cross\kitchen-flow.spec.ts:10:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('heading', { name: /Verify your phone|Complete your profile once/i }) to be hidden
    43 × locator resolved to visible <h2 class="font-[family-name:var(--font-display)] text-lg font-bold">Verify your phone</h2>

```

# Test source

```ts
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
  185 |   await page.waitForURL("/", { timeout: 15_000 });
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
> 272 |     .waitFor({ state: "hidden", timeout: 20_000 });
      |      ^ TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
  273 | }
  274 | 
```