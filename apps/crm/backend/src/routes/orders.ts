import { and, desc, eq, inArray } from "drizzle-orm";

import type { FastifyInstance } from "fastify";

import { z } from "zod";

import { publishKitchenRefresh } from "@damigos/kitchen-bus";
import { customers, db, orderItems, orders } from "@damigos/db";

import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";



const kitchenRoles = requireRoles("RESTAURANT_OWNER", "STAFF", "KITCHEN", "PLATFORM_ADMIN");



const kitchenActiveStatuses = ["PAID", "ACCEPTED", "PREPARING", "READY", "DISPATCHED"] as const;



const nextStatus: Record<string, string | undefined> = {

  PAID: "ACCEPTED",

  ACCEPTED: "PREPARING",

  PREPARING: "READY",

  READY: "DISPATCHED",

  DISPATCHED: "DELIVERED",

};



/** C-05.01 / C-05.02 — kitchen poll (WS P1+) */

export async function registerOrderRoutes(app: FastifyInstance) {

  app.get("/orders", { preHandler: kitchenRoles }, async (request, reply) => {

    const query = z

      .object({

        restaurantId: z.string().uuid().optional(),

        activeKitchen: z

          .string()

          .optional()

          .transform((v) => v === "true"),

        limit: z.coerce.number().int().min(1).max(100).default(50),

      })

      .parse(request.query);



    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;

    if (!restaurantId) {

      return reply.status(400).send({

        error: {

          code: "INVALID_REQUEST",

          message: "restaurantId required",

          correlationId: request.id,

        },

      });

    }



    await enforceRestaurantScope(request, reply, restaurantId);

    if (reply.sent) return;



    const conditions = [eq(orders.restaurantId, restaurantId)];

    if (query.activeKitchen) {

      conditions.push(inArray(orders.status, [...kitchenActiveStatuses]));

    }



    const rows = await db

      .select({

        order: orders,

        customerPhoneLast4: customers.phoneLast4,

      })

      .from(orders)

      .innerJoin(customers, eq(orders.customerId, customers.id))

      .where(and(...conditions))

      .orderBy(desc(orders.createdAt))

      .limit(query.limit);



    const orderIds = rows.map((r) => r.order.id);

    const allItems =

      orderIds.length === 0

        ? []

        : await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));



    const itemsByOrder = new Map<string, typeof allItems>();

    for (const item of allItems) {

      const list = itemsByOrder.get(item.orderId) ?? [];

      list.push(item);

      itemsByOrder.set(item.orderId, list);

    }



    return {

      orders: rows.map(({ order, customerPhoneLast4 }) => ({

        ...order,

        customerPhoneLast4,

        items: itemsByOrder.get(order.id) ?? [],

      })),

    };

  });



  app.post("/orders/:orderId/accept", { preHandler: kitchenRoles }, async (request, reply) => {

    const params = z.object({ orderId: z.string().uuid() }).parse(request.params);

    return advanceOrder(request, reply, params.orderId, "ACCEPTED", ["PAID"]);

  });



  app.patch("/orders/:orderId/status", { preHandler: kitchenRoles }, async (request, reply) => {

    const params = z.object({ orderId: z.string().uuid() }).parse(request.params);

    const body = z

      .object({

        status: z.enum([

          "ACCEPTED",

          "PREPARING",

          "READY",

          "DISPATCHED",

          "DELIVERED",

          "CANCELLED",

        ]),

      })

      .parse(request.body);



    const allowedFrom: Record<string, string[]> = {

      ACCEPTED: ["PAID"],

      PREPARING: ["ACCEPTED"],

      READY: ["PREPARING"],

      DISPATCHED: ["READY"],

      DELIVERED: ["DISPATCHED"],

      CANCELLED: ["PAID", "ACCEPTED"],

    };



    return advanceOrder(request, reply, params.orderId, body.status, allowedFrom[body.status] ?? []);

  });

}



async function advanceOrder(

  request: Parameters<typeof enforceRestaurantScope>[0],

  reply: Parameters<typeof enforceRestaurantScope>[1],

  orderId: string,

  targetStatus: string,

  allowedFrom: string[],

) {

  const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (!row) {

    return reply.status(404).send({

      error: { code: "NOT_FOUND", message: "Order not found", correlationId: request.id },

    });

  }



  await enforceRestaurantScope(request, reply, row.restaurantId);

  if (reply.sent) return;



  if (!allowedFrom.includes(row.status)) {

    return reply.status(409).send({

      error: {

        code: "INVALID_STATUS_TRANSITION",

        message: `Cannot move from ${row.status} to ${targetStatus}`,

        correlationId: request.id,

      },

    });

  }



  const [updated] = await db

    .update(orders)

    .set({ status: targetStatus as typeof row.status })

    .where(eq(orders.id, orderId))

    .returning();

  void publishKitchenRefresh(row.restaurantId);

  return { order: updated, suggestedNext: nextStatus[targetStatus] ?? null };

}


