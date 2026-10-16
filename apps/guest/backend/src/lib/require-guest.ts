import type { FastifyReply, FastifyRequest } from "fastify";
import { bearerToken, verifyGuestToken, type GuestJwtPayload } from "@damigos/auth";

declare module "fastify" {
  interface FastifyRequest {
    guest?: GuestJwtPayload;
  }
}

export async function requireGuest(request: FastifyRequest, reply: FastifyReply) {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Login required",
        correlationId: request.id,
      },
    });
  }
  try {
    request.guest = await verifyGuestToken(token);
  } catch {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid session",
        correlationId: request.id,
      },
    });
  }
}
