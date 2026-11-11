import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { campaigns, db, orders, restaurants } from "@damigos/db";
import { createAndDispatchAutoProgramCampaign, kapsoMode } from "./campaign-queue.js";
import {
  GROW_CAMPAIGN_PROGRAM_CATALOG,
  getCampaignProgramEnabled,
  isAutoDispatchProgram,
  type AutoDispatchProgramId,
} from "./grow-campaign-programs.js";
import { parseGrowLoyaltyConfig } from "./grow-loyalty-config.js";

/**
 * S2.3 — auto-dispatch for enabled Grow campaign programs (checkbox programs).
 *
 * - Runs on an interval (see startGrowProgramScheduler) or on demand (owner "run due" / cron secret route).
 * - Only kitchens with a SAVED grow config and hub-listed; marketing opt-in only; 7-day cap + wallet floor apply.
 * - Idempotent per period: each run creates one campaign whose name carries a run key, checked before creating.
 * - AI poster is NOT part of this — poster blasts remain manual (Approve → Send via Campaigns).
 */

const ACTIVE_ORDER_STATUSES = [
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CLOSED",
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
/** IST hours (inclusive start, exclusive end) when auto WhatsApp sends are allowed */
const SEND_WINDOW_IST = { startHour: 10, endHour: 21 };

type IstParts = {
  date: string; // YYYY-MM-DD
  ym: string; // YYYY-MM
  day: number;
  dow: number; // 0=Sun … 6=Sat
  hour: number;
  daysInMonth: number;
};

export function istParts(now: Date): IstParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    ym: `${parts.year}-${parts.month}`,
    day,
    dow: dowMap[String(parts.weekday)] ?? 0,
    hour: Number(parts.hour) % 24,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

function shiftDate(isoDate: string, deltaDays: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function festivalDates(): Set<string> {
  return new Set(
    (process.env.GROW_FESTIVAL_DATES ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export type DueProgramRun = {
  programId: AutoDispatchProgramId;
  /** Stable per-period key — embedded in campaign name for idempotency */
  runKey: string;
  lapsed?: { minDays: number; maxDays: number };
};

/** Which auto programs are due right now (pure; exported for tests). */
export function dueProgramRuns(
  enabledIds: Iterable<string>,
  now: Date,
  festivals: Set<string> = festivalDates(),
): DueProgramRun[] {
  const t = istParts(now);
  const mondayOfWeek = shiftDate(t.date, -((t.dow + 6) % 7));
  const out: DueProgramRun[] = [];
  for (const id of enabledIds) {
    if (!isAutoDispatchProgram(id)) continue;
    switch (id) {
      case "weekend":
        // Fri (5) is the single trigger day so one blast per weekend; allow Sat/Sun catch-up
        if (t.dow === 5 || t.dow === 6 || t.dow === 0) {
          const friday = shiftDate(t.date, t.dow === 5 ? 0 : t.dow === 6 ? -1 : -2);
          out.push({ programId: id, runKey: `weekend:${friday}` });
        }
        break;
      case "monthend":
        if (t.day >= t.daysInMonth - 2) out.push({ programId: id, runKey: `monthend:${t.ym}` });
        break;
      case "festivals":
        if (festivals.has(t.date)) out.push({ programId: id, runKey: `festivals:${t.date}` });
        break;
      case "winback_15":
        out.push({
          programId: id,
          runKey: `winback_15:${mondayOfWeek}`,
          lapsed: { minDays: 15, maxDays: 29 },
        });
        break;
      case "winback_30":
        out.push({
          programId: id,
          runKey: `winback_30:${mondayOfWeek}`,
          lapsed: { minDays: 30, maxDays: 60 },
        });
        break;
      default:
        break;
    }
  }
  return out;
}

export function autoCampaignName(programId: AutoDispatchProgramId, runKey: string): string {
  const title = GROW_CAMPAIGN_PROGRAM_CATALOG.find((p) => p.id === programId)?.title ?? programId;
  return `[auto:${runKey}] ${title}`.slice(0, 120);
}

async function lapsedCustomerIds(
  restaurantId: string,
  now: Date,
  range: { minDays: number; maxDays: number },
): Promise<string[]> {
  const rows = await db
    .select({
      customerId: orders.customerId,
      lastOrderAt: sql<Date>`max(${orders.createdAt})`,
    })
    .from(orders)
    .where(
      and(eq(orders.restaurantId, restaurantId), inArray(orders.status, [...ACTIVE_ORDER_STATUSES])),
    )
    .groupBy(orders.customerId);
  return rows
    .filter((r) => {
      const ageDays = (now.getTime() - new Date(r.lastOrderAt).getTime()) / DAY_MS;
      return ageDays >= range.minDays && ageDays < range.maxDays + 1;
    })
    .map((r) => r.customerId);
}

export type ProgramRunSummary = {
  restaurantsChecked: number;
  campaignsCreated: number;
  messagesSent: number;
  walletBlocked: number;
  skipped: string[];
};

/**
 * Evaluate every enabled auto program for hub-listed kitchens (or one kitchen) and dispatch the due ones.
 * `ignoreSendWindow` is for manual owner/cron runs.
 */
export async function processEnabledCampaignPrograms(
  opts: { now?: Date; restaurantId?: string; ignoreSendWindow?: boolean } = {},
): Promise<ProgramRunSummary> {
  const now = opts.now ?? new Date();
  const summary: ProgramRunSummary = {
    restaurantsChecked: 0,
    campaignsCreated: 0,
    messagesSent: 0,
    walletBlocked: 0,
    skipped: [],
  };

  if (kapsoMode() === "off") {
    summary.skipped.push("kapso_off");
    return summary;
  }
  const hour = istParts(now).hour;
  if (
    !opts.ignoreSendWindow &&
    (hour < SEND_WINDOW_IST.startHour || hour >= SEND_WINDOW_IST.endHour)
  ) {
    summary.skipped.push("outside_send_window");
    return summary;
  }

  const kitchens = await db
    .select({ id: restaurants.id, growLoyaltyConfig: restaurants.growLoyaltyConfig })
    .from(restaurants)
    .where(
      and(
        eq(restaurants.hubListed, true),
        // Only kitchens whose owner has saved Grow settings — never auto-send on pure defaults
        isNotNull(restaurants.growLoyaltyConfig),
        ...(opts.restaurantId ? [eq(restaurants.id, opts.restaurantId)] : []),
      ),
    );

  for (const kitchen of kitchens) {
    summary.restaurantsChecked += 1;
    const config = parseGrowLoyaltyConfig(kitchen.growLoyaltyConfig);
    const enabled = GROW_CAMPAIGN_PROGRAM_CATALOG.filter((p) =>
      getCampaignProgramEnabled(config, p.id),
    ).map((p) => p.id);

    for (const run of dueProgramRuns(enabled, now)) {
      const name = autoCampaignName(run.programId, run.runKey);
      const [existing] = await db
        .select({ id: campaigns.id })
        .from(campaigns)
        .where(and(eq(campaigns.restaurantId, kitchen.id), eq(campaigns.name, name)))
        .limit(1);
      if (existing) continue; // already ran (or wallet-blocked draft awaiting owner) this period

      const catalogEntry = GROW_CAMPAIGN_PROGRAM_CATALOG.find((p) => p.id === run.programId);
      const templateKey = catalogEntry?.templateKey;
      // Hard guard: posters are manual-only; programs without a template are in-app games
      if (!templateKey || (templateKey as string) === "poster_status_blast") continue;

      const customerIds = run.lapsed
        ? await lapsedCustomerIds(kitchen.id, now, run.lapsed)
        : undefined;

      const result = await createAndDispatchAutoProgramCampaign({
        restaurantId: kitchen.id,
        name,
        templateKey,
        customerIds,
      });
      if (result.status === "kapso_off") break;
      summary.campaignsCreated += result.campaignId ? 1 : 0;
      if (result.status === "dispatched") summary.messagesSent += result.sent;
      if (result.status === "wallet_blocked") summary.walletBlocked += 1;
    }
  }

  return summary;
}

export function startGrowProgramScheduler(app: FastifyInstance) {
  if (process.env.GROW_PROGRAM_SCHEDULER_ENABLED !== "true") {
    app.log.info("Grow program scheduler disabled (set GROW_PROGRAM_SCHEDULER_ENABLED=true)");
    return;
  }

  const intervalMs = Number(process.env.GROW_PROGRAM_SCHEDULER_INTERVAL_MS ?? 15 * 60_000);
  app.log.info({ intervalMs }, "Grow program scheduler started");

  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    void processEnabledCampaignPrograms()
      .then((s) => {
        if (s.campaignsCreated > 0) app.log.info(s, "Grow auto-programs dispatched");
      })
      .catch((err) => app.log.error(err, "Grow program scheduler tick failed"))
      .finally(() => {
        running = false;
      });
  };

  tick();
  setInterval(tick, intervalMs);
}
