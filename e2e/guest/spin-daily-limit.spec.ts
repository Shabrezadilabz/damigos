import { expect, test } from "@playwright/test";
import { guestOtpToken, guestResolveScan, loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";

test.describe("TC-G-021 daily spin limit", () => {
  test("second spin same day blocked when logged in", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx?.alternateScanToken, "Re-run db:seed for 2+ sticker tokens in DEV-BATCH-001");

    const spinPhone = process.env.DEV_GUEST_SPIN_PHONE ?? "9123456781";
    const token = await guestOtpToken(spinPhone, fx!.otpBypass);
    await fetch(`${guestApi}/v1/me/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: "E2E Spin Guest" }),
    });
    await fetch(`${guestApi}/v1/me/consents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactional: true, marketing: false, game: true }),
    });
    const first = await guestResolveScan(fx!.sampleScanToken);

    const spin1 = await fetch(`${guestApi}/v1/rewards/spin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        restaurantId: first.restaurantId,
        scanId: first.scanEventId,
        mode: "spin",
      }),
    });
    expect(spin1.ok).toBeTruthy();
    const play1 = (await spin1.json()) as { playId: string };

    const claim = await fetch(`${guestApi}/v1/rewards/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ playId: play1.playId }),
    });
    expect(claim.ok).toBeTruthy();

    const second = await guestResolveScan(fx!.alternateScanToken!);
    const spin2 = await fetch(`${guestApi}/v1/rewards/spin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        restaurantId: second.restaurantId,
        scanId: second.scanEventId,
        mode: "spin",
      }),
    });
    expect(spin2.status).toBe(429);
    const err = (await spin2.json()) as { error?: { code: string } };
    expect(err.error?.code).toBe("SPIN_DAILY_LIMIT");
  });
});
