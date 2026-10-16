import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createMenuImportJob,
  getMenuImportJob,
  listMenuImportReviewItems,
} from "../lib/menu-import-worker.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";

/** C-03.03 PDF import job (mock extract in P1) */
export async function registerMenuImportRoutes(app: FastifyInstance) {
  const staffMenu = requireRoles("RESTAURANT_OWNER", "STAFF", "PLATFORM_ADMIN");

  app.post("/menu/import", { preHandler: staffMenu }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        fileName: z.string().min(1).max(255),
        imageBase64: z.string().max(12_000_000).optional(),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "restaurantId and fileName required",
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;

    let sourceImageDataUrl: string | undefined;
    if (body.data.imageBase64) {
      const mime = body.data.mimeType ?? "image/jpeg";
      sourceImageDataUrl = body.data.imageBase64.startsWith("data:")
        ? body.data.imageBase64
        : `data:${mime};base64,${body.data.imageBase64}`;
    }

    const job = await createMenuImportJob(
      body.data.restaurantId,
      body.data.fileName,
      sourceImageDataUrl,
    );
    return { job };
  });

  app.get("/menu/import/:jobId", { preHandler: staffMenu }, async (request, reply) => {
    const params = z.object({ jobId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "jobId required",
          correlationId: request.id,
        },
      });
    }

    const job = await getMenuImportJob(params.data.jobId);
    if (!job) {
      return reply.status(404).send({
        error: {
          code: "IMPORT_JOB_NOT_FOUND",
          message: "Import job not found",
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, job.restaurantId);
    if (reply.sent) return;

    const reviewItems =
      job.status === "completed" ? await listMenuImportReviewItems(params.data.jobId) : [];

    return { job, reviewItems };
  });
}
