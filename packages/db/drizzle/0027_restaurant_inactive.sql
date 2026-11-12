ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS inactive boolean NOT NULL DEFAULT false;
