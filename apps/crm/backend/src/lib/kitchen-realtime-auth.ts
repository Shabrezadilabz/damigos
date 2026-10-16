import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { bearerToken, verifyStaffToken } from "@damigos/auth";
import { enforceRestaurantScope } from "./require-staff.js";

const kitchenRoles = ["RESTAURANT_OWNER", "STAFF", "KITCHEN", "PLATFORM_ADMIN"] as const;

const querySchema = z.object({
  restaurantId: z.string().uuid(),
  token: z.string().min(16).optional(),
});

export type KitchenRealtimeAuth = {
  restaurantId: string;
  staffUserId: string;
};

export type KitchenRealtimeDeny = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type KitchenRealtimeResult =
  | { ok: true; auth: KitchenRealtimeAuth }
  | KitchenRealtimeDeny;

export async function resolveKitchenRealtimeAccess(
  request: FastifyRequest,
): Promise<KitchenRealtimeResult> {
  const parsed = querySchema.safeParse(request.query);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_REQUEST",
      message: "restaurantId required",
    };
  }

  const token =
    bearerToken(request.headers.authorization) ?? (parsed.data.token ? parsed.data.token : null);

  if (!token) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Token required" };
  }

  try {
    request.staff = await verifyStaffToken(token);
  } catch {
    return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Invalid token" };
  }

  const roles = request.staff?.roles ?? [];
  if (!kitchenRoles.some((r) => roles.includes(r))) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "Kitchen access only" };
  }

  let scopeDeny: KitchenRealtimeDeny | null = null;
  const scopeReply = {
    get sent() {
      return scopeDeny !== null;
    },
    status(code: number) {
      return {
        send: (body: unknown) => {
          const err = body as { error?: { code?: string; message?: string } };
          scopeDeny = {
            ok: false,
            status: code,
            code: err?.error?.code ?? "FORBIDDEN",
            message: err?.error?.message ?? "Forbidden",
          };
          return scopeReply;
        },
      };
    },
  } as FastifyReply;

  await enforceRestaurantScope(request, scopeReply, parsed.data.restaurantId);
  if (scopeDeny) return scopeDeny;

  return {
    ok: true,
    auth: {
      restaurantId: parsed.data.restaurantId,
      staffUserId: request.staff!.sub!,
    },
  };
}

export async function authorizeKitchenRealtime(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<KitchenRealtimeAuth | null> {
  const result = await resolveKitchenRealtimeAccess(request);
  if (!result.ok) {
    reply.status(result.status).send({
      error: {
        code: result.code,
        message: result.message,
        correlationId: request.id,
      },
    });
    return null;
  }
  return result.auth;
}
