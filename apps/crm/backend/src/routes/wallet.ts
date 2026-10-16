import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import {
  creditTopUp,
  getWalletSnapshot,
  WALLET_TOPUP_PACK_PAISE,
} from "../lib/wallet.js";

/** C-04.06 — prepaid WhatsApp broadcast wallet */
export async function registerWalletRoutes(app: FastifyInstance) {
  const staffView = requireRoles("RESTAURANT_OWNER", "STAFF", "PLATFORM_ADMIN");
  const staffTopUp = requireRoles("RESTAURANT_OWNER", "PLATFORM_ADMIN");

  app.get("/wallet", { preHandler: staffView }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;
    return getWalletSnapshot(query.restaurantId);
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
        amountPaise: z.number().int().positive().default(WALLET_TOPUP_PACK_PAISE),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const mode = process.env.WALLET_TOPUP_MODE ?? "stub";
    if (mode !== "stub") {
      return reply.status(501).send({
        error: {
          code: "NOT_IMPLEMENTED",
          message: "Live Razorpay wallet top-up not wired yet (WALLET_TOPUP_MODE=stub for pilot)",
          correlationId: request.id,
        },
      });
    }

    const wallet = await creditTopUp({
      restaurantId: body.restaurantId,
      amountPaise: body.amountPaise,
      idempotencyKey,
    });

    return { wallet };
  });
}
