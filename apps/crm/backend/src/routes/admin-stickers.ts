import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, stickerBatches, stickerTokens } from "@damigos/db";
import { verifyStickerOpsKey } from "../lib/sticker-ops-key.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";

/** C-06.05 — admin mint (PLATFORM_ADMIN only) */
export async function registerAdminStickerRoutes(app: FastifyInstance) {
  app.post(
    "/admin/sticker-batches",
    { preHandler: requireRoles("PLATFORM_ADMIN") },
    async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(5000),
        validDays: z.number().int().min(10).max(15).default(12),
        notes: z.string().optional(),
        opsKey: z.string().min(4),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: body.error.message,
          correlationId: request.id,
        },
      });
    }

    const { restaurantId, quantity, validDays } = body.data;

    if (!verifyStickerOpsKey(body.data.opsKey)) {
      return reply.status(403).send({
        error: {
          code: "INVALID_OPS_KEY",
          message: "Invalid ops mint key — contact platform admin",
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const validFrom = new Date();
    const validTo = new Date(validFrom);
    validTo.setDate(validTo.getDate() + validDays);

    const batchCode = `B-${randomBytes(4).toString("hex").toUpperCase()}`;

    const [batch] = await db
      .insert(stickerBatches)
      .values({
        restaurantId,
        batchCode,
        quantity,
        validFrom,
        validTo,
      })
      .returning();

    const tokens = Array.from({ length: quantity }, () => ({
      batchId: batch.id,
      publicToken: randomBytes(16).toString("base64url"),
    }));

    await db.insert(stickerTokens).values(tokens);

    return {
      batchId: batch.id,
      batchCode: batch.batchCode,
      validFrom: batch.validFrom,
      validTo: batch.validTo,
      quantity,
    };
  });
}
