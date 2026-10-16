import { expect, test } from "@playwright/test";
import {
  crmLoginViaUi,
  crmOtpVerify,
  guestMockCheckoutUi,
  guestSeedSession,
  loadE2eFixtures,
} from "../fixtures";

test.describe("C-02 dashboard", () => {
  test("TC-C-010..012 overview KPIs, recent orders, low wallet", async ({ page, browser }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const guestContext = await browser.newContext({
      baseURL: process.env.GUEST_WEB_URL ?? "http://localhost:3000",
    });
    const guestPage = await guestContext.newPage();
    await guestSeedSession(guestPage, fx!.devGuestPhone, fx!.otpBypass);
    await guestMockCheckoutUi(guestPage, fx!);
    await guestContext.close();

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/");

    await expect(page.getByTestId("dashboard-kpi-orders-today")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-kpi-scans-7d")).toBeVisible();
    await expect(page.getByTestId("dashboard-kpi-wallet")).toBeVisible();
    await expect(page.getByTestId("dashboard-low-wallet-banner")).toBeVisible();

    const recent = page.getByTestId("dashboard-recent-orders").locator("tbody tr");
    await expect(recent.first()).toBeVisible();
    expect(await recent.count()).toBeLessThanOrEqual(5);
  });

  test("TC-C-013..014 analytics funnel and CSV export", async ({ page, request }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

    await crmLoginViaUi(page, fx!.devOwnerPhone, fx!.otpBypass);
    await page.goto("/");

    await page.getByTestId("dashboard-tab-analytics").click();
    await expect(page.getByTestId("dashboard-funnel")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("dashboard-export-csv")).toBeVisible();

    const { token, restaurantId } = await crmOtpVerify(fx!.devOwnerPhone, fx!.otpBypass);
    const res = await request.get(
      `${crmApi}/v1/dashboard/analytics?restaurantId=${restaurantId}&range=30d&format=csv`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("funnel,scan");
    expect(body).toContain("orders_by_hour");
  });
});
