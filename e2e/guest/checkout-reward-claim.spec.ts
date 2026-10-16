import { expect, test } from "@playwright/test";
import {
  guestEnsureProfileAndGameConsent,
  guestOtpToken,
  guestSeedSession,
  guestSpinAndClaim,
  loadE2eFixtures,
} from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("G-04 reward at checkout", () => {
  test("TC-G-024 apply claimed offer on checkout", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.sampleScanToken, "db:seed required");

    const phone = process.env.DEV_GUEST_REWARD_PHONE ?? "9123456782";
    const token = await guestOtpToken(phone, fx!.otpBypass);
    await guestEnsureProfileAndGameConsent(token, "E2E Reward Guest");

    const reward = await guestSpinAndClaim(token, fx!.sampleScanToken, "spin");

    await guestSeedSession(page, phone, fx!.otpBypass, "E2E Reward Guest");
    await page.goto(`/r/${fx!.restaurantId}/menu`);
    await expect(page.getByText("Hyderabadi Chicken Biryani", { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    const addBtn = page.getByRole("button", { name: "ADD" }).first();
    await addBtn.click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await addBtn.click();
    await page.getByRole("button", { name: "Add to cart" }).click();

    await page.getByRole("link", { name: /Cart \(\d+\)/ }).click();
    await page.waitForURL(/\/checkout/, { timeout: 15_000 });

    const claimRadio = page.getByRole("radio").first();
    await expect(claimRadio).toBeVisible({ timeout: 10_000 });
    await claimRadio.check();

    if (reward.prizeType === "flat_off_paise" || reward.prizeType === "percent") {
      await expect(page.getByText(/Reward discount/i)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/−₹|Reward discount/)).toBeVisible();
    }

    const cartRes = await fetch(`${guestApi}/v1/cart?restaurantId=${fx!.restaurantId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const cart = (await cartRes.json()) as { appliedClaim: { claimId: string } | null };
    expect(cart.appliedClaim?.claimId).toBe(reward.claimId);
  });

  test("TC-G-023 scratch mode records play", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.alternateScanToken, "Re-run db:seed for alternateScanToken");

    const phone = process.env.DEV_GUEST_SCRATCH_PHONE ?? "9123456783";
    const token = await guestOtpToken(phone, fx!.otpBypass);
    await guestEnsureProfileAndGameConsent(token, "E2E Scratch Guest");

    const reward = await guestSpinAndClaim(token, fx!.alternateScanToken!, "scratch");
    expect(reward.playId).toBeTruthy();
    expect(reward.claimId).toBeTruthy();
  });
});
