import { expect, test } from "@playwright/test";
import { crmLoginViaUi, loadE2eFixtures } from "../fixtures";

test.describe("CRM header Grow wallet chip", () => {
  test("T0.3 — wallet balance visible in top header and opens Grow wallet tab", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true and db:seed");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/");
    const chip = page.getByTestId("crm-header-wallet");
    await expect(chip).toBeVisible({ timeout: 15_000 });
    await expect(chip).toContainText(/₹|Wallet/i);
    await chip.click();
    await expect(page).toHaveURL(/grow.*wallet|tab=wallet/i, { timeout: 10_000 });
    await expect(page.getByText(/wallet|broadcast balance|Top up/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
