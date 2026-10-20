ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bank_account_name varchar(128);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bank_account_number varchar(32);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bank_ifsc varchar(16);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bank_name varchar(128);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS payout_frozen_until timestamptz;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS payout_freeze_reason varchar(128);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bank_details_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS restaurant_daily_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  business_date varchar(10) NOT NULL,
  order_count integer NOT NULL DEFAULT 0,
  payments_count integer NOT NULL DEFAULT 0,
  gross_sales_paise integer NOT NULL DEFAULT 0,
  restaurant_share_paise integer NOT NULL DEFAULT 0,
  platform_fee_paise integer NOT NULL DEFAULT 0,
  delivery_fee_paise integer NOT NULL DEFAULT 0,
  waiting_penalty_paise integer NOT NULL DEFAULT 0,
  status varchar(32) NOT NULL DEFAULT 'pending',
  invoice_number varchar(64),
  invoice_json text,
  settled_at timestamptz,
  freeze_note varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, business_date)
);
