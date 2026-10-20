import { expect, test } from "@playwright/test";
import { loadE2eFixtures } from "../fixtures";

test.describe("TC-G-001 scan resolve", () => {
  test("valid token lands on Spark bridge then play with scan param", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "Start guest-api with ENABLE_DEV_FIXTURES=true and db:seed");

    await page.goto(`/s/${fx!.sampleScanToken}`);
    await page.waitForURL(/\/wa\/spark\?/, { timeout: 15_000 });
    await expect(page.getByText(/Unlock rewards on Spark/i)).toBeVisible();

    await page.getByRole("button", { name: /Continue to play/i }).click();
    await page.waitForURL(/\/r\/.+\?scan=/, { timeout: 15_000 });
    await expect(page.getByText(/You scanned our packaging/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /View menu without offer/i })).toBeVisible();
  });

  test("TC-G-002 invalid token shows G-ERR-01", async ({ page }) => {
    await page.goto("/s/not-a-real-token-value");
    await page.waitForURL(/scan-error/, { timeout: 15_000 });
    await expect(page.getByText("G-ERR-01")).toBeVisible();
    await expect(page.getByText(/packaging QR/i)).toBeVisible();
    await expect(page.getByText(/60 minutes/i)).not.toBeVisible();
  });
});
