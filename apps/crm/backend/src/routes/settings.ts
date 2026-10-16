import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, menuItems, restaurants } from "@damigos/db";
import { ensureOperationsSchema } from "../lib/ensure-operations-schema.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";

const ownerSettings = requireRoles("RESTAURANT_OWNER", "PLATFORM_ADMIN");
const staffOps = requireRoles("RESTAURANT_OWNER", "STAFF", "PLATFORM_ADMIN", "KITCHEN");

const kycLabels: Record<string, string> = {
  not_linked: "Not linked — connect Razorpay Route in pilot",
  pending: "KYC pending",
  activated: "Activated — payouts enabled (stub)",
};

/** C-06.03 — payout + POS stub fields */
export async function registerSettingsRoutes(app: FastifyInstance) {
  /** Guest hub + WhatsApp menu — master open/off (PRD: settings/operations) */
  app.get("/settings/operations", { preHandler: staffOps }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    await ensureOperationsSchema();

    const [row] = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        city: restaurants.city,
        orderingEnabled: restaurants.orderingEnabled,
      })
      .from(restaurants)
      .where(eq(restaurants.id, query.restaurantId))
      .limit(1);

    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, query.restaurantId),
          eq(menuItems.draft, false),
          eq(menuItems.available, true),
        ),
      );

    const liveMenuCount = count ?? 0;

    return {
      restaurantId: row.id,
      name: row.name,
      city: row.city,
      orderingEnabled: row.orderingEnabled,
      liveMenuCount,
      guestVisible: row.orderingEnabled && liveMenuCount > 0,
    };
  });

  app.patch("/settings/operations", { preHandler: staffOps }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        orderingEnabled: z.boolean(),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    await ensureOperationsSchema();

    const [updated] = await db
      .update(restaurants)
      .set({ orderingEnabled: body.orderingEnabled })
      .where(eq(restaurants.id, body.restaurantId))
      .returning({
        id: restaurants.id,
        name: restaurants.name,
        city: restaurants.city,
        orderingEnabled: restaurants.orderingEnabled,
      });

    if (!updated) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, body.restaurantId),
          eq(menuItems.draft, false),
          eq(menuItems.available, true),
        ),
      );

    const liveMenuCount = count ?? 0;

    return {
      restaurantId: updated.id,
      name: updated.name,
      city: updated.city,
      orderingEnabled: updated.orderingEnabled,
      liveMenuCount,
      guestVisible: updated.orderingEnabled && liveMenuCount > 0,
    };
  });

  app.get("/settings/payout", { preHandler: ownerSettings }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid().optional() }).parse(request.query);
    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },
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

    const kycStatus = row.razorpayKycStatus ?? "not_linked";

    return {
      restaurantId,
      razorpay: {
        linkedAccountId: row.razorpayLinkedAccountId,
        kycStatus,
        kycLabel: kycLabels[kycStatus] ?? kycStatus,
        mode: "stub",
      },
      pos: {
        petpoojaOutletId: row.petpoojaOutletId,
        restroworksLocationId: row.restroworksLocationId,
        syncMode: "stub",
      },
    };
  });

  app.patch("/settings/payout", { preHandler: ownerSettings }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        petpoojaOutletId: z.string().max(64).nullable().optional(),
        restroworksLocationId: z.string().max(64).nullable().optional(),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const patch: Partial<typeof restaurants.$inferInsert> = {};
    if (body.petpoojaOutletId !== undefined) {
      patch.petpoojaOutletId = body.petpoojaOutletId?.trim() || null;
    }
    if (body.restroworksLocationId !== undefined) {
      patch.restroworksLocationId = body.restroworksLocationId?.trim() || null;
    }

    if (Object.keys(patch).length === 0) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "No POS fields to update", correlationId: request.id },
      });
    }

    const [updated] = await db
      .update(restaurants)
      .set(patch)
      .where(eq(restaurants.id, body.restaurantId))
      .returning();

    if (!updated) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    const kycStatus = updated.razorpayKycStatus ?? "not_linked";

    return {
      restaurantId: updated.id,
      razorpay: {
        linkedAccountId: updated.razorpayLinkedAccountId,
        kycStatus,
        kycLabel: kycLabels[kycStatus] ?? kycStatus,
        mode: "stub",
      },
      pos: {
        petpoojaOutletId: updated.petpoojaOutletId,
        restroworksLocationId: updated.restroworksLocationId,
        syncMode: "stub",
      },
    };
  });
}
