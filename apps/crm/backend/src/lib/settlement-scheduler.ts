import type { FastifyInstance } from "fastify";
import { istBusinessDate, runEodSettlementsForPreviousDay } from "./settlement.js";

/**
 * After midnight IST (post 12:00 AM), settle previous business day.
 * Tick every SETTLEMENT_SCHEDULER_INTERVAL_MS; run once per IST date.
 */
export function startSettlementScheduler(app: FastifyInstance) {
  if (process.env.SETTLEMENT_SCHEDULER_ENABLED !== "true") {
    app.log.info("Settlement scheduler disabled (set SETTLEMENT_SCHEDULER_ENABLED=true)");
    return;
  }

  const intervalMs = Number(process.env.SETTLEMENT_SCHEDULER_INTERVAL_MS ?? 60_000);
  let lastRunBusinessDate: string | null = null;

  app.log.info({ intervalMs }, "Settlement scheduler started (IST EOD after midnight)");

  const tick = () => {
    const now = new Date();
    const hourIst = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        hour12: false,
      }).format(now),
    );
    // Run only after 00:05 IST so prior day is complete
    if (hourIst === 0) {
      const minute = Number(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Kolkata",
          minute: "numeric",
        }).format(now),
      );
      if (minute < 5) return;
    } else if (hourIst > 6) {
      // Still allow catch-up once per calendar day if process started late
    }

    const todayIst = istBusinessDate(now);
    if (lastRunBusinessDate === todayIst) return;

    void runEodSettlementsForPreviousDay(now)
      .then((r) => {
        lastRunBusinessDate = todayIst;
        app.log.info(
          { businessDate: r.businessDate, settled: r.settled },
          "EOD restaurant settlements processed",
        );
      })
      .catch((err) => app.log.error(err, "Settlement scheduler tick failed"));
  };

  tick();
  setInterval(tick, intervalMs);
}
