import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";
import { buildGuestApp } from "./build-app.js";

let cached: FastifyInstance | null = null;

function forwardToFastify(app: FastifyInstance, req: IncomingMessage, res: ServerResponse) {
  return new Promise<void>((resolve, reject) => {
    res.once("finish", resolve);
    res.once("error", reject);
    app.server.emit("request", req, res);
  });
}

async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!cached) {
      cached = await buildGuestApp();
    }
    await forwardToFastify(cached, req, res);
  } catch (err) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "API_INIT_FAILED",
          message: err instanceof Error ? err.message : "Guest API failed to start",
          hint: "Set DATABASE_URL and JWT_SECRET on damigos-guest-api, redeploy, run db:migrate + db:seed",
        },
      }),
    );
  }
}

export default handler;

export const config = {
  maxDuration: 60,
};
