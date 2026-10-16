import { expect, test } from "@playwright/test";
import { crmLoginViaUi, loadE2eFixtures } from "../fixtures";

test.describe("TC-C-044 Grow campaigns shell", () => {
  test("owner opens Grow tabs and campaign wizard step 1", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "Start guest-api with ENABLE_DEV_FIXTURES=true for fixtures");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/grow?tab=campaigns");
    await expect(page.getByRole("heading", { name: "Grow" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Customers/i })).toBeVisible();

    await page.getByRole("button", { name: "New campaign" }).click();
    await expect(page.getByRole("heading", { name: "New WhatsApp campaign" })).toBeVisible();
    await expect(page.getByText(/Step 1 of 4: Audience/i)).toBeVisible();
    await expect(page.getByText(/1 msg \/ 7 days/i).first()).toBeVisible();
  });
});
