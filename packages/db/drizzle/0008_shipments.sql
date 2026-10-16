CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  carrier varchar(32) NOT NULL DEFAULT 'Shiprocket',
  awb varchar(64),
  status varchar(32) NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shipments_order_id_idx ON shipments(order_id);
