CREATE TYPE "public"."cart_status" AS ENUM('OPEN', 'CHECKED_OUT');
CREATE TYPE "public"."order_status" AS ENUM(
  'DRAFT',
  'PAYMENT_PENDING',
  'PAID',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'DELIVERED',
  'CLOSED',
  'CANCELLED',
  'PAYMENT_FAILED',
  'REFUNDED'
);

CREATE TABLE IF NOT EXISTS "carts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "status" "cart_status" DEFAULT 'OPEN' NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "carts_customer_restaurant_open_idx"
  ON "carts" ("customer_id", "restaurant_id")
  WHERE "status" = 'OPEN';

CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cart_id" uuid NOT NULL REFERENCES "carts"("id") ON DELETE CASCADE,
  "menu_item_id" uuid NOT NULL REFERENCES "menu_items"("id"),
  "quantity" integer NOT NULL DEFAULT 1,
  "unit_price_paise" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "status" "order_status" DEFAULT 'PAYMENT_PENDING' NOT NULL,
  "subtotal_paise" integer NOT NULL,
  "convenience_fee_paise" integer DEFAULT 200 NOT NULL,
  "total_paise" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "menu_item_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "quantity" integer NOT NULL,
  "unit_price_paise" integer NOT NULL
);
