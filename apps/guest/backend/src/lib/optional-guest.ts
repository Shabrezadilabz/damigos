import type { FastifyRequest } from "fastify";
import { bearerToken, verifyGuestToken } from "@damigos/auth";

/** Attach guest JWT when present; never 401. */
export async function optionalGuest(request: FastifyRequest) {
  const token = bearerToken(request.headers.authorization);
  if (!token) return;
  try {
    request.guest = await verifyGuestToken(token);
  } catch {
    /* ignore invalid token for optional routes */
  }
}
