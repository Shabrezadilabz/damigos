import { expect, test } from "@playwright/test";
import { guestLoginViaUi, loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("TC-G-055 unserviceable pincode", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${guestApi}/v1/delivery/config`, { cache: "no-store" });
    const data = (await res.json()) as { mode: string };
    test.skip(data.mode !== "mock", "Set DELIVERY_MODE=mock on guest-api");
  });

  test("quote fail blocks checkout pay", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true and db:seed");

    await page.goto(`/r/${fx!.restaurantId}/menu`);
    await page.getByRole("button", { name: "ADD" }).first().click();
    await page.getByRole("button", { name: "Add to cart" }).click();

    if (
      await page
        .getByRole("heading", { name: /Verify your phone|Complete your profile once/i })
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await guestLoginViaUi(page, fx!.devGuestPhone, fx!.otpBypass);
    }

    await page.getByRole("link", { name: /Cart \(\d+\)/ }).click();
    await expect(page.getByLabel(/Pincode/i)).toHaveValue("560034", { timeout: 15_000 });
    await expect(page.getByText(/Delivery \(Shiprocket \+ ₹5\)/i)).toBeVisible();

    await page.getByLabel(/Pincode/i).fill("000000");
    await expect(page.getByText(/cannot deliver|not available/i)).toBeVisible({ timeout: 10_000 });

    const pay = page.getByRole("button", { name: /Pay \(mock UPI\)|Pay with UPI \(test\)/i });
    await expect(pay).toBeDisabled();
    await expect(page.getByText(/Fix delivery pincode before paying/i)).toBeVisible();
  });
});
