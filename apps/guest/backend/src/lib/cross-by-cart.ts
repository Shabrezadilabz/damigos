import { and, eq, sql } from "drizzle-orm";
import { cartItems, carts, db, restaurants } from "@damigos/db";
import { haversineKm, riderModeForDistanceKm } from "./haversine.js";

export const CROSS_BY_MAX_KITCHENS = 2;

export type OpenKitchenCart = {
  cartId: string;
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  subtotalPaise: number;
  lat: number | null;
  lng: number | null;
};

/** OPEN carts with at least one line item */
export async function listOpenKitchenCarts(customerId: string): Promise<OpenKitchenCart[]> {
  const rows = await db
    .select({
      cartId: carts.id,
      restaurantId: carts.restaurantId,
      restaurantName: restaurants.name,
      lat: restaurants.lat,
      lng: restaurants.lng,
      itemCount: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int`,
      subtotalPaise: sql<number>`coalesce(sum(${cartItems.quantity} * ${cartItems.unitPricePaise}), 0)::int`,
    })
    .from(carts)
    .innerJoin(restaurants, eq(carts.restaurantId, restaurants.id))
    .leftJoin(cartItems, eq(cartItems.cartId, carts.id))
    .where(and(eq(carts.customerId, customerId), eq(carts.status, "OPEN")))
    .groupBy(carts.id, carts.restaurantId, restaurants.name, restaurants.lat, restaurants.lng);

  return rows
    .filter((r) => (r.itemCount ?? 0) > 0)
    .map((r) => ({
      cartId: r.cartId,
      restaurantId: r.restaurantId,
      restaurantName: r.restaurantName,
      itemCount: r.itemCount ?? 0,
      subtotalPaise: r.subtotalPaise ?? 0,
      lat: r.lat,
      lng: r.lng,
    }));
}

export function crossByMeta(open: OpenKitchenCart[]) {
  if (open.length < 2) {
    return {
      kitchenCount: open.length,
      maxKitchens: CROSS_BY_MAX_KITCHENS,
      distanceMeters: null as number | null,
      riderMode: "SINGLE" as const,
      canAddKitchen: open.length < CROSS_BY_MAX_KITCHENS,
    };
  }
  const [a, b] = open;
  let distanceMeters: number | null = null;
  let riderMode: "SINGLE" | "SPLIT" = "SPLIT";
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
    distanceMeters = Math.round(km * 1000);
    riderMode = riderModeForDistanceKm(km);
  }
  return {
    kitchenCount: open.length,
    maxKitchens: CROSS_BY_MAX_KITCHENS,
    distanceMeters,
    riderMode,
    canAddKitchen: false,
  };
}

/** Reject opening a 3rd kitchen cart with items */
export async function assertCanShopRestaurant(
  customerId: string,
  restaurantId: string,
): Promise<{ ok: true } | { ok: false; code: string; message: string; openCarts: OpenKitchenCart[] }> {
  const open = await listOpenKitchenCarts(customerId);
  if (open.some((c) => c.restaurantId === restaurantId)) return { ok: true };
  if (open.length < CROSS_BY_MAX_KITCHENS) return { ok: true };
  return {
    ok: false,
    code: "CROSS_BY_LIMIT",
    message: "Cart already has 2 kitchens. Replace one or clear cart before adding another.",
    openCarts: open,
  };
}
