import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { hashPhone, phoneLast4, signStaffToken } from "@damigos/auth";
import { db, userRestaurantRoles, users } from "@damigos/db";
import { isOtpBypassCode } from "../lib/otp-bypass.js";

/** C-01.02 — staff OTP + JWT */
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
    let [user] = await db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({ phoneHash, phoneLast4: phoneLast4(body.data.phone) })
        .returning();
    }

    const roleRows = await db
      .select()
      .from(userRestaurantRoles)
      .where(eq(userRestaurantRoles.userId, user.id));

    const roles = roleRows.map((r) => r.role);

    if (roles.length === 0) {
      return reply.status(403).send({
        error: {
          code: "NO_STAFF_ACCESS",
          message: "No restaurant role assigned for this phone",
          correlationId: request.id,
        },
      });
    }

    const ownerRow = roleRows.find((r) => r.role === "RESTAURANT_OWNER");
    const restaurantId = ownerRow?.restaurantId ?? roleRows[0]?.restaurantId;

    const token = await signStaffToken({
      userId: user.id,
      roles,
      restaurantId,
    });

    return {
      verified: true,
      token,
      roles,
      restaurantId,
      expiresIn: "12h",
    };
  });
}
