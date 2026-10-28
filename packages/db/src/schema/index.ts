import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const stickerTokenStatusEnum = pgEnum("sticker_token_status", [
  "ACTIVE",
  "EXPIRED",
  "REVOKED",
  "CONSUMED",
]);

export const staffRoleEnum = pgEnum("staff_role", [
  "RESTAURANT_OWNER",
  "KITCHEN",
  "REDEEM",
  "STAFF",
  "PLATFORM_ADMIN",
]);

export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  city: varchar("city", { length: 128 }).default("Bangalore"),
  /** Kitchen GPS — Cross-By Haversine + Shiprocket pickup */
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  geoUpdatedAt: timestamp("geo_updated_at", { withTimezone: true }),
  orderingEnabled: boolean("ordering_enabled").default(true).notNull(),
  hubListed: boolean("hub_listed").default(false).notNull(),
  razorpayLinkedAccountId: varchar("razorpay_linked_account_id", { length: 64 }),
  razorpayKycStatus: varchar("razorpay_kyc_status", { length: 32 }).default("not_linked").notNull(),
  petpoojaOutletId: varchar("petpooja_outlet_id", { length: 64 }),
  restroworksLocationId: varchar("restroworks_location_id", { length: 64 }),
  /** Settlement bank (masked in UI; full in DB for ops) */
  bankAccountName: varchar("bank_account_name", { length: 128 }),
  bankAccountNumber: varchar("bank_account_number", { length: 32 }),
  bankIfsc: varchar("bank_ifsc", { length: 16 }),
  bankName: varchar("bank_name", { length: 128 }),
  /** When bank details change — freeze EOD payout until Razorpay Route updated */
  payoutFrozenUntil: timestamp("payout_frozen_until", { withTimezone: true }),
  payoutFreezeReason: varchar("payout_freeze_reason", { length: 128 }),
  bankDetailsUpdatedAt: timestamp("bank_details_updated_at", { withTimezone: true }),
  /** JSON — Grow loyalty rules (spin, scratch, win-back, calendar). CRM C-04.01 */
  growLoyaltyConfig: text("grow_loyalty_config"),
  /** JSON — logo URL, colors, display name from menu/brand AI extract (DeepSeek) */
  brandKit: text("brand_kit"),
  /** Shiprocket pickup_location nickname (must exist on SR account). One per kitchen. */
  shiprocketPickupLocation: varchar("shiprocket_pickup_location", { length: 36 }),
  /** veg | non_veg | both — kitchen dietary flag for hub VEG filter */
  dietType: varchar("diet_type", { length: 16 }),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  fssaiNumber: varchar("fssai_number", { length: 32 }),
  fssaiVerifiedAt: timestamp("fssai_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneHash: varchar("phone_hash", { length: 64 }).notNull().unique(),
  phoneLast4: varchar("phone_last4", { length: 4 }),
  displayName: varchar("display_name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userRestaurantRoles = pgTable("user_restaurant_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  role: staffRoleEnum("role").notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneHash: varchar("phone_hash", { length: 64 }).notNull().unique(),
  phoneLast4: varchar("phone_last4", { length: 4 }),
  /** E.164 digits for Kapso WhatsApp (optional until Spark opt-in) */
  phoneE164: varchar("phone_e164", { length: 20 }),
  waOptInSource: varchar("wa_opt_in_source", { length: 32 }),
  waOptInAt: timestamp("wa_opt_in_at", { withTimezone: true }),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stickerBatches = pgTable("sticker_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  batchCode: varchar("batch_code", { length: 32 }).notNull().unique(),
  quantity: integer("quantity").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validTo: timestamp("valid_to", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  /** Owner asked Damigos to print & ship this batch */
  printRequestedAt: timestamp("print_requested_at", { withTimezone: true }),
  designId: integer("design_id"),
  designName: varchar("design_name", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stickerTokens = pgTable("sticker_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => stickerBatches.id),
  publicToken: varchar("public_token", { length: 64 }).notNull().unique(),
  status: stickerTokenStatusEnum("status").default("ACTIVE").notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const menuVersions = pgTable("menu_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  version: integer("version").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  name: varchar("name", { length: 128 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const foodCatalog = pgTable("food_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  cuisine: varchar("cuisine", { length: 64 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  isVeg: boolean("is_veg").notNull(),
  imageUrl: text("image_url").notNull(),
  aliases: text("aliases").notNull().default("[]"),
  searchText: text("search_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  categoryId: uuid("category_id").references(() => menuCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pricePaise: integer("price_paise").notNull(),
  referencePricePaise: integer("reference_price_paise"),
  isVeg: boolean("is_veg").default(true).notNull(),
  available: boolean("available").default(true).notNull(),
  publishedVersionId: uuid("published_version_id").references(() => menuVersions.id),
  draft: boolean("draft").default(true).notNull(),
  importConfidence: integer("import_confidence"),
  importJobId: uuid("import_job_id"),
  imageUrl: text("image_url"),
  foodCatalogId: uuid("food_catalog_id").references(() => foodCatalog.id),
  /** READY_10M | COOKED_15M — kitchen Accept SLA */
  prepCategory: varchar("prep_category", { length: 16 }).default("COOKED_15M").notNull(),
  prepMinutes: integer("prep_minutes"),
});

export const cartStatusEnum = pgEnum("cart_status", ["OPEN", "CHECKED_OUT"]);

export const orderStatusEnum = pgEnum("order_status", [
  "DRAFT",
  "PAYMENT_PENDING",
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CLOSED",
  "CANCELLED",
  "PAYMENT_FAILED",
  "REFUNDED",
]);

export const checkoutGroups = pgTable("checkout_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  status: varchar("status", { length: 32 }).default("DRAFT").notNull(),
  riderMode: varchar("rider_mode", { length: 16 }).default("SINGLE").notNull(),
  distanceMeters: integer("distance_meters"),
  deliveryFeePaise: integer("delivery_fee_paise").default(0).notNull(),
  platformDeliverySubsidyPaise: integer("platform_delivery_subsidy_paise").default(0).notNull(),
  convenienceFeePaise: integer("convenience_fee_paise").default(200).notNull(),
  currency: varchar("currency", { length: 8 }).default("INR").notNull(),
  /** Single Razorpay order for entire Cross-By group (amount = sum of legs) */
  razorpayOrderId: varchar("razorpay_order_id", { length: 64 }).unique(),
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  status: cartStatusEnum("status").default("OPEN").notNull(),
  appliedClaimId: uuid("applied_claim_id").references(() => rewardClaims.id),
  /** Guest removed auto-applied reward — do not re-apply until they pick one */
  autoRewardDeclined: boolean("auto_reward_declined").default(false).notNull(),
  /** Optional restaurant loyalty credits applied this cart (paise) */
  loyaltyAppliedPaise: integer("loyalty_applied_paise").default(0).notNull(),
  deliveryPincode: varchar("delivery_pincode", { length: 6 }),
  /** Free-text delivery area / house line captured at quote time */
  deliveryAddressText: varchar("delivery_address_text", { length: 240 }),
  deliveryFeePaise: integer("delivery_fee_paise").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Guest loyalty / payback balance per kitchen (restaurant-scoped) */
export const guestLoyaltyCredits = pgTable(
  "guest_loyalty_credits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    balancePaise: integer("balance_paise").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("guest_loyalty_credits_customer_restaurant").on(t.customerId, t.restaurantId)],
);

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id),
  quantity: integer("quantity").default(1).notNull(),
  unitPricePaise: integer("unit_price_paise").notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  status: orderStatusEnum("status").default("PAYMENT_PENDING").notNull(),
  subtotalPaise: integer("subtotal_paise").notNull(),
  convenienceFeePaise: integer("convenience_fee_paise").default(200).notNull(),
  discountPaise: integer("discount_paise").default(0).notNull(),
  deliveryPincode: varchar("delivery_pincode", { length: 6 }),
  /** Guest delivery address line (area / landmark) at order time */
  deliveryAddressText: varchar("delivery_address_text", { length: 240 }),
  deliveryFeePaise: integer("delivery_fee_paise").default(0).notNull(),
  totalPaise: integer("total_paise").notNull(),
  /** Cross-By leg (null = single-restaurant checkout) */
  checkoutGroupId: uuid("checkout_group_id").references(() => checkoutGroups.id, {
    onDelete: "set null",
  }),
  legIndex: integer("leg_index").default(1).notNull(),
  committedPrepMinutes: integer("committed_prep_minutes"),
  extendedPrepMinutes: integer("extended_prep_minutes").default(0).notNull(),
  prepDeadlineAt: timestamp("prep_deadline_at", { withTimezone: true }),
  riderArrivedAt: timestamp("rider_arrived_at", { withTimezone: true }),
  readyForPickupAt: timestamp("ready_for_pickup_at", { withTimezone: true }),
  waitingPenaltyPaise: integer("waiting_penalty_paise").default(0).notNull(),
  waitingPenaltyFinalized: boolean("waiting_penalty_finalized").default(false).notNull(),
  /** 4-digit kitchen ↔ rider code (shown on board + KOT). */
  pickupCode: varchar("pickup_code", { length: 8 }),
  pickupVerifiedAt: timestamp("pickup_verified_at", { withTimezone: true }),
  /** SHA-256 of guest delivery OTP (pepper in DELIVERY_OTP_PEPPER). */
  deliveryOtpHash: varchar("delivery_otp_hash", { length: 64 }),
  deliveryOtpSentAt: timestamp("delivery_otp_sent_at", { withTimezone: true }),
  deliveryOtpVerifiedAt: timestamp("delivery_otp_verified_at", { withTimezone: true }),
  /** damigos | shiprocket_webhook | courier_pod */
  deliveryVerifySource: varchar("delivery_verify_source", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const restaurantPayoutLedger = pgTable("restaurant_payout_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  entryType: varchar("entry_type", { length: 32 }).notNull(),
  amountPaise: integer("amount_paise").notNull(),
  meta: text("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** One EOD settlement row per restaurant per IST business day */
export const restaurantDailySettlements = pgTable(
  "restaurant_daily_settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD in Asia/Kolkata */
    businessDate: varchar("business_date", { length: 10 }).notNull(),
    orderCount: integer("order_count").default(0).notNull(),
    paymentsCount: integer("payments_count").default(0).notNull(),
    grossSalesPaise: integer("gross_sales_paise").default(0).notNull(),
    restaurantSharePaise: integer("restaurant_share_paise").default(0).notNull(),
    platformFeePaise: integer("platform_fee_paise").default(0).notNull(),
    deliveryFeePaise: integer("delivery_fee_paise").default(0).notNull(),
    waitingPenaltyPaise: integer("waiting_penalty_paise").default(0).notNull(),
    status: varchar("status", { length: 32 }).default("pending").notNull(),
    /** SETTLED | FROZEN | SKIPPED_NO_BANK | FAILED */
    invoiceNumber: varchar("invoice_number", { length: 64 }),
    invoiceJson: text("invoice_json"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    freezeNote: varchar("freeze_note", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("restaurant_daily_settlements_rid_date").on(t.restaurantId, t.businessDate)],
);

export const paymentIntents = pgTable("payment_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id),
  appliedClaimId: uuid("applied_claim_id"),
  loyaltyAppliedPaise: integer("loyalty_applied_paise").default(0).notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
  razorpayOrderId: varchar("razorpay_order_id", { length: 64 }).unique(),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 64 }),
  status: varchar("status", { length: 32 }).default("created").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id, { onDelete: "cascade" }),
  carrier: varchar("carrier", { length: 64 }).default("Shiprocket").notNull(),
  awb: varchar("awb", { length: 64 }),
  status: varchar("status", { length: 64 }).default("created").notNull(),
  /** SINGLE multi-pickup vs SPLIT dual AWB (Cross-By) */
  pickupMode: varchar("pickup_mode", { length: 16 }).default("SPLIT").notNull(),
  checkoutGroupId: uuid("checkout_group_id"),
  /** Shiprocket External / Quick hyperlocal metadata */
  shiprocketOrderId: varchar("shiprocket_order_id", { length: 64 }),
  shiprocketShipmentId: varchar("shiprocket_shipment_id", { length: 64 }),
  courierCompanyId: integer("courier_company_id"),
  trackingUrl: text("tracking_url"),
  lastTrackingStatus: varchar("last_tracking_status", { length: 128 }),
  lastTrackingAt: timestamp("last_tracking_at", { withTimezone: true }),
  foodDelivery: boolean("food_delivery").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPricePaise: integer("unit_price_paise").notNull(),
});

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  kind: varchar("kind", { length: 32 }).notNull(),
  granted: boolean("granted").notNull(),
  policyVersion: varchar("policy_version", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scanEvents = pgTable("scan_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenId: uuid("token_id")
    .notNull()
    .references(() => stickerTokens.id),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rewardPlayModeEnum = pgEnum("reward_play_mode", ["spin", "scratch"]);

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Issuing kitchen (still set for PLATFORM_WIDE — scope controls apply rules) */
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  /** RESTAURANT_SCOPED | PLATFORM_WIDE — G-04.08 */
  scope: varchar("scope", { length: 32 }).default("RESTAURANT_SCOPED").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  prizeType: varchar("prize_type", { length: 32 }).notNull(),
  prizeValue: integer("prize_value").notNull(),
  weight: integer("weight").default(100).notNull(),
  active: boolean("active").default(true).notNull(),
  terms: text("terms"),
  expiresDays: integer("expires_days").default(7).notNull(),
  minOrderPaise: integer("min_order_paise").default(0).notNull(),
});

export const rewardPlays = pgTable("reward_plays", {
  id: uuid("id").primaryKey().defaultRandom(),
  scanEventId: uuid("scan_event_id")
    .notNull()
    .unique()
    .references(() => scanEvents.id),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  customerId: uuid("customer_id").references(() => customers.id),
  mode: rewardPlayModeEnum("mode").notNull(),
  offerId: uuid("offer_id")
    .notNull()
    .references(() => offers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rewardClaims = pgTable("reward_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  playId: uuid("play_id")
    .notNull()
    .unique()
    .references(() => rewardPlays.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
  offerId: uuid("offer_id")
    .notNull()
    .references(() => offers.id),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).defaultNow().notNull(),
  redeemedOrderId: uuid("redeemed_order_id").references(() => orders.id),
  /** Spark nudge after claim if guest has not ordered yet */
  orderNudgeSentAt: timestamp("order_nudge_sent_at", { withTimezone: true }),
});

/**
 * Pending Spark play context after packaging scan / invite.
 * unlock_reward webhook looks up by phone_e164 to send the correct play URL.
 */
export const sparkPlaySessions = pgTable("spark_play_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneE164: varchar("phone_e164", { length: 20 }),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  scanEventId: uuid("scan_event_id").references(() => scanEvents.id, { onDelete: "set null" }),
  playPath: varchar("play_path", { length: 512 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const walletAccounts = pgTable("wallet_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .unique()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  balancePaise: integer("balance_paise").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletAccountId: uuid("wallet_account_id")
    .notNull()
    .references(() => walletAccounts.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 32 }).notNull(),
  amountPaise: integer("amount_paise").notNull(),
  reference: varchar("reference", { length: 128 }),
  /** JSON: razorpayOrderId, razorpayPaymentId, utr, batchId, paymentMethod, … */
  meta: text("meta"),
  idempotencyKey: varchar("idempotency_key", { length: 64 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  status: varchar("status", { length: 32 }).default("Draft").notNull(),
  audience: varchar("audience", { length: 32 }).default("all").notNull(),
  templateKey: varchar("template_key", { length: 64 }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  estimatedRecipients: integer("estimated_recipients").default(0).notNull(),
  skippedSevenDayCap: integer("skipped_seven_day_cap").default(0).notNull(),
  skippedOptIn: integer("skipped_opt_in").default(0).notNull(),
  sentCount: integer("sent_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const campaignRecipients = pgTable("campaign_recipients", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  kapsoMessageId: varchar("kapso_message_id", { length: 64 }),
  errorMessage: varchar("error_message", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const menuImportJobs = pgTable("menu_import_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 32 }).default("queued").notNull(),
  progressPct: integer("progress_pct").default(0).notNull(),
  sourceFilename: varchar("source_filename", { length: 255 }).notNull(),
  sourceImageDataUrl: text("source_image_data_url"),
  errorMessage: text("error_message"),
  itemsCreated: integer("items_created").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const messageDeliveryLog = pgTable("message_delivery_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  channel: varchar("channel", { length: 32 }).default("whatsapp").notNull(),
  messageClass: varchar("message_class", { length: 32 }).default("marketing").notNull(),
  templateKey: varchar("template_key", { length: 64 }),
  kapsoMessageId: varchar("kapso_message_id", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
