import cors from "@fastify/cors";

import Fastify from "fastify";

import { CRM_API_PREFIX, loadMonorepoEnv } from "@damigos/domain";



loadMonorepoEnv(import.meta.url);

import { registerHealthRoutes } from "./routes/health.js";

import { registerAuthRoutes } from "./routes/auth.js";

import { registerAdminStickerRoutes } from "./routes/admin-stickers.js";

import { registerMenuRoutes } from "./routes/menu.js";

import { registerMenuImportRoutes } from "./routes/menu-import.js";

import { registerMeRoutes } from "./routes/me.js";

import { registerStickerRoutes } from "./routes/stickers.js";

import { registerKitchenStreamRoutes } from "./routes/kitchen-stream.js";

import { registerOrderRoutes } from "./routes/orders.js";

import { registerGrowRoutes } from "./routes/grow.js";

import { registerWalletRoutes } from "./routes/wallet.js";

import { registerDashboardRoutes } from "./routes/dashboard.js";

import { registerSettingsRoutes } from "./routes/settings.js";

import { registerOnboardingRoutes } from "./routes/onboarding.js";

import { startCampaignScheduler } from "./lib/campaign-scheduler.js";
import { ensureMenuSchema } from "./lib/ensure-menu-schema.js";
import { ensureGrowSchema } from "./lib/ensure-grow-schema.js";
import { ensureBrandSchema } from "./lib/ensure-brand-schema.js";
import { ensureOperationsSchema } from "./lib/ensure-operations-schema.js";

import { pingRedis } from "@damigos/kitchen-bus";
import { resolveCorsOrigin } from "./lib/cors-origins.js";



const port = Number(process.env.PORT ?? process.env.CRM_API_PORT ?? 4001);

const host = process.env.CRM_API_HOST ?? "0.0.0.0";



/** Menu import sends base64 JPEG (~1–3MB). Default Fastify bodyLimit is 1MB → browser shows "Failed to fetch". */
const app = Fastify({
  logger: true,
  bodyLimit: Number(process.env.CRM_API_BODY_LIMIT_BYTES ?? 15 * 1024 * 1024),
});



await app.register(cors, {
  origin: resolveCorsOrigin(process.env.CRM_CORS_ORIGINS, process.env.CRM_WEB_URL ?? "http://localhost:3001"),
  credentials: true,
});

await registerHealthRoutes(app);

await app.register(

  async (api) => {

    try {

      const { default: websocket } = await import("@fastify/websocket");

      await api.register(websocket);

      const { registerKitchenWsRoutes } = await import("./routes/kitchen-ws.js");

      await registerKitchenWsRoutes(api);

      app.log.info("Kitchen WebSocket enabled at /v1/ws/kitchen");

    } catch (err) {

      app.log.warn(

        { err },

        "Kitchen WebSocket disabled — run npm install in damigos_main (needs @fastify/websocket). SSE still works.",

      );

    }



    await registerOnboardingRoutes(api);

    await registerAuthRoutes(api);

    await registerAdminStickerRoutes(api);

    await registerMeRoutes(api);

    await registerStickerRoutes(api);

    await registerMenuRoutes(api);

    await registerMenuImportRoutes(api);

    await registerOrderRoutes(api);

    await registerKitchenStreamRoutes(api);

    await registerGrowRoutes(api);

    await registerWalletRoutes(api);

    await registerDashboardRoutes(api);

    await registerSettingsRoutes(api);

  },

  { prefix: CRM_API_PREFIX },

);



try {

  await ensureMenuSchema();
  await ensureGrowSchema();
  await ensureBrandSchema();
  await ensureOperationsSchema();

  await app.listen({ port, host });

  const redisOk = await pingRedis();

  if (redisOk) {

    app.log.info("Redis connected (kitchen SSE pub/sub)");

  } else {

    app.log.warn("Redis unavailable — kitchen live refresh degraded; run: docker compose up -d redis");

  }

  startCampaignScheduler(app);

} catch (err) {

  app.log.error(err);

  process.exit(1);

}


