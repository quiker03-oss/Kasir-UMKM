// Centralized typed API Client for KASIR UMKM

export const TOKEN_KEY = 'kasir_umkm_token';
export const USER_KEY = 'kasir_umkm_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: any): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): any | null {
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  try {
    return JSON.parse(u);
  } catch {
    return null;
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({ success: false, message: 'Gagal memproses respon server.' }));

  if (!res.ok) {
    throw new Error(data.message || 'Terjadi kesalahan sistem.');
  }

  return data;
}

export const api = {
  // Auth Helpers
  getStoredUser,
  getStoredToken,
  logout: () => clearStoredAuth(),

  // Auth
  login: async (body: { username?: string; email?: string; password: string }) => {
    const res = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (res.success && res.token && res.user) {
      setStoredAuth(res.token, res.user);
    }
    return res;
  },
  register: async (body: any) => {
    const res = await request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    if (res.success && res.token && res.user) {
      setStoredAuth(res.token, res.user);
    }
    return res;
  },
  getMe: () => request('/api/auth/me'),

  // Superadmin
  getStores: () => request('/api/superadmin/stores'),
  getSuperAdminStores: () => request('/api/superadmin/stores'),
  createStore: (body: any) => request('/api/superadmin/stores', { method: 'POST', body: JSON.stringify(body) }),
  createSuperAdminStore: (body: any) => request('/api/superadmin/stores', { method: 'POST', body: JSON.stringify(body) }),
  updateSuperAdminStoreStatus: (id: string, is_active: boolean) =>
    request(`/api/superadmin/stores/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  updateStore: (id: string, body: any) => request(`/api/superadmin/stores/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStore: (id: string) => request(`/api/superadmin/stores/${id}`, { method: 'DELETE' }),

  // Public customer store
  getPublicStores: () => request('/api/public/stores'),
  getPublicStore: (slug: string) => request(`/api/public/store/${slug}`),
  createPublicOrder: (body: any) => request('/api/public/orders', { method: 'POST', body: JSON.stringify(body) }),
  trackOrder: (orderNumber: string) => request(`/api/public/orders/track/${orderNumber}`),

  // File Upload (Gallery / Camera)
  uploadImage: (base64Image: string, filename?: string) =>
    request<{ success: boolean; url: string; filename: string; message?: string }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image, filename }),
    }),

  // Store Profile & Settings
  getStoreProfile: () => request('/api/store/profile'),
  updateStoreProfile: (body: any) => request('/api/store/profile', { method: 'PUT', body: JSON.stringify(body) }),

  // Products & Categories
  getCategories: () => request('/api/products/categories'),
  createCategory: (body: { name: string; icon?: string }) =>
    request('/api/products/categories', { method: 'POST', body: JSON.stringify(body) }),
  deleteCategory: (id: string) => request(`/api/products/categories/${id}`, { method: 'DELETE' }),

  getProducts: (params?: { search?: string; category_id?: string; low_stock?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.category_id) q.append('category_id', params.category_id);
    if (params?.low_stock) q.append('low_stock', 'true');
    return request(`/api/products?${q.toString()}`);
  },
  getProductByBarcode: (barcode: string) => request(`/api/products/barcode/${encodeURIComponent(barcode)}`),
  createProduct: (body: any) => request('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: any) => request(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateProductImage: (id: string, image_url: string | null) =>
    request<{ success: boolean; message: string; image_url?: string }>(`/api/products/${id}/image`, {
      method: 'PATCH',
      body: JSON.stringify({ image_url }),
    }),
  adjustStock: (id: string, body: { type: 'IN' | 'OUT' | 'ADJUST'; quantity: number; note?: string }) =>
    request(`/api/products/${id}/stock-adjust`, { method: 'POST', body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request(`/api/products/${id}`, { method: 'DELETE' }),

  // Tables
  getTables: () => request('/api/tables'),
  createTable: (body: { name: string; capacity: number }) =>
    request('/api/tables', { method: 'POST', body: JSON.stringify(body) }),
  updateTable: (id: string, body: any) => request(`/api/tables/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTable: (id: string) => request(`/api/tables/${id}`, { method: 'DELETE' }),

  // POS & Transactions
  checkout: (body: any) => request('/api/pos/checkout', { method: 'POST', body: JSON.stringify(body) }),
  getTransactions: (params?: { start_date?: string; end_date?: string; search?: string; payment_method?: string }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.search) q.append('search', params.search);
    if (params?.payment_method) q.append('payment_method', params.payment_method);
    return request(`/api/pos/transactions?${q.toString()}`);
  },
  getTransactionReceipt: (id: string) => request(`/api/pos/transactions/${id}`),
  refundTransaction: (id: string, reason?: string) =>
    request(`/api/pos/transactions/${id}/refund`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Online Orders
  getOrders: (params?: { status?: string; date?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.date) q.append('date', params.date);
    return request(`/api/orders?${q.toString()}`);
  },
  updateOrderStatus: (id: string, body: { status: string; payment_status?: string }) =>
    request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteOrder: (id: string) => request(`/api/orders/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: () => request('/api/employees'),
  createEmployee: (body: any) => request('/api/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id: string, body: any) => request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteEmployee: (id: string) => request(`/api/employees/${id}`, { method: 'DELETE' }),

  // Attendance
  scanAttendance: (barcode_id: string) =>
    request('/api/attendance/scan', { method: 'POST', body: JSON.stringify({ barcode_id }) }),
  getAttendanceHistory: (params?: { start_date?: string; end_date?: string; employee_id?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.employee_id) q.append('employee_id', params.employee_id);
    if (params?.status) q.append('status', params.status);
    return request(`/api/attendance?${q.toString()}`);
  },

  // Payroll
  getPayrolls: () => request('/api/payroll'),
  getPayrollDetail: (id: string) => request(`/api/payroll/${id}`),
  getAllSlipsForPayroll: (id: string) => request(`/api/payroll/${id}/all-slips`),
  getEmployeeSalarySlip: (employeeId: string) => request(`/api/payroll/employee/${employeeId}/slip`),
  createPayroll: (body: { period_month: number; period_year: number; items?: any[] }) =>
    request('/api/payroll', { method: 'POST', body: JSON.stringify(body) }),
  updatePayrollStatus: (id: string, status: 'Draft' | 'Diproses' | 'Dibayar') =>
    request(`/api/payroll/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updatePayrollItem: (itemId: string, body: any) =>
    request(`/api/payroll/items/${itemId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePayroll: (id: string) => request(`/api/payroll/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: (params?: { start_date?: string; end_date?: string; category?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.category) q.append('category', params.category);
    if (params?.type) q.append('type', params.type);
    return request(`/api/expenses?${q.toString()}`);
  },
  createExpense: (body: any) => request('/api/expenses', { method: 'POST', body: JSON.stringify(body) }),
  deleteExpense: (id: string) => request(`/api/expenses/${id}`, { method: 'DELETE' }),

  // Reports
  getFinanceReport: (params?: {
    start_date?: string;
    end_date?: string;
    cashier_id?: string;
    payment_method?: string;
    product_id?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.cashier_id) q.append('cashier_id', params.cashier_id);
    if (params?.payment_method) q.append('payment_method', params.payment_method);
    if (params?.product_id) q.append('product_id', params.product_id);
    return request(`/api/reports/finance?${q.toString()}`);
  },
  getTopProducts: (params?: { start_date?: string; end_date?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.start_date) q.append('start_date', params.start_date);
    if (params?.end_date) q.append('end_date', params.end_date);
    if (params?.limit) q.append('limit', String(params.limit));
    return request(`/api/reports/top-products?${q.toString()}`);
  },

  // Dashboard
  getDashboardStats: (params?: { today?: string }) => {
    const q = new URLSearchParams();
    if (params?.today) q.append('today', params.today);
    const queryStr = q.toString();
    return request(`/api/dashboard/stats${queryStr ? '?' + queryStr : ''}`);
  },
};

// Simple audio beep generator for barcode scanner
export function playBeep(type: 'success' | 'error' = 'success'): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6 note
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio context errors
  }
}
