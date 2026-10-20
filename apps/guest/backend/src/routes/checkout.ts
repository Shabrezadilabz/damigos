import { and, desc, eq, inArray, ne } from "drizzle-orm";

import type { FastifyInstance } from "fastify";

import { z } from "zod";

import {
  carts,
  db,
  orderItems,
  orders,
  paymentIntents,
  restaurants,
  rewardClaims,
  shipments,
} from "@damigos/db";
import {
  ACTIVE_ORDER_STATUSES,
  PAST_ORDER_STATUSES,
  type MeOrdersFilter,
} from "../lib/order-status-buckets.js";
import { captureOrderPayment, insertPendingOrder } from "../lib/capture-order-payment.js";
import { loadOpenCheckoutCart } from "../lib/checkout-from-cart.js";
import { CONVENIENCE_FEE_PAISE } from "../lib/cart-totals.js";
import { creditLoyaltyPayback, debitLoyaltyCredits } from "../lib/guest-loyalty.js";

import { paymentMode, razorpayKeyId } from "../lib/payment-mode.js";
import { createRazorpayOrder, verifyPaymentSignature } from "../lib/razorpay.js";

import { publishKitchenRefresh } from "@damigos/kitchen-bus";
import { requireGuest } from "../lib/require-guest.js";



function idempotencyKey(request: { headers: Record<string, string | string[] | undefined> }) {

  const raw = request.headers["idempotency-key"];

  return typeof raw === "string" && raw.length >= 8 ? raw.slice(0, 64) : null;

}



/** G-04 checkout — mock (P0) + Razorpay prepare/webhook (P1) */

export async function registerCheckoutRoutes(app: FastifyInstance) {

  app.get("/checkout/config", async () => {

    const mode = paymentMode();

    return {

      paymentMode: mode,

      razorpayKeyId: mode === "razorpay" ? razorpayKeyId() : null,

    };

  });



  app.post("/checkout/prepare", { preHandler: requireGuest }, async (request, reply) => {

    const mode = paymentMode();

    if (mode === "mock") {

      return reply.status(400).send({

        error: {

          code: "USE_MOCK_PAY",

          message: "PAYMENT_MODE=mock — use POST /checkout/mock-pay",

          correlationId: request.id,

        },

      });

    }



    const body = z.object({ restaurantId: z.string().uuid() }).safeParse(request.body);

    if (!body.success) {

      return reply.status(400).send({

        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },

      });

    }



    const customerId = request.guest!.sub!;

    const key = idempotencyKey(request);



    if (key) {

      const [existingIntent] = await db

        .select()

        .from(paymentIntents)

        .where(eq(paymentIntents.idempotencyKey, key))

        .limit(1);

      if (existingIntent) {

        const [order] = await db

          .select()

          .from(orders)

          .where(eq(orders.id, existingIntent.orderId))

          .limit(1);

        if (order) {

          return {

            idempotent: true,

            orderId: order.id,

            status: order.status,

            totalPaise: order.totalPaise,

            razorpayOrderId: existingIntent.razorpayOrderId,

            trackPath: `/orders/${order.id}`,

          };

        }

      }

    }



    const snapshot = await loadOpenCheckoutCart(request, customerId, body.data.restaurantId);

    if ("error" in snapshot) {

      return reply.status(snapshot.error.status).send({

        error: {

          code: snapshot.error.code,

          message: snapshot.error.message,

          correlationId: request.id,

        },

      });

    }



    const order = await insertPendingOrder(snapshot, customerId, body.data.restaurantId);

    let razorpayOrderId: string;
    if (mode === "stub") {
      razorpayOrderId = `order_stub_${order.id.replace(/-/g, "").slice(0, 20)}`;
    } else {
      razorpayOrderId = await createRazorpayOrder({
        amountPaise: order.totalPaise,
        receipt: order.id,
        notes: { damigos_order_id: order.id },
      });
    }

    await db.insert(paymentIntents).values({

      orderId: order.id,

      cartId: snapshot.cart.id,

      appliedClaimId: snapshot.appliedClaimId,

      loyaltyAppliedPaise: snapshot.loyaltyAppliedPaise,

      idempotencyKey: key,

      razorpayOrderId,

      status: "created",

    });



    return {

      orderId: order.id,

      status: order.status,

      totalPaise: order.totalPaise,

      razorpayOrderId,

      razorpayKeyId: razorpayKeyId(),

      paymentMode: mode,

      trackPath: `/orders/${order.id}`,

    };

  });



  app.post("/checkout/verify-razorpay", { preHandler: requireGuest }, async (request, reply) => {
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
        orderId: z.string().uuid(),
        razorpayOrderId: z.string().min(4),
        razorpayPaymentId: z.string().min(4),
        razorpaySignature: z.string().min(8),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "Payment fields required", correlationId: request.id },
      });
    }

    const customerId = request.guest!.sub!;
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, body.data.orderId), eq(orders.customerId, customerId)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },
      });
    }

    const [intent] = await db
      .select()
      .from(paymentIntents)
      .where(eq(paymentIntents.orderId, order.id))
      .limit(1);

    if (!intent || intent.razorpayOrderId !== body.data.razorpayOrderId) {
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
        error: { code: "INVALID_SIGNATURE", message: "Payment verification failed", correlationId: request.id },
      });
    }

    const result = await captureOrderPayment(order.id, body.data.razorpayPaymentId);
    return { ...result, status: "PAID", trackPath: `/orders/${order.id}` };
  });

  app.post("/checkout/confirm-stub", { preHandler: requireGuest }, async (request, reply) => {

    if (paymentMode() !== "stub") {

      return reply.status(403).send({

        error: {

          code: "STUB_ONLY",

          message: "confirm-stub only when PAYMENT_MODE=stub",

          correlationId: request.id,

        },

      });

    }



    const body = z.object({ orderId: z.string().uuid() }).safeParse(request.body);

    if (!body.success) {

      return reply.status(400).send({

        error: { code: "INVALID_REQUEST", message: "orderId required", correlationId: request.id },

      });

    }



    const customerId = request.guest!.sub!;

    const [order] = await db

      .select()

      .from(orders)

      .where(and(eq(orders.id, body.data.orderId), eq(orders.customerId, customerId)))

      .limit(1);



    if (!order) {

      return reply.status(404).send({

        error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },

      });

    }



    const result = await captureOrderPayment(order.id, `pay_stub_${order.id.slice(0, 8)}`);

    return {

      ...result,

      status: "PAID",

      trackPath: `/orders/${order.id}`,

    };

  });



  app.post("/checkout/mock-pay", { preHandler: requireGuest }, async (request, reply) => {

    const body = z.object({ restaurantId: z.string().uuid() }).safeParse(request.body);

    if (!body.success) {

      return reply.status(400).send({

        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },

      });

    }



    const customerId = request.guest!.sub!;

    const { restaurantId } = body.data;



    const snapshot = await loadOpenCheckoutCart(request, customerId, restaurantId);

    if ("error" in snapshot) {

      return reply.status(snapshot.error.status).send({

        error: {

          code: snapshot.error.code,

          message: snapshot.error.message,

          correlationId: request.id,

        },

      });

    }



    const {
      cart,
      lines,
      subtotalPaise,
      discountPaise,
      loyaltyAppliedPaise,
      deliveryFeePaise,
      deliveryPincode,
      totalPaise,
      appliedClaimId,
    } = snapshot;

    const combinedDiscount = discountPaise + loyaltyAppliedPaise;

    const [order] = await db

      .insert(orders)

      .values({

        customerId,

        restaurantId,

        status: "PAID",

        subtotalPaise,

        convenienceFeePaise: CONVENIENCE_FEE_PAISE,

        discountPaise: combinedDiscount,

        deliveryPincode,

        deliveryFeePaise,

        totalPaise,

      })

      .returning();



    if (appliedClaimId && discountPaise > 0) {

      await db

        .update(rewardClaims)

        .set({ redeemedOrderId: order.id })

        .where(eq(rewardClaims.id, appliedClaimId));

    }



    await db.insert(orderItems).values(

      lines.map((l) => ({

        orderId: order.id,

        menuItemId: l.menuItemId,

        name: l.name,

        quantity: l.quantity,

        unitPricePaise: l.unitPricePaise,

      })),

    );



    await db

      .update(carts)

      .set({
        status: "CHECKED_OUT",
        appliedClaimId: null,
        autoRewardDeclined: false,
        loyaltyAppliedPaise: 0,
      })

      .where(eq(carts.id, cart.id));

    if (loyaltyAppliedPaise > 0) {
      await debitLoyaltyCredits(customerId, restaurantId, loyaltyAppliedPaise);
    }
    await creditLoyaltyPayback(
      customerId,
      restaurantId,
      Math.max(0, subtotalPaise - combinedDiscount),
    );

    void publishKitchenRefresh(restaurantId);

    return {

      orderId: order.id,

      status: order.status,

      totalPaise: order.totalPaise,

      trackPath: `/orders/${order.id}`,

    };

  });



  app.get("/orders/:orderId", { preHandler: requireGuest }, async (request, reply) => {

    const params = z.object({ orderId: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {

      return reply.status(400).send({

        error: { code: "INVALID_REQUEST", message: "Invalid order id", correlationId: request.id },

      });

    }



    const customerId = request.guest!.sub!;

    const [order] = await db

      .select()

      .from(orders)

      .where(and(eq(orders.id, params.data.orderId), eq(orders.customerId, customerId)))

      .limit(1);



    if (!order) {

      return reply.status(404).send({

        error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },

      });

    }



    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.orderId, order.id))
      .limit(1);

    return {
      order: {
        ...order,
        prepDeadlineAt: order.prepDeadlineAt?.toISOString() ?? null,
        riderArrivedAt: order.riderArrivedAt?.toISOString() ?? null,
        readyForPickupAt: order.readyForPickupAt?.toISOString() ?? null,
        createdAt: order.createdAt.toISOString(),
      },
      items,
      shipment: shipment
        ? {
            awb: shipment.awb,
            status: shipment.status,
            carrier: shipment.carrier,
            trackingUrl: shipment.trackingUrl ?? null,
            lastTrackingStatus: shipment.lastTrackingStatus ?? null,
            lastTrackingAt: shipment.lastTrackingAt?.toISOString() ?? null,
            foodDelivery: shipment.foodDelivery ?? true,
          }
        : null,
    };
  });



  app.get("/me/orders", { preHandler: requireGuest }, async (request, reply) => {
    const query = z
      .object({
        status: z.enum(["active", "past"]).optional(),
      })
      .safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "status must be active or past",
          correlationId: request.id,
        },
      });
    }

    const customerId = request.guest!.sub!;
    const bucket = query.data.status as MeOrdersFilter | undefined;
    const statusFilter =
      bucket === "active"
        ? inArray(orders.status, [...ACTIVE_ORDER_STATUSES])
        : bucket === "past"
          ? inArray(orders.status, [...PAST_ORDER_STATUSES])
          : undefined;

    const conditions = [eq(orders.customerId, customerId), ne(orders.status, "DRAFT")];
    if (statusFilter) conditions.push(statusFilter);

    const rows = await db
      .select({
        id: orders.id,
        restaurantId: orders.restaurantId,
        status: orders.status,
        totalPaise: orders.totalPaise,
        createdAt: orders.createdAt,
        restaurantName: restaurants.name,
        checkoutGroupId: orders.checkoutGroupId,
        legIndex: orders.legIndex,
        prepDeadlineAt: orders.prepDeadlineAt,
        discountPaise: orders.discountPaise,
      })
      .from(orders)
      .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt));

    return {
      orders: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        prepDeadlineAt: r.prepDeadlineAt?.toISOString() ?? null,
      })),
    };
  });

}


