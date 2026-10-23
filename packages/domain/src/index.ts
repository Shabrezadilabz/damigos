export { loadMonorepoEnv } from "./load-env.js";
export {
  assignShiprocketAwb,
  checkShiprocketServiceability,
  createShiprocketAdhocOrder,
  createShiprocketShipmentBundle,
  deliveryMode,
  deliveryQuoteRequired,
  generateShiprocketPickup,
  isFoodFriendlyCourier,
  shiprocketApiBase,
  shiprocketCredentialsConfigured,
  shiprocketLogin,
  shiprocketPickupLocationName,
  shiprocketPickupPostcode,
  shiprocketTrackingUrl,
  type CreateAdhocOrderInput,
  type ServiceabilityResult,
  type ShiprocketMode,
} from "./shiprocket.js";

export {
  generateDeliveryOtp,
  generatePickupCode,
  hashDeliveryOtp,
  matchesPickupToken,
  normalizeHandoffToken,
  shortOrderId,
  verifyDeliveryOtp,
} from "./delivery-handoff.js";

export {
  DAMIGOS_WA_TEMPLATES,
  GROW_KEY_TO_TEMPLATE,
  KAPSO_CONNECTED,
  resolveGrowTemplateName,
  templateNameOrDefault,
  type DamigosWaTemplateMeta,
  type DamigosWaTemplateName,
} from "./kapso-templates.js";

/** Shared domain types — align with docs/architecture/DATA-MODEL.md */

export type StickerTokenStatus = "ACTIVE" | "EXPIRED" | "REVOKED" | "CONSUMED";

export type StaffRole =
  | "RESTAURANT_OWNER"
  | "KITCHEN"
  | "REDEEM"
  | "STAFF"
  | "PLATFORM_ADMIN";

export type OrderStatus =
  | "DRAFT"
  | "PAYMENT_PENDING"
  | "PAID"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DISPATCHED"
  | "DELIVERED"
  | "CLOSED"
  | "CANCELLED"
  | "PAYMENT_FAILED"
  | "REFUNDED";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    correlationId: string;
  };
}

export const GUEST_API_PREFIX = "/v1" as const;
export const CRM_API_PREFIX = "/v1" as const;

export {
  brandKitForGuestFromJson,
  isPlausibleRestaurantDisplayName,
  type GuestRestaurantBrand,
} from "./brand-kit.js";

export {
  aiTextProvider,
  damigosEnv,
  deepseekApiKey,
  hiveApiKey,
  menuImportMode,
  posterAiMode,
  posterImageMode,
  posterImageProvider,
  type DamigosEnv,
} from "./ai-env.js";
