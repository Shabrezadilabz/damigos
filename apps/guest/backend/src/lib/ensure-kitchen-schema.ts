import { sql } from "drizzle-orm";
import { db } from "@damigos/db";

/** Guest-side ensure for prep/geo columns (same DB as CRM). */
export async function ensureKitchenSchema() {
  const statements = [
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lat double precision`,
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lng double precision`,
    sql`ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS geo_updated_at timestamptz`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS committed_prep_minutes integer`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS extended_prep_minutes integer NOT NULL DEFAULT 0`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS prep_deadline_at timestamptz`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_arrived_at timestamptz`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at timestamptz`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiting_penalty_paise integer NOT NULL DEFAULT 0`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiting_penalty_finalized boolean NOT NULL DEFAULT false`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS leg_index integer NOT NULL DEFAULT 1`,
    sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_group_id uuid`,
    sql`CREATE TABLE IF NOT EXISTS checkout_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL REFERENCES customers(id),
      status varchar(32) NOT NULL DEFAULT 'DRAFT',
      rider_mode varchar(16) NOT NULL DEFAULT 'SINGLE',
      distance_meters integer,
      delivery_fee_paise integer NOT NULL DEFAULT 0,
      platform_delivery_subsidy_paise integer NOT NULL DEFAULT 0,
      convenience_fee_paise integer NOT NULL DEFAULT 200,
      currency varchar(8) NOT NULL DEFAULT 'INR',
      razorpay_order_id varchar(64) UNIQUE,
      idempotency_key varchar(64) UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
    sql`ALTER TABLE checkout_groups ADD COLUMN IF NOT EXISTS razorpay_order_id varchar(64)`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_mode varchar(16) NOT NULL DEFAULT 'SPLIT'`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS checkout_group_id uuid`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shiprocket_order_id varchar(64)`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shiprocket_shipment_id varchar(64)`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS courier_company_id integer`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_url text`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_tracking_status varchar(128)`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_tracking_at timestamptz`,
    sql`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS food_delivery boolean NOT NULL DEFAULT true`,
    sql`ALTER TABLE offers ADD COLUMN IF NOT EXISTS scope varchar(32) NOT NULL DEFAULT 'RESTAURANT_SCOPED'`,
  ];
  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (err) {
      console.warn("[ensure-kitchen-schema:guest]", err);
    }
  }
}
