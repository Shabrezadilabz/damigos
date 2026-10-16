import { eq } from "drizzle-orm";
import { db, menuItems } from "@damigos/db";

/** Stitch crm_3 draft table + a couple of live items for the Live tab. */
const DEMO_DRAFT_ROWS = [
  {
    name: "Truffle Burrata Pizza",
    description: "Wild mushroom ragu, truffle oil, fresh rocket",
    pricePaise: 64_900,
    referencePricePaise: 79_000,
    isVeg: true,
    importConfidence: 99,
  },
  {
    name: "Charred Malai Tikka",
    description: "Cream cheese marinade, cardamom, cilantro glaze",
    pricePaise: 48_000,
    referencePricePaise: 58_000,
    isVeg: false,
    importConfidence: 96,
  },
  {
    name: "Smoked Ricotta Ravioli",
    description: "Price extraction unverified (OCR ambiguity)",
    pricePaise: 52_000,
    referencePricePaise: null,
    isVeg: true,
    importConfidence: 58,
  },
  {
    name: "Mango Passion Tart",
    description: "Alphonso curd, meringue kiss, cocoa nib butter crust",
    pricePaise: 36_000,
    referencePricePaise: 42_000,
    isVeg: true,
    importConfidence: 94,
  },
  {
    name: "Amigo Botanical Spritz",
    description: "Elderflower, lime cordial, sparkling zero-proof tonic",
    pricePaise: 29_000,
    referencePricePaise: 35_000,
    isVeg: true,
    importConfidence: 91,
  },
  {
    name: "Woodfired Sourdough Focaccia",
    description: "Roasted garlic butter, rosemary sea salt",
    pricePaise: 22_000,
    referencePricePaise: 28_000,
    isVeg: true,
    importConfidence: 88,
  },
  {
    name: "Fiery Ghost Pepper Wings (8pc)",
    description: "House buffalo glaze, blue cheese dip",
    pricePaise: 41_000,
    referencePricePaise: 49_000,
    isVeg: false,
    importConfidence: 90,
  },
] as const;

const DEMO_LIVE_ROWS = [
  {
    name: "Hyderabadi Chicken Biryani",
    description: "Dum-cooked basmati, saffron, fried onions",
    pricePaise: 32_000,
    referencePricePaise: 38_900,
    isVeg: false,
  },
  {
    name: "Paneer Tikka Roll",
    description: "Roomali roti, mint chutney, pickled onion",
    pricePaise: 19_500,
    referencePricePaise: 24_000,
    isVeg: true,
  },
] as const;

const seedInFlight = new Set<string>();

export function isMenuDemoSeedEnabled() {
  if (process.env.MENU_DEMO_SEED === "false") return false;
  return process.env.NODE_ENV !== "production";
}

/** Inserts demo rows when the restaurant has fewer than `minItems` menu records. Idempotent by item name. Never throws. */
export async function ensureDemoMenuItems(restaurantId: string, minItems = 8) {
  if (!isMenuDemoSeedEnabled()) return { seeded: 0 };
  if (seedInFlight.has(restaurantId)) return { seeded: 0 };

  seedInFlight.add(restaurantId);
  try {
    const existing = await db
      .select({ name: menuItems.name })
      .from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId));

    if (existing.length >= minItems) return { seeded: 0 };

    const names = new Set(existing.map((r) => r.name));
    let seeded = 0;

    for (const row of DEMO_DRAFT_ROWS) {
      if (names.has(row.name)) continue;
      try {
        await db.insert(menuItems).values({
          restaurantId,
          name: row.name,
          description: row.description,
          pricePaise: row.pricePaise,
          referencePricePaise: row.referencePricePaise,
          isVeg: row.isVeg,
          draft: true,
          available: true,
          importConfidence: row.importConfidence,
        });
        names.add(row.name);
        seeded += 1;
      } catch {
        /* parallel request or constraint — skip row */
      }
    }

    for (const row of DEMO_LIVE_ROWS) {
      if (names.has(row.name)) continue;
      try {
        await db.insert(menuItems).values({
          restaurantId,
          name: row.name,
          description: row.description,
          pricePaise: row.pricePaise,
          referencePricePaise: row.referencePricePaise,
          isVeg: row.isVeg,
          draft: false,
          available: true,
        });
        names.add(row.name);
        seeded += 1;
      } catch {
        /* skip row */
      }
    }

    return { seeded };
  } catch (err) {
    console.warn("[menu-demo-seed]", restaurantId, err);
    return { seeded: 0 };
  } finally {
    seedInFlight.delete(restaurantId);
  }
}
