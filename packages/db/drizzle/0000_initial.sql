CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "public"."sticker_token_status" AS ENUM('ACTIVE', 'EXPIRED', 'REVOKED', 'CONSUMED');
CREATE TYPE "public"."staff_role" AS ENUM('RESTAURANT_OWNER', 'KITCHEN', 'REDEEM', 'STAFF', 'PLATFORM_ADMIN');

CREATE TABLE IF NOT EXISTS "restaurants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(128) NOT NULL UNIQUE,
  "city" varchar(128) DEFAULT 'Bangalore',
  "ordering_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone_hash" varchar(64) NOT NULL UNIQUE,
  "phone_last4" varchar(4),
  "display_name" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_restaurant_roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "role" "staff_role" NOT NULL
);

CREATE TABLE IF NOT EXISTS "customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone_hash" varchar(64) NOT NULL UNIQUE,
  "phone_last4" varchar(4),
  "name" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sticker_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "batch_code" varchar(32) NOT NULL UNIQUE,
  "quantity" integer NOT NULL,
  "valid_from" timestamp with time zone NOT NULL,
  "valid_to" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "sticker_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL REFERENCES "sticker_batches"("id"),
  "public_token" varchar(64) NOT NULL UNIQUE,
  "status" "sticker_token_status" DEFAULT 'ACTIVE' NOT NULL,
  "consumed_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "menu_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "version" integer NOT NULL,
  "published_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "menu_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "name" varchar(128) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "menu_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "category_id" uuid REFERENCES "menu_categories"("id"),
  "name" varchar(255) NOT NULL,
  "description" text,
  "price_paise" integer NOT NULL,
  "is_veg" boolean DEFAULT true NOT NULL,
  "available" boolean DEFAULT true NOT NULL,
  "published_version_id" uuid REFERENCES "menu_versions"("id"),
  "draft" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "scan_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_id" uuid NOT NULL REFERENCES "sticker_tokens"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
