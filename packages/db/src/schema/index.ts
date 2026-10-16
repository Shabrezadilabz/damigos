import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
  orderingEnabled: boolean("ordering_enabled").default(true).notNull(),
  hubListed: boolean("hub_listed").default(false).notNull(),
  razorpayLinkedAccountId: varchar("razorpay_linked_account_id", { length: 64 }),
  razorpayKycStatus: varchar("razorpay_kyc_status", { length: 32 }).default("not_linked").notNull(),
  petpoojaOutletId: varchar("petpooja_outlet_id", { length: 64 }),
  restroworksLocationId: varchar("restroworks_location_id", { length: 64 }),
  /** JSON — Grow loyalty rules (spin, scratch, win-back, calendar). CRM C-04.01 */
  growLoyaltyConfig: text("grow_loyalty_config"),
  /** JSON — logo URL, colors, display name from menu/brand AI extract (DeepSeek) */
  brandKit: text("brand_kit"),
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
  deliveryPincode: varchar("delivery_pincode", { length: 6 }),
  deliveryFeePaise: integer("delivery_fee_paise").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  deliveryFeePaise: integer("delivery_fee_paise").default(0).notNull(),
  totalPaise: integer("total_paise").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
  carrier: varchar("carrier", { length: 32 }).default("Shiprocket").notNull(),
  awb: varchar("awb", { length: 64 }),
  status: varchar("status", { length: 32 }).default("created").notNull(),
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
  restaurantId: uuid("restaurant_id")
    .notNull()
    .references(() => restaurants.id),
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
