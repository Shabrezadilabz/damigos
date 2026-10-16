import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { carts, db } from "@damigos/db";
import { deliveryMode, PLATFORM_DELIVERY_MARKUP_PAISE } from "../lib/delivery-mode.js";
import { mockEtaMinutes, mockServiceable, mockShiprocketRatePaise } from "../lib/shiprocket-mock.js";
import { requireGuest } from "../lib/require-guest.js";

async function getOpenCart(customerId: string, restaurantId: string) {
  const [cart] = await db
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
  return cart ?? null;
}

/** G-04.02 / G-04.03 */
export async function registerDeliveryRoutes(app: FastifyInstance) {
  app.get("/delivery/config", async () => ({
    mode: deliveryMode(),
    platformMarkupPaise: PLATFORM_DELIVERY_MARKUP_PAISE,
  }));

  app.get("/delivery/serviceability", async (request, reply) => {
    if (deliveryMode() === "off") {
      return { mode: "off", serviceable: true };
    }

    const query = z.object({ pincode: z.string().length(6) }).safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "pincode required (6 digits)", correlationId: request.id },
      });
    }

    const serviceable = mockServiceable(query.data.pincode);
    return {
      mode: deliveryMode(),
      pincode: query.data.pincode,
      serviceable,
      message: serviceable ? null : "Delivery not available for this pincode yet.",
    };
  });

  app.post("/delivery/quote", { preHandler: requireGuest }, async (request, reply) => {
    if (deliveryMode() === "off") {
      return reply.status(400).send({
        error: {
          code: "DELIVERY_DISABLED",
          message: "Delivery quotes disabled (DELIVERY_MODE=off)",
          correlationId: request.id,
        },
      });
    }

    const body = z
      .object({
        restaurantId: z.string().uuid(),
        pincode: z.string().length(6),
      })
      .safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "restaurantId and pincode required", correlationId: request.id },
      });
    }

    const customerId = request.guest!.sub!;
    const cart = await getOpenCart(customerId, body.data.restaurantId);
    if (!cart) {
      return reply.status(400).send({
        error: { code: "CART_EMPTY", message: "Add items before delivery quote", correlationId: request.id },
      });
    }

    if (!mockServiceable(body.data.pincode)) {
      await db
        .update(carts)
        .set({ deliveryPincode: body.data.pincode, deliveryFeePaise: 0 })
        .where(eq(carts.id, cart.id));

      return reply.status(422).send({
        error: {
          code: "NOT_SERVICEABLE",
          message: "We cannot deliver to this pincode yet. Try another address or pick up.",
          correlationId: request.id,
        },
      });
    }

    const shiprocketRatePaise = mockShiprocketRatePaise(body.data.pincode);
    const deliveryFeePaise = shiprocketRatePaise + PLATFORM_DELIVERY_MARKUP_PAISE;

    await db
      .update(carts)
      .set({
        deliveryPincode: body.data.pincode,
        deliveryFeePaise,
      })
      .where(eq(carts.id, cart.id));

    return {
      carrier: "Shiprocket",
      shiprocketRatePaise,
      platformMarkupPaise: PLATFORM_DELIVERY_MARKUP_PAISE,
      deliveryFeePaise,
      etaMinutes: mockEtaMinutes(),
      pincode: body.data.pincode,
    };
  });
}
