# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guest\checkout-delivery-unserviceable.spec.ts >> TC-G-055 unserviceable pincode >> quote fail blocks checkout pay
- Location: guest\checkout-delivery-unserviceable.spec.ts:13:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('heading', { name: /Verify your phone|Complete your profile once/i }) to be hidden
    43 × locator resolved to visible <h2 class="font-[family-name:var(--font-display)] text-lg font-bold">Verify your phone</h2>

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - link "← Orders" [ref=e4] [cursor=pointer]:
        - /url: /orders
      - generic [ref=e5]: Biryani Box Koramangala
      - link "Cart" [ref=e6] [cursor=pointer]:
        - /url: /r/12d3cb82-c036-4f3c-b8f8-51463a49f4d1/checkout
    - list [ref=e7]:
      - listitem [ref=e8]:
        - generic [ref=e10]:
          - paragraph [ref=e11]: Hyderabadi Chicken Biryani
          - paragraph [ref=e12]: Slow-cooked dum biryani
          - paragraph [ref=e13]: ₹249.00
        - button "ADD" [ref=e14]
      - listitem [ref=e15]:
        - generic [ref=e17]:
          - paragraph [ref=e18]: Paneer Butter Masala
          - paragraph [ref=e19]: With butter naan combo
          - paragraph [ref=e20]: ₹189.00
        - button "ADD" [ref=e21]
      - listitem [ref=e22]:
        - generic [ref=e24]:
          - paragraph [ref=e25]: E2E Publish 1792072019056
          - paragraph [ref=e26]: ₹99.00
        - button "ADD" [ref=e27]
      - listitem [ref=e28]:
        - generic [ref=e30]:
          - paragraph [ref=e31]: E2E Publish 1792072076016
          - paragraph [ref=e32]: ₹99.00
        - button "ADD" [ref=e33]
      - listitem [ref=e34]:
        - generic [ref=e36]:
          - paragraph [ref=e37]: E2E Publish 1792072353577
          - paragraph [ref=e38]: ₹99.00
        - button "ADD" [ref=e39]
      - listitem [ref=e40]:
        - generic [ref=e42]:
          - paragraph [ref=e43]: E2E Publish 1792072446748
          - paragraph [ref=e44]: ₹99.00
        - button "ADD" [ref=e45]
      - listitem [ref=e46]:
        - generic [ref=e48]:
          - paragraph [ref=e49]: E2E Publish 1792072553965
          - paragraph [ref=e50]: ₹99.00
        - button "ADD" [ref=e51]
      - listitem [ref=e52]:
        - generic [ref=e54]:
          - paragraph [ref=e55]: E2E Publish 1792072672271
          - paragraph [ref=e56]: ₹99.00
        - button "ADD" [ref=e57]
      - listitem [ref=e58]:
        - generic [ref=e60]:
          - paragraph [ref=e61]: E2E Publish 1792072733131
          - paragraph [ref=e62]: ₹99.00
        - button "ADD" [ref=e63]
      - listitem [ref=e64]:
        - generic [ref=e66]:
          - paragraph [ref=e67]: E2E Publish 1792072792724
          - paragraph [ref=e68]: ₹99.00
        - button "ADD" [ref=e69]
      - listitem [ref=e70]:
        - generic [ref=e72]:
          - paragraph [ref=e73]: E2E Publish 1792072921126
          - paragraph [ref=e74]: ₹99.00
        - button "ADD" [ref=e75]
      - listitem [ref=e76]:
        - generic [ref=e78]:
          - paragraph [ref=e79]: E2E Publish 1792079537515
          - paragraph [ref=e80]: ₹99.00
        - button "ADD" [ref=e81]
      - listitem [ref=e82]:
        - generic [ref=e84]:
          - paragraph [ref=e85]: E2E Publish 1792079738045
          - paragraph [ref=e86]: ₹99.00
        - button "ADD" [ref=e87]
      - listitem [ref=e88]:
        - generic [ref=e90]:
          - paragraph [ref=e91]: E2E Publish 1792079944978
          - paragraph [ref=e92]: ₹99.00
        - button "ADD" [ref=e93]
      - listitem [ref=e94]:
        - generic [ref=e96]:
          - paragraph [ref=e97]: E2E Publish 1792080041286
          - paragraph [ref=e98]: ₹99.00
        - button "ADD" [ref=e99]
      - listitem [ref=e100]:
        - generic [ref=e102]:
          - paragraph [ref=e103]: E2E Publish 1792081286330
          - paragraph [ref=e104]: ₹99.00
        - button "ADD" [ref=e105]
      - listitem [ref=e106]:
        - generic [ref=e108]:
          - paragraph [ref=e109]: E2E Publish 1792081549098
          - paragraph [ref=e110]: ₹99.00
        - button "ADD" [ref=e111]
      - listitem [ref=e112]:
        - generic [ref=e114]:
          - paragraph [ref=e115]: E2E Publish 1792081932971
          - paragraph [ref=e116]: ₹99.00
        - button "ADD" [ref=e117]
      - listitem [ref=e118]:
        - generic [ref=e120]:
          - paragraph [ref=e121]: E2E Publish 1792082262822
          - paragraph [ref=e122]: ₹99.00
        - button "ADD" [ref=e123]
      - listitem [ref=e124]:
        - generic [ref=e126]:
          - paragraph [ref=e127]: E2E Publish 1792085862362
          - paragraph [ref=e128]: ₹99.00
        - button "ADD" [ref=e129]
      - listitem [ref=e130]:
        - generic [ref=e132]:
          - paragraph [ref=e133]: E2E Publish 1792086254190
          - paragraph [ref=e134]: ₹99.00
        - button "ADD" [ref=e135]
      - listitem [ref=e136]:
        - generic [ref=e138]:
          - paragraph [ref=e139]: E2E Publish 1792086424957
          - paragraph [ref=e140]: ₹99.00
        - button "ADD" [ref=e141]
    - generic [ref=e143]:
      - heading "Hyderabadi Chicken Biryani" [level=3] [ref=e144]
      - paragraph [ref=e145]: ₹249.00
      - generic [ref=e146]:
        - button "−" [ref=e147]
        - generic [ref=e148]: "1"
        - button "+" [ref=e149]
      - button "Add to cart" [ref=e150]
      - button "Cancel" [ref=e151]
    - generic [ref=e153]:
      - generic [ref=e154]: Cart empty
      - link "View cart" [ref=e155] [cursor=pointer]:
        - /url: /r/12d3cb82-c036-4f3c-b8f8-51463a49f4d1/checkout
    - generic [ref=e157]:
      - heading "Verify your phone" [level=2] [ref=e158]
      - paragraph [ref=e159]: Marketing and game consent are separate from order updates (DPDP).
      - generic [ref=e160]:
        - textbox "Phone (+91)" [ref=e161]: "9123456780"
        - 'textbox "OTP (dev: 000000)" [ref=e162]': "000000"
        - button "Verify" [ref=e163]
      - paragraph [ref=e164]: Failed to fetch
  - button "Open Next.js Dev Tools" [ref=e170] [cursor=pointer]
  - alert [ref=e174]
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