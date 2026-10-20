import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import {
  db,
  orders,
  restaurantDailySettlements,
  restaurantPayoutLedger,
  restaurants,
} from "@damigos/db";

const paidStatuses = [
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CLOSED",
] as const;

/** IST calendar date YYYY-MM-DD */
export function istBusinessDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Start/end of IST day as UTC Date bounds */
export function istDayBounds(businessDate: string): { start: Date; end: Date } {
  const start = new Date(`${businessDate}T00:00:00+05:30`);
  const end = new Date(`${businessDate}T24:00:00+05:30`);
  return { start, end };
}

export function previousIstBusinessDate(now = new Date()): string {
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  istNow.setDate(istNow.getDate() - 1);
  return istBusinessDate(istNow);
}

function maskAccount(num: string | null | undefined): string | null {
  if (!num) return null;
  const d = num.replace(/\s/g, "");
  if (d.length < 4) return "****";
  return `****${d.slice(-4)}`;
}

export async function computeDayEarnings(restaurantId: string, businessDate: string) {
  const { start, end } = istDayBounds(businessDate);
  const [agg] = await db
    .select({
      orderCount: sql<number>`count(*)::int`,
      grossSalesPaise: sql<number>`coalesce(sum(${orders.totalPaise}), 0)::int`,
      restaurantSharePaise: sql<number>`coalesce(sum(${orders.subtotalPaise} - ${orders.discountPaise}), 0)::int`,
      platformFeePaise: sql<number>`coalesce(sum(${orders.convenienceFeePaise}), 0)::int`,
      deliveryFeePaise: sql<number>`coalesce(sum(${orders.deliveryFeePaise}), 0)::int`,
      waitingPenaltyPaise: sql<number>`coalesce(sum(${orders.waitingPenaltyPaise}), 0)::int`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.restaurantId, restaurantId),
        gte(orders.createdAt, start),
        lt(orders.createdAt, end),
        inArray(orders.status, [...paidStatuses]),
      ),
    );

  const restaurantSharePaise = Math.max(
    0,
    Number(agg?.restaurantSharePaise ?? 0) - Number(agg?.waitingPenaltyPaise ?? 0),
  );

  return {
    businessDate,
    orderCount: Number(agg?.orderCount ?? 0),
    paymentsCount: Number(agg?.orderCount ?? 0),
    grossSalesPaise: Number(agg?.grossSalesPaise ?? 0),
    restaurantSharePaise,
    platformFeePaise: Number(agg?.platformFeePaise ?? 0),
    deliveryFeePaise: Number(agg?.deliveryFeePaise ?? 0),
    waitingPenaltyPaise: Number(agg?.waitingPenaltyPaise ?? 0),
  };
}

function buildInvoice(input: {
  restaurantName: string;
  businessDate: string;
  invoiceNumber: string;
  earnings: Awaited<ReturnType<typeof computeDayEarnings>>;
  bankLast4: string | null;
  status: string;
}) {
  return {
    invoiceNumber: input.invoiceNumber,
    businessDate: input.businessDate,
    restaurantName: input.restaurantName,
    status: input.status,
    currency: "INR",
    lines: [
      { label: "Orders", value: input.earnings.orderCount },
      { label: "Gross sales (paise)", value: input.earnings.grossSalesPaise },
      { label: "Restaurant share (paise)", value: input.earnings.restaurantSharePaise },
      { label: "Platform fee (paise)", value: input.earnings.platformFeePaise },
      { label: "Delivery fees collected (paise)", value: input.earnings.deliveryFeePaise },
      { label: "Waiting penalties (paise)", value: input.earnings.waitingPenaltyPaise },
    ],
    payoutBankLast4: input.bankLast4,
    generatedAt: new Date().toISOString(),
  };
}

/** Settle one restaurant for an IST business day (idempotent). */
export async function settleRestaurantDay(restaurantId: string, businessDate: string) {
  const [existing] = await db
    .select()
    .from(restaurantDailySettlements)
    .where(
      and(
        eq(restaurantDailySettlements.restaurantId, restaurantId),
        eq(restaurantDailySettlements.businessDate, businessDate),
      ),
    )
    .limit(1);

  if (existing && (existing.status === "SETTLED" || existing.status === "FROZEN")) {
    return existing;
  }

  const [kitchen] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
  if (!kitchen) return null;

  const earnings = await computeDayEarnings(restaurantId, businessDate);
  const invoiceNumber = `DMG-${businessDate.replace(/-/g, "")}-${restaurantId.slice(0, 8).toUpperCase()}`;

  const frozen =
    kitchen.payoutFrozenUntil != null && kitchen.payoutFrozenUntil.getTime() > Date.now();
  const noBank = !kitchen.bankAccountNumber?.trim() || !kitchen.bankIfsc?.trim();

  let status: string;
  let freezeNote: string | null = null;
  if (frozen) {
    status = "FROZEN";
    freezeNote =
      kitchen.payoutFreezeReason ??
      "Bank details changed — payout frozen until Razorpay Route updated";
  } else if (noBank) {
    status = "SKIPPED_NO_BANK";
    freezeNote = "Add bank details in Settings → Payout";
  } else if (earnings.orderCount === 0) {
    status = "SETTLED";
    freezeNote = "No orders";
  } else {
    status = "SETTLED";
  }

  const invoice = buildInvoice({
    restaurantName: kitchen.name,
    businessDate,
    invoiceNumber,
    earnings,
    bankLast4: maskAccount(kitchen.bankAccountNumber),
    status,
  });

  const values = {
    restaurantId,
    businessDate,
    orderCount: earnings.orderCount,
    paymentsCount: earnings.paymentsCount,
    grossSalesPaise: earnings.grossSalesPaise,
    restaurantSharePaise: earnings.restaurantSharePaise,
    platformFeePaise: earnings.platformFeePaise,
    deliveryFeePaise: earnings.deliveryFeePaise,
    waitingPenaltyPaise: earnings.waitingPenaltyPaise,
    status,
    invoiceNumber,
    invoiceJson: JSON.stringify(invoice),
    settledAt: status === "SETTLED" ? new Date() : null,
    freezeNote,
  };

  if (existing) {
    const [updated] = await db
      .update(restaurantDailySettlements)
      .set(values)
      .where(eq(restaurantDailySettlements.id, existing.id))
      .returning();
    if (status === "SETTLED" && earnings.restaurantSharePaise > 0) {
      await insertSettlementLedger(restaurantId, businessDate, earnings.restaurantSharePaise, invoiceNumber);
    }
    return updated;
  }

  const [created] = await db.insert(restaurantDailySettlements).values(values).returning();
  if (status === "SETTLED" && earnings.restaurantSharePaise > 0) {
    await insertSettlementLedger(restaurantId, businessDate, earnings.restaurantSharePaise, invoiceNumber);
  }
  return created;
}

async function insertSettlementLedger(
  restaurantId: string,
  businessDate: string,
  amountPaise: number,
  invoiceNumber: string,
) {
  const key = `EOD_SETTLEMENT:${businessDate}`;
  const [dup] = await db
    .select({ id: restaurantPayoutLedger.id })
    .from(restaurantPayoutLedger)
    .where(
      and(
        eq(restaurantPayoutLedger.restaurantId, restaurantId),
        eq(restaurantPayoutLedger.entryType, "EOD_SETTLEMENT"),
        sql`${restaurantPayoutLedger.meta} like ${`%${key}%`}`,
      ),
    )
    .limit(1);
  if (dup) return;

  await db.insert(restaurantPayoutLedger).values({
    restaurantId,
    orderId: null,
    entryType: "EOD_SETTLEMENT",
    amountPaise,
    meta: JSON.stringify({ key, invoiceNumber, businessDate }),
  });
}

/** Run EOD for all restaurants for previous IST day. */
export async function runEodSettlementsForPreviousDay(now = new Date()) {
  const businessDate = previousIstBusinessDate(now);
  const kitchens = await db.select({ id: restaurants.id }).from(restaurants);
  const results = [];
  for (const k of kitchens) {
    const row = await settleRestaurantDay(k.id, businessDate);
    if (row) results.push(row);
  }
  return { businessDate, settled: results.length, rows: results };
}

export function isPayoutFrozen(row: {
  payoutFrozenUntil: Date | null;
}): boolean {
  return row.payoutFrozenUntil != null && row.payoutFrozenUntil.getTime() > Date.now();
}

export { maskAccount };
