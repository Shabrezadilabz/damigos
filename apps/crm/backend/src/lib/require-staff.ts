import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { bearerToken, verifyStaffToken, type StaffJwtPayload } from "@damigos/auth";
import { db, userRestaurantRoles } from "@damigos/db";

declare module "fastify" {
  interface FastifyRequest {
    staff?: StaffJwtPayload;
  }
}

export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const token = bearerToken(request.headers.authorization);
  if (!token) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Staff login required",
        correlationId: request.id,
      },
    });
  }
  try {
    request.staff = await verifyStaffToken(token);
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

export function requireRoles(...allowed: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireStaff(request, reply);
    if (reply.sent) return;
    const roles = request.staff?.roles ?? [];
    const ok = allowed.some((r) => roles.includes(r));
    if (!ok) {
      return reply.status(403).send({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient role",
          correlationId: request.id,
        },
      });
    }
  };
}

export function isPlatformAdmin(staff?: StaffJwtPayload) {
  return staff?.roles?.includes("PLATFORM_ADMIN") ?? false;
}

/** Tenant scope: PLATFORM_ADMIN any restaurant; staff must match JWT or role row. */
export async function enforceRestaurantScope(
  request: FastifyRequest,
  reply: FastifyReply,
  restaurantId: string,
) {
  if (reply.sent) return;
  const staff = request.staff;
  if (!staff?.sub) return;

  if (isPlatformAdmin(staff)) return;

  if (staff.restaurantId === restaurantId) return;

  const [row] = await db
    .select({ id: userRestaurantRoles.id })
    .from(userRestaurantRoles)
    .where(
      and(
        eq(userRestaurantRoles.userId, staff.sub),
        eq(userRestaurantRoles.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  if (row) return;

  return reply.status(403).send({
    error: {
      code: "FORBIDDEN",
      message: "No access to this restaurant",
      correlationId: request.id,
    },
  });
}
