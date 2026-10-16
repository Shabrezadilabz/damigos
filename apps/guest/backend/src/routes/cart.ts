import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { cartItems, carts, db, menuItems, restaurants, rewardClaims } from "@damigos/db";
import { cartTotalPaise, CONVENIENCE_FEE_PAISE, resolveAppliedClaimDiscount } from "../lib/cart-totals.js";
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
    const claimInfo = await resolveAppliedClaimDiscount(
      cart.appliedClaimId,
      customerId,
      query.data.restaurantId,
      subtotalPaise,
    );

    if ("invalidClaim" in claimInfo && claimInfo.invalidClaim && cart.appliedClaimId) {
      await db.update(carts).set({ appliedClaimId: null }).where(eq(carts.id, cart.id));
    }

    const discountPaise = claimInfo.discountPaise;
    const deliveryFeePaise = cart.deliveryFeePaise ?? 0;
    const totalPaise = cartTotalPaise(subtotalPaise, discountPaise, deliveryFeePaise);

    return {
      cartId: cart.id,
      restaurantId: query.data.restaurantId,
      items: rows,
      subtotalPaise,
      discountPaise,
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
      await db.update(carts).set({ appliedClaimId: null }).where(eq(carts.id, cart.id));
      return { appliedClaimId: null };
    }

    const [claim] = await db
      .select()
      .from(rewardClaims)
      .where(
        and(
          eq(rewardClaims.id, body.data.claimId),
          eq(rewardClaims.customerId, customerId),
          eq(rewardClaims.restaurantId, body.data.restaurantId),
          isNull(rewardClaims.redeemedOrderId),
        ),
      )
      .limit(1);

    if (!claim || claim.redeemedOrderId) {
      return reply.status(404).send({
        error: { code: "CLAIM_NOT_AVAILABLE", message: "Offer not available", correlationId: request.id },
      });
    }

    await db.update(carts).set({ appliedClaimId: claim.id }).where(eq(carts.id, cart.id));
    return { appliedClaimId: claim.id };
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

  /** G-07.03 — open cart at another kitchen (for switch-kitchen confirm) */
  app.get("/cart/open", { preHandler: requireGuest }, async (request) => {
    const customerId = request.guest!.sub!;

    const rows = await db
      .select({
        cartId: carts.id,
        restaurantId: carts.restaurantId,
        restaurantName: restaurants.name,
        itemCount: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int`,
        subtotalPaise: sql<number>`coalesce(sum(${cartItems.quantity} * ${cartItems.unitPricePaise}), 0)::int`,
      })
      .from(carts)
      .innerJoin(restaurants, eq(carts.restaurantId, restaurants.id))
      .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
      .where(and(eq(carts.customerId, customerId), eq(carts.status, "OPEN")))
      .groupBy(carts.id, carts.restaurantId, restaurants.name);

    const active = rows.find((r) => (r.itemCount ?? 0) > 0);
    if (!active) return { openCart: null };

    return {
      openCart: {
        cartId: active.cartId,
        restaurantId: active.restaurantId,
        restaurantName: active.restaurantName,
        itemCount: active.itemCount,
        subtotalPaise: active.subtotalPaise,
      },
    };
  });

  app.delete("/cart/open", { preHandler: requireGuest }, async (request) => {
    const customerId = request.guest!.sub!;
    const openCarts = await db
      .select({ id: carts.id })
      .from(carts)
      .where(and(eq(carts.customerId, customerId), eq(carts.status, "OPEN")));

    if (openCarts.length === 0) return { cleared: true, carts: 0 };

    const ids = openCarts.map((c) => c.id);
    await db.delete(cartItems).where(inArray(cartItems.cartId, ids));
    await db
      .update(carts)
      .set({ appliedClaimId: null, deliveryPincode: null, deliveryFeePaise: 0 })
      .where(inArray(carts.id, ids));

    return { cleared: true, carts: ids.length };
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
