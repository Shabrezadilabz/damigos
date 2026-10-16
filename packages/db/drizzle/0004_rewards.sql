CREATE TYPE "public"."reward_play_mode" AS ENUM('spin', 'scratch');

CREATE TABLE IF NOT EXISTS "offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "title" varchar(255) NOT NULL,
  "description" text,
  "prize_type" varchar(32) NOT NULL,
  "prize_value" integer NOT NULL,
  "weight" integer DEFAULT 100 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "terms" text,
  "expires_days" integer DEFAULT 7 NOT NULL
);

CREATE TABLE IF NOT EXISTS "reward_plays" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scan_event_id" uuid NOT NULL UNIQUE REFERENCES "scan_events"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "customer_id" uuid REFERENCES "customers"("id"),
  "mode" "reward_play_mode" NOT NULL,
  "offer_id" uuid NOT NULL REFERENCES "offers"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reward_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "play_id" uuid NOT NULL UNIQUE REFERENCES "reward_plays"("id"),
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "restaurant_id" uuid NOT NULL REFERENCES "restaurants"("id"),
  "offer_id" uuid NOT NULL REFERENCES "offers"("id"),
  "claimed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "reward_plays_restaurant_created_idx"
  ON "reward_plays" ("restaurant_id", "created_at" DESC);
