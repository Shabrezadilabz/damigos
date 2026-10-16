import { expect, test } from "@playwright/test";
import { loadE2eFixtures } from "../fixtures";

test.describe("P1-T13 guest error states", () => {
  test("TC-G-004 revoked sticker shows G-ERR-03", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.revokedScanToken, "Re-run db:seed for revokedScanToken fixture");

    await page.goto(`/s/${fx!.revokedScanToken}`);
    await page.waitForURL(/scan-error/, { timeout: 15_000 });
    await expect(page.getByText("G-ERR-03")).toBeVisible();
    await expect(page.getByText(/Sticker no longer valid/i)).toBeVisible();
  });

  test("TC-G-003 expired sticker shows G-ERR-02 (packaging copy)", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.expiredScanToken, "Re-run db:seed for expiredScanToken fixture");

    await page.goto(`/s/${fx!.expiredScanToken}`);
    await page.waitForURL(/scan-error/, { timeout: 15_000 });
    await expect(page.getByText("G-ERR-02")).toBeVisible();
    await expect(page.getByText(/10–15 days|packaging stickers/i)).toBeVisible();
    await expect(page.getByText(/60 minutes/i)).not.toBeVisible();
  });

  test("G-11 payment failed page shows retry and amount", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const q = new URLSearchParams({
      restaurantId: fx!.restaurantId,
      totalPaise: "56060",
      reason: "UPI session timed out",
    });
    await page.goto(`/payment-failed?${q}`);
    await expect(page.getByText("G-ERR-PAY")).toBeVisible();
    await expect(page.getByText(/Payment did not go through/i)).toBeVisible();
    await expect(page.getByText(/₹560\.60|560\.60/)).toBeVisible();
    await expect(page.getByText("UPI session timed out")).toBeVisible();
    await expect(page.getByRole("link", { name: /Try payment again/i })).toHaveAttribute(
      "href",
      `/r/${fx!.restaurantId}/checkout`,
    );
  });

  test("G-15 kitchen paused read-only menu", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.pausedRestaurantId, "Re-run db:seed for pausedRestaurantId");

    await page.goto(`/r/${fx!.pausedRestaurantId}/menu`);
    await expect(page.getByText("G-ERR-06")).toBeVisible();
    await expect(page.getByText(/Direct ordering paused/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /ADD/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Discover other kitchens/i })).toBeVisible();
  });
});
