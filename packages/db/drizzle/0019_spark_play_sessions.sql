-- Spark scan → WA opt-in → play context + claim order nudge
ALTER TABLE reward_claims ADD COLUMN IF NOT EXISTS order_nudge_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS spark_play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 varchar(20),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  scan_event_id uuid REFERENCES scan_events(id) ON DELETE SET NULL,
  play_path varchar(512) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS spark_play_sessions_phone_idx ON spark_play_sessions (phone_e164);
CREATE INDEX IF NOT EXISTS spark_play_sessions_scan_idx ON spark_play_sessions (scan_event_id);
