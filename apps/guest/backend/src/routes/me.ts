import { desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { consentRecords, customers, db, orders, restaurants } from "@damigos/db";
import { ensureFeedbackSchema } from "../lib/ensure-feedback-schema.js";
import { sendKapsoText } from "../lib/kapso.js";
import { notifyPartnersEmail } from "../lib/partner-notify.js";
import { requireGuest } from "../lib/require-guest.js";
import { optionalGuest } from "../lib/optional-guest.js";

const POLICY_VERSION = "2026-10-15";

/** G-02 profile + consents */
export async function registerMeRoutes(app: FastifyInstance) {
  /** Guest app feedback → DB (per restaurant) + partners@ + WA notify */
  app.post("/me/feedback", { preHandler: optionalGuest }, async (request, reply) => {
    await ensureFeedbackSchema();

    const body = z
      .object({
        message: z.string().min(8).max(4000),
        rating: z.number().int().min(1).max(5).optional(),
        email: z.string().email().optional(),
        name: z.string().max(120).optional(),
        restaurantId: z.string().uuid().optional(),
        orderId: z.string().uuid().optional(),
        source: z.string().max(64).optional(),
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
    let guestPhoneE164: string | null = null;
    const customerId = request.guest?.sub ?? null;
    let restaurantId = body.data.restaurantId ?? null;
    let restaurantName: string | null = null;
    const orderId = body.data.orderId ?? null;

    if (customerId) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);
      if (customer) {
        guestName = guestName || customer.name;
        guestPhoneLast4 = customer.phoneLast4;
        guestPhoneE164 = customer.phoneE164 ?? null;
      }
      if (!restaurantId) {
        const [lastOrder] = await db
          .select({ restaurantId: orders.restaurantId })
          .from(orders)
          .where(eq(orders.customerId, customerId))
          .orderBy(desc(orders.createdAt))
          .limit(1);
        if (lastOrder?.restaurantId) restaurantId = lastOrder.restaurantId;
      }
    }

    if (restaurantId) {
      const [r] = await db
        .select({ name: restaurants.name })
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1);
      restaurantName = r?.name ?? null;
    }

    const ratingLine = body.data.rating ? `Rating: ${body.data.rating}/5\n` : "";
    const kitchenLine = restaurantName
      ? `Kitchen: ${restaurantName} (${restaurantId})\n`
      : restaurantId
        ? `Kitchen id: ${restaurantId}\n`
        : "Kitchen: (not mapped)\n";
    const text =
      `Guest app feedback\n` +
      ratingLine +
      kitchenLine +
      `Name: ${guestName ?? "—"}\n` +
      `Phone last4: ${guestPhoneLast4 ?? "—"}\n` +
      `Reply-to email: ${body.data.email ?? "—"}\n` +
      `Customer id: ${customerId ?? "anonymous"}\n` +
      `Order id: ${orderId ?? "—"}\n\n` +
      body.data.message.trim();

    const result = await notifyPartnersEmail({
      subject: `[Guest feedback]${body.data.rating ? ` ${body.data.rating}★` : ""}${
        restaurantName ? ` · ${restaurantName}` : ""
      } ${guestName ?? "Guest"}`,
      body: text,
      meta: {
        source: body.data.source ?? "guest_me_feedback",
        customerId,
        restaurantId,
        orderId,
        rating: body.data.rating ?? null,
      },
    });

    let feedbackId: string | null = null;
    try {
      const inserted = await db.execute(sql`
        INSERT INTO guest_feedback (
          customer_id, restaurant_id, order_id, rating, message, reply_email, guest_name,
          source, channel, emailed, meta
        ) VALUES (
          ${customerId},
          ${restaurantId},
          ${orderId},
          ${body.data.rating ?? null},
          ${body.data.message.trim()},
          ${body.data.email ?? null},
          ${guestName},
          ${body.data.source ?? "guest_me_feedback"},
          'app',
          ${result.emailed},
          ${JSON.stringify({
            phoneLast4: guestPhoneLast4,
            restaurantName,
          })}::jsonb
        )
        RETURNING id
      `);
      const rows = inserted as unknown as { rows?: { id: string }[] };
      feedbackId = rows.rows?.[0]?.id ?? null;
    } catch (err) {
      console.warn("[me/feedback] persist failed", err);
    }

    /** WA: thank guest + notify shared test line (1 number for now). Template Meta approval later. */
    let waNotified = false;
    const opsWa =
      process.env.FEEDBACK_WA_NOTIFY_E164?.trim() ||
      process.env.KAPSO_WA_E164?.trim() ||
      process.env.KAPSO_SPARK_WA_E164?.trim() ||
      null;
    const stars = body.data.rating ? `${body.data.rating}★ · ` : "";
    const waBody =
      `📝 *Guest feedback*\n` +
      `${stars}${restaurantName ?? "D'aMigo hub"}\n` +
      `${guestName ?? "Guest"}${guestPhoneLast4 ? ` · …${guestPhoneLast4}` : ""}\n\n` +
      body.data.message.trim().slice(0, 800);

    if (opsWa) {
      try {
        const sent = await sendKapsoText("food", opsWa, waBody);
        waNotified = sent.ok;
      } catch (err) {
        console.warn("[me/feedback] ops WA failed", err);
      }
    }
    if (guestPhoneE164) {
      try {
        await sendKapsoText(
          "food",
          guestPhoneE164,
          `Thanks for your feedback${restaurantName ? ` on *${restaurantName}*` : ""}` +
            `${body.data.rating ? ` (${body.data.rating}★)` : ""}. Our partners team got it.`,
        );
      } catch {
        /* non-blocking */
      }
    }
    if (waNotified && feedbackId) {
      try {
        await db.execute(
          sql`UPDATE guest_feedback SET wa_notified = true WHERE id = ${feedbackId}::uuid`,
        );
      } catch {
        /* ignore */
      }
    }

    return {
      ok: true,
      emailed: result.emailed,
      stored: Boolean(feedbackId),
      feedbackId,
      restaurantId,
      waNotified,
      to: process.env.PARTNERS_NOTIFY_EMAIL?.trim() || "partners@damigos.in",
    };
  });

  app.get("/me", { preHandler: requireGuest }, async (request, reply) => {
    await ensureFeedbackSchema();
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

    const extra = await db.execute(sql`
      SELECT email, gender, dietary_pref, date_of_birth::text AS date_of_birth,
             previous_phone_e164, previous_phone_last4
      FROM customers WHERE id = ${customerId}::uuid LIMIT 1
    `);
    const ex = (extra as unknown as { rows?: Record<string, unknown>[] }).rows?.[0] ?? {};

    return {
      id: customer.id,
      name: customer.name,
      phoneLast4: customer.phoneLast4,
      phoneE164: customer.phoneE164 ?? null,
      email: (ex.email as string) ?? null,
      gender: (ex.gender as string) ?? null,
      dietaryPref: (ex.dietary_pref as string) ?? null,
      dateOfBirth: (ex.date_of_birth as string) ?? null,
      previousPhoneLast4: (ex.previous_phone_last4 as string) ?? null,
      consents: {
        transactional: latest.transactional ?? false,
        marketing: latest.marketing ?? false,
        game: latest.game ?? false,
      },
      profileComplete: Boolean(customer.name && latest.transactional),
    };
  });

  app.post("/me/profile", { preHandler: requireGuest }, async (request, reply) => {
    await ensureFeedbackSchema();
    const body = z
      .object({
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().nullable().optional(),
        gender: z.string().max(32).nullable().optional(),
        dietaryPref: z.string().max(64).nullable().optional(),
        dateOfBirth: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        /** Soft phone change — stores old number, does not replace auth identity */
        newPhoneE164: z.string().min(10).max(20).optional(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "Invalid profile fields", correlationId: request.id },
      });
    }
    const customerId = request.guest!.sub!;
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!customer) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Customer not found", correlationId: request.id },
      });
    }

    if (body.data.name) {
      await db.update(customers).set({ name: body.data.name }).where(eq(customers.id, customerId));
    }

    if (body.data.newPhoneE164) {
      const digits = body.data.newPhoneE164.replace(/\D/g, "");
      const e164 = digits.startsWith("91") ? digits : `91${digits.slice(-10)}`;
      const last4 = e164.slice(-4);
      await db.execute(sql`
        UPDATE customers SET
          previous_phone_e164 = COALESCE(phone_e164, previous_phone_e164),
          previous_phone_last4 = COALESCE(phone_last4, previous_phone_last4),
          phone_e164 = ${e164},
          phone_last4 = ${last4}
        WHERE id = ${customerId}::uuid
      `);
    }

    if (body.data.email !== undefined) {
      await db.execute(
        sql`UPDATE customers SET email = ${body.data.email} WHERE id = ${customerId}::uuid`,
      );
    }
    if (body.data.gender !== undefined) {
      await db.execute(
        sql`UPDATE customers SET gender = ${body.data.gender} WHERE id = ${customerId}::uuid`,
      );
    }
    if (body.data.dietaryPref !== undefined) {
      await db.execute(
        sql`UPDATE customers SET dietary_pref = ${body.data.dietaryPref} WHERE id = ${customerId}::uuid`,
      );
    }
    if (body.data.dateOfBirth !== undefined) {
      if (body.data.dateOfBirth === null) {
        await db.execute(sql`UPDATE customers SET date_of_birth = NULL WHERE id = ${customerId}::uuid`);
      } else {
        await db.execute(
          sql`UPDATE customers SET date_of_birth = ${body.data.dateOfBirth}::date WHERE id = ${customerId}::uuid`,
        );
      }
    }

    const [updated] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    return {
      customer: {
        id: updated!.id,
        name: updated!.name,
        phoneLast4: updated!.phoneLast4,
      },
    };
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
