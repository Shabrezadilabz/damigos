import { startCampaignScheduler } from "./lib/campaign-scheduler.js";
import { startSettlementScheduler } from "./lib/settlement-scheduler.js";
import { buildCrmApp } from "./build-app.js";

const port = Number(process.env.PORT ?? process.env.CRM_API_PORT ?? 4001);
const host = process.env.CRM_API_HOST ?? "0.0.0.0";

try {
  const app = await buildCrmApp({ serverless: false });
  await app.listen({ port, host });
  startCampaignScheduler(app);
  startSettlementScheduler(app);
} catch (err) {
  console.error(err);
  process.exit(1);
}
