import type { OrderStatus } from "@damigos/domain";

/** G-06.01 — in-flight kitchen / delivery (paid+). Unpaid prepares stay out so concurrent carts stay clear. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
];

/** G-06.01 — terminal states */
export const PAST_ORDER_STATUSES: OrderStatus[] = [
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
  "PAYMENT_FAILED",
  "REFUNDED",
];

export type MeOrdersFilter = "active" | "past";
