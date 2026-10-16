import type { FastifyInstance } from "fastify";
import { subscribeKitchenRefresh } from "@damigos/kitchen-bus";
import { authorizeKitchenRealtime } from "../lib/kitchen-realtime-auth.js";
import {
  kitchenStreamConnectionCount,
  kitchenStreamMaxPerRestaurant,
  registerKitchenStreamConnection,
  unregisterKitchenStreamConnection,
} from "../lib/kitchen-stream-registry.js";

/** C-05.02 — SSE kitchen refresh (Redis pub/sub) */
export async function registerKitchenStreamRoutes(app: FastifyInstance) {
  app.get("/kitchen/stream", async (request, reply) => {
    const auth = await authorizeKitchenRealtime(request, reply);
    if (!auth) return;

    const connectionId = registerKitchenStreamConnection(auth.restaurantId);
    if (!connectionId) {
      return reply.status(429).send({
        error: {
          code: "KITCHEN_STREAM_CAPACITY",
          message: `Max ${kitchenStreamMaxPerRestaurant()} live kitchen connections per restaurant`,
          correlationId: request.id,
        },
      });
    }

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Kitchen-Connections": String(kitchenStreamConnectionCount(auth.restaurantId)),
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ connectionId, transport: "sse" })}\n\n`);

    const push = () => {
      res.write(`event: refresh\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    };

    let unsubscribe: (() => Promise<void>) | null = null;
    try {
      unsubscribe = await subscribeKitchenRefresh(auth.restaurantId, push);
    } catch {
      res.write("event: error\ndata: redis_unavailable\n\n");
    }

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 25_000);

    const cleanup = () => {
      clearInterval(heartbeat);
      unregisterKitchenStreamConnection(auth.restaurantId, connectionId);
      void unsubscribe?.();
    };

    request.raw.on("close", cleanup);
    request.raw.on("error", cleanup);
  });
}
