import type { OrderStatus } from "@damigos/domain";

/** G-06.01 — in-flight delivery / kitchen pipeline */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "PAYMENT_PENDING",
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
