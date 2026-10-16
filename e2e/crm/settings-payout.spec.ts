import { expect, test } from "@playwright/test";
import { crmLoginViaUi, loadE2eFixtures } from "../fixtures";

test.describe("C-06.03 payout & POS stub", () => {
  test("TC-C-073..074 Razorpay status and save POS IDs", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/settings?tab=payout");

    await expect(page.getByTestId("payout-razorpay-status")).toContainText(/KYC pending|Not linked/i, {
      timeout: 15_000,
    });

    await page.getByTestId("payout-petpooja-input").fill("PP-E2E-001");
    await page.getByTestId("payout-restroworks-input").fill("RW-E2E-001");
    await page.getByTestId("payout-pos-save").click();
    await expect(page.getByTestId("payout-pos-saved")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("payout-petpooja-input")).toHaveValue("PP-E2E-001");
    await expect(page.getByTestId("payout-restroworks-input")).toHaveValue("RW-E2E-001");
  });
});
