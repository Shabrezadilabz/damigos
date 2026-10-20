import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  checkShiprocketServiceability,
  shiprocketCredentialsConfigured,
} from "@damigos/domain";
import { carts, db } from "@damigos/db";
import {
  deliveryMode,
  deliveryQuoteRequired,
  PLATFORM_DELIVERY_MARKUP_PAISE,
} from "../lib/delivery-mode.js";
import { isFirstOrderFreeEligible } from "../lib/first-order-delivery.js";
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

async function resolveRate(pincode: string): Promise<{
  serviceable: boolean;
  shiprocketRatePaise: number;
  etaMinutes: number;
  courierName: string | null;
  foodFriendly: boolean;
}> {
  const mode = deliveryMode();
  if (mode === "mock") {
    const serviceable = mockServiceable(pincode);
    return {
      serviceable,
      shiprocketRatePaise: serviceable ? mockShiprocketRatePaise(pincode) : 0,
      etaMinutes: mockEtaMinutes(),
      courierName: "Shiprocket Instant (mock)",
      foodFriendly: true,
    };
  }

  if (!shiprocketCredentialsConfigured()) {
    throw new Error("SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD not configured");
  }

  const result = await checkShiprocketServiceability({
    deliveryPostcode: pincode,
  });
  return {
    serviceable: result.serviceable,
    shiprocketRatePaise: result.ratePaise,
    etaMinutes: result.etaMinutes || 45,
    courierName: result.courierName,
    foodFriendly: result.foodFriendly,
  };
}

/** G-04.02 / G-04.03 — mock | sandbox | live Shiprocket */
export async function registerDeliveryRoutes(app: FastifyInstance) {
  app.get("/delivery/config", async () => ({
    mode: deliveryMode(),
    platformMarkupPaise: PLATFORM_DELIVERY_MARKUP_PAISE,
    shiprocketConfigured: shiprocketCredentialsConfigured(),
  }));

  /** Quick auth probe for sandbox setup (no secrets returned). */
  app.get("/delivery/shiprocket-ping", async (_request, reply) => {
    const mode = deliveryMode();
    if (mode !== "sandbox" && mode !== "live") {
      return { mode, ok: true, skipped: true };
    }
    if (!shiprocketCredentialsConfigured()) {
      return reply.status(503).send({
        mode,
        ok: false,
        error: "SHIPROCKET_EMAIL / PASSWORD missing",
      });
    }
    try {
      const { shiprocketLogin } = await import("@damigos/domain");
      await shiprocketLogin();
      return { mode, ok: true, authenticated: true };
    } catch (err) {
      return reply.status(502).send({
        mode,
        ok: false,
        error: err instanceof Error ? err.message : "Shiprocket login failed",
        hint: "Use Settings → API → Create API User credentials, not only Sandbox panel UI password",
      });
    }
  });

  app.get("/delivery/serviceability", async (request, reply) => {
    if (deliveryMode() === "off") {
      return { mode: "off", serviceable: true };
    }

    const query = z.object({ pincode: z.string().length(6) }).safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "pincode required (6 digits)",
          correlationId: request.id,
        },
      });
    }

    try {
      const rate = await resolveRate(query.data.pincode);
      return {
        mode: deliveryMode(),
        pincode: query.data.pincode,
        serviceable: rate.serviceable,
        courierName: rate.courierName,
        message: rate.serviceable ? null : "Delivery not available for this pincode yet.",
      };
    } catch (err) {
      return reply.status(502).send({
        error: {
          code: "SHIPROCKET_ERROR",
          message: err instanceof Error ? err.message : "Shiprocket error",
          correlationId: request.id,
        },
      });
    }
  });

  app.post("/delivery/quote", { preHandler: requireGuest }, async (request, reply) => {
    if (!deliveryQuoteRequired()) {
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
        error: {
          code: "INVALID_REQUEST",
          message: "restaurantId and pincode required",
          correlationId: request.id,
        },
      });
    }

    const customerId = request.guest!.sub!;
    const cart = await getOpenCart(customerId, body.data.restaurantId);
    if (!cart) {
      return reply.status(400).send({
        error: {
          code: "CART_EMPTY",
          message: "Add items before delivery quote",
          correlationId: request.id,
        },
      });
    }

    let rate: Awaited<ReturnType<typeof resolveRate>>;
    try {
      rate = await resolveRate(body.data.pincode);
    } catch (err) {
      return reply.status(502).send({
        error: {
          code: "SHIPROCKET_ERROR",
          message: err instanceof Error ? err.message : "Shiprocket quote failed",
          correlationId: request.id,
        },
      });
    }

    if (!rate.serviceable) {
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

    const shiprocketRatePaise = rate.shiprocketRatePaise;
    const grossDeliveryFeePaise = shiprocketRatePaise + PLATFORM_DELIVERY_MARKUP_PAISE;
    const firstOrderFree = await isFirstOrderFreeEligible(customerId);
    const platformSubsidyPaise = firstOrderFree ? grossDeliveryFeePaise : 0;
    const deliveryFeePaise = firstOrderFree ? 0 : grossDeliveryFeePaise;

    await db
      .update(carts)
      .set({
        deliveryPincode: body.data.pincode,
        deliveryFeePaise,
      })
      .where(eq(carts.id, cart.id));

    return {
      carrier: "Shiprocket",
      mode: deliveryMode(),
      courierName: rate.courierName,
      foodFriendly: rate.foodFriendly,
      foodDeliveryLabel: rate.foodFriendly
        ? "Hyperlocal / Instant · food delivery"
        : "Standard Shiprocket (enable Quick for Instant fleets)",
      shiprocketRatePaise,
      platformMarkupPaise: PLATFORM_DELIVERY_MARKUP_PAISE,
      grossDeliveryFeePaise,
      deliveryFeePaise,
      firstOrderFree,
      platformSubsidyPaise,
      subsidyLabel: firstOrderFree
        ? "First-Order FREE Delivery · Sponsored by D'aMigo's"
        : null,
      etaMinutes: rate.etaMinutes,
      pincode: body.data.pincode,
    };
  });
}
