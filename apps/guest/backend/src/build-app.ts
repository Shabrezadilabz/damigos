import cors from "@fastify/cors";
import Fastify from "fastify";
import { GUEST_API_PREFIX, loadMonorepoEnv } from "@damigos/domain";
import { resolveCorsOrigin } from "./lib/cors-origins.js";
import { ensureMenuSchema } from "./lib/ensure-menu-schema.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCartRoutes } from "./routes/cart.js";
import { registerCheckoutRoutes } from "./routes/checkout.js";
import { registerDeliveryRoutes } from "./routes/delivery.js";
import { registerDevFixtureRoutes } from "./routes/dev-fixtures.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerHubRoutes } from "./routes/hub.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerMenuRoutes } from "./routes/menu.js";
import { registerRazorpayWebhookRoutes } from "./routes/razorpay-webhook.js";
import { registerRewardsRoutes } from "./routes/rewards.js";
import { registerScanRoutes } from "./routes/scan.js";

export async function buildGuestApp() {
  loadMonorepoEnv(import.meta.url);

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: resolveCorsOrigin(process.env.GUEST_CORS_ORIGINS, process.env.GUEST_WEB_URL ?? "http://localhost:3000"),
    credentials: true,
  });

  await registerHealthRoutes(app);
  await app.register(
    async (api) => {
      await registerScanRoutes(api);
      await registerAuthRoutes(api);
      await registerMeRoutes(api);
      await registerMenuRoutes(api);
      await registerCartRoutes(api);
      await registerDeliveryRoutes(api);
      await registerHubRoutes(api);
      await registerCheckoutRoutes(api);
      await registerRewardsRoutes(api);
      await registerDevFixtureRoutes(api);
      await registerRazorpayWebhookRoutes(api);
    },
    { prefix: GUEST_API_PREFIX },
  );

  let schemasEnsured = false;
  app.addHook("onRequest", async (request) => {
    if (request.url === "/health" || request.url.startsWith("/health?")) return;
    if (schemasEnsured) return;
    schemasEnsured = true;
    if (process.env.DATABASE_URL?.trim()) {
      await ensureMenuSchema();
    } else {
      app.log.warn("DATABASE_URL missing — configure on Vercel (damigos-guest-api) then redeploy");
    }
  });

  await app.ready();
  return app;
}
