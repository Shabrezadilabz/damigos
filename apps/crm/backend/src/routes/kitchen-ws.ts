import type { FastifyInstance } from "fastify";
import { subscribeKitchenRefresh } from "@damigos/kitchen-bus";
import { resolveKitchenRealtimeAccess } from "../lib/kitchen-realtime-auth.js";
import {
  kitchenStreamConnectionCount,
  registerKitchenStreamConnection,
  unregisterKitchenStreamConnection,
} from "../lib/kitchen-stream-registry.js";

/** C-05.02 — WebSocket kitchen refresh (same Redis channel as SSE) */
export async function registerKitchenWsRoutes(app: FastifyInstance) {
  app.get("/ws/kitchen", { websocket: true }, async (socket, request) => {
    const access = await resolveKitchenRealtimeAccess(request);
    if (!access.ok) {
      socket.close(access.status === 401 ? 4401 : access.status === 403 ? 4403 : 4400, access.code);
      return;
    }

    const { restaurantId } = access.auth;
    const connectionId = registerKitchenStreamConnection(restaurantId);
    if (!connectionId) {
      socket.close(4429, "KITCHEN_STREAM_CAPACITY");
      return;
    }

    socket.send(
      JSON.stringify({
        type: "connected",
        connectionId,
        transport: "ws",
        peers: kitchenStreamConnectionCount(restaurantId),
      }),
    );

    const push = () => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: "refresh", ts: Date.now() }));
      }
    };

    let unsubscribe: (() => Promise<void>) | null = null;
    try {
      unsubscribe = await subscribeKitchenRefresh(restaurantId, push);
    } catch {
      socket.send(JSON.stringify({ type: "error", code: "redis_unavailable" }));
    }

    const heartbeat = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    }, 25_000);

    const cleanup = () => {
      clearInterval(heartbeat);
      unregisterKitchenStreamConnection(restaurantId, connectionId);
      void unsubscribe?.();
    };

    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });
}
