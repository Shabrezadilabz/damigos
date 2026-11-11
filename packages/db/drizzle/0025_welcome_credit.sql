-- S1.1: one-time ₹1000 Grow welcome credit flag (idempotent grant)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS welcome_credit_granted_at timestamptz;
