import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  campaigns,
  consentRecords,
  customers,
  db,
  offers,
  orders,
  restaurants,
  rewardClaims,
} from "@damigos/db";
import {
  extractFoodHeroFromBrief,
  generatePosterSpec,
  localPosterSpec,
} from "../lib/ai/generate-poster-spec.js";
import type { PosterSpec } from "../lib/ai/generate-poster-spec.js";
import { resolveMenuItemImageUrl } from "../lib/menu-item-thumb.js";
import { parseBrandKit } from "../lib/ai/brand-kit.js";
import { aiTextConfigured } from "../lib/ai/ai-text.js";
import { hiveGenerateImage } from "../lib/ai/hive-client.js";
import {
  fetchImageAsDataUrl,
  pickPosterTypography,
  renderPosterSvgDataUrl,
} from "../lib/ai/render-poster-image.js";
import { randomUUID } from "node:crypto";
import { isPlausibleRestaurantDisplayName, posterAiMode, posterImageProvider } from "@damigos/domain";
import { approvePosterJob, createPosterJob, getPosterJob, type PosterJob } from "../lib/poster-jobs.js";
import {
  createCampaignRecord,
  dispatchCampaignMock,
  getCampaignById,
  kapsoMode,
  listCampaignsForRestaurant,
  markCampaignScheduled,
  previewCampaignAudience,
} from "../lib/campaign-queue.js";
import { enforceRestaurantScope, requireRoles } from "../lib/require-staff.js";
import { debitForCampaign, WHATSAPP_MSG_COST_PAISE } from "../lib/wallet.js";
import { ensureGrowSchema } from "../lib/ensure-grow-schema.js";
import { ensureKitchenSchema } from "../lib/ensure-kitchen-schema.js";
import {
  configToOffersRows,
  growLoyaltyConfigSchema,
  MIN_ORDER_OPTIONS,
  OFFER_PRESETS,
  parseGrowLoyaltyConfig,
  validateSpinWeights,
} from "../lib/grow-loyalty-config.js";
import {
  GROW_CAMPAIGN_PROGRAM_CATALOG,
  listCampaignProgramsForRestaurant,
  setCampaignProgramEnabled,
  type CampaignProgramId,
} from "../lib/grow-campaign-programs.js";

const APPROVED_TEMPLATES = [
  { key: "weekend_special", label: "Weekend special (utility)" },
  { key: "poster_status_blast", label: "Poster + status image (from AI studio)" },
  { key: "new_menu_drop", label: "New menu drop" },
  { key: "winback_7d", label: "Win-back — 7 days idle" },
] as const;

/** C-04 — Grow (campaigns persisted + mock Kapso queue) */
export async function registerGrowRoutes(app: FastifyInstance) {
  const staffGrow = requireRoles("RESTAURANT_OWNER", "STAFF", "PLATFORM_ADMIN");
  const staffOwner = requireRoles("RESTAURANT_OWNER", "PLATFORM_ADMIN");

  const programIds = GROW_CAMPAIGN_PROGRAM_CATALOG.map((p) => p.id) as [
    CampaignProgramId,
    ...CampaignProgramId[],
  ];

  async function readGrowConfigRaw(restaurantId: string): Promise<string | null> {
    await ensureGrowSchema();
    try {
      const [restaurant] = await db
        .select({ growLoyaltyConfig: restaurants.growLoyaltyConfig })
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1);
      return restaurant?.growLoyaltyConfig ?? null;
    } catch (err) {
      app.log.warn({ err, restaurantId }, "grow_loyalty_config read failed — using defaults");
      return null;
    }
  }

  async function writeGrowConfig(restaurantId: string, config: ReturnType<typeof parseGrowLoyaltyConfig>) {
    await ensureGrowSchema();
    await db
      .update(restaurants)
      .set({ growLoyaltyConfig: JSON.stringify(config) })
      .where(eq(restaurants.id, restaurantId));
  }

  async function loadOffersGamePayload(restaurantId: string) {
    const configRaw = await readGrowConfigRaw(restaurantId);
    const config = parseGrowLoyaltyConfig(configRaw);
    const { ok, weightSum } = validateSpinWeights(config);

    const rows = await db
      .select()
      .from(offers)
      .where(and(eq(offers.restaurantId, restaurantId), eq(offers.active, true)));

    const segments =
      rows.length > 0
        ? rows.map((o) => ({
            offerId: o.id,
            title: o.title,
            weight: o.weight,
            prizeType: o.prizeType,
            prizeValue: o.prizeValue,
          }))
        : config.spinSegments.map((s) => ({
            offerId: s.localId,
            title: s.title,
            weight: s.weight,
            prizeType: s.prizeType,
            prizeValue: s.prizeValue,
          }));

    return {
      config,
      presets: OFFER_PRESETS,
      minOrderOptions: MIN_ORDER_OPTIONS,
      dailySpinLimit: config.dailySpinLimit,
      spinEnabled: (config.spinEnabled !== false) && config.engineEnabled,
      scratchEnabled: config.scratchEnabled && config.engineEnabled,
      segments,
      weightSum,
      weightsValid: ok,
    };
  }

  app.get("/grow/offers-game", { preHandler: staffGrow }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    return loadOffersGamePayload(query.restaurantId);
  });

  app.put("/grow/offers-game", { preHandler: staffOwner }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        config: growLoyaltyConfigSchema,
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const { ok } = validateSpinWeights(body.config);
    if (!ok) {
      return reply.status(400).send({
        error: {
          code: "INVALID_WEIGHTS",
          message: "Spin wheel weights must sum to more than zero",
          correlationId: request.id,
        },
      });
    }

    await writeGrowConfig(body.restaurantId, body.config);
    await ensureKitchenSchema();

    await db
      .update(offers)
      .set({ active: false })
      .where(eq(offers.restaurantId, body.restaurantId));

    const rows = configToOffersRows(body.restaurantId, body.config);
    if (rows.length > 0) {
      await db.insert(offers).values(rows);
    }

    return loadOffersGamePayload(body.restaurantId);
  });

  app.get("/grow/campaign-programs", { preHandler: staffGrow }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    const config = parseGrowLoyaltyConfig(await readGrowConfigRaw(query.restaurantId));
    return {
      programs: listCampaignProgramsForRestaurant(config),
      enabledCount: listCampaignProgramsForRestaurant(config).filter((p) => p.enabled).length,
    };
  });

  app.patch("/grow/campaign-programs/:programId", { preHandler: staffOwner }, async (request, reply) => {
    const params = z.object({ programId: z.enum(programIds) }).parse(request.params);
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        enabled: z.boolean(),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const config = parseGrowLoyaltyConfig(await readGrowConfigRaw(body.restaurantId));
    const next = setCampaignProgramEnabled(config, params.programId, body.enabled);
    await writeGrowConfig(body.restaurantId, next);

    return {
      programId: params.programId,
      enabled: body.enabled,
      programs: listCampaignProgramsForRestaurant(next),
    };
  });

  app.get("/customers", { preHandler: staffGrow }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    const rows = await db
      .select({
        id: customers.id,
        phoneLast4: customers.phoneLast4,
        name: customers.name,
        lastOrderAt: sql<string>`max(${orders.createdAt})`.as("last_order_at"),
        orderCount: sql<number>`count(${orders.id})::int`.as("order_count"),
      })
      .from(customers)
      .innerJoin(orders, eq(orders.customerId, customers.id))
      .where(eq(orders.restaurantId, query.restaurantId))
      .groupBy(customers.id, customers.phoneLast4, customers.name)
      .orderBy(desc(sql`max(${orders.createdAt})`));

    const withOptIn = await Promise.all(
      rows.map(async (r) => {
        const [consent] = await db
          .select({ granted: consentRecords.granted })
          .from(consentRecords)
          .where(and(eq(consentRecords.customerId, r.id), eq(consentRecords.kind, "marketing")))
          .orderBy(desc(consentRecords.createdAt))
          .limit(1);
        return {
          id: r.id,
          phoneMasked: r.phoneLast4 ? `******${r.phoneLast4}` : "******",
          name: r.name,
          lastOrderAt: r.lastOrderAt,
          orderCount: r.orderCount,
          marketingOptIn: consent ? consent.granted : null,
          creditsPaise: 0,
        };
      }),
    );

    return { customers: withOptIn };
  });

  app.get("/customers/:id", { preHandler: staffGrow }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    const [customer] = await db.select().from(customers).where(eq(customers.id, params.id)).limit(1);
    if (!customer) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Customer not found", correlationId: request.id },
      });
    }

    const recentOrders = await db
      .select({
        id: orders.id,
        status: orders.status,
        totalPaise: orders.totalPaise,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(and(eq(orders.customerId, params.id), eq(orders.restaurantId, query.restaurantId)))
      .orderBy(desc(orders.createdAt))
      .limit(8);

    if (recentOrders.length === 0) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "No orders for this guest at your kitchen",
          correlationId: request.id,
        },
      });
    }

    async function latestConsent(kind: "marketing" | "game") {
      const [row] = await db
        .select({ granted: consentRecords.granted })
        .from(consentRecords)
        .where(and(eq(consentRecords.customerId, params.id), eq(consentRecords.kind, kind)))
        .orderBy(desc(consentRecords.createdAt))
        .limit(1);
      return row?.granted ?? null;
    }

    const [{ count: activeClaims }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rewardClaims)
      .where(
        and(
          eq(rewardClaims.customerId, params.id),
          eq(rewardClaims.restaurantId, query.restaurantId),
          sql`${rewardClaims.redeemedOrderId} is null`,
        ),
      );

    const [{ count: orderCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.customerId, params.id), eq(orders.restaurantId, query.restaurantId)));

    return {
      customer: {
        id: customer.id,
        phoneMasked: customer.phoneLast4 ? `******${customer.phoneLast4}` : "******",
        name: customer.name,
        orderCount: orderCount ?? 0,
        marketingOptIn: await latestConsent("marketing"),
        gameOptIn: await latestConsent("game"),
        activeRewardClaims: activeClaims ?? 0,
        creditsPaise: 0,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        status: o.status,
        totalPaise: o.totalPaise,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  });

  app.get("/campaigns/templates", { preHandler: staffGrow }, async () => {
    return { templates: APPROVED_TEMPLATES };
  });

  app.get("/campaigns/audience-preview", { preHandler: staffGrow }, async (request, reply) => {
    const query = z
      .object({
        restaurantId: z.string().uuid(),
        audience: z.enum(["all", "marketing_opt_in"]).default("all"),
      })
      .parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    return previewCampaignAudience(query.restaurantId, query.audience);
  });

  app.get("/campaigns", { preHandler: staffGrow }, async (request, reply) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    const campaigns = await listCampaignsForRestaurant(query.restaurantId);
    return { campaigns };
  });

  app.post("/campaigns", { preHandler: staffGrow }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        name: z.string().min(1).max(120),
        audience: z.enum(["all", "marketing_opt_in"]).default("all"),
        templateKey: z.string().optional(),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const campaign = await createCampaignRecord(body);
    return { campaign };
  });

  app.post("/campaigns/:id/schedule", { preHandler: staffGrow }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const existing = await getCampaignById(params.id, body.restaurantId);
    if (!existing) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Campaign not found", correlationId: request.id },
      });
    }

    const scheduled = await markCampaignScheduled(
      params.id,
      body.restaurantId,
      new Date(body.scheduledAt),
    );
    if (!scheduled) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Campaign not found", correlationId: request.id },
      });
    }

    const estimatedCost = scheduled.estimatedRecipients * WHATSAPP_MSG_COST_PAISE;
    const debit = await debitForCampaign({
      restaurantId: body.restaurantId,
      campaignId: scheduled.id,
      amountPaise: estimatedCost,
    });
    if (!debit.ok) {
      await db
        .update(campaigns)
        .set({ status: "Draft", scheduledAt: null })
        .where(eq(campaigns.id, scheduled.id));
      return reply.status(402).send({
        error: {
          code: "INSUFFICIENT_WALLET",
          message: "Top up wallet before scheduling broadcasts",
          correlationId: request.id,
          details: { balancePaise: debit.balancePaise, estimatedCostPaise: estimatedCost },
        },
      });
    }

    return { campaign: scheduled };
  });

  app.post("/campaigns/:id/dispatch", { preHandler: staffOwner }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ restaurantId: z.string().uuid() }).parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    if (kapsoMode() === "off") {
      return reply.status(503).send({
        error: {
          code: "KAPSO_DISABLED",
          message: "Set KAPSO_MODE=mock or live to dispatch",
          correlationId: request.id,
        },
      });
    }

    const result = await dispatchCampaignMock(params.id, body.restaurantId);
    if (!result.ok) {
      return reply.status(400).send({
        error: { code: "DISPATCH_FAILED", message: result.reason, correlationId: request.id },
      });
    }

    return { sent: result.sent, campaign: result.campaign };
  });

  /** C-04.07 — poster copilot (mock text or live DeepSeek + SVG preview) */
  app.post("/grow/poster/generate", { preHandler: staffGrow }, async (request, reply) => {
    const body = z
      .object({
        restaurantId: z.string().uuid(),
        headline: z.string().min(1).max(80),
        offerLine: z.string().min(1).max(120),
      })
      .parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const [restaurant] = await db
      .select({ name: restaurants.name, brandKit: restaurants.brandKit })
      .from(restaurants)
      .where(eq(restaurants.id, body.restaurantId))
      .limit(1);
    if (!restaurant) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Restaurant not found", correlationId: request.id },
      });
    }

    const brand = parseBrandKit(restaurant.brandKit ?? null);
    const restaurantName =
      brand && isPlausibleRestaurantDisplayName(brand.displayName)
        ? brand.displayName
        : restaurant.name;
    const posterMode = posterAiMode();
    let spec: PosterSpec;
    let previewSource: PosterJob["previewSource"] = "local";
    let previewNote: string | undefined;

    if (posterMode === "live" && aiTextConfigured()) {
      try {
        spec = await generatePosterSpec({
          headline: body.headline,
          offerLine: body.offerLine,
          restaurantName,
          brand,
        });
        previewSource = "deepseek";
      } catch (err) {
        request.log.warn({ err }, "poster AI text failed — local SVG layout");
        previewNote =
          err instanceof Error
            ? `AI copy unavailable (${err.message}). Check HIVE_API_KEY / AI_TEXT_PROVIDER — see docs/architecture/HIVE-AI.md`
            : "AI copy unavailable — showing branded layout.";
        spec = localPosterSpec({
          headline: body.headline,
          offerLine: body.offerLine,
          restaurantName,
          brand,
        });
      }
    } else {
      if (posterMode === "live" && !aiTextConfigured()) {
        previewNote =
          "Set HIVE_API_KEY (or DEEPSEEK_API_KEY) and AI_TEXT_PROVIDER in damigos_main/.env — restart CRM API (4001).";
      }
      spec = localPosterSpec({
        headline: body.headline,
        offerLine: body.offerLine,
        restaurantName,
        brand,
      });
    }

    const theme: PosterJob["theme"] = {
      primaryColor: spec.primaryColor,
      backgroundColor: spec.backgroundColor,
      accentColor: spec.accentColor,
      layoutHint: spec.layoutHint,
      foodHeroLine: spec.foodHeroLine,
      imageMood: spec.imageMood,
    };

    const typographySeed = `${body.restaurantId}-${randomUUID()}`;
    const typography = pickPosterTypography(typographySeed);
    const renderOpts = { typography, typographySeed };

    const imageProvider = posterImageProvider();
    let previewImageDataUrl: string | undefined;
    let previewImageUrl: string | undefined;

    // Always derive dish from headline (ignore AI £ prices / weak heroes) so Flux + stock match the brief.
    const brandDish = brand?.dishes?.[0]?.name?.replace(/\s*[£$€₹]\s*[\d,.]+/g, "").trim();
    const brandPrimary = brand?.primaryColor ?? "#B7122A";
    const brandBg = brand?.backgroundColor ?? "#FCF9F8";
    const brandAccent = brand?.accentColor ?? "#775600";
    spec = {
      ...spec,
      foodHeroLine: extractFoodHeroFromBrief(body.headline, brandDish),
      subline: `Scan packaging QR · Order on ${restaurantName}`,
      headline: body.headline.trim() || spec.headline,
      offerLine: body.offerLine.trim() || spec.offerLine,
      // Keep brand red CTA — AI sometimes returns near-black which looks like a “fake” poster.
      primaryColor: brandPrimary,
      backgroundColor: brandBg,
      accentColor: brandAccent,
    };

    request.log.info(
      {
        posterMode,
        imageProvider,
        restaurantName,
        headline: body.headline,
        foodHeroLine: spec.foodHeroLine,
      },
      "poster generate",
    );

    if (imageProvider === "hive") {
      try {
        const prompt = [
          "Photorealistic hero food photograph for a restaurant WhatsApp poster background.",
          `Restaurant brand context: ${restaurantName}.`,
          `The plated dish MUST match this offer: "${spec.headline}".`,
          `${spec.foodHeroLine}.`,
          `Photography: ${spec.imageMood}.`,
          "Indian restaurant food styling, appetizing, shallow depth of field, warm lighting, steam if hot.",
          "Fill the frame with food. No text, no logos, no watermarks, no people, no hands, no menus.",
        ].join(" ");
        previewImageUrl = (await hiveGenerateImage({ prompt, width: 1024, height: 1024 })) ?? undefined;
        if (!previewImageUrl) {
          previewNote =
            (previewNote ? `${previewNote} ` : "") +
            "Hive returned no image URL — using dish-matched stock photo under copy.";
          request.log.warn({ prompt: prompt.slice(0, 200) }, "Hive poster image empty");
        } else {
          previewSource = "hive";
          const bgData = await fetchImageAsDataUrl(previewImageUrl);
          previewImageDataUrl = renderPosterSvgDataUrl(spec, restaurantName, {
            ...renderOpts,
            backgroundDataUrl: bgData ?? undefined,
            backgroundImageUrl: bgData ? undefined : previewImageUrl,
          });
        }
      } catch (err) {
        request.log.warn({ err }, "Hive poster image failed");
        previewNote =
          (previewNote ? `${previewNote} ` : "") +
          (err instanceof Error ? err.message : "Hive image generation failed") +
          " — using dish-matched stock photo.";
      }
    } else if (imageProvider === "svg") {
      previewNote =
        (previewNote ? `${previewNote} ` : "") +
        "POSTER_IMAGE_PROVIDER=svg (set hive + HIVE_API_KEY for Flux photos). Using dish-matched stock under copy.";
    }

    // Catalog / keyword food photo so we never show the empty “Visual mood” gradient card.
    if (!previewImageDataUrl && imageProvider !== "none") {
      const dishQuery = `${spec.foodHeroLine} ${spec.headline}`.replace(/^Hero:\s*/i, "");
      const vegGuess = !/\b(chicken|mutton|lamb|fish|prawn|egg|non[\s-]?veg)\b/i.test(dishQuery);
      const stockUrl = resolveMenuItemImageUrl(dishQuery, spec.offerLine, vegGuess);
      const bgData = await fetchImageAsDataUrl(stockUrl);
      previewImageDataUrl = renderPosterSvgDataUrl(spec, restaurantName, {
        ...renderOpts,
        backgroundDataUrl: bgData ?? undefined,
        backgroundImageUrl: bgData ? undefined : stockUrl,
      });
      if (previewSource !== "hive") previewSource = "local";
      request.log.info({ stockUrl: stockUrl.slice(0, 80), dishQuery }, "poster stock food background");
    }

    const job = createPosterJob({
      restaurantId: body.restaurantId,
      headline: spec.headline,
      offerLine: spec.offerLine,
      restaurantName,
      subline: spec.subline,
      theme: { ...theme, typographyId: typography.id },
      previewImageDataUrl,
      previewImageUrl,
      previewSource,
      previewNote,
      typographyId: typography.id,
    });
    return { poster: job };
  });

  app.post("/grow/poster/:id/approve", { preHandler: staffOwner }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = z.object({ restaurantId: z.string().uuid() }).parse(request.body);

    await enforceRestaurantScope(request, reply, body.restaurantId);
    if (reply.sent) return;

    const job = approvePosterJob(params.id, body.restaurantId);
    if (!job) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Poster draft not found", correlationId: request.id },
      });
    }
    return { poster: job };
  });

  app.get("/grow/poster/:id", { preHandler: staffGrow }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);

    await enforceRestaurantScope(request, reply, query.restaurantId);
    if (reply.sent) return;

    const job = getPosterJob(params.id, query.restaurantId);
    if (!job) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Poster not found", correlationId: request.id },
      });
    }
    return { poster: job };
  });
}
