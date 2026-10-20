import { and, eq, desc } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPhone, phoneLast4, signGuestToken } from "@damigos/auth";
import { consentRecords, customers, db, messageDeliveryLog, restaurants } from "@damigos/db";
import {
  guestWebOrigin,
  kapsoMode,
  normalizeWaPhone,
  sendFoodHiNew,
  sendFoodHiReturning,
  sendKapsoText,
  sendSparkOptInInvite,
  sparkWaMeE164,
} from "../lib/kapso.js";
import {
  findActiveSparkSessionByPhone,
  markSparkSessionUnlocked,
  playPathFor,
  upsertSparkPlaySession,
} from "../lib/spark-play-session.js";
import { lastVisitedKitchens } from "./hub.js";

type KapsoInboundMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string };
  };
};

/**
 * Dual-agent WhatsApp surface:
 * - POST /wa/spark/opt-in — web consent → store phone + marketing opt-in
 * - POST /wa/spark/invite — send Spark invite (needs phone)
 * - GET|POST /wa/webhooks/kapso — Meta verify + inbound HI / buttons
 * - GET /wa/status — agent config (no secrets)
 */
export async function registerWaRoutes(app: FastifyInstance) {
  app.get("/wa/status", async () => {
    const waMe = sparkWaMeE164();
    return {
      mode: kapsoMode(),
      agents: {
        spark: "Spark by D'aMigo (marketing / opt-in / game)",
        food: "D'aMigo Food (utility / bill / track / HI)",
      },
      phoneIdsConfigured: {
        spark: Boolean(
          process.env.KAPSO_SPARK_PHONE_NUMBER_ID?.trim() || process.env.KAPSO_PHONE_NUMBER_ID?.trim(),
        ),
        food: Boolean(
          process.env.KAPSO_FOOD_PHONE_NUMBER_ID?.trim() || process.env.KAPSO_PHONE_NUMBER_ID?.trim(),
        ),
      },
      sparkWaMeE164: waMe,
      sandbox: (process.env.KAPSO_USE_SANDBOX ?? "").toLowerCase() === "true",
    };
  });

  app.post("/wa/spark/opt-in", async (request, reply) => {
    const body = z
      .object({
        phone: z.string().min(10),
        restaurantId: z.string().uuid(),
        scanId: z.string().uuid().optional(),
        consentVersion: z.string().default("spark-v1"),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "phone + restaurantId required",
          correlationId: request.id,
        },
      });
    }

    const e164 = normalizeWaPhone(body.data.phone);
    const phoneHash = hashPhone(body.data.phone);
    const last4 = phoneLast4(body.data.phone);

    let [customer] = await db.select().from(customers).where(eq(customers.phoneHash, phoneHash)).limit(1);
    if (!customer) {
      [customer] = await db
        .insert(customers)
        .values({
          phoneHash,
          phoneLast4: last4,
          phoneE164: e164,
          waOptInSource: "SPARK_QR",
          waOptInAt: new Date(),
        })
        .returning();
    } else {
      await db
        .update(customers)
        .set({
          phoneE164: e164,
          waOptInSource: "SPARK_QR",
          waOptInAt: new Date(),
        })
        .where(eq(customers.id, customer.id));
      customer = { ...customer, phoneE164: e164, waOptInSource: "SPARK_QR", waOptInAt: new Date() };
    }

    await db.insert(consentRecords).values({
      customerId: customer.id,
      kind: "marketing",
      granted: true,
      policyVersion: body.data.consentVersion,
    });

    const [kitchen] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, body.data.restaurantId))
      .limit(1);

    const path = playPathFor(body.data.restaurantId, body.data.scanId);
    const playUrl = `${guestWebOrigin()}${path}`;

    await upsertSparkPlaySession({
      restaurantId: body.data.restaurantId,
      scanEventId: body.data.scanId,
      phoneE164: e164,
      playPath: path,
    });

    try {
      await db.insert(messageDeliveryLog).values({
        restaurantId: body.data.restaurantId,
        customerId: customer.id,
        messageClass: "marketing",
        templateKey: "spark_opt_in",
        status: "opted_in",
        kapsoMessageId: null,
      });
    } catch (err) {
      request.log.warn({ err }, "message_delivery_log opt-in write skipped");
    }

    const jwt = await signGuestToken(customer.id, last4);

    return {
      ok: true,
      playUrl,
      playPath: path,
      restaurantName: kitchen?.name ?? "Kitchen",
      token: jwt,
      customerId: customer.id,
      consentVersion: body.data.consentVersion,
    };
  });

  app.post("/wa/spark/invite", async (request, reply) => {
    const body = z
      .object({
        phone: z.string().min(10),
        restaurantId: z.string().uuid(),
        scanId: z.string().uuid().optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "phone + restaurantId required",
          correlationId: request.id,
        },
      });
    }

    const [kitchen] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, body.data.restaurantId))
      .limit(1);

    const path = playPathFor(body.data.restaurantId, body.data.scanId);
    const playUrl = `${guestWebOrigin()}${path}`;
    const e164 = normalizeWaPhone(body.data.phone);

    await upsertSparkPlaySession({
      restaurantId: body.data.restaurantId,
      scanEventId: body.data.scanId,
      phoneE164: e164,
      playPath: path,
    });

    const result = await sendSparkOptInInvite(
      body.data.phone,
      playUrl,
      kitchen?.name ?? "our kitchen",
    );

    if (!result.ok) {
      return reply.status(502).send({
        error: {
          code: "KAPSO_SEND_FAILED",
          message: result.error ?? "Spark invite failed",
          correlationId: request.id,
        },
        mode: result.mode,
      });
    }

    return { ok: true, messageId: result.messageId, mode: result.mode, playUrl, playPath: path };
  });

  app.get("/wa/webhooks/kapso", async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    const mode = q["hub.mode"];
    const token = q["hub.verify_token"];
    const challenge = q["hub.challenge"];
    const expected = process.env.KAPSO_WEBHOOK_VERIFY_TOKEN ?? "damigos-kapso-verify";
    if (mode === "subscribe" && token === expected && challenge) {
      return reply.status(200).send(challenge);
    }
    return reply.status(403).send({ error: "Forbidden" });
  });

  app.post("/wa/webhooks/kapso", async (request) => {
    const payload = request.body as {
      entry?: {
        changes?: {
          value?: {
            messages?: KapsoInboundMessage[];
            metadata?: { phone_number_id?: string };
          };
        }[];
      }[];
    };

    const messages =
      payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];

    for (const msg of messages) {
      const from = msg.from;
      if (!from) continue;

      const buttonId = msg.interactive?.button_reply?.id ?? msg.interactive?.list_reply?.id;
      const textBody = (msg.text?.body ?? "").trim();
      const hub = guestWebOrigin();

      if (buttonId === "unlock_reward" || buttonId === "view_menu" || buttonId === "order_now_menu") {
        const session = await findActiveSparkSessionByPhone(from);
        const playUrl = session ? `${hub}${session.playPath}` : `${hub}/hub`;
        const menuUrl = session
          ? `${hub}/r/${session.restaurantId}/menu`
          : `${hub}/hub`;

        if (buttonId === "unlock_reward") {
          await ensureMarketingConsentFromWa(from, session?.restaurantId ?? null);
          if (session) await markSparkSessionUnlocked(session.id);
          await sendKapsoText(
            "spark",
            from,
            `🎉 *You're in!*\n\n` +
              `Play & redeem your pouch perk here:\n${playUrl}\n\n` +
              `After you win, tap Redeem to order from this kitchen.\n` +
              `_Spark by D'aMigo's_`,
          );
          continue;
        }

        await sendKapsoText(
          "spark",
          from,
          buttonId === "order_now_menu"
            ? `🍽 Order & redeem your perk:\n${menuUrl}\n\nAfter pay, *D'aMigo Food* sends your bill & track link.`
            : `Menu: ${menuUrl}`,
        );
        continue;
      }

      if (buttonId === "explore_hub" || buttonId === "order_last" || buttonId === "active_orders") {
        if (buttonId === "order_last") {
          const customer = await findCustomerByWaPhone(from);
          const last = customer ? await lastVisitedKitchens(customer.id, 1) : [];
          const path = last[0]?.menuPath ?? "/hub";
          await sendKapsoText(
            "food",
            from,
            last[0]
              ? `Reordering from *${last[0].name}*:\n${hub}${path}`
              : `No past kitchen yet — explore: ${hub}/hub`,
          );
          continue;
        }
        const path = buttonId === "active_orders" ? "/orders" : "/hub";
        await sendKapsoText("food", from, `Open here: ${hub}${path}`);
        continue;
      }

      if (/^hi+$/i.test(textBody) || textBody.toLowerCase() === "hello") {
        const customer = await findCustomerByWaPhone(from);
        const hubUrl = `${hub}/hub`;
        if (customer) {
          const kitchens = await lastVisitedKitchens(customer.id, 3);
          await sendFoodHiReturning(
            from,
            hubUrl,
            kitchens.map((k) => ({ name: k.name, menuUrl: `${hub}${k.menuPath}` })),
          );
        } else {
          await sendFoodHiNew(from, hubUrl);
        }
      }
    }

    return { received: true };
  });
}

async function findCustomerByWaPhone(from: string) {
  const e164 = normalizeWaPhone(from);
  const phoneHash = hashPhone(from.startsWith("+") ? from : `+${from}`);

  const [byHash] = await db.select().from(customers).where(eq(customers.phoneHash, phoneHash)).limit(1);
  if (byHash) return byHash;

  const [byE164] = await db.select().from(customers).where(eq(customers.phoneE164, e164)).limit(1);
  if (byE164) return byE164;

  // Returning = has prior marketing consent even if phone formats differ
  const [consented] = await db
    .select({ customerId: consentRecords.customerId })
    .from(consentRecords)
    .innerJoin(customers, eq(consentRecords.customerId, customers.id))
    .where(and(eq(customers.phoneE164, e164), eq(consentRecords.kind, "marketing"), eq(consentRecords.granted, true)))
    .orderBy(desc(consentRecords.createdAt))
    .limit(1);

  if (!consented) return null;
  const [c] = await db.select().from(customers).where(eq(customers.id, consented.customerId)).limit(1);
  return c ?? null;
}

/** Record marketing Yes from Spark unlock button (DEC-010). */
async function ensureMarketingConsentFromWa(from: string, restaurantId: string | null) {
  const e164 = normalizeWaPhone(from);
  const phoneHash = hashPhone(from.startsWith("+") ? from : `+${from}`);
  const last4 = phoneLast4(from);

  let [customer] = await db.select().from(customers).where(eq(customers.phoneHash, phoneHash)).limit(1);
  if (!customer) {
    [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.phoneE164, e164))
      .limit(1);
  }
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({
        phoneHash,
        phoneLast4: last4,
        phoneE164: e164,
        waOptInSource: "SPARK_UNLOCK",
        waOptInAt: new Date(),
      })
      .returning();
  } else {
    await db
      .update(customers)
      .set({
        phoneE164: e164,
        waOptInSource: customer.waOptInSource ?? "SPARK_UNLOCK",
        waOptInAt: customer.waOptInAt ?? new Date(),
      })
      .where(eq(customers.id, customer.id));
  }

  const [existing] = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.customerId, customer.id),
        eq(consentRecords.kind, "marketing"),
        eq(consentRecords.granted, true),
      ),
    )
    .limit(1);
  if (!existing) {
    await db.insert(consentRecords).values({
      customerId: customer.id,
      kind: "marketing",
      granted: true,
      policyVersion: "spark-unlock-v1",
    });
  }

  if (restaurantId) {
    try {
      await db.insert(messageDeliveryLog).values({
        restaurantId,
        customerId: customer.id,
        messageClass: "marketing",
        templateKey: "spark_unlock_yes",
        status: "opted_in",
        kapsoMessageId: null,
      });
    } catch {
      /* ignore */
    }
  }
}
