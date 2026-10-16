CREATE TABLE IF NOT EXISTS food_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(160) NOT NULL UNIQUE,
  name varchar(255) NOT NULL,
  cuisine varchar(64) NOT NULL,
  category varchar(64) NOT NULL,
  is_veg boolean NOT NULL,
  image_url text NOT NULL,
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  search_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_catalog_search_text_idx ON food_catalog USING gin (to_tsvector('simple', search_text));
CREATE INDEX IF NOT EXISTS food_catalog_name_lower_idx ON food_catalog (lower(name));

ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS food_catalog_id uuid REFERENCES food_catalog(id);
