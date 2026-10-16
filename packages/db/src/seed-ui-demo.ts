import { and, eq, sql } from "drizzle-orm";
import { hashPhone, phoneLast4 } from "@damigos/auth";
import {
  campaigns,
  carts,
  cartItems,
  consentRecords,
  customers,
  db,
  menuItems,
  offers,
  orderItems,
  orders,
  restaurants,
  rewardClaims,
  rewardPlays,
  scanEvents,
  shipments,
  stickerTokens,
  users,
  walletAccounts,
  walletTransactions,
} from "./index.ts";

const UI_CAMPAIGN_MARKER = "DEV-UI-WEEKEND-BLAST";
const POLICY_VERSION = "2026-10-15";

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function startOfUtcDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function ensureCustomer(phone: string, name: string) {
  const phoneHash = hashPhone(phone);
  let [c] = await db.select().from(customers).where(eq(customers.phoneHash, phoneHash)).limit(1);
  if (!c) {
    [c] = await db
      .insert(customers)
      .values({ phoneHash, phoneLast4: phoneLast4(phone), name })
      .returning();
  } else if (c.name !== name) {
    [c] = await db.update(customers).set({ name }).where(eq(customers.id, c.id)).returning();
  }
  return c;
}

async function ensureConsents(customerId: string, kinds: Array<"transactional" | "marketing" | "game">) {
  for (const kind of kinds) {
    const [existing] = await db
      .select()
      .from(consentRecords)
      .where(and(eq(consentRecords.customerId, customerId), eq(consentRecords.kind, kind)))
      .limit(1);
    if (!existing) {
      await db.insert(consentRecords).values({
        customerId,
        kind,
        granted: true,
        policyVersion: POLICY_VERSION,
      });
    }
  }
}

type DemoOrderInput = {
  customerId: string;
  restaurantId: string;
  status: (typeof orders.$inferInsert)["status"];
  lines: Array<{ menuItemId: string; name: string; unitPricePaise: number; quantity: number }>;
  discountPaise?: number;
  deliveryPincode?: string;
  deliveryFeePaise?: number;
  createdAt: Date;
  withShipment?: boolean;
};

async function insertDemoOrder(input: DemoOrderInput) {
  const subtotal = input.lines.reduce((s, l) => s + l.unitPricePaise * l.quantity, 0);
  const discount = input.discountPaise ?? 0;
  const deliveryFee = input.deliveryFeePaise ?? 0;
  const total = subtotal + 200 + deliveryFee - discount;

  const [order] = await db
    .insert(orders)
    .values({
      customerId: input.customerId,
      restaurantId: input.restaurantId,
      status: input.status,
      subtotalPaise: subtotal,
      convenienceFeePaise: 200,
      discountPaise: discount,
      deliveryPincode: input.deliveryPincode ?? "560034",
      deliveryFeePaise: deliveryFee,
      totalPaise: total,
      createdAt: input.createdAt,
    })
    .returning();

  await db.insert(orderItems).values(
    input.lines.map((l) => ({
      orderId: order.id,
      menuItemId: l.menuItemId,
      name: l.name,
      quantity: l.quantity,
      unitPricePaise: l.unitPricePaise,
    })),
  );

  if (input.withShipment) {
    await db.insert(shipments).values({
      orderId: order.id,
      awb: `SR-DEMO-${order.id.slice(0, 8).toUpperCase()}`,
      status: "in_transit",
    });
  }

  return order;
}

/** Idempotent rich dataset for Stitch / UI validation (CRM + guest). */
export async function seedUiDemo(input: {
  restaurantId: string;
  hubRestaurantId: string;
  stickerTokenId: string;
  ownerPhone: string;
}) {
  const [marker] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.restaurantId, input.restaurantId), eq(campaigns.name, UI_CAMPAIGN_MARKER)))
    .limit(1);
  if (marker) return;

  const guestPhone = process.env.DEV_GUEST_PHONE ?? "9123456780";
  const guest2Phone = process.env.DEV_UI_GUEST2_PHONE ?? "9123456790";
  const guest3Phone = process.env.DEV_UI_GUEST3_PHONE ?? "9123456791";

  const priya = await ensureCustomer(guestPhone, "Priya Sharma");
  const arjun = await ensureCustomer(guest2Phone, "Arjun Kumar");
  const meera = await ensureCustomer(guest3Phone, "Meera Nair");

  await ensureConsents(priya.id, ["transactional", "marketing", "game"]);
  await ensureConsents(arjun.id, ["transactional", "marketing"]);
  await ensureConsents(meera.id, ["transactional"]);

  await db
    .update(restaurants)
    .set({
      petpoojaOutletId: "PP-KOR-8842",
      restroworksLocationId: "RW-BLR-19",
      razorpayLinkedAccountId: "acc_demo_biryani_box",
      razorpayKycStatus: "pending",
    })
    .where(eq(restaurants.id, input.restaurantId));

  const ownerHash = hashPhone(input.ownerPhone);
  await db
    .update(users)
    .set({ displayName: "Raj Malhotra (Demo Owner)" })
    .where(eq(users.phoneHash, ownerHash));

  const menuRows = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, input.restaurantId));

  const byName = (name: string) => menuRows.find((m) => m.name === name);

  if (!byName("Mutton Dum Biryani")) {
    await db.insert(menuItems).values([
      {
        restaurantId: input.restaurantId,
        name: "Mutton Dum Biryani",
        description: "Weekend special · slow cooked",
        pricePaise: 32900,
        referencePricePaise: 37900,
        isVeg: false,
        draft: false,
        available: true,
        importConfidence: null,
      },
      {
        restaurantId: input.restaurantId,
        name: "Double Ka Meetha",
        description: "Hyderabadi dessert",
        pricePaise: 8900,
        isVeg: true,
        draft: false,
        available: true,
      },
      {
        restaurantId: input.restaurantId,
        name: "Mirchi Ka Salan (86'd)",
        description: "Side · temporarily unavailable",
        pricePaise: 6900,
        isVeg: true,
        draft: false,
        available: false,
      },
      {
        restaurantId: input.restaurantId,
        name: "AI Import — Veg Thali (review)",
        description: "Draft from menu PDF import",
        pricePaise: 14900,
        isVeg: true,
        draft: true,
        available: true,
        importConfidence: 68,
      },
    ]);
  }

  const refreshedMenu = await db
    .select()
    .from(menuItems)
    .where(eq(menuItems.restaurantId, input.restaurantId));
  const biryani =
    refreshedMenu.find((m) => m.name === "Hyderabadi Chicken Biryani") ?? refreshedMenu[0];
  const paneer = refreshedMenu.find((m) => m.name === "Paneer Butter Masala") ?? refreshedMenu[1];

  let [wallet] = await db
    .select()
    .from(walletAccounts)
    .where(eq(walletAccounts.restaurantId, input.restaurantId))
    .limit(1);
  if (!wallet) {
    [wallet] = await db
      .insert(walletAccounts)
      .values({ restaurantId: input.restaurantId, balancePaise: 185_000 })
      .returning();
  } else if (wallet.balancePaise < 50_000) {
    [wallet] = await db
      .update(walletAccounts)
      .set({ balancePaise: 185_000 })
      .where(eq(walletAccounts.id, wallet.id))
      .returning();
  }

  const [ledgerDup] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, "dev-ui-topup-001"))
    .limit(1);
  if (!ledgerDup) {
    await db.insert(walletTransactions).values([
      {
        walletAccountId: wallet.id,
        kind: "topup",
        amountPaise: 99_900,
        reference: "pack_999",
        idempotencyKey: "dev-ui-topup-001",
        createdAt: hoursAgo(72),
      },
      {
        walletAccountId: wallet.id,
        kind: "campaign_debit",
        amountPaise: -12_500,
        reference: "campaign-demo-sent",
        idempotencyKey: "dev-ui-campaign-debit-001",
        createdAt: hoursAgo(48),
      },
    ]);
  }

  for (let i = 0; i < 12; i++) {
    await db.insert(scanEvents).values({
      tokenId: input.stickerTokenId,
      restaurantId: input.restaurantId,
      createdAt: hoursAgo(i * 12 + 2),
    });
  }

  const [offerRow] = await db
    .select()
    .from(offers)
    .where(eq(offers.restaurantId, input.restaurantId))
    .limit(1);

  if (offerRow) {
    const [scanForPlay] = await db
      .select()
      .from(scanEvents)
      .where(eq(scanEvents.restaurantId, input.restaurantId))
      .orderBy(sql`${scanEvents.createdAt} desc`)
      .limit(1);

    if (scanForPlay) {
      const [existingPlay] = await db
        .select()
        .from(rewardPlays)
        .where(eq(rewardPlays.scanEventId, scanForPlay.id))
        .limit(1);
      if (!existingPlay) {
        const [play] = await db
          .insert(rewardPlays)
          .values({
            scanEventId: scanForPlay.id,
            restaurantId: input.restaurantId,
            customerId: priya.id,
            mode: "spin",
            offerId: offerRow.id,
            createdAt: hoursAgo(3),
          })
          .returning();
        const [claimDup] = await db
          .select()
          .from(rewardClaims)
          .where(eq(rewardClaims.playId, play.id))
          .limit(1);
        if (!claimDup) {
          await db.insert(rewardClaims).values({
            playId: play.id,
            customerId: priya.id,
            restaurantId: input.restaurantId,
            offerId: offerRow.id,
            claimedAt: hoursAgo(2),
          });
        }
      }
    }
  }

  const today = startOfUtcDay();
  const line = (item = biryani) => ({
    menuItemId: item.id,
    name: item.name,
    unitPricePaise: item.pricePaise,
    quantity: 1,
  });

  await insertDemoOrder({
    customerId: priya.id,
    restaurantId: input.restaurantId,
    status: "PAID",
    lines: [line(), line(paneer)],
    createdAt: new Date(today.getTime() + 2 * 60 * 60 * 1000),
  });
  await insertDemoOrder({
    customerId: arjun.id,
    restaurantId: input.restaurantId,
    status: "ACCEPTED",
    lines: [line()],
    discountPaise: 5000,
    createdAt: hoursAgo(1),
  });
  await insertDemoOrder({
    customerId: meera.id,
    restaurantId: input.restaurantId,
    status: "PREPARING",
    lines: [line(paneer)],
    createdAt: hoursAgo(4),
  });
  await insertDemoOrder({
    customerId: priya.id,
    restaurantId: input.restaurantId,
    status: "READY",
    lines: [line()],
    createdAt: hoursAgo(6),
  });
  const dispatched = await insertDemoOrder({
    customerId: priya.id,
    restaurantId: input.restaurantId,
    status: "DISPATCHED",
    lines: [line(), line(paneer)],
    deliveryFeePaise: 4500,
    createdAt: hoursAgo(10),
    withShipment: true,
  });
  await insertDemoOrder({
    customerId: priya.id,
    restaurantId: input.restaurantId,
    status: "DELIVERED",
    lines: [line()],
    createdAt: hoursAgo(30),
  });
  await insertDemoOrder({
    customerId: priya.id,
    restaurantId: input.restaurantId,
    status: "DELIVERED",
    lines: [line(paneer)],
    createdAt: hoursAgo(80),
  });
  await insertDemoOrder({
    customerId: priya.id,
    restaurantId: input.hubRestaurantId,
    status: "DELIVERED",
    lines: [
      {
        menuItemId: biryani.id,
        name: "South Indian Meals (hub)",
        unitPricePaise: 16900,
        quantity: 2,
      },
    ],
    createdAt: hoursAgo(50),
  });
  await insertDemoOrder({
    customerId: priya.id,
    restaurantId: input.restaurantId,
    status: "PAYMENT_FAILED",
    lines: [line()],
    createdAt: hoursAgo(20),
  });

  await db.insert(campaigns).values([
    {
      restaurantId: input.restaurantId,
      name: UI_CAMPAIGN_MARKER,
      status: "Draft",
      audience: "marketing_opt_in",
      templateKey: "weekend_special",
      estimatedRecipients: 128,
      skippedOptIn: 12,
      skippedSevenDayCap: 3,
    },
    {
      restaurantId: input.restaurantId,
      name: "DEV-UI-WINBACK-7D",
      status: "Scheduled",
      audience: "all",
      templateKey: "winback_7d",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      estimatedRecipients: 86,
      skippedSevenDayCap: 5,
    },
    {
      restaurantId: input.restaurantId,
      name: "DEV-UI-MENU-DROP-SENT",
      status: "Sent",
      audience: "marketing_opt_in",
      templateKey: "new_menu_drop",
      estimatedRecipients: 52,
      sentCount: 47,
      skippedOptIn: 8,
    },
  ]);

  const [openCart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.customerId, priya.id), eq(carts.restaurantId, input.restaurantId), eq(carts.status, "OPEN")))
    .limit(1);
  if (!openCart) {
    const [cart] = await db
      .insert(carts)
      .values({
        customerId: priya.id,
        restaurantId: input.restaurantId,
        status: "OPEN",
        deliveryPincode: "560034",
        deliveryFeePaise: 4500,
      })
      .returning();
    await db.insert(cartItems).values({
      cartId: cart.id,
      menuItemId: biryani.id,
      quantity: 2,
      unitPricePaise: biryani.pricePaise,
    });
  }

  return { activeTrackOrderId: dispatched.id, guestPhone, guest2Phone, guest3Phone };
}
