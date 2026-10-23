import { desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { consentRecords, customers, db } from "@damigos/db";
import { notifyPartnersEmail } from "../lib/partner-notify.js";
import { requireGuest } from "../lib/require-guest.js";
import { optionalGuest } from "../lib/optional-guest.js";

const POLICY_VERSION = "2026-10-15";

/** G-02 profile + consents */
export async function registerMeRoutes(app: FastifyInstance) {
  /** Guest app feedback → partners@damigos.in */
  app.post("/me/feedback", { preHandler: optionalGuest }, async (request, reply) => {
    const body = z
      .object({
        message: z.string().min(8).max(4000),
        rating: z.number().int().min(1).max(5).optional(),
        email: z.string().email().optional(),
        name: z.string().max(120).optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "message required (min 8 characters)",
          correlationId: request.id,
        },
      });
    }

    let guestName = body.data.name?.trim() || null;
    let guestPhoneLast4: string | null = null;
    const customerId = request.guest?.sub;
    if (customerId) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);
      if (customer) {
        guestName = guestName || customer.name;
        guestPhoneLast4 = customer.phoneLast4;
      }
    }

    const ratingLine = body.data.rating ? `Rating: ${body.data.rating}/5\n` : "";
    const text =
      `Guest app feedback\n` +
      ratingLine +
      `Name: ${guestName ?? "—"}\n` +
      `Phone last4: ${guestPhoneLast4 ?? "—"}\n` +
      `Reply-to email: ${body.data.email ?? "—"}\n` +
      `Customer id: ${customerId ?? "anonymous"}\n\n` +
      body.data.message.trim();

    const result = await notifyPartnersEmail({
      subject: `[Guest feedback]${body.data.rating ? ` ${body.data.rating}★` : ""} ${guestName ?? "Guest"}`,
      body: text,
      meta: {
        source: "guest_me_feedback",
        customerId: customerId ?? null,
        rating: body.data.rating ?? null,
      },
    });

    return {
      ok: true,
      emailed: result.emailed,
      to: process.env.PARTNERS_NOTIFY_EMAIL?.trim() || "partners@damigos.in",
    };
  });

  app.get("/me", { preHandler: requireGuest }, async (request, reply) => {
    const customerId = request.guest!.sub!;
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Customer not found", correlationId: request.id },
      });
    }

    const consents = await db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.customerId, customerId))
      .orderBy(desc(consentRecords.createdAt));

    const latest: Record<string, boolean> = {};
    for (const row of consents) {
      if (latest[row.kind] === undefined) latest[row.kind] = row.granted;
    }

    return {
      id: customer.id,
      name: customer.name,
      phoneLast4: customer.phoneLast4,
      consents: {
        transactional: latest.transactional ?? false,
        marketing: latest.marketing ?? false,
        game: latest.game ?? false,
      },
      profileComplete: Boolean(customer.name && latest.transactional),
    };
  });

  app.post("/me/profile", { preHandler: requireGuest }, async (request, reply) => {
    const body = z.object({ name: z.string().min(1).max(255) }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "name required", correlationId: request.id },
      });
    }
    const customerId = request.guest!.sub!;
    const [updated] = await db
      .update(customers)
      .set({ name: body.data.name })
      .where(eq(customers.id, customerId))
      .returning();
    return { customer: { id: updated.id, name: updated.name } };
  });

  app.post("/me/consents", { preHandler: requireGuest }, async (request, reply) => {
    const body = z
      .object({
        transactional: z.boolean(),
        marketing: z.boolean().optional(),
        game: z.boolean().optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },
      });
    }

    if (!body.data.transactional) {
      return reply.status(400).send({
        error: {
          code: "CONSENT_REQUIRED",
          message: "Transactional consent is required to order",
          correlationId: request.id,
        },
      });
    }

    const customerId = request.guest!.sub!;
    const rows = [
      { kind: "transactional", granted: body.data.transactional },
      { kind: "marketing", granted: body.data.marketing ?? false },
      { kind: "game", granted: body.data.game ?? false },
    ];

    await db.insert(consentRecords).values(
      rows.map((r) => ({
        customerId,
        kind: r.kind,
        granted: r.granted,
        policyVersion: POLICY_VERSION,
      })),
    );

    return { saved: true, policyVersion: POLICY_VERSION };
  });
}
