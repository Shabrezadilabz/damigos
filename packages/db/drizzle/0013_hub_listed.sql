ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS hub_listed boolean NOT NULL DEFAULT false;

UPDATE restaurants SET hub_listed = true WHERE slug = 'biryani-box-koramangala';
