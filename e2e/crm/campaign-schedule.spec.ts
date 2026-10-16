import { expect, test } from "@playwright/test";
import { crmLoginViaUi, crmOtpToken, crmTopUpWallet, loadE2eFixtures } from "../fixtures";

function tomorrowLocalDatetime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function campaignWizard(page: import("@playwright/test").Page) {
  return page.getByRole("dialog", { name: /New WhatsApp campaign/i });
}

async function openCampaignWizardToReview(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "New campaign" }).click();
  const wizard = campaignWizard(page);
  await expect(wizard).toBeVisible();
  await wizard.getByLabel(/Campaign name/i).fill("E2E insufficient test");
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
  await wizard.getByLabel(/Send at/i).fill(tomorrowLocalDatetime());
  await wizard.getByRole("button", { name: "Next", exact: true }).click();
  await expect(wizard.getByText(/Step 4 of 4: Review/i)).toBeVisible();
}

test.describe("Campaign schedule + wallet", () => {
  test("TC-C-049 insufficient wallet surfaces in wizard", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/grow?tab=campaigns");

    await page.route("**/v1/campaigns/*/schedule", async (route) => {
      await route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INSUFFICIENT_WALLET",
            message: "Top up wallet before scheduling broadcasts",
          },
        }),
      });
    });

    await openCampaignWizardToReview(page);
    await campaignWizard(page).getByRole("button", { name: "Schedule campaign" }).click();
    await expect(page.getByText(/Insufficient wallet|Top up wallet/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("TC-C-051 schedule after top-up shows Scheduled + ledger debit", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);
    await crmTopUpWallet(fx!.restaurantId, token);

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/grow?tab=campaigns");

    await page.getByRole("button", { name: "New campaign" }).click();
    const wizard = campaignWizard(page);
    await wizard.getByLabel(/Campaign name/i).fill("E2E broadcast");
    await wizard.getByRole("button", { name: "Next", exact: true }).click();
    await wizard.getByRole("button", { name: "Next", exact: true }).click();
    await wizard.getByLabel(/Send at/i).fill(tomorrowLocalDatetime());
    await wizard.getByRole("button", { name: "Next", exact: true }).click();
    await wizard.getByRole("button", { name: "Schedule campaign" }).click();

    await expect(page.getByText("Scheduled").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("E2E broadcast")).toBeVisible();

    await page.goto("/grow?tab=wallet");
    await expect(page.locator("ul li").filter({ hasText: /campaign debit/i }).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
