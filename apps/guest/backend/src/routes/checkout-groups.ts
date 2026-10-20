import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { checkoutGroups, db, orders, paymentIntents } from "@damigos/db";
import { publishKitchenRefresh } from "@damigos/kitchen-bus";
import {
  buildLegSnapshots,
  captureCheckoutGroup,
  createPendingCheckoutGroup,
  groupDeliveryFeePaise,
  groupTotalPaise,
} from "../lib/create-checkout-group.js";
import { CONVENIENCE_FEE_PAISE } from "../lib/cart-totals.js";
import { crossByMeta, listOpenKitchenCarts } from "../lib/cross-by-cart.js";
import { isFirstOrderFreeEligible } from "../lib/first-order-delivery.js";
import { paymentMode, razorpayKeyId } from "../lib/payment-mode.js";
import { createRazorpayOrder, verifyPaymentSignature } from "../lib/razorpay.js";
import { requireGuest } from "../lib/require-guest.js";

function idempotencyKey(request: { headers: Record<string, string | string[] | undefined> }) {
  const raw = request.headers["idempotency-key"];
  return typeof raw === "string" && raw.length >= 8 ? raw.slice(0, 64) : null;
}

/** P1.5 — Cross-By checkout_groups (single pay → N child orders) */
export async function registerCheckoutGroupRoutes(app: FastifyInstance) {
  app.get("/checkout-groups/preview", { preHandler: requireGuest }, async (request) => {
    const customerId = request.guest!.sub!;
    const open = await listOpenKitchenCarts(customerId);
    const meta = crossByMeta(open);
    const legs = await buildLegSnapshots(customerId);
    const grossDelivery = groupDeliveryFeePaise(legs, meta.riderMode);
    const firstOrderFree = await isFirstOrderFreeEligible(customerId);
    const deliveryFeePaise = firstOrderFree ? 0 : grossDelivery;
    const totalPaise = groupTotalPaise(legs, deliveryFeePaise);

    return {
      legs: legs.map((l) => ({
        restaurantId: l.restaurantId,
        restaurantName: l.restaurantName,
        legIndex: l.legIndex,
        itemCount: l.lines.reduce((s, x) => s + x.quantity, 0),
        subtotalPaise: l.subtotalPaise,
        discountPaise: l.discountPaise,
        loyaltyAppliedPaise: l.loyaltyAppliedPaise,
        appliedClaimTitle: l.appliedClaimTitle,
        appliedClaimBillLabel: l.appliedClaimBillLabel,
        deliveryFeePaise: l.deliveryFeePaise,
        lines: l.lines,
      })),
      crossBy: meta,
      convenienceFeePaise: CONVENIENCE_FEE_PAISE,
      deliveryFeePaise,
      grossDeliveryFeePaise: grossDelivery,
      firstOrderFree,
      platformSubsidyPaise: firstOrderFree ? grossDelivery : 0,
      subsidyLabel: firstOrderFree
        ? "First-Order FREE Delivery · Sponsored by D'aMigo's"
        : null,
      totalPaise,
    };
  });

  /** Prepare group for stub/razorpay — one Razorpay order for full amount */
  app.post("/checkout-groups/prepare", { preHandler: requireGuest }, async (request, reply) => {
    const mode = paymentMode();
    if (mode === "mock") {
      return reply.status(400).send({
        error: {
          code: "USE_MOCK_PAY",
          message: "PAYMENT_MODE=mock — use POST /checkout-groups/mock-pay",
          correlationId: request.id,
        },
      });
    }

    const customerId = request.guest!.sub!;
    const key = idempotencyKey(request);
    const pending = await createPendingCheckoutGroup(customerId, key);
    if ("error" in pending) {
      return reply.status(400).send({
        error: { code: pending.error, message: "No open carts", correlationId: request.id },
      });
    }

    if (pending.group.status === "PAID") {
      return {
        idempotent: true,
        checkoutGroupId: pending.group.id,
        orderIds: pending.orderIds,
        status: "PAID",
        totalPaise: pending.totalPaise,
        razorpayOrderId: pending.group.razorpayOrderId,
        trackPath: `/orders/group/${pending.group.id}`,
        riderMode: pending.riderMode,
      };
    }

    let razorpayOrderId = pending.group.razorpayOrderId;
    if (!razorpayOrderId) {
      if (mode === "stub") {
        razorpayOrderId = `order_stub_cg_${pending.group.id.replace(/-/g, "").slice(0, 16)}`;
      } else {
        razorpayOrderId = await createRazorpayOrder({
          amountPaise: pending.totalPaise,
          receipt: pending.group.id,
          notes: {
            damigos_checkout_group_id: pending.group.id,
            damigos_order_ids: pending.orderIds.join(",").slice(0, 200),
          },
        });
      }

      await db
        .update(checkoutGroups)
        .set({ razorpayOrderId })
        .where(eq(checkoutGroups.id, pending.group.id));

      // Store on leg-1 intent only (unique constraint)
      const leg1Id = pending.orderIds[0];
      if (leg1Id) {
        await db
          .update(paymentIntents)
          .set({ razorpayOrderId })
          .where(eq(paymentIntents.orderId, leg1Id));
      }
    }

    return {
      idempotent: pending.idempotent,
      checkoutGroupId: pending.group.id,
      orderIds: pending.orderIds,
      status: "PAYMENT_PENDING",
      totalPaise: pending.totalPaise,
      razorpayOrderId,
      razorpayKeyId: razorpayKeyId(),
      paymentMode: mode,
      trackPath: `/orders/group/${pending.group.id}`,
      riderMode: pending.riderMode,
      distanceMeters: pending.distanceMeters,
    };
  });

  app.post("/checkout-groups/confirm-stub", { preHandler: requireGuest }, async (request, reply) => {
    if (paymentMode() !== "stub") {
      return reply.status(403).send({
        error: {
          code: "STUB_ONLY",
          message: "confirm-stub only when PAYMENT_MODE=stub",
          correlationId: request.id,
        },
      });
    }

    const body = z.object({ checkoutGroupId: z.string().uuid() }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "checkoutGroupId required",
          correlationId: request.id,
        },
      });
    }

    const customerId = request.guest!.sub!;
    const [group] = await db
      .select()
      .from(checkoutGroups)
      .where(
        and(
          eq(checkoutGroups.id, body.data.checkoutGroupId),
          eq(checkoutGroups.customerId, customerId),
        ),
      )
      .limit(1);

    if (!group) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Group not found", correlationId: request.id },
      });
    }

    if (group.status === "PAID") {
      const childOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.checkoutGroupId, group.id));
      return {
        checkoutGroupId: group.id,
        orderIds: childOrders.map((o) => o.id),
        status: "PAID",
        trackPath: `/orders/group/${group.id}`,
        riderMode: group.riderMode,
      };
    }

    const orderIds = await captureCheckoutGroup(
      group.id,
      `pay_stub_cg_${group.id.slice(0, 8)}`,
      group.razorpayOrderId,
    );

    const child = await db.select().from(orders).where(eq(orders.checkoutGroupId, group.id));
    for (const o of child) void publishKitchenRefresh(o.restaurantId);

    return {
      checkoutGroupId: group.id,
      orderIds,
      status: "PAID",
      trackPath: `/orders/group/${group.id}`,
      riderMode: group.riderMode,
    };
  });

  app.post("/checkout-groups/verify-razorpay", { preHandler: requireGuest }, async (request, reply) => {
    if (paymentMode() !== "razorpay") {
      return reply.status(403).send({
        error: {
          code: "RAZORPAY_ONLY",
          message: "verify-razorpay only when PAYMENT_MODE=razorpay",
          correlationId: request.id,
        },
      });
    }

    const body = z
      .object({
        checkoutGroupId: z.string().uuid(),
        razorpayOrderId: z.string().min(4),
        razorpayPaymentId: z.string().min(4),
        razorpaySignature: z.string().min(8),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Payment fields required",
          correlationId: request.id,
        },
      });
    }

    const customerId = request.guest!.sub!;
    const [group] = await db
      .select()
      .from(checkoutGroups)
      .where(
        and(
          eq(checkoutGroups.id, body.data.checkoutGroupId),
          eq(checkoutGroups.customerId, customerId),
        ),
      )
      .limit(1);

    if (!group) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Group not found", correlationId: request.id },
      });
    }

    if (group.razorpayOrderId !== body.data.razorpayOrderId) {
      return reply.status(400).send({
        error: { code: "INTENT_MISMATCH", message: "Unknown payment intent", correlationId: request.id },
      });
    }

    const valid = verifyPaymentSignature({
      orderId: body.data.razorpayOrderId,
      paymentId: body.data.razorpayPaymentId,
      signature: body.data.razorpaySignature,
    });

    if (!valid) {
      return reply.status(400).send({
        error: {
          code: "INVALID_SIGNATURE",
          message: "Payment verification failed",
          correlationId: request.id,
        },
      });
    }

    if (group.status === "PAID") {
      const childOrders = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.checkoutGroupId, group.id));
      return {
        checkoutGroupId: group.id,
        orderIds: childOrders.map((o) => o.id),
        status: "PAID",
        trackPath: `/orders/group/${group.id}`,
      };
    }

    const orderIds = await captureCheckoutGroup(
      group.id,
      body.data.razorpayPaymentId,
      body.data.razorpayOrderId,
    );

    const child = await db.select().from(orders).where(eq(orders.checkoutGroupId, group.id));
    for (const o of child) void publishKitchenRefresh(o.restaurantId);

    return {
      checkoutGroupId: group.id,
      orderIds,
      status: "PAID",
      trackPath: `/orders/group/${group.id}`,
      riderMode: group.riderMode,
    };
  });

  app.post("/checkout-groups/mock-pay", { preHandler: requireGuest }, async (request, reply) => {
    const body = z
      .object({ idempotencyKey: z.string().min(8).max(64).optional() })
      .safeParse(request.body ?? {});

    const customerId = request.guest!.sub!;
    const key = body.success ? body.data.idempotencyKey ?? null : null;
    const pending = await createPendingCheckoutGroup(customerId, key);
    if ("error" in pending) {
      return reply.status(400).send({
        error: { code: pending.error, message: "No open carts", correlationId: request.id },
      });
    }

    if (pending.group.status === "PAID") {
      return {
        checkoutGroupId: pending.group.id,
        orderIds: pending.orderIds,
        status: "PAID",
        trackPath: `/orders/group/${pending.group.id}`,
        riderMode: pending.riderMode,
        distanceMeters: pending.distanceMeters,
        totalPaise: pending.totalPaise,
      };
    }

    const orderIds = await captureCheckoutGroup(
      pending.group.id,
      `pay_mock_cg_${pending.group.id.slice(0, 8)}`,
    );

    for (const leg of pending.legs) void publishKitchenRefresh(leg.restaurantId);

    return {
      checkoutGroupId: pending.group.id,
      orderIds,
      status: "PAID",
      trackPath: `/orders/group/${pending.group.id}`,
      riderMode: pending.riderMode,
      distanceMeters: pending.distanceMeters,
      totalPaise: pending.totalPaise,
    };
  });

  app.get("/orders/group/:groupId", { preHandler: requireGuest }, async (request, reply) => {
    const params = z.object({ groupId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "groupId required", correlationId: request.id },
      });
    }
    const customerId = request.guest!.sub!;
    const [group] = await db
      .select()
      .from(checkoutGroups)
      .where(
        and(eq(checkoutGroups.id, params.data.groupId), eq(checkoutGroups.customerId, customerId)),
      )
      .limit(1);
    if (!group) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Group not found", correlationId: request.id },
      });
    }
    const childOrders = await db
      .select({
        id: orders.id,
        restaurantId: orders.restaurantId,
        status: orders.status,
        legIndex: orders.legIndex,
        totalPaise: orders.totalPaise,
        prepDeadlineAt: orders.prepDeadlineAt,
      })
      .from(orders)
      .where(eq(orders.checkoutGroupId, group.id))
      .orderBy(asc(orders.legIndex));

    return {
      group: {
        id: group.id,
        status: group.status,
        riderMode: group.riderMode,
        distanceMeters: group.distanceMeters,
      },
      orders: childOrders.map((o) => ({
        ...o,
        prepDeadlineAt: o.prepDeadlineAt?.toISOString() ?? null,
        trackPath: `/orders/${o.id}`,
      })),
    };
  });
}
