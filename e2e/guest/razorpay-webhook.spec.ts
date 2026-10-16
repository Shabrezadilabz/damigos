import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { guestOtpToken, guestStubPrepareOrder, loadE2eFixtures } from "../fixtures";

const guestApi = process.env.GUEST_API_URL ?? "http://localhost:4000";
const webhookSecret =
  process.env.RAZORPAY_WEBHOOK_SECRET ?? "ci-test-razorpay-webhook-secret-min-32-chars";

function signWebhook(rawBody: string) {
  return createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
}

test.describe("TC-G-058 Razorpay webhook (raw body)", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${guestApi}/v1/checkout/config`, { cache: "no-store" });
    const data = (await res.json()) as { paymentMode: string };
    test.skip(data.paymentMode !== "stub", "Set PAYMENT_MODE=stub on guest-api");
  });

  test("signed webhook captures order (PAID)", async () => {
    const fx = await loadE2eFixtures();
    test.skip(!fx, "ENABLE_DEV_FIXTURES=true");

    const token = await guestOtpToken(fx!.devGuestPhone, fx!.otpBypass);
    const { orderId, razorpayOrderId } = await guestStubPrepareOrder(fx!.restaurantId, token);

    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_e2e_${orderId.slice(0, 8)}`,
            order_id: razorpayOrderId,
            status: "captured",
          },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const sig = signWebhook(rawBody);

    const wh = await fetch(`${guestApi}/v1/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": sig,
      },
      body: rawBody,
    });
    expect(wh.ok).toBeTruthy();

    const orderRes = await fetch(`${guestApi}/v1/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const order = (await orderRes.json()) as { order: { status: string } };
    expect(order.order.status).toBe("PAID");
  });

  test("invalid signature rejected", async () => {
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const wh = await fetch(`${guestApi}/v1/webhooks/razorpay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": "bad-signature",
      },
      body: rawBody,
    });
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      test.skip(true, "Set RAZORPAY_WEBHOOK_SECRET in damigos_main/.env (loaded by playwright.config)");
    }
    expect(wh.status).toBe(401);
  });
});
