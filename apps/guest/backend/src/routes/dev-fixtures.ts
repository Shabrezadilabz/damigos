import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  campaigns,
  db,
  orders,
  restaurants,
  stickerBatches,
  stickerTokens,
} from "@damigos/db";

/** Non-prod only — E2E / local tooling */
export async function registerDevFixtureRoutes(app: FastifyInstance) {
  if (process.env.ENABLE_DEV_FIXTURES !== "true") return;

  app.get("/dev/e2e-fixtures", async (_request, reply) => {
    const [r] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, "biryani-box-koramangala"))
      .limit(1);

    if (!r) {
      return reply.status(503).send({
        error: { code: "SEED_REQUIRED", message: "Run npm run db:seed" },
      });
    }

    const [batch] = await db
      .select()
      .from(stickerBatches)
      .where(eq(stickerBatches.batchCode, "DEV-BATCH-001"))
      .limit(1);

    const batchTokens = batch
      ? await db.select().from(stickerTokens).where(eq(stickerTokens.batchId, batch.id)).limit(3)
      : [];
    const token = batchTokens[0];

    const [expiredBatch] = await db
      .select()
      .from(stickerBatches)
      .where(eq(stickerBatches.batchCode, "DEV-BATCH-EXPIRED"))
      .limit(1);
    const [expiredToken] = expiredBatch
      ? await db
          .select()
          .from(stickerTokens)
          .where(eq(stickerTokens.batchId, expiredBatch.id))
          .limit(1)
      : [];

    const [revokedBatch] = await db
      .select()
      .from(stickerBatches)
      .where(eq(stickerBatches.batchCode, "DEV-BATCH-REVOKED"))
      .limit(1);
    const [revokedToken] = revokedBatch
      ? await db
          .select()
          .from(stickerTokens)
          .where(eq(stickerTokens.batchId, revokedBatch.id))
          .limit(1)
      : [];

    const [pausedR] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, "cloud-kitchen-paused-demo"))
      .limit(1);

    const [hub2] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, "masala-trail-indiranagar"))
      .limit(1);

    return {
      restaurantId: r.id,
      restaurantSlug: r.slug,
      sampleScanToken: token?.publicToken ?? null,
      alternateScanToken: batchTokens[1]?.publicToken ?? null,
      scanPath: token ? `/s/${token.publicToken}` : null,
      expiredScanToken: expiredToken?.publicToken ?? null,
      revokedScanToken: revokedToken?.publicToken ?? null,
      pausedRestaurantId: pausedR?.id ?? null,
      hubSecondRestaurantId: hub2?.id ?? null,
      hubSecondRestaurantName: hub2?.name ?? null,
      devGuestPhone: process.env.DEV_GUEST_PHONE ?? "9123456780",
      devOwnerPhone: process.env.DEV_OWNER_PHONE ?? "9876543210",
      otpBypass: process.env.OTP_BYPASS_CODE ?? "000000",
    };
  });

  app.get("/dev/ui-demo", async (_request, reply) => {
    const [r] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.slug, "biryani-box-koramangala"))
      .limit(1);
    if (!r) {
      return reply.status(503).send({
        error: { code: "SEED_REQUIRED", message: "Run npm run db:seed" },
      });
    }

    const [batch] = await db
      .select()
      .from(stickerBatches)
      .where(eq(stickerBatches.batchCode, "DEV-BATCH-001"))
      .limit(1);
    const [token] = batch
      ? await db.select().from(stickerTokens).where(eq(stickerTokens.batchId, batch.id)).limit(1)
      : [];

    const [uiCampaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.restaurantId, r.id), eq(campaigns.name, "DEV-UI-WEEKEND-BLAST")))
      .limit(1);

    const [trackOrder] = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.restaurantId, r.id), eq(orders.status, "DISPATCHED")))
      .orderBy(desc(orders.createdAt))
      .limit(1);

    const guestPhone = process.env.DEV_GUEST_PHONE ?? "9123456780";
    const ownerPhone = process.env.DEV_OWNER_PHONE ?? "9876543210";
    const otp = process.env.OTP_BYPASS_CODE ?? "000000";

    return {
      seeded: Boolean(uiCampaign),
      restaurantId: r.id,
      restaurantName: r.name,
      scanPath: token ? `/s/${token.publicToken}` : null,
      guest: {
        phone: guestPhone,
        otp,
        profileName: "Priya Sharma",
        phonesAlt: ["9123456790", "9123456791"],
      },
      crmOwner: { phone: ownerPhone, otp, loginPath: "/start" },
      guestUrls: {
        hub: "/hub",
        orders: "/orders",
        menu: `/r/${r.id}/menu`,
        trackOrder: trackOrder ? `/orders/${trackOrder.id}` : null,
      },
      stitchMap: "docs/design/STITCH-SCREEN-MAP.md",
      doc: "docs/UI-DEMO-ACCOUNTS.md",
    };
  });

  /** Run Spark claim-without-order nudges once (E2E / local). */
  app.post("/dev/spark-claim-nudges", async () => {
    const { processClaimOrderNudges } = await import("../lib/claim-order-nudge.js");
    const prev = process.env.SPARK_CLAIM_NUDGE_MINUTES;
    process.env.SPARK_CLAIM_NUDGE_MINUTES = "0";
    try {
      return await processClaimOrderNudges(50);
    } finally {
      if (prev === undefined) delete process.env.SPARK_CLAIM_NUDGE_MINUTES;
      else process.env.SPARK_CLAIM_NUDGE_MINUTES = prev;
    }
  });

  /** Idempotent UI demo pack — same as `npm run db:seed` (Neon / Vercel testing). */
  app.post("/dev/reseed", async (request, reply) => {
    try {
      const { runAppSeed } = await import("@damigos/db/seed-app");
      const summary = await runAppSeed();
      return { ok: true, summary };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({
        error: {
          code: "SEED_FAILED",
          message: err instanceof Error ? err.message : "Seed failed",
        },
      });
    }
  });
}
