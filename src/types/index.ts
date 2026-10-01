export type UserRole = 'SUPER_ADMIN' | 'ADMIN_TOKO' | 'KASIR';

export interface AuthUser {
  id: string;
  store_id?: string | null;
  store_name?: string | null;
  store_slug?: string | null;
  username?: string;
  email?: string;
  role: string;
  name: string;
  full_name?: string;
}

export interface User {
  id: string;
  store_id: string | null;
  username: string;
  role: UserRole;
  full_name: string;
  is_active: number;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  description: string | null;
  opening_hours: string | null;
  receipt_footer: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  icon?: string;
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  category_name?: string;
  name: string;
  barcode: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  unit: string;
  min_stock: number;
  image_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface TableItem {
  id: string;
  store_id: string;
  name: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED';
  is_active: number;
  created_at: string;
}

export type OrderStatus = 'Menunggu' | 'Diterima' | 'Diproses' | 'Siap' | 'Selesai' | 'Dibatalkan';
export type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'QRIS';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  buy_price: number;
  price: number;
  quantity: number;
  subtotal: number;
  note?: string;
}

export interface Order {
  id: string;
  store_id: string;
  order_number: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  order_type: 'DINE_IN' | 'TAKEAWAY';
  table_name?: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: 'PENDING' | 'PAID';
  notes?: string | null;
  subtotal: number;
  discount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  buy_price: number;
  sell_price: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  store_id: string;
  transaction_number: string;
  order_id?: string | null;
  cashier_id: string;
  cashier_name: string;
  customer_name?: string | null;
  table_name?: string | null;
  order_type: 'DINE_IN' | 'TAKEAWAY';
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  total_cogs: number;
  payment_method: PaymentMethod;
  amount_paid: number;
  change_amount: number;
  notes?: string | null;
  created_at: string;
  items?: TransactionItem[];
}

export interface Employee {
  id: string;
  store_id: string;
  barcode_id: string;
  name: string;
  position: string;
  phone: string;
  address?: string | null;
  hire_date: string;
  base_salary: number;
  photo_url?: string | null;
  is_active: number;
  created_at: string;
}

export interface Attendance {
  id: string;
  store_id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  check_in: string;
  check_out?: string | null;
  status: 'HADIR' | 'TERLAMBAT' | 'IZIN' | 'SAKIT';
  notes?: string | null;
  created_at: string;
}

export interface PayrollItem {
  id: string;
  payroll_id: string;
  employee_id: string;
  employee_name: string;
  position: string;
  attendance_count: number;
  base_salary: number;
  bonus: number;
  overtime: number;
  deductions: number;
  net_salary: number;
  notes?: string | null;
}

export interface Payroll {
  id: string;
  store_id: string;
  payroll_number: string;
  period_month: number;
  period_year: number;
  status: 'Draft' | 'Diproses' | 'Dibayar';
  total_payout: number;
  paid_at?: string | null;
  created_at: string;
  employee_count?: number;
  items?: PayrollItem[];
}

export interface Expense {
  id: string;
  store_id: string;
  category: 'OPERASIONAL' | 'BAHAN_BAKU' | 'GAJI' | 'SEWA' | 'UTILITAS' | 'LAINNYA';
  type: 'MODAL' | 'BIAYA_OPERASIONAL';
  amount: number;
  description: string;
  date: string;
  created_by?: string;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_id: string;
  tax_percentage: number;
  allow_dine_in: number;
  allow_takeaway: number;
  currency_symbol: string;
  qris_image_url?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  updated_at: string;
}

export interface DashboardStats {
  today_revenue: number;
  today_transactions: number;
  today_gross_profit: number;
  total_products: number;
  low_stock_count: number;
  new_orders_count: number;
  total_employees: number;
  today_attendance_count: number;
  daily_revenue_chart: { date: string; label: string; revenue: number; transactions: number }[];
  top_products: { name: string; quantity: number; revenue: number }[];
}
