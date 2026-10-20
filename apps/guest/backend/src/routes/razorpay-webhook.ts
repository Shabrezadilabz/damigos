import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkoutGroups, db, orders, paymentIntents } from "@damigos/db";
import { captureOrderPayment } from "../lib/capture-order-payment.js";
import { captureCheckoutGroup } from "../lib/create-checkout-group.js";
import { paymentMode } from "../lib/payment-mode.js";
import { registerWebhookRawBodyScope } from "../lib/raw-body.js";
import { verifyWebhookSignature } from "../lib/razorpay.js";

const CAPTURE_EVENTS = new Set(["payment.captured", "payment.authorized"]);

const webhookPayloadSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      payment: z
        .object({
          entity: z.object({
            id: z.string(),
            order_id: z.string().optional(),
            status: z.string().optional(),
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

/** P1-T02 — Razorpay webhook (raw body + HMAC); single order + checkout_group */
export async function registerRazorpayWebhookRoutes(app: FastifyInstance) {
  await registerWebhookRawBodyScope(app, async (scope) => {
    scope.post("/webhooks/razorpay", async (request, reply) => {
      const rawBody = request.rawBody;
      if (!rawBody) {
        return reply.status(400).send({
          error: {
            code: "RAW_BODY_REQUIRED",
            message: "Webhook requires raw JSON body",
            correlationId: request.id,
          },
        });
      }

      const signature = request.headers["x-razorpay-signature"];
      if (!verifyWebhookSignature(rawBody, typeof signature === "string" ? signature : undefined)) {
        return reply.status(401).send({
          error: {
            code: "INVALID_SIGNATURE",
            message: "Webhook signature invalid",
            correlationId: request.id,
          },
        });
      }

      if (paymentMode() === "mock") {
        return reply.status(404).send({
          error: {
            code: "NOT_FOUND",
            message: "Webhooks disabled in mock mode",
            correlationId: request.id,
          },
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

      const event = body.data.event;
      if (!CAPTURE_EVENTS.has(event)) {
        // Ack non-capture events so Razorpay does not retry forever
        return { ok: true, ignored: true, event };
      }

      const { razorpayOrderId, razorpayPaymentId } = extractOrderAndPayment(body.data);
      if (!razorpayOrderId) {
        return reply.status(400).send({
          error: {
            code: "INVALID_WEBHOOK",
            message: "Missing order id",
            correlationId: request.id,
          },
        });
      }

      // Prefer checkout_group Razorpay order (Cross-By one-pay → N orders)
      const [groupByRz] = await db
        .select()
        .from(checkoutGroups)
        .where(eq(checkoutGroups.razorpayOrderId, razorpayOrderId))
        .limit(1);

      if (groupByRz) {
        if (groupByRz.status === "PAID") {
          return {
            ok: true,
            idempotent: true,
            checkoutGroupId: groupByRz.id,
            status: "PAID",
          };
        }
        try {
          const orderIds = await captureCheckoutGroup(
            groupByRz.id,
            razorpayPaymentId,
            razorpayOrderId,
          );
          return {
            ok: true,
            checkoutGroupId: groupByRz.id,
            orderIds,
            status: "PAID",
          };
        } catch (err) {
          app.log.error({ err, groupId: groupByRz.id }, "webhook checkout_group capture failed");
          return reply.status(500).send({
            error: {
              code: "CAPTURE_FAILED",
              message: "Could not capture checkout group",
              correlationId: request.id,
            },
          });
        }
      }

      const [intent] = await db
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.razorpayOrderId, razorpayOrderId))
        .limit(1);

      if (!intent) {
        return reply.status(404).send({
          error: {
            code: "UNKNOWN_ORDER",
            message: "No matching payment intent or checkout group",
            correlationId: request.id,
          },
        });
      }

      const [orderRow] = await db
        .select({ id: orders.id, checkoutGroupId: orders.checkoutGroupId, status: orders.status })
        .from(orders)
        .where(eq(orders.id, intent.orderId))
        .limit(1);

      if (orderRow?.checkoutGroupId) {
        const [group] = await db
          .select()
          .from(checkoutGroups)
          .where(eq(checkoutGroups.id, orderRow.checkoutGroupId))
          .limit(1);
        if (group) {
          if (group.status === "PAID") {
            return {
              ok: true,
              idempotent: true,
              checkoutGroupId: group.id,
              status: "PAID",
            };
          }
          try {
            const orderIds = await captureCheckoutGroup(
              group.id,
              razorpayPaymentId,
              razorpayOrderId,
            );
            return {
              ok: true,
              checkoutGroupId: group.id,
              orderIds,
              status: "PAID",
            };
          } catch (err) {
            app.log.error({ err, groupId: group.id }, "webhook group via intent capture failed");
            return reply.status(500).send({
              error: {
                code: "CAPTURE_FAILED",
                message: "Could not capture checkout group",
                correlationId: request.id,
              },
            });
          }
        }
      }

      if (orderRow?.status === "PAID") {
        return {
          ok: true,
          idempotent: true,
          orderId: orderRow.id,
          status: "PAID",
        };
      }

      try {
        const result = await captureOrderPayment(intent.orderId, razorpayPaymentId);
        return { ok: true, ...result };
      } catch (err) {
        app.log.error({ err, orderId: intent.orderId }, "webhook single capture failed");
        return reply.status(500).send({
          error: { code: "CAPTURE_FAILED", message: "Could not capture", correlationId: request.id },
        });
      }
    });
  });
}
