import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import {
  createRazorpayOrder,
  fetchRazorpayOrderAmountPaise,
  razorpayConfigured,
  razorpayKeyId,
  verifyPaymentSignature,
} from "../lib/razorpay.js";
import {
  creditTopUp,
  getWalletSnapshot,
  grantWelcomeCreditIfEligible,
  WALLET_TOPUP_PACK_PAISE,
  WELCOME_CREDIT_PAISE,
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
    // S1.1 — safety net: owner who is ACTIVE but never hit the login/activation hook
    const welcome = await grantWelcomeCreditIfEligible(query.restaurantId).catch(() => null);
    const wallet = await getWalletSnapshot(query.restaurantId);
    const mode = process.env.WALLET_TOPUP_MODE ?? "stub";
    return {
      ...wallet,
      welcomeCreditGranted: welcome?.granted ?? false,
      welcomeCreditPaise: WELCOME_CREDIT_PAISE,
      topupMode: mode === "live" && razorpayConfigured() ? "live" : "stub",
      packsPaise: [...TOPUP_PACKS],
    };
  });

  /** S1.1 — explicit idempotent claim of the ₹1000 Grow welcome credit (ACTIVE tenants only). */
  app.post("/wallet/welcome-credit", { preHandler: staffTopUp }, async (request, reply) => {
    const body = z.object({ restaurantId: z.string().uuid() }).parse(request.body);
    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;
    const result = await grantWelcomeCreditIfEligible(body.restaurantId);
    if (result.reason === "NOT_FOUND") {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }
    if (result.reason === "NOT_ACTIVE") {
      return reply.status(409).send({
        error: {
          code: "NOT_ACTIVE",
          message: "Welcome credit is available once the restaurant is ACTIVE",
          correlationId: request.id,
        },
      });
    }
    const wallet = await getWalletSnapshot(body.restaurantId);
    return { granted: result.granted, amountPaise: result.amountPaise, wallet };
  });

  app.post("/wallet/topup", { preHandler: staffTopUp }, async (request, reply) => {
    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 64) {
      return reply.status(400).send({
        error: {
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Header Idempotency-Key (8–64 chars) required for wallet top-up",
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

    // S3.4 — in production, free "stub" credit only when WALLET_TOPUP_MODE=stub is set explicitly
    // (an unset / misconfigured env must never mint free wallet balance).
    const stubExplicit = (process.env.WALLET_TOPUP_MODE ?? "").toLowerCase() === "stub";
    if (process.env.NODE_ENV === "production" && !stubExplicit) {
      return reply.status(503).send({
        error: {
          code: "TOPUP_NOT_CONFIGURED",
          message: "Wallet top-up is not configured. Set WALLET_TOPUP_MODE=live with Razorpay keys.",
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
        amountPaise: z
          .number()
          .int()
          .positive()
          .refine((n) => (TOPUP_PACKS as readonly number[]).includes(n), {
            message: "amountPaise must be a listed pack",
          }),
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

    // Credit only what Razorpay actually holds for this order (signature does not cover amount)
    const paidPaise = await fetchRazorpayOrderAmountPaise(body.razorpayOrderId);
    if (paidPaise == null || paidPaise !== body.amountPaise) {
      return reply.status(400).send({
        error: {
          code: "AMOUNT_MISMATCH",
          message: "Razorpay order amount does not match the requested top-up",
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
