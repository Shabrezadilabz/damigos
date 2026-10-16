ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS razorpay_linked_account_id varchar(64),
  ADD COLUMN IF NOT EXISTS razorpay_kyc_status varchar(32) DEFAULT 'not_linked' NOT NULL,
  ADD COLUMN IF NOT EXISTS petpooja_outlet_id varchar(64),
  ADD COLUMN IF NOT EXISTS restroworks_location_id varchar(64);
