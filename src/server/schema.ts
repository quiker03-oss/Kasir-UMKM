export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE,
  custom_domain TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  description TEXT,
  opening_hours TEXT,
  receipt_footer TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  store_id TEXT,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  buy_price REAL NOT NULL DEFAULT 0,
  sell_price REAL NOT NULL DEFAULT 0,
  stock REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  min_stock REAL NOT NULL DEFAULT 5,
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL,
  previous_stock REAL NOT NULL,
  current_stock REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spend REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tables (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  order_number TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  order_type TEXT NOT NULL,
  table_name TEXT,
  status TEXT NOT NULL DEFAULT 'Menunggu',
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  buy_price REAL NOT NULL,
  price REAL NOT NULL,
  quantity REAL NOT NULL,
  subtotal REAL NOT NULL,
  note TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  transaction_number TEXT NOT NULL UNIQUE,
  order_id TEXT,
  cashier_id TEXT NOT NULL,
  cashier_name TEXT NOT NULL,
  customer_name TEXT,
  table_name TEXT,
  order_type TEXT NOT NULL DEFAULT 'DINE_IN',
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  total_cogs REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  amount_paid REAL NOT NULL,
  change_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  barcode TEXT,
  buy_price REAL NOT NULL,
  sell_price REAL NOT NULL,
  quantity REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  barcode_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  hire_date TEXT NOT NULL,
  base_salary REAL NOT NULL DEFAULT 0,
  photo_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT NOT NULL,
  check_out TEXT,
  status TEXT NOT NULL DEFAULT 'HADIR',
  notes TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  payroll_number TEXT NOT NULL UNIQUE,
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  total_payout REAL NOT NULL DEFAULT 0,
  paid_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id TEXT PRIMARY KEY,
  payroll_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  position TEXT NOT NULL,
  attendance_count INTEGER NOT NULL DEFAULT 0,
  base_salary REAL NOT NULL,
  bonus REAL NOT NULL DEFAULT 0,
  overtime REAL NOT NULL DEFAULT 0,
  deductions REAL NOT NULL DEFAULT 0,
  net_salary REAL NOT NULL,
  notes TEXT,
  FOREIGN KEY (payroll_id) REFERENCES payroll(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'BIAYA_OPERASIONAL',
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL UNIQUE,
  tax_percentage REAL DEFAULT 0,
  allow_dine_in INTEGER DEFAULT 1,
  allow_takeaway INTEGER DEFAULT 1,
  currency_symbol TEXT DEFAULT 'Rp',
  qris_image_url TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- Multi-Tenant Performance Indices
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_barcode ON products(store_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_tables_store_id ON tables(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_store_created ON orders(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_store_created ON transactions(store_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_store_id ON payments(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_employees_store_id ON employees(store_id);
CREATE INDEX IF NOT EXISTS idx_attendance_store_id ON attendance(store_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_store_id ON expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_payroll_store_id ON payroll(store_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_store_id ON activity_logs(store_id);
`;
