import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  carts,
  cartItems,
  db,
  menuItems,
  orders,
  rewardPlays,
  scanEvents,
} from "@damigos/db";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import {
  getWalletSnapshot,
  WALLET_LOW_BALANCE_PAISE,
  WHATSAPP_MSG_COST_PAISE,
} from "../lib/wallet.js";

const dashboardRoles = requireRoles("RESTAURANT_OWNER", "STAFF", "KITCHEN", "PLATFORM_ADMIN");

const paidOrderStatuses = [
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CLOSED",
] as const;

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function parseRange(range: string): { since: Date; label: string } {
  const days = range === "7d" ? 7 : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { since, label: range === "7d" ? "7d" : "30d" };
}

async function countScansSince(restaurantId: string, since: Date) {
  const [row] = await db
    .select({ n: count() })
    .from(scanEvents)
    .where(and(eq(scanEvents.restaurantId, restaurantId), gte(scanEvents.createdAt, since)));
  return Number(row?.n ?? 0);
}

async function countOrdersToday(restaurantId: string) {
  const since = startOfUtcDay();
  const [row] = await db
    .select({ n: count() })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, since),
        inArray(orders.status, [...paidOrderStatuses]),
      ),
    );
  return Number(row?.n ?? 0);
}

async function countDraftMenuItems(restaurantId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(menuItems)
    .where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.draft, true)));
  return Number(row?.n ?? 0);
}

/** C-02.01 / C-02.04 — dashboard KPIs + analytics */
export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/overview", { preHandler: dashboardRoles }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid().optional() }).parse(request.query);
    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },
      });
    }
    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [ordersToday, scans7d, wallet, draftMenuCount] = await Promise.all([
      countOrdersToday(restaurantId),
      countScansSince(restaurantId, sevenDaysAgo),
      getWalletSnapshot(restaurantId),
      countDraftMenuItems(restaurantId),
    ]);

    const campaignSendsRemaining = Math.floor(wallet.balancePaise / WHATSAPP_MSG_COST_PAISE);

    const alerts: Array<{ code: string; severity: "info" | "warning"; message: string }> = [];
    if (wallet.balancePaise < WALLET_LOW_BALANCE_PAISE) {
      alerts.push({
        code: "LOW_WALLET",
        severity: "warning",
        message: "WhatsApp wallet is low — top up before sending campaigns.",
      });
    }
    if (draftMenuCount > 0) {
      alerts.push({
        code: "DRAFT_MENU",
        severity: "info",
        message: `${draftMenuCount} draft menu item${draftMenuCount === 1 ? "" : "s"} pending publish.`,
      });
    }

    return {
      restaurantId,
      kpis: {
        ordersToday,
        scans7d,
        walletBalancePaise: wallet.balancePaise,
        campaignSendsRemaining,
      },
      alerts,
    };
  });

  app.get("/dashboard/analytics", { preHandler: dashboardRoles }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid().optional(),
        range: z.enum(["7d", "30d"]).default("30d"),
        format: z.enum(["json", "csv"]).optional(),
      })
      .parse(request.query);

    const restaurantId = query.restaurantId ?? request.staff?.restaurantId;
    if (!restaurantId) {
      return reply.status(400).send({
        error: { code: "INVALID_REQUEST", message: "restaurantId required", correlationId: request.id },
      });
    }
    await enforceRestaurantScope(request, reply, restaurantId);
    if (reply.sent) return;

    const { since, label } = parseRange(query.range);

    const [scanRow, gameRow, menuRow, orderRow] = await Promise.all([
      db
        .select({ n: count() })
        .from(scanEvents)
        .where(and(eq(scanEvents.restaurantId, restaurantId), gte(scanEvents.createdAt, since))),
      db
        .select({ n: count() })
        .from(rewardPlays)
        .where(and(eq(rewardPlays.restaurantId, restaurantId), gte(rewardPlays.createdAt, since))),
      db
        .select({ n: sql<number>`count(distinct ${carts.id})::int` })
        .from(carts)
        .innerJoin(cartItems, eq(cartItems.cartId, carts.id))
        .where(and(eq(carts.restaurantId, restaurantId), gte(carts.updatedAt, since))),
      db
        .select({ n: count() })
        .from(orders)
        .where(
          and(
            eq(orders.restaurantId, restaurantId),
            gte(orders.createdAt, since),
            inArray(orders.status, [...paidOrderStatuses]),
          ),
        ),
    ]);

    const funnel = [
      { step: "scan", label: "Sticker scans", count: Number(scanRow[0]?.n ?? 0) },
      { step: "game", label: "Reward plays", count: Number(gameRow[0]?.n ?? 0) },
      { step: "menu", label: "Carts with items", count: Number(menuRow[0]?.n ?? 0) },
      { step: "order", label: "Paid orders", count: Number(orderRow[0]?.n ?? 0) },
    ];

    const hourRows = await db
      .select({
        hour: sql<number>`extract(hour from ${orders.createdAt} at time zone 'UTC')::int`,
        n: count(),
      })
      .from(orders)
      .where(
        and(
          eq(orders.restaurantId, restaurantId),
          gte(orders.createdAt, since),
          inArray(orders.status, [...paidOrderStatuses]),
        ),
      )
      .groupBy(sql`extract(hour from ${orders.createdAt} at time zone 'UTC')`);

    const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: Number(hourRows.find((r) => Number(r.hour) === hour)?.n ?? 0),
    }));

    const payload = {
      restaurantId,
      range: label,
      since: since.toISOString(),
      funnel,
      ordersByHour,
    };

    if (query.format === "csv") {
      const lines = [
        "section,step,hour,count",
        ...funnel.map((f) => `funnel,${f.step},,${f.count}`),
        ...ordersByHour.map((h) => `orders_by_hour,,${h.hour},${h.count}`),
      ];
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="damigos-analytics-${label}.csv"`)
        .send(lines.join("\n"));
    }

    return payload;
  });
}
