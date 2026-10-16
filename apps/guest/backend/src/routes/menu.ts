import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { brandKitForGuestFromJson } from "@damigos/domain";
import { db, loadFoodCatalogCache, matchFoodCatalogFromCache, menuItems, restaurants } from "@damigos/db";

/** G-03.01 — published menu only */
export async function registerMenuRoutes(app: FastifyInstance) {
  app.get("/restaurants/:restaurantId/menu", async (request, reply) => {
    const params = z.object({ restaurantId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid restaurant id",
          correlationId: request.id,
        },
      });
    }

    const [restaurant] = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        orderingEnabled: restaurants.orderingEnabled,
        brandKit: restaurants.brandKit,
      })
      .from(restaurants)
      .where(eq(restaurants.id, params.data.restaurantId))
      .limit(1);

    if (!restaurant) {
      return reply.status(404).send({
        error: {
          code: "RESTAURANT_NOT_FOUND",
          message: "Restaurant not found",
          correlationId: request.id,
        },
      });
    }

    const items = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        pricePaise: menuItems.pricePaise,
        referencePricePaise: menuItems.referencePricePaise,
        isVeg: menuItems.isVeg,
        available: menuItems.available,
        imageUrl: menuItems.imageUrl,
      })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.restaurantId, params.data.restaurantId),
          eq(menuItems.draft, false),
          eq(menuItems.available, true),
        ),
      );

    if (!restaurant.orderingEnabled) {
      return reply.status(503).send({
        error: {
          code: "ORDERING_PAUSED",
          message: "Kitchen is off — not available for guest ordering",
          correlationId: request.id,
        },
        restaurant: { id: restaurant.id, name: restaurant.name },
        items: [],
      });
    }

    const brand = brandKitForGuestFromJson(restaurant.brandKit ?? null);
    const catalog = await loadFoodCatalogCache();
    const itemsWithImages = items.map((row) => {
      const matched = matchFoodCatalogFromCache(catalog, row.name, row.description, row.isVeg);
      const imageUrl =
        row.imageUrl?.trim() || matched?.imageUrl || null;
      return { ...row, imageUrl };
    });
    return {
      restaurant: {
        id: restaurant.id,
        name: brand?.displayName ?? restaurant.name,
        brand,
      },
      items: itemsWithImages,
    };
  });
}
