import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { StaffOtpError, verifyStaffOtp } from "../lib/staff-otp-verify.js";

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

    try {
      return await verifyStaffOtp(body.data.phone, body.data.code);
    } catch (err) {
      if (err instanceof StaffOtpError) {
        return reply.status(err.statusCode).send({
          error: { code: err.code, message: err.message, correlationId: request.id },
        });
      }
      throw err;
    }
  });
}
