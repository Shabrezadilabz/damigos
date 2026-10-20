import { and, eq, inArray, sql } from "drizzle-orm";
import { db, orders } from "@damigos/db";

/** Prior completed platform orders — G-04.09 first-order FREE delivery */
const COMPLETED = ["DELIVERED", "CLOSED"] as const;

export async function customerHasCompletedOrder(customerId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.customerId, customerId), inArray(orders.status, [...COMPLETED])))
    .limit(1);
  return Boolean(row);
}

export async function isFirstOrderFreeEligible(customerId: string): Promise<boolean> {
  return !(await customerHasCompletedOrder(customerId));
}

/** Count completed orders (analytics / debug) */
export async function countCompletedOrders(customerId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.customerId, customerId), inArray(orders.status, [...COMPLETED])));
  return row?.n ?? 0;
}
