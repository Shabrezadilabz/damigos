import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cartItems, carts, db, menuItems, restaurants, rewardClaims } from "@damigos/db";
import { ensureBestClaimApplied } from "../lib/auto-apply-claim.js";
import {
  cartTotalPaise,
  CONVENIENCE_FEE_PAISE,
  loadClaimWithOffer,
  resolveAppliedClaimDiscount,
} from "../lib/cart-totals.js";
import { assertCanShopRestaurant, crossByMeta, listOpenKitchenCarts } from "../lib/cross-by-cart.js";
import {
  clampLoyaltyApplyPaise,
  getLoyaltyBalancePaise,
  setLoyaltyAppliedOnCart,
} from "../lib/guest-loyalty.js";
import { CROSS_BY_SINGLE_RIDER_KM, haversineKm, riderModeForDistanceKm } from "../lib/haversine.js";
import { requireGuest } from "../lib/require-guest.js";

async function getOrCreateOpenCart(customerId: string, restaurantId: string) {
  const [existing] = await db
    .select()
    .from(carts)
    .where(
      and(
        eq(carts.customerId, customerId),
        eq(carts.restaurantId, restaurantId),
        eq(carts.status, "OPEN"),
      ),
    )
    .limit(1);

  if (existing) return existing;

  try {
    const [created] = await db
      .insert(carts)
      .values({ customerId, restaurantId, status: "OPEN" })
      .returning();
    return created;
  } catch {
    const [again] = await db
      .select()
      .from(carts)
      .where(
        and(
          eq(carts.customerId, customerId),
          eq(carts.restaurantId, restaurantId),
          eq(carts.status, "OPEN"),
        ),
      )
      .limit(1);
    if (again) return again;
    throw new Error("Could not open cart");
  }
}

/** G-03.04 / G-04.01 cart */
export async function registerCartRoutes(app: FastifyInstance) {
  app.get("/cart", { preHandler: requireGuest }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },
      });
    }

    const customerId = request.guest!.sub!;
    const cart = await getOrCreateOpenCart(customerId, query.data.restaurantId);

    const rows = await db
      .select({
        id: cartItems.id,
        menuItemId: cartItems.menuItemId,
        quantity: cartItems.quantity,
        unitPricePaise: cartItems.unitPricePaise,
        name: menuItems.name,
        isVeg: menuItems.isVeg,
      })
      .from(cartItems)
      .innerJoin(menuItems, eq(cartItems.menuItemId, menuItems.id))
      .where(eq(cartItems.cartId, cart.id));

    const subtotalPaise = rows.reduce((s, r) => s + r.quantity * r.unitPricePaise, 0);

    // Cross-By: don't auto-apply a platform claim already on another open cart
    const otherOpen = await listOpenKitchenCarts(customerId);
    const excludeClaimIds = new Set<string>();
    for (const k of otherOpen) {
      if (k.cartId === cart.id) continue;
      const [other] = await db.select().from(carts).where(eq(carts.id, k.cartId)).limit(1);
      if (other?.appliedClaimId) excludeClaimIds.add(other.appliedClaimId);
    }

    let appliedClaimId = cart.appliedClaimId;
    if (appliedClaimId) {
      const probe = await resolveAppliedClaimDiscount(
        appliedClaimId,
        customerId,
        query.data.restaurantId,
        subtotalPaise,
      );
      if ("invalidClaim" in probe && probe.invalidClaim) {
        await db
          .update(carts)
          .set({ appliedClaimId: null, updatedAt: new Date() })
          .where(eq(carts.id, cart.id));
        appliedClaimId = null;
      }
    }

    appliedClaimId = await ensureBestClaimApplied({
      cartId: cart.id,
      customerId,
      restaurantId: query.data.restaurantId,
      subtotalPaise,
      appliedClaimId,
      autoRewardDeclined: cart.autoRewardDeclined ?? false,
      excludeClaimIds,
    });

    const claimInfo = await resolveAppliedClaimDiscount(
      appliedClaimId,
      customerId,
      query.data.restaurantId,
      subtotalPaise,
    );

    const discountPaise = claimInfo.discountPaise;
    const loyaltyAvailablePaise = await getLoyaltyBalancePaise(
      customerId,
      query.data.restaurantId,
    );
    let loyaltyAppliedPaise = clampLoyaltyApplyPaise(
      cart.loyaltyAppliedPaise ?? 0,
      subtotalPaise,
      discountPaise,
    );
    if (loyaltyAppliedPaise !== (cart.loyaltyAppliedPaise ?? 0)) {
      await db
        .update(carts)
        .set({ loyaltyAppliedPaise, updatedAt: new Date() })
        .where(eq(carts.id, cart.id));
    }

    const deliveryFeePaise = cart.deliveryFeePaise ?? 0;
    const totalPaise = cartTotalPaise(
      subtotalPaise,
      discountPaise,
      deliveryFeePaise,
      loyaltyAppliedPaise,
    );

    return {
      cartId: cart.id,
      restaurantId: query.data.restaurantId,
      items: rows,
      subtotalPaise,
      discountPaise,
      loyaltyAvailablePaise,
      loyaltyAppliedPaise,
      deliveryFeePaise,
      deliveryPincode: cart.deliveryPincode,
      convenienceFeePaise: CONVENIENCE_FEE_PAISE,
      totalPaise,
      appliedClaim: claimInfo.appliedClaim,
      itemCount: rows.reduce((s, r) => s + r.quantity, 0),
    };
  });

  app.patch("/cart/claim", { preHandler: requireGuest }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        claimId: z.string().uuid().nullable(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },
      });
    }

    const customerId = request.guest!.sub!;
    const cart = await getOrCreateOpenCart(customerId, body.data.restaurantId);

    if (body.data.claimId === null) {
      await db
        .update(carts)
        .set({
          appliedClaimId: null,
          autoRewardDeclined: true,
          updatedAt: new Date(),
        })
        .where(eq(carts.id, cart.id));
      return { appliedClaimId: null };
    }

    const loaded = await loadClaimWithOffer(body.data.claimId, customerId);
    if (!loaded) {
      return reply.status(404).send({
        error: { code: "CLAIM_NOT_AVAILABLE", message: "Offer not available", correlationId: request.id },
      });
    }

    const scope = loaded.offer.scope === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED";
    if (scope === "RESTAURANT_SCOPED" && loaded.claim.restaurantId !== body.data.restaurantId) {
      return reply.status(409).send({
        error: {
          code: "OFFER_SCOPE_MISMATCH",
          message: "This restaurant reward only applies at the kitchen where you won it",
          correlationId: request.id,
        },
      });
    }

    await db
      .update(carts)
      .set({
        appliedClaimId: loaded.claim.id,
        autoRewardDeclined: false,
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cart.id));
    return { appliedClaimId: loaded.claim.id, scope };
  });

  /** Optional restaurant loyalty credits — opt-in on checkout */
  app.patch("/cart/loyalty", { preHandler: requireGuest }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        apply: z.boolean(),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },
      });
    }

    const customerId = request.guest!.sub!;
    const cart = await getOrCreateOpenCart(customerId, body.data.restaurantId);

    const rows = await db
      .select({
        quantity: cartItems.quantity,
        unitPricePaise: cartItems.unitPricePaise,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id));
    const subtotalPaise = rows.reduce((s, r) => s + r.quantity * r.unitPricePaise, 0);
    const claimInfo = await resolveAppliedClaimDiscount(
      cart.appliedClaimId,
      customerId,
      body.data.restaurantId,
      subtotalPaise,
    );
    const available = await getLoyaltyBalancePaise(customerId, body.data.restaurantId);
    const loyaltyAppliedPaise = await setLoyaltyAppliedOnCart(
      cart.id,
      body.data.apply,
      available,
      subtotalPaise,
      claimInfo.discountPaise,
    );

    return {
      loyaltyAvailablePaise: available,
      loyaltyAppliedPaise,
      apply: body.data.apply && loyaltyAppliedPaise > 0,
    };
  });

  app.post("/cart/items", { preHandler: requireGuest }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20).default(1),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },
      });
    }

    const customerId = request.guest!.sub!;
    const { restaurantId, menuItemId, quantity } = body.data;

    const [item] = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.id, menuItemId),
          eq(menuItems.restaurantId, restaurantId),
          eq(menuItems.draft, false),
          eq(menuItems.available, true),
        ),
      )
      .limit(1);

    if (!item) {
      return reply.status(404).send({
        error: { code: "ITEM_NOT_FOUND", message: "Item not available", correlationId: request.id },
      });
    }

    const gate = await assertCanShopRestaurant(customerId, restaurantId);
    if (!gate.ok) {
      return reply.status(409).send({
        error: {
          code: gate.code,
          message: gate.message,
          correlationId: request.id,
        },
        openCarts: gate.openCarts.map(({ lat: _l, lng: _g, ...rest }) => rest),
      });
    }

    const cart = await getOrCreateOpenCart(customerId, restaurantId);

    const [existingLine] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.menuItemId, menuItemId)))
      .limit(1);

    if (existingLine) {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity: existingLine.quantity + quantity })
        .where(eq(cartItems.id, existingLine.id))
        .returning();
      return { line: updated };
    }

    const [line] = await db
      .insert(cartItems)
      .values({
        cartId: cart.id,
        menuItemId,
        quantity,
        unitPricePaise: item.pricePaise,
      })
      .returning();

    return { line };
  });

  /** G-07.03 / G-R01b — open kitchen carts (max 2 for Cross-By) */
  app.get("/cart/open", { preHandler: requireGuest }, async (request) => {
    const customerId = request.guest!.sub!;
    const open = await listOpenKitchenCarts(customerId);
    const summaries = open.map(({ lat: _a, lng: _b, ...rest }) => rest);
    const meta = crossByMeta(open);

    return {
      openCart: summaries[0] ?? null,
      openCarts: summaries,
      crossBy: meta,
    };
  });

  app.delete("/cart/open", { preHandler: requireGuest }, async (request) => {
    const query = z
      .object({ restaurantId: z.string().uuid().optional() })
      .safeParse(request.query);
    const customerId = request.guest!.sub!;

    const conditions = [eq(carts.customerId, customerId), eq(carts.status, "OPEN")];
    if (query.success && query.data.restaurantId) {
      conditions.push(eq(carts.restaurantId, query.data.restaurantId));
    }

    const openCarts = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(...conditions));

    if (openCarts.length === 0) return { cleared: true, carts: 0 };

    const ids = openCarts.map((c) => c.id);
    await db.delete(cartItems).where(inArray(cartItems.cartId, ids));
    await db
      .update(carts)
      .set({
        appliedClaimId: null,
        autoRewardDeclined: false,
        loyaltyAppliedPaise: 0,
        deliveryPincode: null,
        deliveryFeePaise: 0,
      })
      .where(inArray(carts.id, ids));

    return { cleared: true, carts: ids.length };
  });

  /**
   * G-04.10 — Cross-By nearby kitchens within 1 km (Haversine).
   * Returns candidates + rider mode preview vs primary restaurant.
   */
  app.get("/cart/cross-by/nearby", async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid(),
        radiusKm: z.coerce.number().min(0.1).max(5).default(CROSS_BY_SINGLE_RIDER_KM),
      })
      .safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "restaurantId required",
          correlationId: request.id,
        },
      });
    }

    const [primary] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, query.data.restaurantId))
      .limit(1);

    if (!primary) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    if (primary.lat == null || primary.lng == null) {
      return {
        restaurantId: primary.id,
        radiusKm: query.data.radiusKm,
        pinMissing: true,
        nearby: [] as {
          restaurantId: string;
          name: string;
          distanceKm: number;
          distanceMeters: number;
          riderMode: "SINGLE" | "SPLIT";
          menuPath: string;
        }[],
      };
    }

    const others = await db
      .select()
      .from(restaurants)
      .where(
        and(
          ne(restaurants.id, primary.id),
          eq(restaurants.orderingEnabled, true),
          eq(restaurants.hubListed, true),
          isNotNull(restaurants.lat),
          isNotNull(restaurants.lng),
        ),
      );

    const nearby = others
      .map((r) => {
        const distanceKm = haversineKm(primary.lat!, primary.lng!, r.lat!, r.lng!);
        return {
          restaurantId: r.id,
          name: r.name,
          distanceKm: Math.round(distanceKm * 1000) / 1000,
          distanceMeters: Math.round(distanceKm * 1000),
          riderMode: riderModeForDistanceKm(distanceKm),
          menuPath: `/r/${r.id}/menu`,
        };
      })
      .filter((r) => r.distanceKm <= query.data.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);

    return {
      restaurantId: primary.id,
      radiusKm: query.data.radiusKm,
      pinMissing: false,
      singleRiderMaxKm: CROSS_BY_SINGLE_RIDER_KM,
      nearby,
    };
  });

  app.patch("/cart/items/:lineId", { preHandler: requireGuest }, async (request, reply) => {
    const params = z.object({ lineId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ quantity: z.number().int().min(0).max(99) }).safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "Invalid input", correlationId: request.id },
      });
    }

    if (body.data.quantity === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, params.data.lineId));
      return { deleted: true };
    }

    const [updated] = await db
      .update(cartItems)
      .set({ quantity: body.data.quantity })
      .where(eq(cartItems.id, params.data.lineId))
      .returning();

    if (!updated) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Cart line not found", correlationId: request.id },
      });
    }
    return { line: updated };
  });
}
