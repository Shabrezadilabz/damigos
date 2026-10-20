import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, menuItems, restaurantDailySettlements, restaurants } from "@damigos/db";
import { ensureKitchenSchema } from "../lib/ensure-kitchen-schema.js";
import { ensureOperationsSchema } from "../lib/ensure-operations-schema.js";
import { ensureSettlementSchema } from "../lib/ensure-settlement-schema.js";
import { notifyPartnersEmail } from "../lib/partner-notify.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import {
  computeDayEarnings,
  istBusinessDate,
  isPayoutFrozen,
  maskAccount,
  settleRestaurantDay,
} from "../lib/settlement.js";

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

  /** C-06.08 — kitchen GPS pin for Cross-By Haversine */
  app.get("/settings/location", { preHandler: staffOps }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;
    await ensureKitchenSchema();

    const [row] = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        lat: restaurants.lat,
        lng: restaurants.lng,
        geoUpdatedAt: restaurants.geoUpdatedAt,
      })
      .from(restaurants)
      .where(eq(restaurants.id, query.restaurantId))
      .limit(1);

    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    return {
      restaurantId: row.id,
      name: row.name,
      lat: row.lat,
      lng: row.lng,
      geoUpdatedAt: row.geoUpdatedAt?.toISOString() ?? null,
      pinRequired: row.lat == null || row.lng == null,
    };
  });

  app.patch("/settings/location", { preHandler: ownerSettings }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;
    await ensureKitchenSchema();

    const [updated] = await db
      .update(restaurants)
      .set({
        lat: body.lat,
        lng: body.lng,
        geoUpdatedAt: new Date(),
      })
      .where(eq(restaurants.id, body.restaurantId))
      .returning({
        id: restaurants.id,
        lat: restaurants.lat,
        lng: restaurants.lng,
        geoUpdatedAt: restaurants.geoUpdatedAt,
      });

    if (!updated) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    return {
      restaurantId: updated.id,
      lat: updated.lat,
      lng: updated.lng,
      geoUpdatedAt: updated.geoUpdatedAt?.toISOString() ?? null,
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
    await ensureSettlementSchema();

    const [row] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
    if (!row) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    const kycStatus = row.razorpayKycStatus ?? "not_linked";
    const today = istBusinessDate();
    const todayEarnings = await computeDayEarnings(restaurantId, today);
    const frozen = isPayoutFrozen(row);

    return {
      restaurantId,
      razorpay: {
        linkedAccountId: row.razorpayLinkedAccountId,
        kycStatus,
        kycLabel: kycLabels[kycStatus] ?? kycStatus,
        mode: "stub",
      },
      bank: {
        accountName: row.bankAccountName,
        accountNumberMasked: maskAccount(row.bankAccountNumber),
        accountNumberLast4: row.bankAccountNumber
          ? row.bankAccountNumber.replace(/\s/g, "").slice(-4)
          : null,
        ifsc: row.bankIfsc,
        bankName: row.bankName,
        updatedAt: row.bankDetailsUpdatedAt?.toISOString() ?? null,
        hasBank: Boolean(row.bankAccountNumber && row.bankIfsc),
      },
      payout: {
        frozen,
        frozenUntil: row.payoutFrozenUntil?.toISOString() ?? null,
        freezeReason: row.payoutFreezeReason,
        eodNote: "Auto-settlement runs after 12:00 AM IST for the previous day",
      },
      today: todayEarnings,
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
        bankAccountName: z.string().max(128).nullable().optional(),
        bankAccountNumber: z.string().max(32).nullable().optional(),
        bankIfsc: z.string().max(16).nullable().optional(),
        bankName: z.string().max(128).nullable().optional(),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;
    await ensureSettlementSchema();

    const [before] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, body.restaurantId))
      .limit(1);
    if (!before) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    const patch: Partial<typeof restaurants.$inferInsert> = {};
    if (body.petpoojaOutletId !== undefined) {
      patch.petpoojaOutletId = body.petpoojaOutletId?.trim() || null;
    }
    if (body.restroworksLocationId !== undefined) {
      patch.restroworksLocationId = body.restroworksLocationId?.trim() || null;
    }

    const bankTouched =
      body.bankAccountName !== undefined ||
      body.bankAccountNumber !== undefined ||
      body.bankIfsc !== undefined ||
      body.bankName !== undefined;

    if (bankTouched) {
      if (body.bankAccountName !== undefined) {
        patch.bankAccountName = body.bankAccountName?.trim() || null;
      }
      if (body.bankAccountNumber !== undefined) {
        patch.bankAccountNumber = body.bankAccountNumber?.replace(/\s/g, "") || null;
      }
      if (body.bankIfsc !== undefined) {
        patch.bankIfsc = body.bankIfsc?.trim().toUpperCase() || null;
      }
      if (body.bankName !== undefined) {
        patch.bankName = body.bankName?.trim() || null;
      }
      patch.bankDetailsUpdatedAt = new Date();
      // Freeze through end of today IST (+ buffer) until ops updates Razorpay Route
      const endOfTodayIst = new Date(`${istBusinessDate()}T23:59:59+05:30`);
      patch.payoutFrozenUntil = endOfTodayIst;
      patch.payoutFreezeReason =
        "Bank details edited — settlements frozen until Razorpay Route updated";
    }

    if (Object.keys(patch).length === 0) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "No fields to update", correlationId: request.id },
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

    if (bankTouched) {
      void notifyPartnersEmail({
        subject: `[Damigos] Bank details updated — payout frozen · ${updated.name}`,
        body:
          `Restaurant: ${updated.name} (${updated.id})\n` +
          `IFSC: ${updated.bankIfsc ?? "—"}\n` +
          `Account: ${maskAccount(updated.bankAccountNumber)}\n` +
          `Name: ${updated.bankAccountName ?? "—"}\n` +
          `Bank: ${updated.bankName ?? "—"}\n` +
          `Payout frozen until: ${updated.payoutFrozenUntil?.toISOString() ?? "—"}\n` +
          `Action: Update Razorpay Route linked account, then clear freeze in CRM ops.\n`,
        meta: { restaurantId: updated.id, previousIfsc: before.bankIfsc },
      });
    }

    const kycStatus = updated.razorpayKycStatus ?? "not_linked";
    const today = istBusinessDate();
    const todayEarnings = await computeDayEarnings(updated.id, today);

    return {
      restaurantId: updated.id,
      razorpay: {
        linkedAccountId: updated.razorpayLinkedAccountId,
        kycStatus,
        kycLabel: kycLabels[kycStatus] ?? kycStatus,
        mode: "stub",
      },
      bank: {
        accountName: updated.bankAccountName,
        accountNumberMasked: maskAccount(updated.bankAccountNumber),
        accountNumberLast4: updated.bankAccountNumber
          ? updated.bankAccountNumber.replace(/\s/g, "").slice(-4)
          : null,
        ifsc: updated.bankIfsc,
        bankName: updated.bankName,
        updatedAt: updated.bankDetailsUpdatedAt?.toISOString() ?? null,
        hasBank: Boolean(updated.bankAccountNumber && updated.bankIfsc),
      },
      payout: {
        frozen: isPayoutFrozen(updated),
        frozenUntil: updated.payoutFrozenUntil?.toISOString() ?? null,
        freezeReason: updated.payoutFreezeReason,
        eodNote: "Auto-settlement runs after 12:00 AM IST for the previous day",
      },
      today: todayEarnings,
      pos: {
        petpoojaOutletId: updated.petpoojaOutletId,
        restroworksLocationId: updated.restroworksLocationId,
        syncMode: "stub",
      },
    };
  });

  /** Daily earnings + settlement invoices */
  app.get("/settings/payout/earnings", { preHandler: ownerSettings }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;
    await ensureSettlementSchema();

    const date = query.date ?? istBusinessDate();
    const earnings = await computeDayEarnings(query.restaurantId, date);
    const [settlement] = await db
      .select()
      .from(restaurantDailySettlements)
      .where(
        and(
          eq(restaurantDailySettlements.restaurantId, query.restaurantId),
          eq(restaurantDailySettlements.businessDate, date),
        ),
      )
      .limit(1);

    return { earnings, settlement: settlement ?? null };
  });

  app.get("/settings/payout/settlements", { preHandler: ownerSettings }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid(),
        limit: z.coerce.number().int().min(1).max(60).optional(),
      })
      .parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;
    await ensureSettlementSchema();

    const rows = await db
      .select()
      .from(restaurantDailySettlements)
      .where(eq(restaurantDailySettlements.restaurantId, query.restaurantId))
      .orderBy(desc(restaurantDailySettlements.businessDate))
      .limit(query.limit ?? 14);

    return {
      settlements: rows.map((r) => ({
        id: r.id,
        businessDate: r.businessDate,
        orderCount: r.orderCount,
        paymentsCount: r.paymentsCount,
        grossSalesPaise: r.grossSalesPaise,
        restaurantSharePaise: r.restaurantSharePaise,
        platformFeePaise: r.platformFeePaise,
        deliveryFeePaise: r.deliveryFeePaise,
        waitingPenaltyPaise: r.waitingPenaltyPaise,
        status: r.status,
        invoiceNumber: r.invoiceNumber,
        invoice: r.invoiceJson ? (JSON.parse(r.invoiceJson) as unknown) : null,
        settledAt: r.settledAt?.toISOString() ?? null,
        freezeNote: r.freezeNote,
      })),
    };
  });

  /** Manual catch-up settle (owner) — still respects freeze */
  app.post("/settings/payout/settle-day", { preHandler: ownerSettings }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .parse(request.body);
    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;
    await ensureSettlementSchema();

    const date = body.date ?? istBusinessDate();
    const row = await settleRestaurantDay(body.restaurantId, date);
    return { settlement: row };
  });
}
