-- Kitchen GPS, prep SLA, offer.scope, grow loyalty (aligns with ensure-kitchen/grow schema)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS geo_updated_at timestamptz;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS grow_loyalty_config text;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS brand_kit text;

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_category varchar(16) NOT NULL DEFAULT 'COOKED_15M';
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS prep_minutes integer;

ALTER TABLE offers ADD COLUMN IF NOT EXISTS scope varchar(32) NOT NULL DEFAULT 'RESTAURANT_SCOPED';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_group_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS leg_index integer NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS committed_prep_minutes integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extended_prep_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prep_deadline_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_arrived_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_for_pickup_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiting_penalty_paise integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiting_penalty_finalized boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS checkout_groups (
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
);

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS pickup_mode varchar(16) NOT NULL DEFAULT 'SPLIT';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS checkout_group_id uuid;
