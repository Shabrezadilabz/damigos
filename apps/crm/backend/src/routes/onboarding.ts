import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, restaurants } from "@damigos/db";
import { FssaiVerifyError, verifyFssaiLicense } from "../lib/fssai-verify.js";
import {
  autoProvisionOnboardingTenant,
  onboardingAutoApproveEnabled,
} from "../lib/onboarding-auto-provision.js";
import { enforceRestaurantScope, requireStaff } from "../lib/require-staff.js";

const applicationBody = z.object({
  legalName: z.string().min(2).max(200),
  operatorName: z.string().min(2).max(120),
  phone: z.string().min(10),
  email: z.string().email(),
  city: z.string().min(2).max(80),
  cuisineTags: z.array(z.string()).max(12).optional(),
  fssai: z.string().optional(),
  dpdpAccepted: z.literal(true),
  whatsappGatewayAccepted: z.literal(true),
});

/** C-01.01 — public onboarding + FSSAI verify */
export async function registerOnboardingRoutes(app: FastifyInstance) {
  app.post("/onboarding/applications", async (request, reply) => {
    const parsed = applicationBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: parsed.error.flatten().formErrors.join("; ") || "Invalid onboarding payload",
          correlationId: request.id,
        },
      });
    }

    let fssaiVerification: Awaited<ReturnType<typeof verifyFssaiLicense>> | null = null;
    if (parsed.data.fssai?.trim()) {
      try {
        fssaiVerification = await verifyFssaiLicense(parsed.data.fssai);
      } catch (err) {
        if (err instanceof FssaiVerifyError) {
          return reply.status(422).send({
            error: { code: err.code, message: err.message, correlationId: request.id },
          });
        }
        throw err;
      }
    }

    if (onboardingAutoApproveEnabled()) {
      try {
        const activated = await autoProvisionOnboardingTenant({
          legalName: parsed.data.legalName,
          operatorName: parsed.data.operatorName,
          phone: parsed.data.phone,
          email: parsed.data.email,
          city: parsed.data.city,
          cuisineTags: parsed.data.cuisineTags,
          fssai: parsed.data.fssai,
          fssaiVerification: fssaiVerification,
        });
        return {
          ...activated,
          fssaiVerification,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Activation failed";
        return reply.status(500).send({
          error: { code: "ACTIVATION_FAILED", message, correlationId: request.id },
        });
      }
    }

    return {
      applicationId: randomUUID(),
      status: "PENDING",
      message: "Application recorded (pilot). Ops will activate tenant C-01.03.",
      fssaiVerification,
    };
  });

  app.post("/onboarding/fssai/verify", async (request, reply) => {
    const body = z.object({ fssai: z.string().min(10) }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "fssai required", correlationId: request.id },
      });
    }
    try {
      const result = await verifyFssaiLicense(body.data.fssai);
      return { verified: true, ...result };
    } catch (err) {
      if (err instanceof FssaiVerifyError) {
        const status = err.code === "INVALID_FORMAT" ? 400 : err.code === "EXPIRED" ? 422 : 404;
        return reply.status(status).send({
          error: { code: err.code, message: err.message, correlationId: request.id },
        });
      }
      throw err;
    }
  });

  app.get("/onboarding/status", { preHandler: requireStaff }, async (request, reply) => {
    const restaurantId = request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "No restaurant on session", correlationId: request.id },
      });
    }
    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const [row] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    const r = row as typeof row & {
      onboardingCompletedAt?: Date | null;
      fssaiNumber?: string | null;
      fssaiVerifiedAt?: Date | null;
    };

    const onboardingComplete = Boolean(r.onboardingCompletedAt ?? row.slug);

    return {
      restaurantId,
      onboardingComplete,
      onboardingCompletedAt: r.onboardingCompletedAt?.toISOString() ?? null,
      fssaiNumber: r.fssaiNumber ?? null,
      fssaiVerifiedAt: r.fssaiVerifiedAt?.toISOString() ?? null,
      tenantStatus: row.hubListed ? "ACTIVE" : "PILOT",
    };
  });
}
