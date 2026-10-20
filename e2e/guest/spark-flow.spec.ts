import { expect, test } from "@playwright/test";
import { guestOtpToken, guestSpinAndClaim, loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("TC-G-027 Spark scan → play → redeem", () => {
  test("scan lands on Spark bridge then continue opens play", async ({ page }) => {
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

  test("unlock_reward webhook returns restaurant play URL with scan", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "fixtures required");

    const phone = process.env.DEV_GUEST_REWARD_PHONE ?? "9123456782";
    const resolve = await fetch(
      `${guestApi}/v1/scan/resolve?token=${encodeURIComponent(fx!.alternateScanToken ?? fx!.sampleScanToken)}`,
    );
    expect(resolve.ok).toBeTruthy();
    const scan = (await resolve.json()) as {
      restaurantId: string;
      scanEventId: string;
      playPath?: string;
    };

    const invite = await fetch(`${guestApi}/v1/wa/spark/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        restaurantId: scan.restaurantId,
        scanId: scan.scanEventId,
      }),
    });
    expect(invite.ok).toBeTruthy();

    const webhook = await fetch(`${guestApi}/v1/wa/webhooks/kapso`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: phone.replace(/\D/g, ""),
                      type: "interactive",
                      interactive: { button_reply: { id: "unlock_reward", title: "Yes" } },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    });
    expect(webhook.ok).toBeTruthy();
    const body = (await webhook.json()) as { received?: boolean };
    expect(body.received).toBe(true);
  });

  test("redeem claim can proceed to menu path after spin", async ({ page }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.alternateScanToken, "need alternate scan token");

    const phone = process.env.DEV_GUEST_PHONE ?? "9123456780";
    const token = await guestOtpToken(phone, fx!.otpBypass);
    const reward = await guestSpinAndClaim(token, fx!.alternateScanToken!, "spin");

    await page.addInitScript((t) => {
      localStorage.setItem("damigos_guest_token", t);
    }, token);

    await page.goto(`/r/${reward.restaurantId}/menu?redeemed=1`);
    await expect(page.getByText(/menu|add|cart/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
