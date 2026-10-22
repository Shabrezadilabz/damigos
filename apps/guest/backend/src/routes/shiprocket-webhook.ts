import { eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, orders, shipments } from "@damigos/db";
import { publishKitchenRefresh } from "@damigos/kitchen-bus";
import { issueAndSendDeliveryOtp } from "../lib/issue-delivery-otp.js";

/**
 * Shiprocket tracking webhook → update shipment + map food delivery status on order.
 * Configure in Shiprocket: Settings → API → Webhooks → {GUEST_API}/v1/webhooks/shiprocket
 * Do not put "shiprocket" in the public hostname if SR blocks that keyword — use damigos-guest-api.
 */
export async function registerShiprocketWebhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/shiprocket", async (request, reply) => {
    const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN?.trim();
    if (expected) {
      const got =
        (request.headers["x-api-key"] as string | undefined) ??
        (request.headers["x-shiprocket-token"] as string | undefined);
      if (got !== expected) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }

    const body = z
      .object({
        awb: z.string().optional(),
        courier_name: z.string().optional(),
        current_status: z.string().optional(),
        shipment_status: z.string().optional(),
        order_id: z.union([z.string(), z.number()]).optional(),
        sr_order_id: z.union([z.string(), z.number()]).optional(),
        etd: z.string().optional(),
        current_timestamp: z.string().optional(),
        pod_status: z.string().optional(),
      })
      .passthrough()
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(200).send({ ok: true, ignored: true });
    }

    const awb = body.data.awb?.trim();
    const srOrderId =
      body.data.sr_order_id != null ? String(body.data.sr_order_id) : null;
    const statusLabel =
      body.data.current_status ?? body.data.shipment_status ?? "UPDATE";

    const [ship] = awb
      ? await db.select().from(shipments).where(eq(shipments.awb, awb)).limit(1)
      : srOrderId
        ? await db
            .select()
            .from(shipments)
            .where(
              or(
                eq(shipments.shiprocketOrderId, srOrderId),
                eq(shipments.shiprocketShipmentId, srOrderId),
              ),
            )
            .limit(1)
        : [];

    if (!ship) {
      return reply.status(200).send({ ok: true, matched: false });
    }

    const upper = statusLabel.toUpperCase();
    let shipmentStatus = ship.status;
    if (/PICKUP|ASSIGNED|OUT FOR PICKUP|RIDER/.test(upper)) {
      shipmentStatus = "rider_en_route_pickup";
    } else if (/PICKED|IN TRANSIT|OFD|OUT FOR DELIVERY/.test(upper)) {
      shipmentStatus = "out_for_delivery";
    } else if (/DELIVERED|RTO DELIVERED/.test(upper)) {
      shipmentStatus = "delivered";
    }

    await db
      .update(shipments)
      .set({
        status: shipmentStatus,
        lastTrackingStatus: statusLabel.slice(0, 128),
        lastTrackingAt: new Date(),
        carrier: body.data.courier_name
          ? `Shiprocket/${body.data.courier_name}`.slice(0, 64)
          : ship.carrier,
      })
      .where(eq(shipments.id, ship.id));

    const [order] = await db.select().from(orders).where(eq(orders.id, ship.orderId)).limit(1);
    if (order) {
      if (
        shipmentStatus === "out_for_delivery" &&
        (order.status === "READY" || order.status === "PREPARING" || order.status === "ACCEPTED")
      ) {
        await db.update(orders).set({ status: "DISPATCHED" }).where(eq(orders.id, order.id));
        // Damigos guest OTP (Shiprocket does not expose OTP digits to us)
        void issueAndSendDeliveryOtp(order.id).catch((err) =>
          console.warn("[shiprocket-webhook] delivery otp", err),
        );
      }
      if (shipmentStatus === "delivered" && order.status !== "DELIVERED") {
        const pod = body.data.pod_status?.toLowerCase() ?? "";
        await db
          .update(orders)
          .set({
            status: "DELIVERED",
            deliveryVerifySource: pod.includes("otp")
              ? "courier_pod"
              : "shiprocket_webhook",
            deliveryOtpVerifiedAt: order.deliveryOtpVerifiedAt ?? new Date(),
          })
          .where(eq(orders.id, order.id));
      }
      void publishKitchenRefresh(order.restaurantId);
    }

    return reply.status(200).send({ ok: true, matched: true, shipmentStatus });
  });
}
