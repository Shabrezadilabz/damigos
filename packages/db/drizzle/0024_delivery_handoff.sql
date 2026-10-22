ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS shiprocket_pickup_location varchar(36);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_code varchar(8);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_verified_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp_hash varchar(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp_sent_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp_verified_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_verify_source varchar(32);
