CREATE TABLE IF NOT EXISTS "payment_intents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL UNIQUE REFERENCES "orders"("id"),
  "cart_id" uuid NOT NULL REFERENCES "carts"("id"),
  "applied_claim_id" uuid REFERENCES "reward_claims"("id"),
  "idempotency_key" varchar(64) UNIQUE,
  "razorpay_order_id" varchar(64) UNIQUE,
  "razorpay_payment_id" varchar(64),
  "status" varchar(32) DEFAULT 'created' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "captured_at" timestamp with time zone
);
