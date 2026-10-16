import { expect, test } from "@playwright/test";
import { crmLoginViaUi, loadE2eFixtures } from "../fixtures";

test.describe("TC-C-050 wallet top-up", () => {
  test("owner tops up ₹999 and balance increases", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true and db:seed");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/grow?tab=wallet");
    await expect(page.getByText(/WhatsApp broadcast balance/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Top up ₹999/i }).click();
    await expect(page.getByText("₹999.00").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Ledger")).toBeVisible();
    await expect(page.locator("ul li").filter({ hasText: "topup" }).first()).toBeVisible();
  });
});
