CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'Draft',
  audience varchar(32) NOT NULL DEFAULT 'all',
  template_key varchar(64),
  scheduled_at timestamptz,
  estimated_recipients integer NOT NULL DEFAULT 0,
  skipped_seven_day_cap integer NOT NULL DEFAULT 0,
  skipped_opt_in integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_restaurant_created_idx ON campaigns(restaurant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  status varchar(32) NOT NULL DEFAULT 'pending',
  kapso_message_id varchar(64),
  error_message varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, customer_id)
);

CREATE INDEX IF NOT EXISTS campaign_recipients_campaign_status_idx
  ON campaign_recipients(campaign_id, status);

CREATE TABLE IF NOT EXISTS message_delivery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  channel varchar(32) NOT NULL DEFAULT 'whatsapp',
  message_class varchar(32) NOT NULL DEFAULT 'marketing',
  template_key varchar(64),
  kapso_message_id varchar(64),
  status varchar(32) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_delivery_log_cap_idx
  ON message_delivery_log(restaurant_id, customer_id, created_at DESC);
