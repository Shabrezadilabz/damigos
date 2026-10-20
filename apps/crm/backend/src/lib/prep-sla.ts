import { eq, inArray } from "drizzle-orm";
import { db, menuItems, orderItems } from "@damigos/db";

function prepMinutesFromMenuItem(item: {
  prepMinutes: number | null;
  prepCategory: string | null;
}): 10 | 15 {
  if (item.prepMinutes === 10 || item.prepMinutes === 15) return item.prepMinutes;
  return item.prepCategory === "READY_10M" ? 10 : 15;
}

/** Resolve Accept SLA from order lines — any 15m item → 15, else 10 */
export async function resolvePrepMinutesForOrder(orderId: string): Promise<10 | 15> {
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  if (lines.length === 0) return 15;

  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const items = await db.select().from(menuItems).where(inArray(menuItems.id, ids));
  if (items.length === 0) return 15;

  let max: 10 | 15 = 10;
  for (const item of items) {
    if (prepMinutesFromMenuItem(item) === 15) max = 15;
  }
  return max;
}

/** Batch SLA for kitchen board cards (PAID → Accept label). */
export async function resolvePrepMinutesForOrders(
  orderIds: string[],
): Promise<Map<string, 10 | 15>> {
  const out = new Map<string, 10 | 15>();
  if (orderIds.length === 0) return out;

  const lines = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));
  const menuIds = [...new Set(lines.map((l) => l.menuItemId))];
  const items =
    menuIds.length === 0
      ? []
      : await db.select().from(menuItems).where(inArray(menuItems.id, menuIds));
  const prepByMenu = new Map(items.map((i) => [i.id, prepMinutesFromMenuItem(i)] as const));

  const linesByOrder = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = linesByOrder.get(line.orderId) ?? [];
    list.push(line);
    linesByOrder.set(line.orderId, list);
  }

  for (const orderId of orderIds) {
    const orderLines = linesByOrder.get(orderId) ?? [];
    if (orderLines.length === 0) {
      out.set(orderId, 15);
      continue;
    }
    let max: 10 | 15 = 10;
    for (const line of orderLines) {
      if ((prepByMenu.get(line.menuItemId) ?? 15) === 15) max = 15;
    }
    out.set(orderId, max);
  }
  return out;
}

export function prepDeadlineFrom(committedMin: number, from = new Date()): Date {
  return new Date(from.getTime() + committedMin * 60_000);
}
