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

export const PLATFORM_DELIVERY_MARKUP_PAISE = 500;
