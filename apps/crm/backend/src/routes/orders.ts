import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  matchesPickupToken,
  shortOrderId,
  verifyDeliveryOtp,
} from "@damigos/domain";
import { customers, db, orderItems, orders, shipments } from "@damigos/db";
import { publishKitchenRefresh } from "@damigos/kitchen-bus";
import { createShipmentOnAccept } from "../lib/create-shipment-on-accept.js";
import { issueAndSendDeliveryOtp } from "../lib/issue-delivery-otp.js";
import {
  prepDeadlineFrom,
  resolvePrepMinutesForOrder,
  resolvePrepMinutesForOrders,
} from "../lib/prep-sla.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import { finalizeWaitingPenalty } from "../lib/waiting-penalty.js";

const kitchenRoles = requireRoles("RESTAURANT_OWNER", "STAFF", "KITCHEN", "PLATFORM_ADMIN");

const kitchenActiveStatuses = ["PAID", "ACCEPTED", "PREPARING", "READY", "DISPATCHED"] as const;

const nextStatus: Record<string, string | undefined> = {
  PAID: "ACCEPTED",
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "DISPATCHED",
  DISPATCHED: "DELIVERED",
};

/** C-05.01 / C-05.02 / C-05.06 — kitchen board + Accept SLA + rider */
export async function registerOrderRoutes(app: FastifyInstance) {
  app.get("/orders", { preHandler: kitchenRoles }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid().optional(),
        activeKitchen: z
          .string()
          .optional()
          .transform((v) => v === "true"),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .parse(request.query);

    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "restaurantId required",
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const conditions = [eq(orders.restaurantId, restaurantId)];
    if (query.activeKitchen) {
      conditions.push(inArray(orders.status, [...kitchenActiveStatuses]));
    }

    const rows = await db
      .select({
        order: orders,
        customerPhoneLast4: customers.phoneLast4,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(query.limit);

    const orderIds = rows.map((r) => r.order.id);
    const allItems =
      orderIds.length === 0
        ? []
        : await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

    const itemsByOrder = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const allShipments =
      orderIds.length === 0
        ? []
        : await db.select().from(shipments).where(inArray(shipments.orderId, orderIds));
    const shipByOrder = new Map(allShipments.map((s) => [s.orderId, s]));
    const suggestedPrep = await resolvePrepMinutesForOrders(orderIds);

    return {
      orders: rows.map(({ order, customerPhoneLast4 }) => {
        const ship = shipByOrder.get(order.id) ?? null;
        return {
          ...order,
          customerPhoneLast4,
          items: itemsByOrder.get(order.id) ?? [],
          shipment: ship
            ? {
                awb: ship.awb,
                status: ship.status,
                carrier: ship.carrier,
                trackingUrl: ship.trackingUrl ?? null,
                lastTrackingStatus: ship.lastTrackingStatus ?? null,
                lastTrackingAt: ship.lastTrackingAt?.toISOString() ?? null,
                foodDelivery: ship.foodDelivery ?? true,
                shiprocketShipmentId: ship.shiprocketShipmentId ?? null,
              }
            : null,
          shortOrderId: shortOrderId(order.id),
          pickupCode: order.pickupCode ?? null,
          pickupVerifiedAt: order.pickupVerifiedAt?.toISOString() ?? null,
          deliveryOtpSentAt: order.deliveryOtpSentAt?.toISOString() ?? null,
          deliveryOtpVerifiedAt: order.deliveryOtpVerifiedAt?.toISOString() ?? null,
          deliveryVerifySource: order.deliveryVerifySource ?? null,
          prepDeadlineAt: order.prepDeadlineAt?.toISOString() ?? null,
          riderArrivedAt: order.riderArrivedAt?.toISOString() ?? null,
          readyForPickupAt: order.readyForPickupAt?.toISOString() ?? null,
          suggestedPrepMinutes:
            order.committedPrepMinutes === 10 || order.committedPrepMinutes === 15
              ? order.committedPrepMinutes
              : (suggestedPrep.get(order.id) ?? 15),
        };
      }),
    };
  });

  app.post("/orders/:orderId/accept", { preHandler: kitchenRoles }, async (request, reply) => {
    const params = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const body = z
      .object({ prepMinutes: z.union([z.literal(10), z.literal(15)]).optional() })
      .safeParse(request.body ?? {});

    const [row] = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },
      });
    }

    await enforceRestaurantScope(request, reply, row.restaurantId);
    if (reply.sent) return;

    if (row.status !== "PAID") {
      return reply.status(409).send({
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Cannot accept from ${row.status}`,
          correlationId: request.id,
        },
      });
    }

    const committed =
      body.success && body.data.prepMinutes
        ? body.data.prepMinutes
        : await resolvePrepMinutesForOrder(row.id);
    const acceptedAt = new Date();
    const deadline = prepDeadlineFrom(committed, acceptedAt);

    const [updated] = await db
      .update(orders)
      .set({
        status: "ACCEPTED",
        committedPrepMinutes: committed,
        extendedPrepMinutes: 0,
        prepDeadlineAt: deadline,
      })
      .where(eq(orders.id, row.id))
      .returning();

    const shipment = await createShipmentOnAccept(row.id);
    void publishKitchenRefresh(row.restaurantId);

    return {
      order: {
        ...updated,
        prepDeadlineAt: updated.prepDeadlineAt?.toISOString() ?? null,
      },
      shipment,
      suggestedNext: nextStatus.ACCEPTED,
    };
  });

  /** One-time +5 min before T-3m */
  app.post("/orders/:orderId/extend-prep", { preHandler: kitchenRoles }, async (request, reply) => {
    const params = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const [row] = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },
      });
    }

    await enforceRestaurantScope(request, reply, row.restaurantId);
    if (reply.sent) return;

    if (row.status !== "ACCEPTED" && row.status !== "PREPARING") {
      return reply.status(409).send({
        error: {
          code: "INVALID_STATUS",
          message: "Can only extend during prep",
          correlationId: request.id,
        },
      });
    }
    if ((row.extendedPrepMinutes ?? 0) > 0) {
      return reply.status(409).send({
        error: { code: "ALREADY_EXTENDED", message: "+5m already used", correlationId: request.id },
      });
    }
    if (!row.prepDeadlineAt) {
      return reply.status(409).send({
        error: { code: "NO_DEADLINE", message: "Accept order first", correlationId: request.id },
      });
    }

    const remainingMs = row.prepDeadlineAt.getTime() - Date.now();
    if (remainingMs <= 3 * 60_000) {
      return reply.status(409).send({
        error: {
          code: "TOO_LATE",
          message: "Extend only before T-3m",
          correlationId: request.id,
        },
      });
    }

    const [updated] = await db
      .update(orders)
      .set({
        extendedPrepMinutes: 5,
        prepDeadlineAt: new Date(row.prepDeadlineAt.getTime() + 5 * 60_000),
      })
      .where(eq(orders.id, row.id))
      .returning();

    void publishKitchenRefresh(row.restaurantId);
    return {
      order: {
        ...updated,
        prepDeadlineAt: updated.prepDeadlineAt?.toISOString() ?? null,
      },
    };
  });

  /** Mock / webhook: rider at pickup — starts waiting clock */
  app.post("/orders/:orderId/rider-arrived", { preHandler: kitchenRoles }, async (request, reply) => {
    const params = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const [row] = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },
      });
    }
    await enforceRestaurantScope(request, reply, row.restaurantId);
    if (reply.sent) return;

    const [updated] = await db
      .update(orders)
      .set({ riderArrivedAt: row.riderArrivedAt ?? new Date() })
      .where(eq(orders.id, row.id))
      .returning();

    void publishKitchenRefresh(row.restaurantId);
    return { order: updated };
  });

  app.patch("/orders/:orderId/status", { preHandler: kitchenRoles }, async (request, reply) => {
    const params = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        status: z.enum([
          "ACCEPTED",
          "PREPARING",
          "READY",
          "DISPATCHED",
          "DELIVERED",
          "CANCELLED",
        ]),
        /** Rider states AWB / short order id / pickup code at kitchen handoff */
        pickupToken: z.string().min(4).max(64).optional(),
        /** Guest delivery OTP at door (Damigos-owned) */
        deliveryOtp: z.string().min(4).max(12).optional(),
      })
      .parse(request.body);

    const allowedFrom: Record<string, string[]> = {
      ACCEPTED: ["PAID"],
      PREPARING: ["ACCEPTED"],
      READY: ["PREPARING"],
      DISPATCHED: ["READY"],
      DELIVERED: ["DISPATCHED"],
      CANCELLED: ["PAID", "ACCEPTED"],
    };

    if (body.status === "ACCEPTED") {
      return reply.status(400).send({
        error: {
          code: "USE_ACCEPT_ENDPOINT",
          message: "POST /orders/:id/accept to set prep SLA + rider",
          correlationId: request.id,
        },
      });
    }

    return advanceOrder(request, reply, params.orderId, body.status, allowedFrom[body.status] ?? [], {
      pickupToken: body.pickupToken,
      deliveryOtp: body.deliveryOtp,
    });
  });

  /** Resend guest delivery OTP (WhatsApp). */
  app.post("/orders/:orderId/resend-delivery-otp", { preHandler: kitchenRoles }, async (request, reply) => {
    const params = z.object({ orderId: z.string().uuid() }).parse(request.params);
    const [row] = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },
      });
    }
    await enforceRestaurantScope(request, reply, row.restaurantId);
    if (reply.sent) return;

    if (row.status !== "DISPATCHED" && row.status !== "READY") {
      return reply.status(409).send({
        error: {
          code: "INVALID_STATUS",
          message: "OTP only after ready / out for delivery",
          correlationId: request.id,
        },
      });
    }

    const result = await issueAndSendDeliveryOtp(row.id);
    if (!result.sent) {
      return reply.status(502).send({
        error: {
          code: "OTP_SEND_FAILED",
          message: result.error ?? "Failed to send OTP",
          correlationId: request.id,
        },
      });
    }
    return { ok: true, mockOtp: result.otp ?? null };
  });
}

async function advanceOrder(
  request: Parameters<typeof enforceRestaurantScope>[0],
  reply: Parameters<typeof enforceRestaurantScope>[1],
  orderId: string,
  targetStatus: string,
  allowedFrom: string[],
  handoff: { pickupToken?: string; deliveryOtp?: string } = {},
) {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!row) {
    return reply.status(404).send({
      error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },
    });
  }

  await enforceRestaurantScope(request, reply, row.restaurantId);
  if (reply.sent) return;

  if (!allowedFrom.includes(row.status)) {
    return reply.status(409).send({
      error: {
        code: "INVALID_STATUS_TRANSITION",
        message: `Cannot move from ${row.status} to ${targetStatus}`,
        correlationId: request.id,
      },
    });
  }

  const [ship] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);

  if (targetStatus === "DISPATCHED") {
    const token = handoff.pickupToken?.trim();
    if (!token) {
      return reply.status(400).send({
        error: {
          code: "PICKUP_TOKEN_REQUIRED",
          message: "Enter AWB, order id, or pickup code the rider states",
          correlationId: request.id,
        },
      });
    }
    const ok = matchesPickupToken(token, {
      pickupCode: row.pickupCode,
      orderId: row.id,
      awb: ship?.awb,
    });
    if (!ok) {
      return reply.status(400).send({
        error: {
          code: "PICKUP_TOKEN_MISMATCH",
          message: "Code does not match this order’s AWB / order id / pickup code",
          correlationId: request.id,
        },
      });
    }
  }

  if (targetStatus === "DELIVERED") {
    // Shiprocket webhook may already have verified; kitchen confirm needs Damigos OTP when issued
    if (row.deliveryOtpHash && !row.deliveryOtpVerifiedAt) {
      const otp = handoff.deliveryOtp?.trim();
      if (!otp) {
        return reply.status(400).send({
          error: {
            code: "DELIVERY_OTP_REQUIRED",
            message: "Enter the guest delivery OTP",
            correlationId: request.id,
          },
        });
      }
      if (!verifyDeliveryOtp(otp, row.deliveryOtpHash)) {
        return reply.status(400).send({
          error: {
            code: "DELIVERY_OTP_INVALID",
            message: "Delivery OTP is incorrect",
            correlationId: request.id,
          },
        });
      }
    }
  }

  const patch: Partial<typeof orders.$inferInsert> = {
    status: targetStatus as typeof row.status,
  };
  if (targetStatus === "READY") {
    patch.readyForPickupAt = new Date();
  }
  if (targetStatus === "DISPATCHED") {
    patch.pickupVerifiedAt = new Date();
  }
  if (targetStatus === "DELIVERED") {
    if (handoff.deliveryOtp && row.deliveryOtpHash) {
      patch.deliveryOtpVerifiedAt = new Date();
      patch.deliveryVerifySource = "damigos";
    } else if (!row.deliveryVerifySource) {
      patch.deliveryVerifySource = "kitchen_confirm";
    }
  }

  const [updated] = await db.update(orders).set(patch).where(eq(orders.id, orderId)).returning();

  if (targetStatus === "DISPATCHED" || targetStatus === "DELIVERED") {
    await finalizeWaitingPenalty(orderId);
  }

  if (targetStatus === "DISPATCHED") {
    void issueAndSendDeliveryOtp(orderId).catch((err) =>
      console.warn("[delivery-otp] send failed", err),
    );
  }

  void publishKitchenRefresh(row.restaurantId);

  const [finalOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  return {
    order: {
      ...(finalOrder ?? updated),
      prepDeadlineAt: (finalOrder ?? updated).prepDeadlineAt?.toISOString() ?? null,
      shortOrderId: shortOrderId(orderId),
      pickupCode: (finalOrder ?? updated).pickupCode ?? null,
    },
    suggestedNext: nextStatus[targetStatus] ?? null,
  };
}
