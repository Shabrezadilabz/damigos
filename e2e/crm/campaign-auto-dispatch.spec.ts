import { expect, test } from "@playwright/test";
import { crmOtpToken, crmTopUpWallet, loadE2eFixtures } from "../fixtures";

const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

test.describe("P1-T07 scheduled campaign worker", () => {
  test("TC-C-052 due scheduled campaign auto-dispatches to Sent", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");
    test.skip(
      process.env.CAMPAIGN_SCHEDULER_ENABLED !== "true",
      "Set CAMPAIGN_SCHEDULER_ENABLED=true on crm-api",
    );

    const token = await crmOtpToken(fx!.devOwnerPhone, fx!.otpBypass);
    await crmTopUpWallet(fx!.restaurantId, token);

    const create = await fetch(`${crmApi}/v1/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        restaurantId: fx!.restaurantId,
        name: "E2E auto dispatch",
        audience: "all",
        templateKey: "weekend_special",
      }),
    });
    expect(create.ok).toBe(true);
    const { campaign } = (await create.json()) as { campaign: { id: string } };

    const past = new Date(Date.now() - 60_000).toISOString();
    const schedule = await fetch(`${crmApi}/v1/campaigns/${campaign.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ restaurantId: fx!.restaurantId, scheduledAt: past }),
    });
    expect(schedule.ok).toBe(true);

    let status = "Scheduled";
    for (let i = 0; i < 25; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      const list = await fetch(
        `${crmApi}/v1/campaigns?restaurantId=${fx!.restaurantId}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      const data = (await list.json()) as { campaigns: { id: string; status: string }[] };
      const row = data.campaigns.find((c) => c.id === campaign.id);
      status = row?.status ?? status;
      if (status === "Sent") break;
    }

    expect(status).toBe("Sent");
  });
});
