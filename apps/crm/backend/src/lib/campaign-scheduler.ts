import { and, eq, lte } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { campaigns, db } from "@damigos/db";
import { dispatchCampaignMock, kapsoMode } from "./campaign-queue.js";

/** P1-T07 — dispatch campaigns when scheduledAt passes (7-day cap enforced in queue). */
export async function processDueScheduledCampaigns(): Promise<number> {
  if (kapsoMode() === "off") return 0;

  const due = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.status, "Scheduled"), lte(campaigns.scheduledAt, new Date())));

  let dispatched = 0;
  for (const row of due) {
    const result = await dispatchCampaignMock(row.id, row.restaurantId);
    if (result.ok) dispatched += 1;
  }
  return dispatched;
}

export function startCampaignScheduler(app: FastifyInstance) {
  if (process.env.CAMPAIGN_SCHEDULER_ENABLED !== "true") {
    app.log.info("Campaign scheduler disabled (set CAMPAIGN_SCHEDULER_ENABLED=true)");
    return;
  }

  const intervalMs = Number(process.env.CAMPAIGN_SCHEDULER_INTERVAL_MS ?? 15_000);
  app.log.info({ intervalMs }, "Campaign scheduler started");

  const tick = () => {
    void processDueScheduledCampaigns()
      .then((n) => {
        if (n > 0) app.log.info({ dispatched: n }, "Scheduled campaigns sent");
      })
      .catch((err) => app.log.error(err, "Campaign scheduler tick failed"));
  };

  tick();
  setInterval(tick, intervalMs);
}
