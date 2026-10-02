import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  Utensils,
  Users,
  Clock,
  Wallet,
  DollarSign,
  BarChart3,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Store as StoreIcon,
  Home,
} from 'lucide-react';
import { api } from './lib/api.ts';
import { AuthUser } from './types/index.ts';

// Pages
import LandingPageView from './pages/LandingPageView.tsx';
import LoginView from './pages/LoginView.tsx';
import SuperAdminPortalSite from './pages/SuperAdminPortalSite.tsx';
import PublicCustomerStore from './pages/PublicCustomerStore.tsx';
import DashboardView from './pages/DashboardView.tsx';
import PosView from './pages/PosView.tsx';
import OnlineOrdersView from './pages/OnlineOrdersView.tsx';
import ProductsView from './pages/ProductsView.tsx';
import TablesView from './pages/TablesView.tsx';
import EmployeesView from './pages/EmployeesView.tsx';
import AttendanceView from './pages/AttendanceView.tsx';
import PayrollView from './pages/PayrollView.tsx';
import ExpensesView from './pages/ExpensesView.tsx';
import ReportsView from './pages/ReportsView.tsx';
import StoreSettingsView from './pages/StoreSettingsView.tsx';
import ForbiddenView from './components/ForbiddenView.tsx';

type AppRoute = 'landing' | 'customer' | 'login' | 'superadmin' | 'app';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(api.getStoredUser());
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publicStoreSlug, setPublicStoreSlug] = useState<string | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('landing');
  const [productsFilterLowStock, setProductsFilterLowStock] = useState(false);

  // Validate session against database on startup / page refresh
  useEffect(() => {
    const token = api.getStoredToken();
    if (!token) return;

    api
      .getMe()
      .then((res) => {
        if (res.success && res.user) {
          const freshUser: AuthUser = {
            ...res.user,
            name: res.user.full_name || res.user.name,
          };
          setCurrentUser(freshUser);
          localStorage.setItem('kasir_umkm_user', JSON.stringify(freshUser));
        }
      })
      .catch((err) => {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('sesi') || msg.includes('autentikasi') || msg.includes('dinonaktifkan')) {
          api.logout();
          setCurrentUser(null);
        }
      });
  }, []);

  // Handle URL Hash and Path routing
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = (window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();

      const storeMatch = window.location.pathname.match(/\/store\/([^/?#]+)/i) || window.location.hash.match(/#store\/([^/?#]+)/i);
      if (storeMatch && storeMatch[1]) {
        setPublicStoreSlug(storeMatch[1]);
        setCurrentRoute('customer');
      } else if (path === '/customer' || hash === '#customer' || hash === '#pelanggan' || hash === '#shop') {
        setPublicStoreSlug(currentUser?.store_slug || 'kopi-nusantara');
        setCurrentRoute('customer');
      } else if (
        path === '/super-admin' ||
        path === '/superadmin' ||
        hash === '#super-admin' ||
        hash === '#superadmin' ||
        hash === '#admin-portal'
      ) {
        setPublicStoreSlug(null);
        setCurrentRoute('superadmin');
      } else if (
        path === '/cashier' ||
        hash === '#cashier' ||
        path === '/kasir' ||
        hash === '#kasir' ||
        path === '/admin' ||
        hash === '#admin' ||
        hash === '#pos' ||
        hash === '#app'
      ) {
        setPublicStoreSlug(null);
        if (currentUser) {
          setCurrentRoute('app');
        } else {
          setCurrentRoute('login');
        }
      } else if (hash === '#login' || hash === '#masuk') {
        setPublicStoreSlug(null);
        if (currentUser) {
          setCurrentRoute('app');
        } else {
          setCurrentRoute('login');
        }
      } else {
        // Default root / or #landing or #beranda:
        // 1. HALAMAN DEPAN TOKO / LANDING PAGE!
        setPublicStoreSlug(null);
        setCurrentRoute('landing');
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, [currentUser]);

  // Poll pending orders count if logged in
  useEffect(() => {
    if (!currentUser) return;
    const fetchPending = async () => {
      try {
        const res = await api.getOrders({ status: 'Menunggu' });
        if (res.success && res.orders) {
          setPendingOrdersCount(res.orders.length);
        }
      } catch (err) {
        // silent
      }
    };

    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    const roleUpper = (user.role || '').toUpperCase();
    if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN') {
      window.location.hash = '#super-admin';
      setCurrentRoute('superadmin');
    } else {
      window.location.hash = '#cashier';
      setCurrentRoute('app');
      if (roleUpper === 'KASIR' || roleUpper === 'CASHIER') {
        setActiveTab('pos');
      } else {
        setActiveTab('dashboard');
      }
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    window.location.hash = '';
    setCurrentRoute('landing');
  };

  const openPublicCustomerStore = (slug?: string | null) => {
    const targetSlug = slug || currentUser?.store_slug || 'kopi-nusantara';
    window.location.hash = `#store/${targetSlug}`;
    setPublicStoreSlug(targetSlug);
    setCurrentRoute('customer');
  };

  const goToStaffLogin = () => {
    window.location.hash = '#login';
    setCurrentRoute('login');
  };

  const goToSuperAdmin = () => {
    window.location.hash = '#super-admin';
    setCurrentRoute('superadmin');
  };

  const goToLanding = () => {
    window.location.hash = '';
    setCurrentRoute('landing');
  };

  const goToStoreApp = () => {
    window.location.hash = '#cashier';
    setCurrentRoute('app');
  };

  const userRole = (currentUser?.role || '').toUpperCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';

  // ================= 1. WEBSITE PELANGGAN (#customer, /customer, #store/:slug) =================
  if (currentRoute === 'customer') {
    return (
      <PublicCustomerStore
        slug={publicStoreSlug || currentUser?.store_slug || 'kopi-nusantara'}
        onNavigateHome={goToLanding}
        onBackToAdmin={goToStaffLogin}
      />
    );
  }

  // ================= 2. WEBSITE SUPER ADMIN (#super-admin, /super-admin) =================
  if (currentRoute === 'superadmin') {
    return (
      <SuperAdminPortalSite
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onGoToHome={goToLanding}
        onOpenPublicShop={(slug) => openPublicCustomerStore(slug || 'kopi-nusantara')}
      />
    );
  }

  // ================= 3. LOGIN STAF TOKO (Kasir & Admin Toko) =================
  if (currentRoute === 'login' && !currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onOpenPublicShop={(slug) => openPublicCustomerStore(slug || 'kopi-nusantara')}
        onGoToHome={goToLanding}
      />
    );
  }

  // ================= 4. HALAMAN DEPAN TOKO / LANDING PAGE (Default saat dibuka) =================
  if (currentRoute === 'landing') {
    return (
      <LandingPageView
        currentUser={currentUser}
        onGoToLogin={goToStaffLogin}
        onGoToDashboard={goToStoreApp}
        onOpenCustomerArea={openPublicCustomerStore}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // If visitor is not logged in and tried to reach store dashboard:
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onOpenPublicShop={(slug) => openPublicCustomerStore(slug || 'kopi-nusantara')}
        onGoToHome={goToLanding}
      />
    );
  }

  // 5. LOGGED-IN STORE APPLICATION (Admin Toko & Kasir)
  const isAdmin = userRole === 'ADMIN_TOKO' || userRole === 'ADMIN' || userRole === 'OWNER';
  const roleLabel = isAdmin ? 'Admin Toko' : 'Kasir';

  // Navigation Items for Store Staff (Kasir & Admin Toko)
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true,
    },
    {
      id: 'pos',
      label: 'Kasir POS',
      icon: ShoppingCart,
      allowed: true,
    },
    {
      id: 'orders',
      label: 'Pesanan Online',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      allowed: true,
    },
    {
      id: 'products',
      label: 'Produk & Stok',
      icon: Package,
      allowed: true,
    },
    {
      id: 'tables',
      label: 'Nomor Meja',
      icon: Utensils,
      allowed: true,
    },
    {
      id: 'attendance',
      label: 'Absensi Barcode',
      icon: Clock,
      allowed: true,
    },
    {
      id: 'employees',
      label: 'Karyawan',
      icon: Users,
      allowed: isAdmin,
    },
    {
      id: 'payroll',
      label: 'Gaji & Slip Gaji',
      icon: Wallet,
      allowed: isAdmin,
    },
    {
      id: 'expenses',
      label: 'Pengeluaran',
      icon: DollarSign,
      allowed: isAdmin,
    },
    {
      id: 'reports',
      label: 'Laporan Keuangan',
      icon: BarChart3,
      allowed: true,
    },
    {
      id: 'settings',
      label: 'Pengaturan Toko',
      icon: Settings,
      allowed: isAdmin,
    },
  ];

  const allowedNav = navItems.filter((item) => item.allowed);
  const isCurrentTabAllowed = allowedNav.some((item) => item.id === activeTab);
  
  if (!isCurrentTabAllowed) {
    const deniedItem = navItems.find((item) => item.id === activeTab);
    return (
      <ForbiddenView
        currentUser={currentUser}
        attemptedArea={deniedItem ? `Menu ${deniedItem.label}` : 'Area Khusus Admin Toko'}
        requiredRole="ADMIN_TOKO / OWNER"
        onGoHome={goToLanding}
        onGoAuthorizedArea={() => setActiveTab('pos')}
        onLogout={handleLogout}
      />
    );
  }

  const effectiveTab = activeTab;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 shadow-xl z-20 no-print">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <StoreIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">
                  KASIR POS
                </h1>
                <span className="text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                  Outlet
                </span>
              </div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider truncate max-w-[130px]">
                {currentUser.store_name || 'Toko'}
              </p>
            </div>
          </div>
        </div>

        {/* User Role Badge */}
        <div className="px-5 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="truncate">
            <span className="font-bold text-white block truncate">{currentUser.name || currentUser.full_name}</span>
            <span className="text-[10px] text-slate-400 capitalize">{roleLabel}</span>
          </div>
          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
              isAdmin
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
            }`}
          >
            {roleLabel}
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
          {allowedNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800 space-y-1.5">
          {/* Super Admin Link (Only visible if logged in as SUPER_ADMIN) */}
          {isSuperAdmin && (
            <button
              onClick={goToSuperAdmin}
              className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:bg-purple-950/40 hover:text-purple-200 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>Portal Super Admin</span>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-30 no-print">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold">
            <StoreIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-extrabold text-xs">KASIR POS</h1>
              <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded-sm uppercase font-bold">Outlet</span>
            </div>
            <p className="text-[10px] text-emerald-400 font-semibold truncate max-w-[150px]">
              {currentUser.store_name}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {pendingOrdersCount > 0 && (
            <button
              onClick={() => setActiveTab('orders')}
              className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center space-x-1"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>{pendingOrdersCount}</span>
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-xs flex flex-col justify-end no-print">
          <div className="bg-slate-900 text-white rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto border-t border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm">{currentUser.name}</h3>
                <p className="text-xs text-slate-400">{currentUser.store_name}</p>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {allowedNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold ${
                      isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              {isSuperAdmin && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    goToSuperAdmin();
                  }}
                  className="w-full py-2.5 bg-purple-950/60 text-purple-300 border border-purple-800/40 rounded-xl text-xs font-bold flex items-center justify-center space-x-2"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Portal Super Admin</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-2.5 text-rose-400 hover:bg-rose-950/40 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {effectiveTab === 'dashboard' && (
          <DashboardView
            onNavigate={(t) => {
              if (t === 'products') {
                setProductsFilterLowStock(true);
              } else {
                setProductsFilterLowStock(false);
              }
              setActiveTab(t);
            }}
          />
        )}
        {effectiveTab === 'pos' && <PosView />}
        {effectiveTab === 'orders' && <OnlineOrdersView />}
        {effectiveTab === 'products' && (
          <ProductsView initialFilterLowStock={productsFilterLowStock} />
        )}
        {effectiveTab === 'tables' && <TablesView />}
        {effectiveTab === 'attendance' && <AttendanceView />}
        {effectiveTab === 'employees' && <EmployeesView />}
        {effectiveTab === 'payroll' && <PayrollView />}
        {effectiveTab === 'expenses' && <ExpensesView />}
        {effectiveTab === 'reports' && <ReportsView />}
        {effectiveTab === 'settings' && (
          <StoreSettingsView onOpenPublicShop={(slug) => openPublicCustomerStore(slug)} />
        )}
      </main>
    </div>
  );
}
