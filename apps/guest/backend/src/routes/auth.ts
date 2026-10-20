import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPhone, phoneLast4, signGuestToken } from "@damigos/auth";
import { customers, db } from "@damigos/db";
import { normalizeWaPhone } from "../lib/kapso.js";
import { isOtpBypassCode } from "../lib/otp-bypass.js";

/** G-02.01 — OTP + JWT (P0: bypass code; SMS P1) */
export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/auth/otp/request", async (request, reply) => {
    const body = z.object({ phone: z.string().min(10) }).safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "phone required",
          correlationId: request.id,
        },
      });
    }
    return { sent: true, channel: "sms_stub" };
  });

  app.post("/auth/otp/verify", async (request, reply) => {
    const body = z
      .object({ phone: z.string().min(10), code: z.string().min(5).max(6) })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "phone and code required",
          correlationId: request.id,
        },
      });
    }

    if (!isOtpBypassCode(body.data.code)) {
      return reply.status(401).send({
        error: {
          code: "OTP_INVALID",
          message: "Invalid code",
          correlationId: request.id,
        },
      });
    }

    const phoneHash = hashPhone(body.data.phone);
    const last4 = phoneLast4(body.data.phone);
    const e164 = normalizeWaPhone(body.data.phone);

    let [customer] = await db.select().from(customers).where(eq(customers.phoneHash, phoneHash)).limit(1);

    if (!customer) {
      [customer] = await db
        .insert(customers)
        .values({ phoneHash, phoneLast4: last4, phoneE164: e164 })
        .returning();
    } else if (!customer.phoneE164) {
      await db.update(customers).set({ phoneE164: e164 }).where(eq(customers.id, customer.id));
    }

    const token = await signGuestToken(customer.id, last4);

    return {
      verified: true,
      token,
      customerId: customer.id,
      expiresIn: "30d",
    };
  });
}
