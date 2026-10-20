import { expect, test } from "@playwright/test";
import { guestMockCheckoutUi, loadE2eFixtures } from "../fixtures";

test.describe("G-06 orders home", () => {
  test("TC-G-080/081 active tab lists order; reorder opens menu", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true and db:seed");

    await guestMockCheckoutUi(page, fx);

    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: /Your Orders/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Active/i })).toBeVisible();
    await expect(page.getByRole("listitem").first()).toContainText("Biryani Box Koramangala", {
      timeout: 10_000,
    });

    await page.getByRole("link", { name: "Reorder" }).first().click();
    await page.waitForURL(new RegExp(`/r/${fx.restaurantId}/menu`), { timeout: 10_000 });
    await expect(page.getByText("Hyderabadi Chicken Biryani", { exact: true })).toBeVisible();

    await page.goto("/orders");
    await page.getByRole("button", { name: /Past/i }).click();
    await expect(page.getByText(/No past orders/i)).toBeVisible({ timeout: 5000 });
  });
});
