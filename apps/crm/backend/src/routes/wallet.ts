import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
} from "../lib/razorpay.js";
import {
  creditTopUp,
  getWalletSnapshot,
  WALLET_TOPUP_PACK_PAISE,
} from "../lib/wallet.js";

const TOPUP_PACKS = [49900, 99900, 249900] as const;

/** C-04.06 — prepaid WhatsApp broadcast wallet */
export async function registerWalletRoutes(app: FastifyInstance) {
  const staffView = requireRoles("RESTAURANT_OWNER", "STAFF", "PLATFORM_ADMIN");
  const staffTopUp = requireRoles("RESTAURANT_OWNER", "PLATFORM_ADMIN");

  app.get("/wallet", { preHandler: staffView }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;
    const wallet = await getWalletSnapshot(query.restaurantId);
    const mode = process.env.WALLET_TOPUP_MODE ?? "stub";
    return {
      ...wallet,
      topupMode: mode === "live" && razorpayConfigured() ? "live" : "stub",
      packsPaise: [...TOPUP_PACKS],
    };
  });

  app.post("/wallet/topup", { preHandler: staffTopUp }, async (request, reply) => {
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
      return reply.status(400).send({
        error: {
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Header Idempotency-Key required for wallet top-up",
          correlationId: request.id,
        },
      });
    }

    const body = z
      .object({
        restaurantId: z.string().uuid(),
        amountPaise: z
          .number()
          .int()
          .positive()
          .default(WALLET_TOPUP_PACK_PAISE)
          .refine((n) => (TOPUP_PACKS as readonly number[]).includes(n), {
            message: "amountPaise must be a listed pack",
          }),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const mode = process.env.WALLET_TOPUP_MODE ?? "stub";
    if (mode === "live" && razorpayConfigured()) {
      return reply.status(400).send({
        error: {
          code: "USE_PREPARE",
          message: "Use POST /wallet/topup/prepare for live Razorpay top-up",
          correlationId: request.id,
        },
      });
    }

    const stubOrderId = `order_stub_${Date.now().toString(36)}`;
    const stubPaymentId = `pay_stub_${idempotencyKey.slice(0, 12)}`;
    const wallet = await creditTopUp({
      restaurantId: body.restaurantId,
      amountPaise: body.amountPaise,
      idempotencyKey,
      meta: {
        paymentMethod: "stub",
        orderId: stubOrderId,
        razorpayOrderId: stubOrderId,
        razorpayPaymentId: stubPaymentId,
        transactionId: stubPaymentId,
        utr: stubPaymentId,
        note: "Stub wallet top-up",
      },
    });

    return { wallet, mode: "stub" };
  });

  /** Prepare Razorpay order for live wallet credit (WALLET_TOPUP_MODE=live). */
  app.post("/wallet/topup/prepare", { preHandler: staffTopUp }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        amountPaise: z
          .number()
          .int()
          .positive()
          .default(WALLET_TOPUP_PACK_PAISE)
          .refine((n) => (TOPUP_PACKS as readonly number[]).includes(n), {
            message: "amountPaise must be a listed pack",
          }),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const mode = process.env.WALLET_TOPUP_MODE ?? "stub";
    if (mode !== "live" || !razorpayConfigured()) {
      return reply.status(400).send({
        error: {
          code: "STUB_MODE",
          message: "Set WALLET_TOPUP_MODE=live and Razorpay keys, or use POST /wallet/topup stub",
          correlationId: request.id,
        },
      });
    }

    const receipt = `wlt_${body.restaurantId.slice(0, 8)}_${Date.now().toString(36)}`;
    const razorpayOrderId = await createRazorpayOrder({
      amountPaise: body.amountPaise,
      receipt,
      notes: {
        restaurantId: body.restaurantId,
        purpose: "crm_wallet_topup",
      },
    });

    return {
      mode: "live" as const,
      amountPaise: body.amountPaise,
      razorpayOrderId,
      razorpayKeyId: razorpayKeyId(),
    };
  });

  app.post("/wallet/topup/verify", { preHandler: staffTopUp }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        amountPaise: z.number().int().positive(),
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    if (
      !verifyPaymentSignature({
        orderId: body.razorpayOrderId,
        paymentId: body.razorpayPaymentId,
        signature: body.razorpaySignature,
      })
    ) {
      return reply.status(400).send({
        error: {
          code: "INVALID_SIGNATURE",
          message: "Razorpay payment signature invalid",
          correlationId: request.id,
        },
      });
    }

    const wallet = await creditTopUp({
      restaurantId: body.restaurantId,
      amountPaise: body.amountPaise,
      idempotencyKey: `rzp_${body.razorpayPaymentId}`,
      meta: {
        paymentMethod: "razorpay",
        orderId: body.razorpayOrderId,
        razorpayOrderId: body.razorpayOrderId,
        razorpayPaymentId: body.razorpayPaymentId,
        razorpaySignature: body.razorpaySignature,
        transactionId: body.razorpayPaymentId,
        utr: body.razorpayPaymentId,
        note: "Razorpay wallet top-up",
      },
    });

    return { wallet, mode: "live" as const };
  });
}
