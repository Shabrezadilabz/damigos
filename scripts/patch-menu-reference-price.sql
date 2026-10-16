-- Align menu_items + import jobs with current @damigos/db schema (fixes CRM menu 500)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS reference_price_paise integer;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_confidence integer;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS import_job_id uuid;

CREATE TABLE IF NOT EXISTS menu_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  progress_pct integer NOT NULL DEFAULT 0,
  source_filename text NOT NULL,
  error_message text,
  items_created integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
