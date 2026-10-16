import { and, desc, eq, isNull } from "drizzle-orm";

import type { FastifyInstance } from "fastify";

import { z } from "zod";

import {

  consentRecords,

  db,

  offers,

  restaurants,

  rewardClaims,

  rewardPlays,

  scanEvents,

} from "@damigos/db";

import { bearerToken, verifyGuestToken } from "@damigos/auth";
import { pickWeightedOffer } from "../lib/pick-weighted-offer.js";
import { countDailyRewardPlays, dailySpinLimit } from "../lib/rewards-limits.js";
import { requireGuest } from "../lib/require-guest.js";

/** Unredeemed claimed offers for checkout (G-04) */



function formatPrize(offer: {

  title: string;

  description: string | null;

  prizeType: string;

  prizeValue: number;

  terms: string | null;

  expiresDays: number;

}) {

  return {

    title: offer.title,

    description: offer.description,

    prizeType: offer.prizeType,

    prizeValue: offer.prizeValue,

    terms: offer.terms,

    expiresDays: offer.expiresDays,

  };

}



/** G-01.04–07 rewards engine (P1) */

export async function registerRewardsRoutes(app: FastifyInstance) {
  app.get("/me/reward-claims", { preHandler: requireGuest }, async (request) => {
    const query = z.object({ restaurantId: z.string().uuid() }).parse(request.query);
    const customerId = request.guest!.sub!;

    const rows = await db
      .select({ claim: rewardClaims, offer: offers })
      .from(rewardClaims)
      .innerJoin(offers, eq(rewardClaims.offerId, offers.id))
      .where(
        and(
          eq(rewardClaims.customerId, customerId),
          eq(rewardClaims.restaurantId, query.restaurantId),
          isNull(rewardClaims.redeemedOrderId),
        ),
      )
      .orderBy(desc(rewardClaims.claimedAt));

    return {
      claims: rows.map(({ claim, offer }) => ({
        claimId: claim.id,
        title: offer.title,
        description: offer.description,
        prizeType: offer.prizeType,
        minOrderPaise: offer.minOrderPaise,
        claimedAt: claim.claimedAt,
      })),
    };
  });

  app.get("/restaurants/:restaurantId/offers/active", async (request) => {

    const params = z.object({ restaurantId: z.string().uuid() }).parse(request.params);

    const rows = await db

      .select()

      .from(offers)

      .where(and(eq(offers.restaurantId, params.restaurantId), eq(offers.active, true)));



    return {

      offers: rows.map((o) => ({

        id: o.id,

        title: o.title,

        description: o.description,

        terms: o.terms,

      })),

    };

  });



  app.get("/rewards/plays/by-scan/:scanId", async (request) => {

    const params = z.object({ scanId: z.string().uuid() }).parse(request.params);

    const [play] = await db

      .select()

      .from(rewardPlays)

      .where(eq(rewardPlays.scanEventId, params.scanId))

      .limit(1);



    if (!play) return { play: null };



    const [offer] = await db.select().from(offers).where(eq(offers.id, play.offerId)).limit(1);

    const [claim] = await db.select().from(rewardClaims).where(eq(rewardClaims.playId, play.id)).limit(1);



    return {

      play: {

        playId: play.id,

        mode: play.mode,

        claimed: Boolean(claim),

        outcome: offer ? formatPrize(offer) : null,

      },

    };

  });



  app.post("/rewards/spin", async (request, reply) => {

    const body = z

      .object({

        restaurantId: z.string().uuid(),

        scanId: z.string().uuid(),

        mode: z.enum(["spin", "scratch"]).default("spin"),

      })

      .safeParse(request.body);



    if (!body.success) {

      return reply.status(400).send({

        error: { code: "INVALID_REQUEST", message: body.error.message, correlationId: request.id },

      });

    }



    const { restaurantId, scanId, mode } = body.data;



    const [scan] = await db.select().from(scanEvents).where(eq(scanEvents.id, scanId)).limit(1);

    if (!scan || scan.restaurantId !== restaurantId) {

      return reply.status(404).send({

        error: { code: "SCAN_NOT_FOUND", message: "Invalid scan session", correlationId: request.id },

      });

    }



    const [existing] = await db

      .select()

      .from(rewardPlays)

      .where(eq(rewardPlays.scanEventId, scanId))

      .limit(1);



    if (existing) {

      const [offer] = await db.select().from(offers).where(eq(offers.id, existing.offerId)).limit(1);

      return {

        playId: existing.id,

        alreadyPlayed: true,

        outcome: offer ? formatPrize(offer) : null,

      };

    }

    let linkedCustomerId: string | undefined;
    const guestToken = bearerToken(request.headers.authorization);
    if (guestToken) {
      try {
        linkedCustomerId = (await verifyGuestToken(guestToken)).sub;
      } catch {
        linkedCustomerId = undefined;
      }
    }
    if (linkedCustomerId) {
      const used = await countDailyRewardPlays(linkedCustomerId, restaurantId);
      if (used >= dailySpinLimit()) {
        return reply.status(429).send({
          error: {
            code: "SPIN_DAILY_LIMIT",
            message: `Daily spin limit reached for this kitchen (${dailySpinLimit()} per day). Try again tomorrow.`,
            correlationId: request.id,
          },
        });
      }
    }

    const pool = await db

      .select()

      .from(offers)

      .where(and(eq(offers.restaurantId, restaurantId), eq(offers.active, true)));



    if (pool.length === 0) {

      return reply.status(503).send({

        error: {

          code: "NO_OFFERS",

          message: "No active offers for this kitchen",

          correlationId: request.id,

        },

      });

    }



    const picked = pickWeightedOffer(pool);

    const [play] = await db

      .insert(rewardPlays)

      .values({

        scanEventId: scanId,

        restaurantId,

        customerId: linkedCustomerId,

        mode,

        offerId: picked.id,

      })

      .returning();



    return {

      playId: play.id,

      alreadyPlayed: false,

      outcome: formatPrize(picked),

    };

  });



  app.post("/rewards/claim", { preHandler: requireGuest }, async (request, reply) => {

    const body = z.object({ playId: z.string().uuid() }).safeParse(request.body);

    if (!body.success) {

      return reply.status(400).send({

        error: { code: "INVALID_REQUEST", message: "playId required", correlationId: request.id },

      });

    }



    const customerId = request.guest!.sub!;



    const [play] = await db.select().from(rewardPlays).where(eq(rewardPlays.id, body.data.playId)).limit(1);

    if (!play) {

      return reply.status(404).send({

        error: { code: "NOT_FOUND", message: "Play not found", correlationId: request.id },

      });

    }



    const consents = await db

      .select()

      .from(consentRecords)

      .where(eq(consentRecords.customerId, customerId))

      .orderBy(desc(consentRecords.createdAt));



    let gameGranted = false;

    for (const row of consents) {

      if (row.kind === "game" && gameGranted === false) gameGranted = row.granted;

    }

    if (!gameGranted) {

      return reply.status(403).send({

        error: {

          code: "GAME_CONSENT_REQUIRED",

          message: "Enable promotional game consent to avail rewards",

          correlationId: request.id,

        },

      });

    }



    const [existingClaim] = await db

      .select()

      .from(rewardClaims)

      .where(eq(rewardClaims.playId, play.id))

      .limit(1);



    if (existingClaim) {

      return { claimed: true, claimId: existingClaim.id, idempotent: true };

    }



    const [claim] = await db

      .insert(rewardClaims)

      .values({

        playId: play.id,

        customerId,

        restaurantId: play.restaurantId,

        offerId: play.offerId,

      })

      .returning();



    await db.update(rewardPlays).set({ customerId }).where(eq(rewardPlays.id, play.id));



    const [restaurant] = await db

      .select({ name: restaurants.name })

      .from(restaurants)

      .where(eq(restaurants.id, play.restaurantId))

      .limit(1);



    return {

      claimed: true,

      claimId: claim.id,

      restaurantName: restaurant?.name,

    };

  });

}


