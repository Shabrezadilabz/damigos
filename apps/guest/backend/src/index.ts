import cors from "@fastify/cors";
import Fastify from "fastify";
import { GUEST_API_PREFIX, loadMonorepoEnv } from "@damigos/domain";

loadMonorepoEnv(import.meta.url);
import { registerHealthRoutes } from "./routes/health.js";
import { registerScanRoutes } from "./routes/scan.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerMenuRoutes } from "./routes/menu.js";
import { registerCartRoutes } from "./routes/cart.js";
import { registerCheckoutRoutes } from "./routes/checkout.js";
import { registerRewardsRoutes } from "./routes/rewards.js";
import { registerDevFixtureRoutes } from "./routes/dev-fixtures.js";
import { registerDeliveryRoutes } from "./routes/delivery.js";
import { registerHubRoutes } from "./routes/hub.js";
import { registerRazorpayWebhookRoutes } from "./routes/razorpay-webhook.js";
import { ensureMenuSchema } from "./lib/ensure-menu-schema.js";

const port = Number(process.env.GUEST_API_PORT ?? 4000);
const host = process.env.GUEST_API_HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.GUEST_WEB_URL ?? "http://localhost:3000",
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

try {
  await ensureMenuSchema();
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
