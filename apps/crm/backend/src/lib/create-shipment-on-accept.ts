import { and, eq, ne } from "drizzle-orm";
import {
  createShiprocketShipmentBundle,
  deliveryMode,
  generatePickupCode,
  shiprocketCredentialsConfigured,
} from "@damigos/domain";
import {
  checkoutGroups,
  customers,
  db,
  orderItems,
  orders,
  restaurants,
  shipments,
} from "@damigos/db";

async function ensurePickupCode(orderId: string) {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!row) return null;
  if (row.pickupCode) return row.pickupCode;
  const code = generatePickupCode();
  await db.update(orders).set({ pickupCode: code }).where(eq(orders.id, orderId));
  return code;
}

/**
 * Accept → Shiprocket food dispatch (Quick / Instant preferred).
 * create adhoc → assign AWB (food-friendly courier) → generate pickup.
 */
export async function createShipmentOnAccept(orderId: string) {
  const mode = deliveryMode();
  if (mode === "off") return null;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  await ensurePickupCode(orderId);

  const [existing] = await db.select().from(shipments).where(eq(shipments.orderId, orderId)).limit(1);
  if (existing) {
    if (existing.status === "created") {
      const [updated] = await db
        .update(shipments)
        .set({ status: "pickup_scheduled" })
        .where(eq(shipments.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  let riderMode: "SINGLE" | "SPLIT" = "SPLIT";
  let groupId: string | null = order.checkoutGroupId ?? null;

  if (groupId) {
    const [group] = await db
      .select()
      .from(checkoutGroups)
      .where(eq(checkoutGroups.id, groupId))
      .limit(1);
    if (group?.riderMode === "SINGLE") riderMode = "SINGLE";
  }

  if (groupId && riderMode === "SINGLE") {
    const [siblingShip] = await db
      .select()
      .from(shipments)
      .innerJoin(orders, eq(shipments.orderId, orders.id))
      .where(
        and(
          eq(orders.checkoutGroupId, groupId),
          ne(orders.id, orderId),
          eq(shipments.pickupMode, "SINGLE"),
        ),
      )
      .limit(1);

    if (siblingShip?.shipments?.awb) {
      const sib = siblingShip.shipments;
      const [row] = await db
        .insert(shipments)
        .values({
          orderId,
          carrier: sib.carrier,
          awb: sib.awb,
          status: "multi_pickup_leg",
          pickupMode: "SINGLE",
          checkoutGroupId: groupId,
          shiprocketOrderId: sib.shiprocketOrderId,
          shiprocketShipmentId: sib.shiprocketShipmentId,
          trackingUrl: sib.trackingUrl,
          foodDelivery: true,
        })
        .returning();
      return row;
    }
  }

  const useLiveApi =
    (mode === "sandbox" || mode === "live") && shiprocketCredentialsConfigured();

  if (useLiveApi && order.deliveryPincode) {
    try {
      const [customer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, order.customerId))
        .limit(1);
      const [kitchen] = await db
        .select()
        .from(restaurants)
        .where(eq(restaurants.id, order.restaurantId))
        .limit(1);
      const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));

      const bundle = await createShiprocketShipmentBundle({
        orderId: order.id,
        deliveryPincode: order.deliveryPincode,
        customerName: customer?.name ?? "Guest",
        customerPhone: customer?.phoneE164 ?? "9999999999",
        subTotalPaise: order.subtotalPaise,
        items: lines.map((l) => ({
          name: l.name,
          quantity: l.quantity,
          unitPricePaise: l.unitPricePaise,
        })),
        assignAwb: true,
        pickupLocation: kitchen?.shiprocketPickupLocation ?? null,
        pickupLat: kitchen?.lat ?? null,
        pickupLng: kitchen?.lng ?? null,
      });

      const awb =
        bundle.awb ??
        `SRPENDING${String(bundle.shipmentId).slice(0, 10).toUpperCase()}`;

      const [row] = await db
        .insert(shipments)
        .values({
          orderId,
          carrier: bundle.courierName
            ? `Shiprocket/${bundle.courierName}`
            : "Shiprocket",
          awb,
          status: bundle.pickupRequested
            ? "rider_requested"
            : bundle.awb
              ? "pickup_scheduled"
              : "awaiting_awb",
          pickupMode: riderMode,
          checkoutGroupId: groupId,
          shiprocketOrderId: bundle.shiprocketOrderId,
          shiprocketShipmentId: bundle.shipmentId,
          courierCompanyId: bundle.courierCompanyId,
          trackingUrl: bundle.trackingUrl,
          lastTrackingStatus: bundle.pickupRequested
            ? "Pickup requested · food delivery"
            : "Shipment created",
          lastTrackingAt: new Date(),
          foodDelivery: true,
        })
        .returning();
      return row;
    } catch (err) {
      console.warn("[shiprocket] food dispatch failed — synthetic AWB", err);
    }
  }

  const awbPrefix = riderMode === "SINGLE" && groupId ? "SRM" : "SR";
  const awb = `${awbPrefix}${order.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const [row] = await db
    .insert(shipments)
    .values({
      orderId,
      carrier: "Shiprocket",
      awb,
      status: riderMode === "SINGLE" && groupId ? "multi_pickup_scheduled" : "pickup_scheduled",
      pickupMode: riderMode,
      checkoutGroupId: groupId,
      foodDelivery: true,
      lastTrackingStatus: "Mock / pending live Shiprocket",
      lastTrackingAt: new Date(),
    })
    .returning();

  return row;
}
