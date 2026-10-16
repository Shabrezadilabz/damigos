import { randomUUID } from "node:crypto";

const connections = new Map<string, Set<string>>();

export function kitchenStreamMaxPerRestaurant(): number {
  const n = Number(process.env.KITCHEN_STREAM_MAX_PER_RESTAURANT ?? 32);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 32;
}

/** Returns connection id when registered; null when restaurant is at capacity. */
export function registerKitchenStreamConnection(restaurantId: string): string | null {
  let set = connections.get(restaurantId);
  if (!set) {
    set = new Set();
    connections.set(restaurantId, set);
  }
  if (set.size >= kitchenStreamMaxPerRestaurant()) {
    return null;
  }
  const id = randomUUID();
  set.add(id);
  return id;
}

export function unregisterKitchenStreamConnection(restaurantId: string, connectionId: string) {
  const set = connections.get(restaurantId);
  if (!set) return;
  set.delete(connectionId);
  if (set.size === 0) connections.delete(restaurantId);
}

export function kitchenStreamConnectionCount(restaurantId: string): number {
  return connections.get(restaurantId)?.size ?? 0;
}
