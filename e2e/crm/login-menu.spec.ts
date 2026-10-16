import { expect, test } from "@playwright/test";
import { crmLoginViaUi, loadE2eFixtures } from "../fixtures";

test.describe("TC-C-002 CRM owner login", () => {
  test("owner reaches menu with draft tab", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "Start guest-api with ENABLE_DEV_FIXTURES=true for fixtures");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/menu");
    await expect(page.getByRole("heading", { name: "Menu" })).toBeVisible();
    await expect(page.getByText(/Draft|Live/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
