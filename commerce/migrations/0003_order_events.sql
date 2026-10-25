CREATE TABLE sandbox_order_events (
  event_key TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES sandbox_orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('PAYMENT_REFUNDED','PAYMENT_REVERSED','PAYMENT_DECLINED','PAYMENT_EXCEPTION_UNCONFIRMED')),
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged')),
  acknowledged_at TEXT
);
CREATE INDEX sandbox_order_events_order ON sandbox_order_events(order_id);
