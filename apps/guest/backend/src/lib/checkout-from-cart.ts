import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { cartItems, carts, db, menuItems } from "@damigos/db";
import { deliveryMode } from "./delivery-mode.js";
import { mockServiceable } from "./shiprocket-mock.js";
import { cartTotalPaise, CONVENIENCE_FEE_PAISE, resolveAppliedClaimDiscount } from "./cart-totals.js";

export type CheckoutCartSnapshot = {
  cart: typeof carts.$inferSelect;
  lines: {
    lineId: string;
    menuItemId: string;
    quantity: number;
    unitPricePaise: number;
    name: string;
  }[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  deliveryFeePaise: number;
  deliveryPincode: string | null;
  appliedClaimId: string | null;
};

export async function loadOpenCheckoutCart(
  request: FastifyRequest,
  customerId: string,
  restaurantId: string,
): Promise<CheckoutCartSnapshot | { error: { code: string; message: string; status: number } }> {
  const [cart] = await db
    .select()
    .from(carts)
    .where(
      and(
        eq(carts.customerId, customerId),
        eq(carts.restaurantId, restaurantId),
        eq(carts.status, "OPEN"),
      ),
    )
    .limit(1);

  if (!cart) {
    return { error: { code: "CART_EMPTY", message: "No open cart", status: 400 } };
  }

  const lines = await db
    .select({
      lineId: cartItems.id,
      menuItemId: cartItems.menuItemId,
      quantity: cartItems.quantity,
      unitPricePaise: cartItems.unitPricePaise,
      name: menuItems.name,
    })
    .from(cartItems)
    .innerJoin(menuItems, eq(cartItems.menuItemId, menuItems.id))
    .where(eq(cartItems.cartId, cart.id));

  if (lines.length === 0) {
    return { error: { code: "CART_EMPTY", message: "Cart has no items", status: 400 } };
  }

  const subtotalPaise = lines.reduce((s, l) => s + l.quantity * l.unitPricePaise, 0);
  const claimInfo = await resolveAppliedClaimDiscount(
    cart.appliedClaimId,
    customerId,
    restaurantId,
    subtotalPaise,
  );
  const discountPaise = claimInfo.discountPaise;
  const deliveryFeePaise = cart.deliveryFeePaise ?? 0;

  const pin = cart.deliveryPincode ?? null;
  if (deliveryMode() === "mock") {
    if (deliveryFeePaise <= 0 || !pin || !mockServiceable(pin)) {
      return {
        error: {
          code: pin && !mockServiceable(pin) ? "NOT_SERVICEABLE" : "DELIVERY_QUOTE_REQUIRED",
          message:
            pin && !mockServiceable(pin)
              ? "We cannot deliver to this pincode yet. Try another address or pick up."
              : "Enter a deliverable pincode to continue",
          status: pin && !mockServiceable(pin) ? 422 : 400,
        },
      };
    }
  }

  const totalPaise = cartTotalPaise(subtotalPaise, discountPaise, deliveryFeePaise);

  return {
    cart,
    lines,
    subtotalPaise,
    discountPaise,
    deliveryFeePaise,
    deliveryPincode: cart.deliveryPincode ?? null,
    totalPaise,
    appliedClaimId: discountPaise > 0 ? cart.appliedClaimId : null,
  };
}

export { CONVENIENCE_FEE_PAISE };
