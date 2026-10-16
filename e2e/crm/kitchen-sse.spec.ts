import { expect, test } from "@playwright/test";
import {
  crmLoginViaUi,
  crmOtpVerify,
  guestMockCheckoutUi,
  guestSeedSession,
  loadE2eFixtures,
} from "../fixtures";

const crmApi = process.env.CRM_API_URL ?? "http://localhost:4001";

test.describe("C-05.02 kitchen realtime", () => {
  test("TC-C-063 SSE shows new order without manual refresh", async ({ browser }) => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const guestBase = process.env.GUEST_WEB_URL ?? "http://localhost:3000";
    const crmBase = process.env.CRM_WEB_URL ?? "http://localhost:3001";

    const guestContext = await browser.newContext({ baseURL: guestBase });
    const crmContext = await browser.newContext({ baseURL: crmBase });
    const guestPage = await guestContext.newPage();
    const crmPage = await crmContext.newPage();

    try {
      await crmLoginViaUi(crmPage, fx!.devOwnerPhone, fx!.otpBypass);
      await crmPage.goto("/orders/kitchen");
      await expect(crmPage.getByTestId("kitchen-connection-status")).toContainText(/Live \(SSE\)/i, {
        timeout: 15_000,
      });

      await guestSeedSession(guestPage, fx!.devGuestPhone, fx!.otpBypass);
      const orderId = await guestMockCheckoutUi(guestPage, fx!);
      const shortId = orderId.slice(0, 8).toUpperCase();

      await expect(
        crmPage.getByRole("article").filter({ hasText: `#${shortId}` }),
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await guestContext.close();
      await crmContext.close();
    }
  });

  test("TC-C-064 stream requires auth", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const res = await fetch(
      `${crmApi}/v1/kitchen/stream?restaurantId=${fx!.restaurantId}`,
      { headers: { Accept: "text/event-stream" } },
    );
    expect(res.status).toBe(401);
  });

  test("TC-C-064 WS kitchen connects with token", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const { token, restaurantId } = await crmOtpVerify(fx!.devOwnerPhone, fx!.otpBypass);
    const wsBase = crmApi.replace(/^http/, "ws");
    const url = `${wsBase}/v1/ws/kitchen?restaurantId=${restaurantId}&token=${encodeURIComponent(token)}`;

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        reject(new Error("WS connect timeout"));
      }, 10_000);
      ws.onmessage = (ev) => {
        const msg = JSON.parse(String(ev.data)) as { type?: string };
        if (msg.type === "connected") {
          clearTimeout(timer);
          ws.close();
          resolve();
        }
      };
      ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error("WS error"));
      };
    });
  });
});
