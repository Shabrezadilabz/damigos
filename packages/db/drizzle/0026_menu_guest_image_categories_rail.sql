-- S2.1: dual menu images (image_url = owner/primary, guest_image_url = guest-facing, falls back to image_url)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS guest_image_url text;

-- S2.2: category CRUD (hide flag; id/name/sort_order already exist from 0000_initial)
ALTER TABLE menu_categories ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS menu_categories_restaurant_idx ON menu_categories (restaurant_id, sort_order);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items (category_id);

-- S3.1: settlement rail tag (DIRECT = D'aMigo guest app/WA/sticker, ONDC = Beckn network) + per-rail EOD split
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rail varchar(16) NOT NULL DEFAULT 'DIRECT';
ALTER TABLE restaurant_daily_settlements ADD COLUMN IF NOT EXISTS direct_order_count integer NOT NULL DEFAULT 0;
ALTER TABLE restaurant_daily_settlements ADD COLUMN IF NOT EXISTS ondc_order_count integer NOT NULL DEFAULT 0;
ALTER TABLE restaurant_daily_settlements ADD COLUMN IF NOT EXISTS direct_share_paise integer NOT NULL DEFAULT 0;
ALTER TABLE restaurant_daily_settlements ADD COLUMN IF NOT EXISTS ondc_share_paise integer NOT NULL DEFAULT 0;
