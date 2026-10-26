import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendStaffOtpSms } from "../lib/sms-otp.js";
import { StaffOtpError, verifyStaffOtp } from "../lib/staff-otp-verify.js";

/** C-01.02 — staff OTP + JWT (invite kitchen uses same OTP). */
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
    // Live 6-digit OTP when MSG91/Twilio is set; pilot code 000000 still works via bypass
    const hasLiveSms = Boolean(
      process.env.MSG91_AUTH_KEY?.trim() || process.env.TWILIO_ACCOUNT_SID?.trim(),
    );
    const code = hasLiveSms
      ? undefined
      : process.env.STAFF_OTP_DEV_CODE?.trim() || "000000";
    const sms = await sendStaffOtpSms(body.data.phone, code);
    return { sent: sms.sent, channel: sms.channel };
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
