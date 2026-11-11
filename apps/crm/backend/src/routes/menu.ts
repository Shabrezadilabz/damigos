import { and, asc, eq, inArray, like, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
  db,
  catalogImageForMatch,
  loadFoodCatalogCache,
  matchFoodCatalogFromCache,
  menuCategories,
  menuItems,
  restaurants,
  type FoodCatalogRow,
} from "@damigos/db";
import { ensureDemoMenuItems } from "../lib/menu-demo-seed.js";
import {
  GUEST_PRICE_BAND_MESSAGE,
  GUEST_PRICE_BANDS_PAISE,
  isAllowedGuestPricePaise,
} from "../lib/guest-price-bands.js";
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
    /** S2.1 — guest-facing override; null → guest surfaces fall back to imageUrl */
    guestImageUrl: row.guestImageUrl?.trim() || null,
    /** S2.2 */
    categoryId: row.categoryId ?? null,
    prepCategory: row.prepCategory ?? "COOKED_15M",
    prepMinutes: row.prepMinutes ?? null,
  };
}

/** https URL or data:image/*;data URL (compressed client-side) */
const menuImageField = z
  .string()
  .max(2_500_000)
  .nullable()
  .optional()
  .refine(
    (v) =>
      v == null ||
      v.startsWith("https://") ||
      v.startsWith("http://") ||
      v.startsWith("data:image/"),
    { message: "image must be http(s) or data:image" },
  );

/** S2.2 — category must belong to the same kitchen (null = uncategorised). */
async function categoryBelongsToRestaurant(categoryId: string, restaurantId: string) {
  const [row] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.restaurantId, restaurantId)))
    .limit(1);
  return Boolean(row);
}

function sendMenuValidationError(
  reply: FastifyReply,
  correlationId: string,
  error: z.ZodError,
) {
  const priceIssue = error.issues.find((i) => i.path[0] === "pricePaise" && i.message === GUEST_PRICE_BAND_MESSAGE);
  if (priceIssue) {
    return reply.status(400).send({
      error: {
        code: "PRICE_BAND_VIOLATION",
        message: GUEST_PRICE_BAND_MESSAGE,
        allowedPricePaise: [...GUEST_PRICE_BANDS_PAISE],
        correlationId,
      },
    });
  }
  return reply.status(400).send({
    error: { code: "INVALID_REQUEST", message: error.message, correlationId },
  });
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
        /** S1.5 — guest sell price must be ₹49 (4900) or ₹99 (9900) */
        pricePaise: z
          .number()
          .int()
          .positive()
          .refine(isAllowedGuestPricePaise, { message: GUEST_PRICE_BAND_MESSAGE }),
        isVeg: z.boolean().default(true),
        description: z.string().optional(),
        referencePricePaise: z.number().int().positive().nullable().optional(),
        categoryId: z.string().uuid().nullable().optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return sendMenuValidationError(reply, request.id, body.error);
    }

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;

    await ensureMenuSchema();
    if (
      body.data.categoryId &&
      !(await categoryBelongsToRestaurant(body.data.categoryId, body.data.restaurantId))
    ) {
      return reply.status(400).send({
        error: { code: "CATEGORY_NOT_FOUND", message: "Category not found", correlationId: request.id },
      });
    }

    const [item] = await db
      .insert(menuItems)
      .values({
        restaurantId: body.data.restaurantId,
        name: body.data.name,
        pricePaise: body.data.pricePaise,
        isVeg: body.data.isVeg,
        description: body.data.description,
        referencePricePaise: body.data.referencePricePaise ?? null,
        categoryId: body.data.categoryId ?? null,
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

  /** Bulk prep SLA for multi-select in draft inspector — register before /:id */
  app.patch("/menu/items/bulk", { preHandler: staffMenu }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        itemIds: z.array(z.string().uuid()).min(1).max(200),
        prepCategory: z.enum(["READY_10M", "COOKED_15M"]).optional(),
        prepMinutes: z.union([z.literal(10), z.literal(15)]).optional(),
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

    if (body.data.prepCategory === undefined && body.data.prepMinutes === undefined) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "prepCategory or prepMinutes required",
          correlationId: request.id,
        },
      });
    }

    const prepCategory =
      body.data.prepCategory ??
      (body.data.prepMinutes === 10 ? "READY_10M" : "COOKED_15M");
    const prepMinutes = prepCategory === "READY_10M" ? 10 : 15;

    await ensureKitchenSchema();
    const updated = await db
      .update(menuItems)
      .set({ prepCategory, prepMinutes })
      .where(
        and(
          eq(menuItems.restaurantId, body.data.restaurantId),
          inArray(menuItems.id, body.data.itemIds),
        ),
      )
      .returning({ id: menuItems.id });

    return {
      updated: updated.length,
      prepCategory,
      prepMinutes,
      itemIds: updated.map((r) => r.id),
    };
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
        /** Owner/primary image */
        imageUrl: menuImageField,
        /** S2.1 — guest-facing image (null clears → falls back to imageUrl) */
        guestImageUrl: menuImageField,
        /** S2.2 — assign to category (null = uncategorised) */
        categoryId: z.string().uuid().nullable().optional(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return sendMenuValidationError(reply, request.id, body.error);
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

    // S1.5 — a changed guest price must land in the ₹49 / ₹99 bands (unchanged legacy price may pass through)
    if (
      body.data.pricePaise !== undefined &&
      body.data.pricePaise !== existing.pricePaise &&
      !isAllowedGuestPricePaise(body.data.pricePaise)
    ) {
      return reply.status(400).send({
        error: {
          code: "PRICE_BAND_VIOLATION",
          message: GUEST_PRICE_BAND_MESSAGE,
          allowedPricePaise: [...GUEST_PRICE_BANDS_PAISE],
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
    if (body.data.imageUrl !== undefined) patch.imageUrl = body.data.imageUrl;
    if (body.data.guestImageUrl !== undefined) patch.guestImageUrl = body.data.guestImageUrl;
    if (body.data.categoryId !== undefined) {
      if (
        body.data.categoryId &&
        !(await categoryBelongsToRestaurant(body.data.categoryId, body.data.restaurantId))
      ) {
        return reply.status(400).send({
          error: { code: "CATEGORY_NOT_FOUND", message: "Category not found", correlationId: request.id },
        });
      }
      patch.categoryId = body.data.categoryId;
    }

    await ensureKitchenSchema();
    const catalog = await loadFoodCatalogCache();
    if (
      body.data.imageUrl === undefined &&
      (body.data.name !== undefined || body.data.description !== undefined || body.data.isVeg !== undefined)
    ) {
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

  // ── S2.2 — Categories CRUD ──────────────────────────────────────────────

  async function listCategories(restaurantId: string) {
    const cats = await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.restaurantId, restaurantId))
      .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.name));
    const counts = await db
      .select({ categoryId: menuItems.categoryId, n: sql<number>`count(*)::int` })
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .groupBy(menuItems.categoryId);
    const countMap = new Map(counts.map((c) => [c.categoryId, Number(c.n)]));
    return cats.map((c) => ({
      id: c.id,
      restaurantId: c.restaurantId,
      name: c.name,
      sortOrder: c.sortOrder,
      hidden: c.hidden,
      itemCount: countMap.get(c.id) ?? 0,
    }));
  }

  function categoryNotFound(reply: FastifyReply, correlationId: string) {
    return reply.status(404).send({
      error: { code: "CATEGORY_NOT_FOUND", message: "Category not found", correlationId },
    });
  }

  app.get("/menu/categories", { preHandler: staffMenu }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;
    await ensureMenuSchema();
    return { categories: await listCategories(query.restaurantId) };
  });

  app.post("/menu/categories", { preHandler: staffMenu }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        name: z.string().trim().min(1).max(128),
        hidden: z.boolean().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return sendMenuValidationError(reply, request.id, body.error);

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;
    await ensureMenuSchema();

    const existing = await listCategories(body.data.restaurantId);
    if (existing.some((c) => c.name.toLowerCase() === body.data.name.toLowerCase())) {
      return reply.status(409).send({
        error: {
          code: "CATEGORY_EXISTS",
          message: "A category with this name already exists",
          correlationId: request.id,
        },
      });
    }
    const nextOrder = existing.reduce((m, c) => Math.max(m, c.sortOrder), -1) + 1;
    const [created] = await db
      .insert(menuCategories)
      .values({
        restaurantId: body.data.restaurantId,
        name: body.data.name,
        sortOrder: nextOrder,
        hidden: body.data.hidden ?? false,
      })
      .returning();
    return {
      category: {
        id: created.id,
        restaurantId: created.restaurantId,
        name: created.name,
        sortOrder: created.sortOrder,
        hidden: created.hidden,
        itemCount: 0,
      },
    };
  });

  /** Reorder — body.orderedIds is the full desired order (registered before /:id routes). */
  app.post("/menu/categories/reorder", { preHandler: staffMenu }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        orderedIds: z.array(z.string().uuid()).min(1).max(200),
      })
      .safeParse(request.body);
    if (!body.success) return sendMenuValidationError(reply, request.id, body.error);

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;
    await ensureMenuSchema();

    const current = await listCategories(body.data.restaurantId);
    const known = new Set(current.map((c) => c.id));
    const ordered = body.data.orderedIds.filter((id, i, arr) => known.has(id) && arr.indexOf(id) === i);
    // Categories not mentioned keep their relative order after the listed ones
    const rest = current.filter((c) => !ordered.includes(c.id)).map((c) => c.id);
    const finalOrder = [...ordered, ...rest];
    for (let i = 0; i < finalOrder.length; i += 1) {
      await db
        .update(menuCategories)
        .set({ sortOrder: i })
        .where(
          and(
            eq(menuCategories.id, finalOrder[i]),
            eq(menuCategories.restaurantId, body.data.restaurantId),
          ),
        );
    }
    return { categories: await listCategories(body.data.restaurantId) };
  });

  app.patch("/menu/categories/:id", { preHandler: staffMenu }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        name: z.string().trim().min(1).max(128).optional(),
        hidden: z.boolean().optional(),
        sortOrder: z.number().int().min(0).max(10_000).optional(),
      })
      .safeParse(request.body);
    if (!body.success) return sendMenuValidationError(reply, request.id, body.error);

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;
    await ensureMenuSchema();

    const patch: Partial<typeof menuCategories.$inferInsert> = {};
    if (body.data.name !== undefined) patch.name = body.data.name;
    if (body.data.hidden !== undefined) patch.hidden = body.data.hidden;
    if (body.data.sortOrder !== undefined) patch.sortOrder = body.data.sortOrder;
    if (Object.keys(patch).length === 0) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "Nothing to update", correlationId: request.id },
      });
    }

    const [updated] = await db
      .update(menuCategories)
      .set(patch)
      .where(
        and(eq(menuCategories.id, params.id), eq(menuCategories.restaurantId, body.data.restaurantId)),
      )
      .returning();
    if (!updated) return categoryNotFound(reply, request.id);

    const all = await listCategories(body.data.restaurantId);
    return { category: all.find((c) => c.id === updated.id) ?? null, categories: all };
  });

  /** Delete category — items are kept and become uncategorised. */
  app.delete("/menu/categories/:id", { preHandler: staffMenu }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);

    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;
    await ensureMenuSchema();

    const scope = and(
      eq(menuCategories.id, params.id),
      eq(menuCategories.restaurantId, query.restaurantId),
    );
    const [existing] = await db.select({ id: menuCategories.id }).from(menuCategories).where(scope).limit(1);
    if (!existing) return categoryNotFound(reply, request.id);

    await db
      .update(menuItems)
      .set({ categoryId: null })
      .where(and(eq(menuItems.categoryId, params.id), eq(menuItems.restaurantId, query.restaurantId)));
    await db.delete(menuCategories).where(scope);
    return { deleted: true, id: params.id };
  });

  /** Bulk assign items to a category (null = uncategorised). */
  app.post("/menu/items/assign-category", { preHandler: staffMenu }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        itemIds: z.array(z.string().uuid()).min(1).max(200),
        categoryId: z.string().uuid().nullable(),
      })
      .safeParse(request.body);
    if (!body.success) return sendMenuValidationError(reply, request.id, body.error);

    await enforceRestaurantScope(request, reply, body.data.restaurantId);
    if (reply.sent) return;
    await ensureMenuSchema();

    if (
      body.data.categoryId &&
      !(await categoryBelongsToRestaurant(body.data.categoryId, body.data.restaurantId))
    ) {
      return categoryNotFound(reply, request.id);
    }

    const updated = await db
      .update(menuItems)
      .set({ categoryId: body.data.categoryId })
      .where(
        and(
          eq(menuItems.restaurantId, body.data.restaurantId),
          inArray(menuItems.id, body.data.itemIds),
        ),
      )
      .returning({ id: menuItems.id });
    return { updated: updated.length, categoryId: body.data.categoryId, itemIds: updated.map((r) => r.id) };
  });
}
