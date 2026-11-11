import {
  deliveryMode as domainDeliveryMode,
  deliveryQuoteRequired,
  type ShiprocketMode,
} from "@damigos/domain";

/** G-04.03 — off | mock | sandbox | live (Shiprocket) */
export type DeliveryMode = ShiprocketMode;

export function deliveryMode(): DeliveryMode {
  return domainDeliveryMode();
}

export { deliveryQuoteRequired };

/** S1.9 — delivery rail ₹3 lives in silent micro-fees; Shiprocket quote has no extra markup line. */
export const PLATFORM_DELIVERY_MARKUP_PAISE = 0;
