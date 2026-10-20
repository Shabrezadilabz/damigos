import { and, eq, inArray, like } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  db,
  catalogImageForMatch,
  loadFoodCatalogCache,
  matchFoodCatalogFromCache,
  menuItems,
  restaurants,
  type FoodCatalogRow,
} from "@damigos/db";
import { ensureDemoMenuItems } from "../lib/menu-demo-seed.js";
import { ensureFoodCatalogSchema } from "../lib/ensure-food-catalog-schema.js";
import { ensureKitchenSchema } from "../lib/ensure-kitchen-schema.js";
import { ensureMenuSchema } from "../lib/ensure-menu-schema.js";
import { parseDishNameAndPrices } from "../lib/ai/menu-dish-quality.js";
import { resolveMenuItemImageUrl } from "../lib/menu-item-thumb.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";

function menuItemDto(row: typeof menuItems.$inferSelect, catalog: FoodCatalogRow[]) {
  const stored = row.imageUrl?.trim();
  const catalogName = parseDishNameAndPrices(
    row.name.replace(/\s*\((Mini|Regular)\)\s*$/i, ""),
  ).name;
  const matched = matchFoodCatalogFromCache(catalog, catalogName, row.description, row.isVeg);
  const catalogImage = catalogImageForMatch(matched);
  const lowConfDraft =
    row.draft && row.importConfidence != null && row.importConfidence < 70;
  const fallbackKeyword =
    !lowConfDraft && !stored && !catalogImage
      ? resolveMenuItemImageUrl(catalogName, row.description, row.isVeg)
      : null;

  return {
    id: row.id,
    restaurantId: row.restaurantId,
    name: row.name,
    description: row.description,
    pricePaise: row.pricePaise,
    referencePricePaise: row.referencePricePaise,
    isVeg: row.isVeg,
    available: row.available,
    draft: row.draft,
    importConfidence: row.importConfidence,
    importJobId: row.importJobId,
    foodCatalogId:
      row.foodCatalogId ??
      (catalogImage && matched ? matched.id : null),
    imageUrl: stored || catalogImage || fallbackKeyword,
    prepCategory: row.prepCategory ?? "COOKED_15M",
    prepMinutes: row.prepMinutes ?? null,
  };
}

/** C-03 — menu (staff auth P0) */
export async function registerMenuRoutes(app: FastifyInstance) {
  await ensureFoodCatalogSchema();
  void loadFoodCatalogCache().catch((err) => console.warn("[food-catalog-cache]", err));

  const staffMenu = requireRoles("RESTAURANT_OWNER", "STAFF", "KITCHEN", "PLATFORM_ADMIN");

  app.get("/menu/items", { preHandler: staffMenu }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid(),
        draft: z
          .string()
          .optional()
          .transform((v) => v === "true"),
      })
      .parse(request.query);

    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    await ensureMenuSchema();
    await ensureKitchenSchema();

    try {
      await ensureDemoMenuItems(query.restaurantId);
    } catch (err) {
      request.log.warn({ err }, "menu demo seed failed");
    }

    const items = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.restaurantId, query.restaurantId));

    const filtered =
      query.draft === undefined
        ? items
        : query.draft
          ? items.filter((i) => i.draft !== false)
          : items.filter((i) => i.draft === false);

    const catalog = await loadFoodCatalogCache();
    return { items: filtered.map((row) => menuItemDto(row, catalog)) };
  });

  /** Discard all draft menu rows (undo AI import / draft edits before publish). */
  app.post("/menu/drafts/revert", { preHandler: staffMenu }, async (request, reply) => {
    const body = z.object({ restaurantId: z.string().uuid() }).parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const scope = and(eq(menuItems.restaurantId, body.restaurantId), eq(menuItems.draft, true));
    const doomed = await db.select({ id: menuItems.id }).from(menuItems).where(scope);
    if (doomed.length > 0) {
      await db.delete(menuItems).where(scope);
    }

    return { deletedCount: doomed.length, restaurantId: body.restaurantId };
  });

  app.post("/menu/items", { preHandler: staffMenu }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        name: z.string().min(1),
        pricePaise: z.number().int().positive(),
        isVeg: z.boolean().default(true),
        description: z.string().optional(),
        referencePricePaise: z.number().int().positive().nullable().optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: body.error.message,
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;

    const [item] = await db
      .insert(menuItems)
      .values({
        restaurantId: body.data.restaurantId,
        name: body.data.name,
        pricePaise: body.data.pricePaise,
        isVeg: body.data.isVeg,
        description: body.data.description,
        referencePricePaise: body.data.referencePricePaise ?? null,
        draft: true,
        available: true,
        prepCategory: "COOKED_15M",
        prepMinutes: 15,
      })
      .returning();
    const catalog = await loadFoodCatalogCache();
    return { item: menuItemDto(item, catalog) };
  });

  app.delete("/menu/items/:id", { preHandler: staffMenu }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);

    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    const [existing] = await db
      .select({ id: menuItems.id, draft: menuItems.draft, name: menuItems.name })
      .from(menuItems)
      .where(and(eq(menuItems.id, params.id), eq(menuItems.restaurantId, query.restaurantId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Menu item not found", correlationId: request.id },
      });
    }

    const isE2eRow = existing.name.startsWith("E2E Publish");
    if (existing.draft === false && !isE2eRow) {
      return reply.status(400).send({
        error: {
          code: "LIVE_ITEM",
          message: "Live items cannot be deleted here — 86 them or edit price. Only drafts can be removed.",
          correlationId: request.id,
        },
      });
    }

    await db
      .delete(menuItems)
      .where(and(eq(menuItems.id, params.id), eq(menuItems.restaurantId, query.restaurantId)));

    return { deleted: true, id: params.id };
  });

  /** Dev / ops — remove Playwright publish-menu rows (name prefix E2E Publish). */
  app.post("/menu/items/purge-test-data", { preHandler: staffMenu }, async (request, reply) => {
    const body = z.object({ restaurantId: z.string().uuid() }).parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const scope = and(
      eq(menuItems.restaurantId, body.restaurantId),
      like(menuItems.name, "E2E Publish%"),
    );
    const doomed = await db.select({ id: menuItems.id }).from(menuItems).where(scope);
    if (doomed.length > 0) {
      await db.delete(menuItems).where(scope);
    }

    return { deletedCount: doomed.length };
  });

  app.post("/menu/publish", { preHandler: staffMenu }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        itemIds: z.array(z.string().uuid()).optional(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "restaurantId required",
          correlationId: request.id,
        },
      });
    }

    const restaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, body.data.restaurantId))
      .limit(1);

    if (!restaurant[0]) {
      return reply.status(404).send({
        error: {
          code: "RESTAURANT_NOT_FOUND",
          message: "Restaurant not found",
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;

    await ensureKitchenSchema();

    const scope = eq(menuItems.restaurantId, body.data.restaurantId);
    const drafts = await db
      .select()
      .from(menuItems)
      .where(and(scope, eq(menuItems.draft, true)));

    const candidates = body.data.itemIds?.length
      ? drafts.filter((d) => body.data.itemIds!.includes(d.id))
      : drafts;

    const missingPrep = candidates.filter((d) => {
      const cat = d.prepCategory;
      const mins = d.prepMinutes;
      const catOk = cat === "READY_10M" || cat === "COOKED_15M";
      const minsOk = mins === 10 || mins === 15;
      const aligned =
        (cat === "READY_10M" && mins === 10) || (cat === "COOKED_15M" && mins === 15);
      return !catOk || !minsOk || !aligned;
    });

    if (missingPrep.length > 0) {
      return reply.status(400).send({
        error: {
          code: "PREP_CATEGORY_REQUIRED",
          message: `Set prep SLA (10m ready / 15m cooked) on ${missingPrep.length} draft item(s) before publish`,
          correlationId: request.id,
          itemIds: missingPrep.map((i) => i.id),
          itemNames: missingPrep.slice(0, 8).map((i) => i.name),
        },
      });
    }

    if (body.data.itemIds?.length) {
      await db
        .update(menuItems)
        .set({ draft: false })
        .where(and(scope, inArray(menuItems.id, body.data.itemIds), eq(menuItems.draft, true)));
    } else {
      await db.update(menuItems).set({ draft: false }).where(and(scope, eq(menuItems.draft, true)));
    }

    return { published: true, restaurantId: body.data.restaurantId, count: candidates.length };
  });

  app.patch("/menu/items/:id", { preHandler: staffMenu }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        pricePaise: z.number().int().positive().optional(),
        isVeg: z.boolean().optional(),
        importConfidence: z.number().int().min(0).max(100).nullable().optional(),
        available: z.boolean().optional(),
        referencePricePaise: z.number().int().positive().nullable().optional(),
        prepCategory: z.enum(["READY_10M", "COOKED_15M"]).optional(),
        prepMinutes: z.union([z.literal(10), z.literal(15), z.null()]).optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: body.error.message,
          correlationId: request.id,
        },
      });
    }

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;

    const [existing] = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.id, params.id), eq(menuItems.restaurantId, body.data.restaurantId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Menu item not found",
          correlationId: request.id,
        },
      });
    }

    const patch: Partial<typeof menuItems.$inferInsert> = {};
    if (body.data.name !== undefined) patch.name = body.data.name;
    if (body.data.description !== undefined) patch.description = body.data.description;
    if (body.data.pricePaise !== undefined) patch.pricePaise = body.data.pricePaise;
    if (body.data.referencePricePaise !== undefined) {
      patch.referencePricePaise = body.data.referencePricePaise;
    }
    if (body.data.isVeg !== undefined) patch.isVeg = body.data.isVeg;
    if (body.data.importConfidence !== undefined) patch.importConfidence = body.data.importConfidence;
    if (body.data.available !== undefined) patch.available = body.data.available;
    if (body.data.prepCategory !== undefined) {
      patch.prepCategory = body.data.prepCategory;
      if (body.data.prepMinutes === undefined) {
        patch.prepMinutes = body.data.prepCategory === "READY_10M" ? 10 : 15;
      }
    }
    if (body.data.prepMinutes !== undefined) patch.prepMinutes = body.data.prepMinutes;

    await ensureKitchenSchema();
    const catalog = await loadFoodCatalogCache();
    if (body.data.name !== undefined || body.data.description !== undefined || body.data.isVeg !== undefined) {
      const nextName = body.data.name ?? existing.name;
      const nextDesc = body.data.description !== undefined ? body.data.description : existing.description;
      const nextVeg = body.data.isVeg ?? existing.isVeg;
      const matched = matchFoodCatalogFromCache(catalog, nextName, nextDesc, nextVeg);
      const img = catalogImageForMatch(matched);
      if (img && !existing.imageUrl) {
        patch.imageUrl = img;
        patch.foodCatalogId = matched!.id;
      }
    }

    const [item] = await db
      .update(menuItems)
      .set(patch)
      .where(eq(menuItems.id, params.id))
      .returning();

    return { item: menuItemDto(item, catalog) };
  });
}
