import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, menuItems, restaurants } from "@damigos/db";

/** G-07.01 — curated pilot kitchens (hub_listed; no fake wait-times) */
export async function registerHubRoutes(app: FastifyInstance) {
  app.get("/hub/restaurants", async (request) => {
    const query = z
      .object({
        city: z.string().optional(),
        q: z.string().max(64).optional(),
      })
      .parse(request.query);

    const cityFilter = query.city?.toLowerCase() ?? "bangalore";
    const search = query.q?.trim().toLowerCase() ?? "";

    const rows = await db.select().from(restaurants).where(eq(restaurants.hubListed, true));

    const filtered: typeof rows = [];
    for (const r of rows) {
      if (!r.orderingEnabled) continue;
      if ((r.city ?? "Bangalore").toLowerCase() !== cityFilter) continue;
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(menuItems)
        .where(
          and(
            eq(menuItems.restaurantId, r.id),
            eq(menuItems.draft, false),
            eq(menuItems.available, true),
          ),
        );
      if ((count ?? 0) > 0) filtered.push(r);
    }

    const searched = search
      ? filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(search) ||
            r.slug.toLowerCase().includes(search) ||
            (r.city ?? "").toLowerCase().includes(search),
        )
      : filtered;

    searched.sort((a, b) => a.name.localeCompare(b.name));

    return {
      city: cityFilter,
      q: search || null,
      restaurants: searched.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        city: r.city,
        orderingEnabled: r.orderingEnabled,
        menuPath: `/r/${r.id}/menu`,
      })),
    };
  });
}
