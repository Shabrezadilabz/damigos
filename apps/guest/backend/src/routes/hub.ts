import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { bearerToken, verifyGuestToken } from "@damigos/auth";
import {
  db,
  menuItems,
  offers,
  orders,
  restaurants,
  rewardClaims,
} from "@damigos/db";

/** G-07.01 / G-07.02 — hub kitchens + Your Direct Perks rail */
export async function registerHubRoutes(app: FastifyInstance) {
  app.get("/hub/restaurants", async (request) => {
    const query = z
      .object({
        city: z.string().optional(),
        q: z.string().max(64).optional(),
        veg: z.enum(["0", "1", "true", "false"]).optional(),
      })
      .parse(request.query);

    const vegOnly = query.veg === "1" || query.veg === "true";
    const cityFilter = (query.city?.toLowerCase() ?? "bangalore").trim();
    const search = query.q?.trim().toLowerCase() ?? "";
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[''`]/g, "")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const searchNorm = normalize(search);
    const searchTokens = searchNorm.split(" ").filter((t) => t.length >= 2);
    const cityAliases =
      cityFilter === "bangalore" || cityFilter === "bengaluru"
        ? new Set(["bangalore", "bengaluru", "blr", ""])
        : new Set([cityFilter]);

    // All hub-listed kitchens (no artificial cap). Soft city match for Bangalore pilot.
    const rows = await db.select().from(restaurants).where(eq(restaurants.hubListed, true));

    const filtered: typeof rows = [];
    for (const r of rows) {
      const cityNorm = normalize(r.city ?? "bangalore");
      if (!cityAliases.has(cityNorm) && !cityAliases.has("")) continue;
      // Prefer live menus; still list kitchens that only have draft items so owners see them while publishing
      const [{ liveCount }] = await db
        .select({ liveCount: sql<number>`count(*)::int` })
        .from(menuItems)
        .where(
          and(
            eq(menuItems.restaurantId, r.id),
            eq(menuItems.draft, false),
            eq(menuItems.available, true),
          ),
        );
      const [{ anyCount }] = await db
        .select({ anyCount: sql<number>`count(*)::int` })
        .from(menuItems)
        .where(eq(menuItems.restaurantId, r.id));
      if ((liveCount ?? 0) > 0 || (anyCount ?? 0) > 0 || r.orderingEnabled) {
        filtered.push(r);
      }
    }

    const restaurantsOut = [];
    for (const r of filtered) {
      const items = await db
        .select({
          id: menuItems.id,
          name: menuItems.name,
          pricePaise: menuItems.pricePaise,
          isVeg: menuItems.isVeg,
          imageUrl: menuItems.imageUrl,
        })
        .from(menuItems)
        .where(
          and(
            eq(menuItems.restaurantId, r.id),
            eq(menuItems.draft, false),
            eq(menuItems.available, true),
          ),
        )
        .limit(24);

      const vegCount = items.filter((i) => i.isVeg).length;
      let logoUrl: string | null = null;
      if (r.brandKit) {
        try {
          const kit = JSON.parse(r.brandKit) as { logoDataUrl?: string | null };
          if (kit.logoDataUrl?.trim()) logoUrl = kit.logoDataUrl.trim();
        } catch {
          /* ignore */
        }
      }
      const dishCover = items.find((i) => i.imageUrl?.trim())?.imageUrl?.trim() ?? null;
      const coverImageUrl = logoUrl || dishCover;

      const dietType = r.dietType ?? null;
      const nameBlob = normalize(`${r.name} ${r.slug} ${r.city ?? ""}`);
      const nameHit =
        !searchNorm ||
        nameBlob.includes(searchNorm) ||
        searchTokens.every((tok) => nameBlob.includes(tok)) ||
        searchTokens.some((tok) => tok.length >= 3 && nameBlob.includes(tok));
      const matchingDishes = !searchNorm
        ? items
        : items.filter((i) => {
            const n = normalize(i.name);
            return (
              n.includes(searchNorm) ||
              searchTokens.some((tok) => tok.length >= 2 && n.includes(tok))
            );
          });
      const dishHit = !searchNorm || matchingDishes.length > 0;

      if (search && !nameHit && !dishHit) continue;

      const pureFromDiet = dietType === "veg";
      const mixedFromDiet = dietType === "both" || dietType === "non_veg";
      const vegFriendly = pureFromDiet || mixedFromDiet || vegCount > 0;
      const pureVeg =
        pureFromDiet || (items.length > 0 && vegCount === items.length && dietType !== "non_veg");

      // Veg mode: hide kitchens with zero vegetarian dishes (and non_veg-only diet)
      if (vegOnly && (vegCount === 0 || dietType === "non_veg")) continue;

      const dishPool = nameHit && !dishHit ? items : matchingDishes.length ? matchingDishes : items;
      const samplePool = vegOnly ? dishPool.filter((i) => i.isVeg) : dishPool;

      restaurantsOut.push({
        id: r.id,
        name: r.name,
        slug: r.slug,
        city: r.city,
        orderingEnabled: r.orderingEnabled,
        menuPath: `/r/${r.id}/menu`,
        coverImageUrl,
        logoUrl,
        dietType: dietType === "veg" || dietType === "non_veg" || dietType === "both" ? dietType : null,
        vegFriendly,
        pureVeg,
        sampleDishes: samplePool.slice(0, 3).map((i) => ({
          id: i.id,
          name: i.name,
          pricePaise: i.pricePaise,
          isVeg: i.isVeg,
          imageUrl: i.imageUrl,
        })),
        matchedBy: searchNorm ? (nameHit ? (dishHit ? "both" : "kitchen") : "dish") : null,
      });
    }

    restaurantsOut.sort((a, b) => a.name.localeCompare(b.name));

    return {
      city: cityFilter,
      q: search || null,
      vegOnly,
      restaurants: restaurantsOut,
    };
  });


  /** Ownly WA-02 — Bestsellers under ₹149 across hub kitchens (?veg=1 = vegetarian only) */
  app.get("/hub/bestsellers", async (request) => {
    const query = z
      .object({ veg: z.enum(["0", "1", "true", "false"]).optional() })
      .parse(request.query);
    const vegOnly = query.veg === "1" || query.veg === "true";

    const rows = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        pricePaise: menuItems.pricePaise,
        isVeg: menuItems.isVeg,
        imageUrl: menuItems.imageUrl,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        restaurantSlug: restaurants.slug,
      })
      .from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .where(
        and(
          eq(restaurants.hubListed, true),
          eq(restaurants.orderingEnabled, true),
          eq(menuItems.draft, false),
          eq(menuItems.available, true),
          lte(menuItems.pricePaise, 14900),
          ...(vegOnly ? [eq(menuItems.isVeg, true)] : []),
        ),
      )
      .orderBy(menuItems.pricePaise)
      .limit(24);

    return {
      title: "Bestsellers under ₹149",
      maxPricePaise: 14900,
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        pricePaise: r.pricePaise,
        isVeg: r.isVeg,
        imageUrl: r.imageUrl,
        restaurantId: r.restaurantId,
        restaurantName: r.restaurantName,
        restaurantSlug: r.restaurantSlug,
        menuPath: `/r/${r.restaurantId}/menu`,
        bestseller: true,
      })),
    };
  });

  /**
   * G-07.02 — Your Direct Perks
   * Public kitchen/platform offer cards; guest claims when Authorization present.
   */
  app.get("/hub/perks", async (request) => {
    const activeOffers = await db
      .select({
        offer: offers,
        restaurantName: restaurants.name,
        restaurantId: restaurants.id,
        hubListed: restaurants.hubListed,
      })
      .from(offers)
      .innerJoin(restaurants, eq(offers.restaurantId, restaurants.id))
      .where(eq(offers.active, true))
      .orderBy(desc(offers.weight))
      .limit(40);

    const platform: {
      id: string;
      title: string;
      badge: string;
      kitchenName: string;
      restaurantId: string | null;
      scope: "PLATFORM_WIDE";
      href: string;
    }[] = [];

    const kitchenCards: {
      id: string;
      title: string;
      badge: string;
      kitchenName: string;
      restaurantId: string;
      scope: "RESTAURANT_SCOPED";
      href: string;
      coinsHint: number;
    }[] = [];

    for (const row of activeOffers) {
      const scope =
        row.offer.scope === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED";
      if (scope === "PLATFORM_WIDE") {
        if (platform.length >= 6) continue;
        platform.push({
          id: row.offer.id,
          title: row.offer.title,
          badge: "D'aMigo Platform",
          kitchenName: "D'aMigo's",
          restaurantId: null,
          scope: "PLATFORM_WIDE",
          href: "/hub",
        });
        continue;
      }
      // One card per active kitchen offer (not one-per-kitchen) so Grow segments show up
      if (!row.hubListed) continue;
      if (kitchenCards.length >= 16) continue;
      kitchenCards.push({
        id: row.offer.id,
        title: row.offer.title,
        badge:
          row.offer.prizeType === "percent"
            ? `${row.offer.prizeValue}% OFF`
            : row.offer.prizeType === "flat_off_paise"
              ? `₹${Math.round(row.offer.prizeValue / 100)} OFF`
              : row.offer.prizeType === "free_item"
                ? row.offer.prizeValue > 0
                  ? `Free · upto ₹${Math.round(row.offer.prizeValue / 100)}`
                  : "Free item"
                : "Kitchen perk",
        kitchenName: row.restaurantName,
        restaurantId: row.restaurantId,
        scope: "RESTAURANT_SCOPED",
        href: `/r/${row.restaurantId}/menu`,
        coinsHint: Math.min(200, Math.max(20, Math.round(Math.max(1, row.offer.prizeValue) / 50))),
      });
    }

    let myClaims: {
      claimId: string;
      title: string;
      kitchenName: string;
      restaurantId: string;
      scope: string;
      href: string;
    }[] = [];

    const token = bearerToken(request.headers.authorization);
    if (token) {
      try {
        const guest = await verifyGuestToken(token);
        const rows = await db
          .select({
            claim: rewardClaims,
            offer: offers,
            restaurantName: restaurants.name,
          })
          .from(rewardClaims)
          .innerJoin(offers, eq(rewardClaims.offerId, offers.id))
          .innerJoin(restaurants, eq(rewardClaims.restaurantId, restaurants.id))
          .where(
            and(
              eq(rewardClaims.customerId, guest.sub!),
              isNull(rewardClaims.redeemedOrderId),
              or(eq(offers.active, true), eq(offers.scope, "PLATFORM_WIDE")),
            ),
          )
          .orderBy(desc(rewardClaims.claimedAt))
          .limit(12);

        myClaims = rows.map(({ claim, offer, restaurantName }) => ({
          claimId: claim.id,
          title: offer.title,
          kitchenName:
            offer.scope === "PLATFORM_WIDE" ? "D'aMigo Platform" : restaurantName,
          restaurantId: claim.restaurantId,
          scope: offer.scope === "PLATFORM_WIDE" ? "PLATFORM_WIDE" : "RESTAURANT_SCOPED",
          href: `/r/${claim.restaurantId}/menu`,
        }));
      } catch {
        // anonymous hub browse
      }
    }

    return {
      platform,
      kitchens: kitchenCards,
      myClaims,
      /** Flat rail for FE (claims first, then kitchen, then platform) */
      rail: [
        ...myClaims.map((c) => ({
          id: c.claimId,
          kitchenName: c.kitchenName,
          title: c.title,
          badge: "Ready to redeem",
          coinsHint: 0,
          href: c.href,
          kind: "claim" as const,
        })),
        ...kitchenCards.map((k) => ({
          id: k.id,
          kitchenName: k.kitchenName,
          title: k.title,
          badge: k.badge,
          coinsHint: k.coinsHint,
          href: k.href,
          kind: "kitchen" as const,
        })),
        ...platform.map((p) => ({
          id: p.id,
          kitchenName: p.kitchenName,
          title: p.title,
          badge: p.badge,
          coinsHint: 0,
          href: p.href,
          kind: "platform" as const,
        })),
      ].slice(0, 12),
    };
  });
}

/** Last N distinct kitchens for Food HI carousel (G-08.01). */
export async function lastVisitedKitchens(customerId: string, limit = 3) {
  const rows = await db
    .select({
      restaurantId: orders.restaurantId,
      name: restaurants.name,
    })
    .from(orders)
    .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(40);

  const out: { restaurantId: string; name: string; menuPath: string }[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.restaurantId)) continue;
    seen.add(r.restaurantId);
    out.push({
      restaurantId: r.restaurantId,
      name: r.name,
      menuPath: `/r/${r.restaurantId}/menu`,
    });
    if (out.length >= limit) break;
  }
  return out;
}
