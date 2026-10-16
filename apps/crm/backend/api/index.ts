import "tsx/esm/api";
import type { IncomingMessage, ServerResponse } from "node:http";
import serverless from "serverless-http";
import { buildCrmApp } from "../src/build-app.js";

type ServerlessHandler = (req: IncomingMessage, res: ServerResponse) => void;

let cached: ServerlessHandler | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    if (!cached) {
      const app = await buildCrmApp({ serverless: true });
      cached = serverless(app.server) as ServerlessHandler;
    }
    return cached(req, res);
  } catch (err) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "API_INIT_FAILED",
          message: err instanceof Error ? err.message : "CRM API failed to start",
          hint: "Set DATABASE_URL and JWT_SECRET on Vercel project damigos-crm-api, redeploy, run db:migrate + db:seed",
        },
      }),
    );
  }
}

export const config = {
  maxDuration: 60,
};
