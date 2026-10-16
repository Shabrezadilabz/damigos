import { expect, test } from "@playwright/test";
import { crmLoginViaUi, loadE2eFixtures } from "../fixtures";

test.describe("C-04.07 AI poster", () => {
  test("TC-C-054 generate then approve poster", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/grow?tab=poster");

    await page.getByTestId("poster-headline").fill("E2E Poster Headline");
    await page.getByRole("button", { name: "Generate preview" }).click();
    await expect(page.getByTestId("poster-preview")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("E2E Poster Headline")).toBeVisible();

    await page.getByRole("button", { name: "Approve poster" }).click();
    await expect(page.getByTestId("poster-approved")).toBeVisible({ timeout: 10_000 });
  });
});
