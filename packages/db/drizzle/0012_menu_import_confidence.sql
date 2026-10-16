ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS import_confidence integer,
  ADD COLUMN IF NOT EXISTS import_job_id uuid REFERENCES menu_import_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS menu_items_import_job_idx ON menu_items(import_job_id);
