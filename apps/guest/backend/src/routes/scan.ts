import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, scanEvents, stickerBatches, stickerTokens } from "@damigos/db";

const resolveQuery = z.object({
  token: z.string().min(8),
});

/** G-01.01 — P0 stub with DB when available */
export async function registerScanRoutes(app: FastifyInstance) {
  app.get("/scan/resolve", async (request, reply) => {
    const parsed = resolveQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "token query required",
          correlationId: request.id,
        },
      });
    }

    const { token } = parsed.data;

    const rows = await db
      .select({
        tokenId: stickerTokens.id,
        tokenStatus: stickerTokens.status,
        restaurantId: stickerBatches.restaurantId,
        validFrom: stickerBatches.validFrom,
        validTo: stickerBatches.validTo,
        revokedAt: stickerBatches.revokedAt,
        activatedAt: stickerBatches.activatedAt,
      })
      .from(stickerTokens)
      .innerJoin(stickerBatches, eq(stickerTokens.batchId, stickerBatches.id))
      .where(eq(stickerTokens.publicToken, token))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return reply.status(404).send({
        error: {
          code: "STICKER_NOT_FOUND",
          message: "Invalid QR",
          correlationId: request.id,
        },
      });
    }

    if (!row.activatedAt) {
      return reply.status(403).send({
        error: {
          code: "STICKER_NOT_ACTIVATED",
          message: "Sticker batch not activated by restaurant yet",
          correlationId: request.id,
        },
      });
    }

    if (row.revokedAt || row.tokenStatus === "REVOKED") {
      return reply.status(410).send({
        error: {
          code: "STICKER_REVOKED",
          message: "This sticker was revoked",
          correlationId: request.id,
        },
      });
    }

    const now = new Date();
    if (now < row.validFrom || now > row.validTo || row.tokenStatus === "EXPIRED") {
      return reply.status(410).send({
        error: {
          code: "STICKER_EXPIRED",
          message: "This sticker batch has expired",
          correlationId: request.id,
        },
      });
    }

    if (row.tokenStatus === "CONSUMED") {
      return reply.status(410).send({
        error: {
          code: "STICKER_CONSUMED",
          message: "This sticker was already used",
          correlationId: request.id,
        },
      });
    }

    const [scanEvent] = await db
      .insert(scanEvents)
      .values({
        tokenId: row.tokenId,
        restaurantId: row.restaurantId,
      })
      .returning();

    return {
      restaurantId: row.restaurantId,
      scanEventId: scanEvent.id,
      scanLogged: true,
      redirectPath: `/r/${row.restaurantId}?scan=${scanEvent.id}`,
    };
  });
}
