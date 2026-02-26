CREATE TABLE print_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  design_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  design_name TEXT DEFAULT 'Untitled',
  design_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  paper_quality TEXT NOT NULL DEFAULT 'standard',
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_area TEXT,
  delivery_landmark TEXT,
  delivery_region TEXT NOT NULL DEFAULT 'greater-accra',
  print_cost_pesewas INTEGER NOT NULL,
  delivery_fee_pesewas INTEGER NOT NULL,
  total_pesewas INTEGER NOT NULL,
  currency TEXT DEFAULT 'GHS',
  paystack_reference TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending',
  paid_at TEXT,
  fulfillment_status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  printer_reference TEXT,
  estimated_delivery TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_print_orders_user ON print_orders(user_id);
CREATE INDEX idx_print_orders_ref ON print_orders(paystack_reference);
CREATE INDEX idx_print_orders_status ON print_orders(fulfillment_status);
CREATE INDEX idx_print_orders_payment ON print_orders(payment_status);
