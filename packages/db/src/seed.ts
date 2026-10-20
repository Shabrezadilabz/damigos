import "dotenv/config";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { hashPhone, phoneLast4 } from "@damigos/auth";
import {
  customers,
  db,
  guestLoyaltyCredits,
  menuItems,
  offers,
  restaurants,
  stickerBatches,
  stickerTokens,
  userRestaurantRoles,
  users,
} from "./index.ts";
import { seedUiDemo } from "./seed-ui-demo.ts";
import { seedPilotDummy } from "./seed-pilot-dummy.ts";

export type AppSeedSummary = {
  restaurantId: string;
  batchCode: string;
  sampleToken: string | undefined;
  devOwnerPhone: string;
  devAdminPhone: string;
  devGuestPhone: string;
  uiDemo: Record<string, unknown> | null;
  pilotDummy: Record<string, unknown> | null;
};

export async function runAppSeed(): Promise<AppSeedSummary> {
  let [r] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, "biryani-box-koramangala"))
    .limit(1);

  /** Koramangala pilot pin — Cross-By Haversine demos */
  const BIRYANI_LAT = 12.9352;
  const BIRYANI_LNG = 77.6245;

  if (!r) {
    const orderingEnabled = process.env.DEV_ORDERING_ENABLED !== "false";
    [r] = await db
      .insert(restaurants)
      .values({
        name: "Biryani Box Koramangala",
        slug: "biryani-box-koramangala",
        orderingEnabled,
        hubListed: true,
        razorpayKycStatus: "pending",
        lat: BIRYANI_LAT,
        lng: BIRYANI_LNG,
        geoUpdatedAt: new Date(),
      })
      .returning();
  } else {
    const patch: {
      hubListed?: boolean;
      razorpayKycStatus?: string;
      lat?: number;
      lng?: number;
      geoUpdatedAt?: Date;
    } = {};
    if (!r.hubListed) patch.hubListed = true;
    if (r.razorpayKycStatus === "not_linked") patch.razorpayKycStatus = "pending";
    if (r.lat == null || r.lng == null) {
      patch.lat = BIRYANI_LAT;
      patch.lng = BIRYANI_LNG;
      patch.geoUpdatedAt = new Date();
    }
    if (Object.keys(patch).length > 0) {
      [r] = await db.update(restaurants).set(patch).where(eq(restaurants.id, r.id)).returning();
    }
  }

  let [b] = await db
    .select()
    .from(stickerBatches)
    .where(eq(stickerBatches.batchCode, "DEV-BATCH-001"))
    .limit(1);

  if (!b) {
    const validFrom = new Date();
    const validTo = new Date(validFrom);
    validTo.setDate(validTo.getDate() + 12);
    [b] = await db
      .insert(stickerBatches)
      .values({
        restaurantId: r.id,
        batchCode: "DEV-BATCH-001",
        quantity: 3,
        validFrom,
        validTo,
        activatedAt: validFrom,
      })
      .returning();

    const tokens = Array.from({ length: 3 }, () => ({
      batchId: b.id,
      publicToken: randomBytes(16).toString("base64url"),
    }));
    await db.insert(stickerTokens).values(tokens);
  }

  const batchTokens = await db
    .select()
    .from(stickerTokens)
    .where(eq(stickerTokens.batchId, b.id))
    .limit(3);
  const [t] = batchTokens;

  const existingItems = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, r.id))
    .limit(1);

  const existingOffers = await db.select().from(offers).where(eq(offers.restaurantId, r.id)).limit(1);
  if (existingOffers.length === 0) {
    await db.insert(offers).values([
      {
        restaurantId: r.id,
        title: "₹50 off your next order",
        description: "Min order ₹299 · packaging perk",
        prizeType: "flat_off_paise",
        prizeValue: 5000,
        minOrderPaise: 29900,
        weight: 40,
        terms: "Valid 7 days. One use per guest. Not combinable with other offers.",
      },
      {
        restaurantId: r.id,
        title: "Free Coke (330ml)",
        description: "On orders above ₹199",
        prizeType: "free_item",
        prizeValue: 0,
        minOrderPaise: 19900,
        weight: 35,
        terms: "Add any main to cart to redeem.",
      },
      {
        restaurantId: r.id,
        title: "10% off today",
        description: "Max discount ₹75",
        prizeType: "percent",
        prizeValue: 10,
        weight: 25,
        terms: "Promotional offer — not gambling. T&C apply.",
      },
    ]);
  }

  const seedDraftName = "Draft Special (unpublished)";

  if (existingItems.length === 0) {
    await db.insert(menuItems).values([
      {
        restaurantId: r.id,
        name: "Hyderabadi Chicken Biryani",
        description: "Slow-cooked dum biryani",
        pricePaise: 24900,
        referencePricePaise: 29900,
        isVeg: false,
        draft: false,
        available: true,
      },
      {
        restaurantId: r.id,
        name: "Paneer Butter Masala",
        description: "With butter naan combo",
        pricePaise: 18900,
        isVeg: true,
        draft: false,
        available: true,
      },
      {
        restaurantId: r.id,
        name: seedDraftName,
        description: "Should not appear on guest menu",
        pricePaise: 9900,
        isVeg: true,
        draft: true,
        available: true,
      },
    ]);
  }

  await db
    .update(menuItems)
    .set({ draft: true })
    .where(and(eq(menuItems.restaurantId, r.id), eq(menuItems.name, seedDraftName)));

  await db
    .update(menuItems)
    .set({ referencePricePaise: 29900 })
    .where(
      and(eq(menuItems.restaurantId, r.id), eq(menuItems.name, "Hyderabadi Chicken Biryani")),
    );

  const ownerPhone = process.env.DEV_OWNER_PHONE ?? "9876543210";
  const adminPhone = process.env.DEV_ADMIN_PHONE ?? "9876543211";

  async function ensureStaff(phone: string, role: "RESTAURANT_OWNER" | "PLATFORM_ADMIN") {
    const phoneHash = hashPhone(phone);
    let [u] = await db.select().from(users).where(eq(users.phoneHash, phoneHash)).limit(1);
    if (!u) {
      [u] = await db
        .insert(users)
        .values({
          phoneHash,
          phoneLast4: phoneLast4(phone),
          displayName: role === "RESTAURANT_OWNER" ? "Raj Malhotra (Demo Owner)" : "Platform Admin Demo",
        })
        .returning();
    }
    const [existingRole] = await db
      .select()
      .from(userRestaurantRoles)
      .where(eq(userRestaurantRoles.userId, u.id))
      .limit(1);
    if (!existingRole && role !== "PLATFORM_ADMIN") {
      await db.insert(userRestaurantRoles).values({
        userId: u.id,
        restaurantId: r.id,
        role,
      });
    }
    if (role === "PLATFORM_ADMIN") {
      const [adminRole] = await db
        .select()
        .from(userRestaurantRoles)
        .where(eq(userRestaurantRoles.userId, u.id))
        .limit(1);
      if (!adminRole) {
        await db.insert(userRestaurantRoles).values({
          userId: u.id,
          restaurantId: r.id,
          role: "PLATFORM_ADMIN",
        });
      }
    }
    return u.id;
  }

  await ensureStaff(ownerPhone, "RESTAURANT_OWNER");
  await ensureStaff(adminPhone, "PLATFORM_ADMIN");

  /** E2E — G-ERR-02 expired packaging batch (no table-session copy) */
  let [expiredBatch] = await db
    .select()
    .from(stickerBatches)
    .where(eq(stickerBatches.batchCode, "DEV-BATCH-EXPIRED"))
    .limit(1);
  if (!expiredBatch) {
    const validTo = new Date();
    validTo.setDate(validTo.getDate() - 2);
    const validFrom = new Date(validTo);
    validFrom.setDate(validFrom.getDate() - 14);
    [expiredBatch] = await db
      .insert(stickerBatches)
      .values({
        restaurantId: r.id,
        batchCode: "DEV-BATCH-EXPIRED",
        quantity: 1,
        validFrom,
        validTo,
        activatedAt: validFrom,
      })
      .returning();
    await db.insert(stickerTokens).values({
      batchId: expiredBatch.id,
      publicToken: `expired-${randomBytes(12).toString("base64url")}`,
    });
  }

  /** E2E — G-ERR-03 revoked batch */
  let [revokedBatch] = await db
    .select()
    .from(stickerBatches)
    .where(eq(stickerBatches.batchCode, "DEV-BATCH-REVOKED"))
    .limit(1);
  if (!revokedBatch) {
    const validFrom = new Date();
    const validTo = new Date(validFrom);
    validTo.setDate(validTo.getDate() + 10);
    [revokedBatch] = await db
      .insert(stickerBatches)
      .values({
        restaurantId: r.id,
        batchCode: "DEV-BATCH-REVOKED",
        quantity: 1,
        validFrom,
        validTo,
        activatedAt: validFrom,
        revokedAt: validFrom,
      })
      .returning();
    await db.insert(stickerTokens).values({
      batchId: revokedBatch.id,
      publicToken: `revoked-${randomBytes(12).toString("base64url")}`,
      status: "REVOKED",
    });
  }

  const [expiredToken] = await db
    .select()
    .from(stickerTokens)
    .where(eq(stickerTokens.batchId, expiredBatch.id))
    .limit(1);
  const [revokedToken] = await db
    .select()
    .from(stickerTokens)
    .where(eq(stickerTokens.batchId, revokedBatch.id))
    .limit(1);

  /** Hub discover — second curated kitchen (G-07.01) */
  let [hub2] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, "masala-trail-indiranagar"))
    .limit(1);
  /** ~400m from Biryani Box — Cross-By single-rider demo */
  const MASALA_LAT = 12.9378;
  const MASALA_LNG = 77.6271;

  if (!hub2) {
    [hub2] = await db
      .insert(restaurants)
      .values({
        name: "Masala Trail Indiranagar",
        slug: "masala-trail-indiranagar",
        city: "Bangalore",
        orderingEnabled: true,
        hubListed: true,
        lat: MASALA_LAT,
        lng: MASALA_LNG,
        geoUpdatedAt: new Date(),
      })
      .returning();
    await db.insert(menuItems).values([
      {
        restaurantId: hub2.id,
        name: "South Indian Meals",
        description: "Rice, sambar, poriyal, papad",
        pricePaise: 16900,
        isVeg: true,
        draft: false,
        available: true,
      },
      {
        restaurantId: hub2.id,
        name: "Filter Coffee",
        description: "Post-meal add-on",
        pricePaise: 4900,
        isVeg: true,
        draft: false,
        available: true,
      },
    ]);
  } else {
    const hub2Patch: {
      hubListed?: boolean;
      lat?: number;
      lng?: number;
      geoUpdatedAt?: Date;
    } = {};
    if (!hub2.hubListed) hub2Patch.hubListed = true;
    if (hub2.lat == null || hub2.lng == null) {
      hub2Patch.lat = MASALA_LAT;
      hub2Patch.lng = MASALA_LNG;
      hub2Patch.geoUpdatedAt = new Date();
    }
    if (Object.keys(hub2Patch).length > 0) {
      await db.update(restaurants).set(hub2Patch).where(eq(restaurants.id, hub2.id));
    }
  }

  /** E2E — G-15 kitchen paused (read-only menu) */
  let [pausedR] = await db
    .select()
    .from(restaurants)
    .where(eq(restaurants.slug, "cloud-kitchen-paused-demo"))
    .limit(1);
  if (!pausedR) {
    [pausedR] = await db
      .insert(restaurants)
      .values({
        name: "Cloud Kitchen (Paused Demo)",
        slug: "cloud-kitchen-paused-demo",
        orderingEnabled: false,
        hubListed: false,
      })
      .returning();
    await db.insert(menuItems).values({
      restaurantId: pausedR.id,
      name: "Demo Thali (view only)",
      description: "Ordering paused for this pilot kitchen",
      pricePaise: 14900,
      isVeg: true,
      draft: false,
      available: true,
    });
  } else if (pausedR.orderingEnabled) {
    await db
      .update(restaurants)
      .set({ orderingEnabled: false })
      .where(eq(restaurants.id, pausedR.id));
  }

  let uiDemo: Awaited<ReturnType<typeof seedUiDemo>> | null = null;
  if (t?.id) {
    uiDemo = await seedUiDemo({
      restaurantId: r.id,
      hubRestaurantId: hub2.id,
      stickerTokenId: t.id,
      ownerPhone,
    });
  }

  /** ~8 more hub kitchens + 10 offers + 5 loyalty configs (with Biryani+Masala ≈ 10 kitchens) */
  const pilotDummy = await seedPilotDummy();

  const guestPhone = process.env.DEV_GUEST_PHONE ?? "9123456780";

  /** Demo kitchen loyalty balance for Priya (optional add at checkout) */
  try {
    const guestHash = hashPhone(guestPhone);
    const [guest] = await db
      .select()
      .from(customers)
      .where(eq(customers.phoneHash, guestHash))
      .limit(1);
    if (guest) {
      const [existingCredit] = await db
        .select()
        .from(guestLoyaltyCredits)
        .where(
          and(
            eq(guestLoyaltyCredits.customerId, guest.id),
            eq(guestLoyaltyCredits.restaurantId, r.id),
          ),
        )
        .limit(1);
      if (!existingCredit) {
        await db.insert(guestLoyaltyCredits).values({
          customerId: guest.id,
          restaurantId: r.id,
          balancePaise: 7500,
        });
      } else if (existingCredit.balancePaise < 1000) {
        await db
          .update(guestLoyaltyCredits)
          .set({ balancePaise: 7500, updatedAt: new Date() })
          .where(eq(guestLoyaltyCredits.id, existingCredit.id));
      }
    }
  } catch (err) {
    console.warn("[seed] guest loyalty credits skipped", err);
  }

  const summary: AppSeedSummary = {
    restaurantId: r.id,
    batchCode: b.batchCode,
    sampleToken: t?.publicToken,
    devOwnerPhone: ownerPhone,
    devAdminPhone: adminPhone,
    devGuestPhone: guestPhone,
    uiDemo: uiDemo
      ? {
          guestTrackOrderId: uiDemo.activeTrackOrderId,
          guestPhones: [uiDemo.guestPhone, uiDemo.guest2Phone, uiDemo.guest3Phone],
          crmLogin: {
            url: "https://damigos-crm-web.vercel.app/start",
            phone: ownerPhone,
            otp: process.env.OTP_BYPASS_CODE ?? "000000",
          },
          guestLogin: {
            phone: guestPhone,
            otp: process.env.OTP_BYPASS_CODE ?? "000000",
            name: "Priya Sharma",
          },
          doc: "docs/UI-DEMO-ACCOUNTS.md",
        }
      : null,
    pilotDummy: {
      ...pilotDummy,
      note: "8 pilot kitchens + Biryani/Masala ≈ 10 hub; 10 offers; 5 growLoyaltyConfig payback %",
    },
  };

  return summary;
}

async function main() {
  const summary = await runAppSeed();
  console.log(JSON.stringify(summary, null, 2));
}

const isSeedCli =
  typeof process.argv[1] === "string" &&
  (process.argv[1].endsWith("seed.ts") || process.argv[1].includes("seed.ts"));

if (isSeedCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
