import { expect, test } from "@playwright/test";
import { crmLoginViaUi, guestMockCheckoutUi, loadE2eFixtures } from "../fixtures";

const guestBase = process.env.GUEST_WEB_URL ?? "http://localhost:3000";
const crmBase = process.env.CRM_WEB_URL ?? "http://localhost:3001";
const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

/** P0-T30-e · TC-C-061 (partial) · TC-G-070 (partial) */
test.describe("Kitchen accept after guest pay", () => {
  test("mock checkout → CRM Accept → guest track ACCEPTED", async ({ browser }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true and db:seed");

    const guestContext = await browser.newContext({ baseURL: guestBase });
    const crmContext = await browser.newContext({ baseURL: crmBase });
    const guestPage = await guestContext.newPage();
    const crmPage = await crmContext.newPage();

    try {
      const orderId = await guestMockCheckoutUi(guestPage, fx);
      const shortId = orderId.slice(0, 8).toUpperCase();

      await crmLoginViaUi(crmPage, fx.devOwnerPhone, fx.otpBypass);
      await crmPage.goto("/orders/kitchen");

      const card = crmPage.getByRole("article").filter({ hasText: `#${shortId}` });
      await expect(card).toBeVisible({ timeout: 20_000 });
      await card.getByRole("button", { name: "Accept", exact: true }).click();
      await expect(card.getByText("ACCEPTED")).toBeVisible({ timeout: 10_000 });

      const guestToken = await guestPage.evaluate(() =>
        localStorage.getItem("damigos_guest_token"),
      );
      await expect
        .poll(
          async () => {
            if (!guestToken) return false;
            const res = await fetch(`${guestApi}/v1/orders/${orderId}`, {
              headers: { Authorization: `Bearer ${guestToken}` },
              cache: "no-store",
            });
            if (!res.ok) return false;
            const data = (await res.json()) as { order?: { status: string } };
            return data.order?.status === "ACCEPTED";
          },
          { timeout: 25_000 },
        )
        .toBe(true);

      await guestPage.bringToFront();
      await guestPage.reload();
      await expect(guestPage.locator("main strong")).toHaveText("ACCEPTED");
    } finally {
      await guestContext.close();
      await crmContext.close();
    }
  });
});
