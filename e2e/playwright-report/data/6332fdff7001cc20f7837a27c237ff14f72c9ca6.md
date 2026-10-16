# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guest\checkout.spec.ts >> P0 checkout smoke >> TC-G-040/046/050 menu add and mock pay
- Location: guest\checkout.spec.ts:5:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
Call log:
  - waiting for getByRole('heading', { name: /Verify your phone|Complete your profile once/i }) to be hidden
    43 × locator resolved to visible <h2 class="font-[family-name:var(--font-display)] text-lg font-bold">Verify your phone</h2>

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - main [ref=f1e2]:
    - generic [ref=f1e3]:
      - link "← Orders" [ref=f1e4] [cursor=pointer]:
        - /url: /orders
      - generic [ref=f1e5]: Biryani Box Koramangala
      - link "Cart" [ref=f1e6] [cursor=pointer]:
        - /url: /r/12d3cb82-c036-4f3c-b8f8-51463a49f4d1/checkout
    - list [ref=f1e7]:
      - listitem [ref=f1e8]:
        - generic [ref=f1e10]:
          - paragraph [ref=f1e11]: Hyderabadi Chicken Biryani
          - paragraph [ref=f1e12]: Slow-cooked dum biryani
          - paragraph [ref=f1e13]: ₹249.00
        - button "ADD" [ref=f1e14]
      - listitem [ref=f1e15]:
        - generic [ref=f1e17]:
          - paragraph [ref=f1e18]: Paneer Butter Masala
          - paragraph [ref=f1e19]: With butter naan combo
          - paragraph [ref=f1e20]: ₹189.00
        - button "ADD" [ref=f1e21]
      - listitem [ref=f1e22]:
        - generic [ref=f1e24]:
          - paragraph [ref=f1e25]: E2E Publish 1792072019056
          - paragraph [ref=f1e26]: ₹99.00
        - button "ADD" [ref=f1e27]
      - listitem [ref=f1e28]:
        - generic [ref=f1e30]:
          - paragraph [ref=f1e31]: E2E Publish 1792072076016
          - paragraph [ref=f1e32]: ₹99.00
        - button "ADD" [ref=f1e33]
      - listitem [ref=f1e34]:
        - generic [ref=f1e36]:
          - paragraph [ref=f1e37]: E2E Publish 1792072353577
          - paragraph [ref=f1e38]: ₹99.00
        - button "ADD" [ref=f1e39]
      - listitem [ref=f1e40]:
        - generic [ref=f1e42]:
          - paragraph [ref=f1e43]: E2E Publish 1792072446748
          - paragraph [ref=f1e44]: ₹99.00
        - button "ADD" [ref=f1e45]
      - listitem [ref=f1e46]:
        - generic [ref=f1e48]:
          - paragraph [ref=f1e49]: E2E Publish 1792072553965
          - paragraph [ref=f1e50]: ₹99.00
        - button "ADD" [ref=f1e51]
      - listitem [ref=f1e52]:
        - generic [ref=f1e54]:
          - paragraph [ref=f1e55]: E2E Publish 1792072672271
          - paragraph [ref=f1e56]: ₹99.00
        - button "ADD" [ref=f1e57]
      - listitem [ref=f1e58]:
        - generic [ref=f1e60]:
          - paragraph [ref=f1e61]: E2E Publish 1792072733131
          - paragraph [ref=f1e62]: ₹99.00
        - button "ADD" [ref=f1e63]
      - listitem [ref=f1e64]:
        - generic [ref=f1e66]:
          - paragraph [ref=f1e67]: E2E Publish 1792072792724
          - paragraph [ref=f1e68]: ₹99.00
        - button "ADD" [ref=f1e69]
      - listitem [ref=f1e70]:
        - generic [ref=f1e72]:
          - paragraph [ref=f1e73]: E2E Publish 1792072921126
          - paragraph [ref=f1e74]: ₹99.00
        - button "ADD" [ref=f1e75]
      - listitem [ref=f1e76]:
        - generic [ref=f1e78]:
          - paragraph [ref=f1e79]: E2E Publish 1792079537515
          - paragraph [ref=f1e80]: ₹99.00
        - button "ADD" [ref=f1e81]
      - listitem [ref=f1e82]:
        - generic [ref=f1e84]:
          - paragraph [ref=f1e85]: E2E Publish 1792079738045
          - paragraph [ref=f1e86]: ₹99.00
        - button "ADD" [ref=f1e87]
      - listitem [ref=f1e88]:
        - generic [ref=f1e90]:
          - paragraph [ref=f1e91]: E2E Publish 1792079944978
          - paragraph [ref=f1e92]: ₹99.00
        - button "ADD" [ref=f1e93]
      - listitem [ref=f1e94]:
        - generic [ref=f1e96]:
          - paragraph [ref=f1e97]: E2E Publish 1792080041286
          - paragraph [ref=f1e98]: ₹99.00
        - button "ADD" [ref=f1e99]
      - listitem [ref=f1e100]:
        - generic [ref=f1e102]:
          - paragraph [ref=f1e103]: E2E Publish 1792081286330
          - paragraph [ref=f1e104]: ₹99.00
        - button "ADD" [ref=f1e105]
      - listitem [ref=f1e106]:
        - generic [ref=f1e108]:
          - paragraph [ref=f1e109]: E2E Publish 1792081549098
          - paragraph [ref=f1e110]: ₹99.00
        - button "ADD" [ref=f1e111]
      - listitem [ref=f1e112]:
        - generic [ref=f1e114]:
          - paragraph [ref=f1e115]: E2E Publish 1792081932971
          - paragraph [ref=f1e116]: ₹99.00
        - button "ADD" [ref=f1e117]
      - listitem [ref=f1e118]:
        - generic [ref=f1e120]:
          - paragraph [ref=f1e121]: E2E Publish 1792082262822
          - paragraph [ref=f1e122]: ₹99.00
        - button "ADD" [ref=f1e123]
      - listitem [ref=f1e124]:
        - generic [ref=f1e126]:
          - paragraph [ref=f1e127]: E2E Publish 1792085862362
          - paragraph [ref=f1e128]: ₹99.00
        - button "ADD" [ref=f1e129]
      - listitem [ref=f1e130]:
        - generic [ref=f1e132]:
          - paragraph [ref=f1e133]: E2E Publish 1792086254190
          - paragraph [ref=f1e134]: ₹99.00
        - button "ADD" [ref=f1e135]
      - listitem [ref=f1e136]:
        - generic [ref=f1e138]:
          - paragraph [ref=f1e139]: E2E Publish 1792086424957
          - paragraph [ref=f1e140]: ₹99.00
        - button "ADD" [ref=f1e141]
    - generic [ref=f1e143]:
      - heading "Hyderabadi Chicken Biryani" [level=3] [ref=f1e144]
      - paragraph [ref=f1e145]: ₹249.00
      - generic [ref=f1e146]:
        - button "−" [ref=f1e147]
        - generic [ref=f1e148]: "1"
        - button "+" [ref=f1e149]
      - button "Add to cart" [ref=f1e150]
      - button "Cancel" [ref=f1e151]
    - generic [ref=f1e153]:
      - generic [ref=f1e154]: Cart empty
      - link "View cart" [ref=f1e155] [cursor=pointer]:
        - /url: /r/12d3cb82-c036-4f3c-b8f8-51463a49f4d1/checkout
    - generic [ref=f1e157]:
      - heading "Verify your phone" [level=2] [ref=f1e158]
      - paragraph [ref=f1e159]: Marketing and game consent are separate from order updates (DPDP).
      - generic [ref=f1e160]:
        - textbox "Phone (+91)" [ref=f1e161]: "9123456780"
        - 'textbox "OTP (dev: 000000)" [ref=f1e162]': "000000"
        - button "Verify" [ref=f1e163]
      - paragraph [ref=f1e164]: Failed to fetch
  - button "Open Next.js Dev Tools" [ref=f1e170] [cursor=pointer]
  - alert [ref=f1e174]
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