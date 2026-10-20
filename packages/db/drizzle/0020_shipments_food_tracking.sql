ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shiprocket_order_id varchar(64);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS shiprocket_shipment_id varchar(64);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS courier_company_id integer;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_tracking_status varchar(128);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_tracking_at timestamptz;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS food_delivery boolean NOT NULL DEFAULT true;
ALTER TABLE shipments ALTER COLUMN carrier TYPE varchar(64);
ALTER TABLE shipments ALTER COLUMN status TYPE varchar(64);
