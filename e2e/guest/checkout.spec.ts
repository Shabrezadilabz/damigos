import { expect, test } from "@playwright/test";
import { guestMockCheckoutUi, loadE2eFixtures } from "../fixtures";

test.describe("P0 checkout smoke", () => {
  test("TC-G-040/046/050 menu add and mock pay", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "Start guest-api with ENABLE_DEV_FIXTURES=true and db:seed");

    await page.goto(`/r/${fx.restaurantId}/menu`);
    await expect(page.getByText("Draft Special (unpublished)", { exact: true })).not.toBeVisible();

    await guestMockCheckoutUi(page, fx);
  });
});
