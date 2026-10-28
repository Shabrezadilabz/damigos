import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { cartItems, carts, db, menuItems } from "@damigos/db";
import { deliveryQuoteRequired } from "./delivery-mode.js";
import { mockServiceable } from "./shiprocket-mock.js";
import { deliveryMode } from "@damigos/domain";
import { ensureBestClaimApplied } from "./auto-apply-claim.js";
import { cartTotalPaise, CONVENIENCE_FEE_PAISE, resolveAppliedClaimDiscount } from "./cart-totals.js";
import { clampLoyaltyApplyPaise } from "./guest-loyalty.js";

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
  loyaltyAppliedPaise: number;
  totalPaise: number;
  deliveryFeePaise: number;
  deliveryPincode: string | null;
  deliveryAddressText: string | null;
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

  const appliedClaimId = await ensureBestClaimApplied({
    cartId: cart.id,
    customerId,
    restaurantId,
    subtotalPaise,
    appliedClaimId: cart.appliedClaimId,
    autoRewardDeclined: cart.autoRewardDeclined ?? false,
  });

  const claimInfo = await resolveAppliedClaimDiscount(
    appliedClaimId,
    customerId,
    restaurantId,
    subtotalPaise,
  );
  const discountPaise = claimInfo.discountPaise;
  const loyaltyAppliedPaise = clampLoyaltyApplyPaise(
    cart.loyaltyAppliedPaise ?? 0,
    subtotalPaise,
    discountPaise,
  );
  const deliveryFeePaise = cart.deliveryFeePaise ?? 0;

  const pin = cart.deliveryPincode ?? null;
  if (deliveryQuoteRequired()) {
    if (!pin) {
      return {
        error: {
          code: "DELIVERY_QUOTE_REQUIRED",
          message: "Enter a deliverable pincode to continue",
          status: 400,
        },
      };
    }
    if (deliveryMode() === "mock" && !mockServiceable(pin)) {
      return {
        error: {
          code: "NOT_SERVICEABLE",
          message: "We cannot deliver to this pincode yet. Try another address or pick up.",
          status: 422,
        },
      };
    }
  }

  const totalPaise = cartTotalPaise(
    subtotalPaise,
    discountPaise,
    deliveryFeePaise,
    loyaltyAppliedPaise,
  );

  return {
    cart,
    lines,
    subtotalPaise,
    discountPaise,
    loyaltyAppliedPaise,
    deliveryFeePaise,
    deliveryPincode: cart.deliveryPincode ?? null,
    deliveryAddressText: cart.deliveryAddressText ?? null,
    totalPaise,
    appliedClaimId: discountPaise > 0 ? appliedClaimId : null,
  };
}

export { CONVENIENCE_FEE_PAISE };
