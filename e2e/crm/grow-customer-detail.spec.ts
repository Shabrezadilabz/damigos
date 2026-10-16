import { expect, test } from "@playwright/test";
import { crmLoginViaUi, guestMockCheckoutUi, guestSeedSession, loadE2eFixtures } from "../fixtures";

test.describe("C-04.03 customer detail", () => {
  test("TC-C-043 drawer shows recent orders", async ({ page, browser }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const guestContext = await browser.newContext({
      baseURL: process.env.GUEST_WEB_URL ?? "http://localhost:3000",
    });
    const guestPage = await guestContext.newPage();
    await guestSeedSession(guestPage, fx!.devGuestPhone, fx!.otpBypass);
    await guestMockCheckoutUi(guestPage, fx!);
    await guestContext.close();

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/grow?tab=customers");

    await expect(page.getByTestId("grow-customer-row").first()).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("grow-customer-row").first().click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("customer-recent-orders").locator("li").first()).toBeVisible();
    await expect(page.getByText(/Recent orders/i)).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
  });
});
