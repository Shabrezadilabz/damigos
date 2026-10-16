CREATE TABLE IF NOT EXISTS menu_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  status varchar(32) NOT NULL DEFAULT 'queued',
  progress_pct integer NOT NULL DEFAULT 0,
  source_filename varchar(255) NOT NULL,
  error_message text,
  items_created integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS menu_import_jobs_restaurant_idx ON menu_import_jobs(restaurant_id);
