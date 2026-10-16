import { expect, test } from "@playwright/test";
import { guestMockCheckoutUi, loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("TC-G-058 Razorpay stub checkout", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${guestApi}/v1/checkout/config`, { cache: "no-store" });
    const data = (await res.json()) as { paymentMode: string };
    test.skip(data.paymentMode !== "stub", "Set PAYMENT_MODE=stub on guest-api for this test");
  });

  test("prepare + confirm-stub reaches PAID track page", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true and db:seed");

    await guestMockCheckoutUi(page, fx);
    await expect(page.locator("main")).toContainText("PAID");
  });
});
