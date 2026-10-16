import cors from "@fastify/cors";
import Fastify from "fastify";
import { CRM_API_PREFIX, loadMonorepoEnv } from "@damigos/domain";
import { pingRedis } from "@damigos/kitchen-bus";
import { ensureSchemasIfConfigured } from "./lib/ensure-schemas-if-configured.js";
import { resolveCorsOrigin } from "./lib/cors-origins.js";
import { registerAdminStickerRoutes } from "./routes/admin-stickers.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerGrowRoutes } from "./routes/grow.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerKitchenStreamRoutes } from "./routes/kitchen-stream.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerMenuImportRoutes } from "./routes/menu-import.js";
import { registerMenuRoutes } from "./routes/menu.js";
import { registerOnboardingRoutes } from "./routes/onboarding.js";
import { registerOrderRoutes } from "./routes/orders.js";
import { registerSettingsRoutes } from "./routes/settings.js";
import { registerStickerRoutes } from "./routes/stickers.js";
import { registerWalletRoutes } from "./routes/wallet.js";

export type BuildCrmAppOptions = {
  /** Vercel serverless — no WebSocket; kitchen uses polling fallback */
  serverless?: boolean;
};

export async function buildCrmApp(options: BuildCrmAppOptions = {}) {
  loadMonorepoEnv(import.meta.url);

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
      if (!options.serverless) {
        try {
          const { default: websocket } = await import("@fastify/websocket");
          await api.register(websocket);
          const { registerKitchenWsRoutes } = await import("./routes/kitchen-ws.js");
          await registerKitchenWsRoutes(api);
          app.log.info("Kitchen WebSocket enabled at /v1/ws/kitchen");
        } catch (err) {
          app.log.warn({ err }, "Kitchen WebSocket disabled — SSE still works.");
        }
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

  let schemasEnsured = false;
  app.addHook("onRequest", async (request) => {
    if (request.url === "/health" || request.url.startsWith("/health?")) return;
    if (schemasEnsured) return;
    schemasEnsured = true;
    await ensureSchemasIfConfigured(app);
  });

  await app.ready();

  if (!options.serverless) {
    const redisOk = await pingRedis();
    if (redisOk) app.log.info("Redis connected (kitchen SSE pub/sub)");
    else app.log.warn("Redis unavailable — kitchen live refresh degraded");
  }

  return app;
}
