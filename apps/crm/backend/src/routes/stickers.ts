import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

import type { FastifyInstance } from "fastify";

import { z } from "zod";

import { db, restaurants, stickerBatches, stickerTokens } from "@damigos/db";

import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";



/** C-06.04 — owner activate batch (P0 API) */

export async function registerStickerRoutes(app: FastifyInstance) {

  const ownerStickers = requireRoles("RESTAURANT_OWNER", "STAFF", "PLATFORM_ADMIN");



  app.get("/stickers/active", { preHandler: ownerStickers }, async (request, reply) => {

    const query = z

      .object({ restaurantId: z.string().uuid().optional() })

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



    const batches = await db

      .select()

      .from(stickerBatches)

      .where(

        and(

          eq(stickerBatches.restaurantId, restaurantId),

          isNotNull(stickerBatches.activatedAt),

          isNull(stickerBatches.revokedAt),

        ),

      )

      .orderBy(desc(stickerBatches.activatedAt));



    return {

      batches: batches.map((b) => ({

        id: b.id,

        batchCode: b.batchCode,

        quantity: b.quantity,

        validFrom: b.validFrom,

        validTo: b.validTo,

        activatedAt: b.activatedAt,

      })),

    };

  });



  app.get("/stickers/batches", { preHandler: ownerStickers }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid().optional(),
        status: z.enum(["all", "active", "minted", "expired"]).default("all"),
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

    const now = new Date();
    const rows = await db
      .select()
      .from(stickerBatches)
      .where(eq(stickerBatches.restaurantId, restaurantId))
      .orderBy(desc(stickerBatches.validFrom));

    const filtered = rows.filter((b) => {
      const expired = b.validTo < now;
      const revoked = b.revokedAt != null;
      const active = b.activatedAt != null && !revoked && !expired;
      const minted = b.activatedAt == null && !revoked && !expired;
      switch (query.status) {
        case "active":
          return active;
        case "minted":
          return minted;
        case "expired":
          return expired || revoked;
        default:
          return true;
      }
    });

    return {
      batches: filtered.map((b) => ({
        id: b.id,
        batchCode: b.batchCode,
        quantity: b.quantity,
        validFrom: b.validFrom,
        validTo: b.validTo,
        activatedAt: b.activatedAt,
        revokedAt: b.revokedAt,
      })),
    };
  });



  app.get("/stickers/batches/:batchId/print-sheet", { preHandler: ownerStickers }, async (request, reply) => {
    const params = z.object({ batchId: z.string().uuid() }).parse(request.params);
    const query = z
      .object({
        restaurantId: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(48),
      })
      .parse(request.query);

    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },
      });
    }

    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const [batch] = await db
      .select()
      .from(stickerBatches)
      .where(and(eq(stickerBatches.id, params.batchId), eq(stickerBatches.restaurantId, restaurantId)))
      .limit(1);

    if (!batch) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Batch not found", correlationId: request.id },
      });
    }

    const [restaurant] = await db
      .select({ name: restaurants.name })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    const tokens = await db
      .select({ id: stickerTokens.id, publicToken: stickerTokens.publicToken })
      .from(stickerTokens)
      .where(eq(stickerTokens.batchId, batch.id))
      .limit(query.limit);

    const guestWeb = (process.env.GUEST_WEB_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");

    return {
      restaurantName: restaurant?.name ?? "Restaurant",
      batchCode: batch.batchCode,
      validTo: batch.validTo,
      stickers: tokens.map((t, i) => ({
        label: `TBL-${String(i + 1).padStart(2, "0")}`,
        scanPath: `/s/${t.publicToken}`,
        scanUrl: `${guestWeb}/s/${t.publicToken}`,
      })),
    };
  });



  app.post("/stickers/activate", { preHandler: ownerStickers }, async (request, reply) => {

    const body = z

      .object({

        batchCode: z.string().min(4),

        restaurantId: z.string().uuid().optional(),

      })

      .safeParse(request.body);



    if (!body.success) {

      return reply.status(400).send({

        error: {

          code: "INVALID_REQUEST",

          message: "batchCode required",

          correlationId: request.id,

        },

      });

    }



    const restaurantId = body.data.restaurantId ?? request.staff?.restaurantId;

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



    const [batch] = await db

      .select()

      .from(stickerBatches)

      .where(eq(stickerBatches.batchCode, body.data.batchCode.trim()))

      .limit(1);



    if (!batch) {

      return reply.status(404).send({

        error: {

          code: "BATCH_NOT_FOUND",

          message: "Unknown batch code",

          correlationId: request.id,

        },

      });

    }



    if (batch.restaurantId !== restaurantId) {

      return reply.status(403).send({

        error: {

          code: "FORBIDDEN",

          message: "Batch belongs to another kitchen",

          correlationId: request.id,

        },

      });

    }



    if (batch.revokedAt) {

      return reply.status(410).send({

        error: {

          code: "BATCH_REVOKED",

          message: "This batch was revoked",

          correlationId: request.id,

        },

      });

    }



    if (batch.activatedAt) {

      return {

        alreadyActive: true,

        batchId: batch.id,

        batchCode: batch.batchCode,

        validFrom: batch.validFrom,

        validTo: batch.validTo,

        activatedAt: batch.activatedAt,

      };

    }



    const activatedAt = new Date();

    const [updated] = await db

      .update(stickerBatches)

      .set({ activatedAt, validFrom: activatedAt })

      .where(eq(stickerBatches.id, batch.id))

      .returning();



    return {

      activated: true,

      batchId: updated.id,

      batchCode: updated.batchCode,

      validFrom: updated.validFrom,

      validTo: updated.validTo,

      activatedAt: updated.activatedAt,

    };

  });

}

