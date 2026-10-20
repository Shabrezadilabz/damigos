import type { FastifyInstance } from "fastify";
import { requireStaff } from "../lib/require-staff.js";

/** Staff session from JWT (P0-T04) */
export async function registerMeRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: requireStaff }, async (request) => {
    const staff = request.staff!;
    return {
      userId: staff.sub,
      roles: staff.roles ?? [],
      restaurantId: staff.restaurantId ?? null,
    };
  });
}
