CREATE TABLE IF NOT EXISTS "consent_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "kind" varchar(32) NOT NULL,
  "granted" boolean NOT NULL,
  "policy_version" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "consent_records_customer_kind_idx" ON "consent_records" ("customer_id", "kind", "created_at" DESC);
