import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, paymentIntents } from "@damigos/db";
import { captureOrderPayment } from "../lib/capture-order-payment.js";
import { paymentMode } from "../lib/payment-mode.js";
import { registerWebhookRawBodyScope } from "../lib/raw-body.js";
import { verifyWebhookSignature } from "../lib/razorpay.js";

const webhookPayloadSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z.object({
            id: z.string(),
            order_id: z.string(),
            status: z.string(),
          }),
        })
        .optional(),
      order: z.object({ entity: z.object({ id: z.string() }) }).optional(),
    })
    .optional(),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
});

function extractOrderAndPayment(parsed: z.infer<typeof webhookPayloadSchema>) {
  const razorpayOrderId =
    parsed.payload?.payment?.entity.order_id ??
    parsed.payload?.order?.entity.id ??
    parsed.razorpay_order_id;
  const razorpayPaymentId =
    parsed.payload?.payment?.entity.id ?? parsed.razorpay_payment_id ?? `pay_webhook_${Date.now()}`;
  return { razorpayOrderId, razorpayPaymentId };
}

/** P1 — Razorpay webhook (raw body + HMAC) */
export async function registerRazorpayWebhookRoutes(app: FastifyInstance) {
  await registerWebhookRawBodyScope(app, async (scope) => {
    scope.post("/webhooks/razorpay", async (request, reply) => {
      const rawBody = request.rawBody;
      if (!rawBody) {
        return reply.status(400).send({
          error: { code: "RAW_BODY_REQUIRED", message: "Webhook requires raw JSON body", correlationId: request.id },
        });
      }

      const signature = request.headers["x-razorpay-signature"];
      if (!verifyWebhookSignature(rawBody, typeof signature === "string" ? signature : undefined)) {
        return reply.status(401).send({
          error: { code: "INVALID_SIGNATURE", message: "Webhook signature invalid", correlationId: request.id },
        });
      }

      if (paymentMode() === "mock") {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Webhooks disabled in mock mode", correlationId: request.id },
        });
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        return reply.status(400).send({
          error: { code: "INVALID_WEBHOOK", message: "Bad JSON", correlationId: request.id },
        });
      }

      const body = webhookPayloadSchema.safeParse(parsedJson);
      if (!body.success) {
        return reply.status(400).send({
          error: { code: "INVALID_WEBHOOK", message: "Bad payload", correlationId: request.id },
        });
      }

      const { razorpayOrderId, razorpayPaymentId } = extractOrderAndPayment(body.data);
      if (!razorpayOrderId) {
        return reply.status(400).send({
          error: { code: "INVALID_WEBHOOK", message: "Missing order id", correlationId: request.id },
        });
      }

      const [intent] = await db
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.razorpayOrderId, razorpayOrderId))
        .limit(1);

      if (!intent) {
        return reply.status(404).send({
          error: { code: "UNKNOWN_ORDER", message: "No matching payment intent", correlationId: request.id },
        });
      }

      try {
        const result = await captureOrderPayment(intent.orderId, razorpayPaymentId);
        return { ok: true, ...result };
      } catch {
        return reply.status(500).send({
          error: { code: "CAPTURE_FAILED", message: "Could not capture", correlationId: request.id },
        });
      }
    });
  });
}
