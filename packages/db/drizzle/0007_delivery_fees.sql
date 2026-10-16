ALTER TABLE carts
  ADD COLUMN IF NOT EXISTS delivery_pincode varchar(6),
  ADD COLUMN IF NOT EXISTS delivery_fee_paise integer NOT NULL DEFAULT 0;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_pincode varchar(6),
  ADD COLUMN IF NOT EXISTS delivery_fee_paise integer NOT NULL DEFAULT 0;
