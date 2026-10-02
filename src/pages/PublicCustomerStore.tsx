import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Store as StoreIcon,
  ChevronRight,
  UtensilsCrossed,
  X,
  MessageSquare,
  Send,
  Check,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Store, Category, Product, TableItem } from '../types/index.ts';

export interface CustomerCartItem {
  product: Product;
  quantity: number;
  note: string;
}

interface PublicCustomerStoreProps {
  slug: string;
  onNavigateHome?: () => void;
  onBackToAdmin?: () => void;
}

export default function PublicCustomerStore({
  slug,
  onNavigateHome,
  onBackToAdmin,
}: PublicCustomerStoreProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Direct Order Modal State (when "Pesan Menu Ini" is clicked)
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(1);
  const [orderNote, setOrderNote] = useState<string>('');

  // Cart State (Persisted in localStorage by store slug)
  const [cart, setCart] = useState<CustomerCartItem[]>(() => {
    try {
      const saved = localStorage.getItem(`umkm_cart_${slug}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cart & Checkout Drawer
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);

  // Checkout Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableName, setTableName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'QRIS'>('TUNAI');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Success Confirmation Modal
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2800);
  };

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`umkm_cart_${slug}`, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cart, slug]);

  useEffect(() => {
    loadStoreData();
  }, [slug]);

  const loadStoreData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPublicStore(slug);
      if (res.success && res.store) {
        setStore(res.store);
        setSettings(res.settings);
        setCategories(res.categories || []);
        setProducts(res.products || []);
        setTables(res.tables || []);
        if (res.tables && res.tables.length > 0 && !tableName) {
          setTableName(res.tables[0].name);
        }
      } else {
        setError(res.message || 'Toko tidak ditemukan.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat katalog toko.');
    } finally {
      setLoading(false);
    }
  };

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartAmount = cart.reduce((sum, item) => sum + item.product.sell_price * item.quantity, 0);

  // 1. Open Item Order Modal on the same page
  const handleOpenItemOrder = (product: Product) => {
    setSelectedProductForOrder(product);
    setOrderQuantity(1);
    setOrderNote('');
  };

  // 2. Add to Cart from Modal
  const handleAddToCart = () => {
    if (!selectedProductForOrder) return;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.product.id === selectedProductForOrder.id && it.note === orderNote.trim()
      );

      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += orderQuantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            product: selectedProductForOrder,
            quantity: orderQuantity,
            note: orderNote.trim(),
          },
        ];
      }
    });

    showToast(`${selectedProductForOrder.name} (${orderQuantity}) berhasil ditambahkan ke keranjang!`);
    setSelectedProductForOrder(null);
  };

  // Update Cart Quantity
  const handleUpdateCartQty = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index].quantity = newQty;
      }
      return updated;
    });
  };

  // Remove Item from Cart
  const handleRemoveCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // 3. Checkout Submit
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store?.id) return;
    if (cart.length === 0) {
      setCheckoutError('Keranjang belanja masih kosong.');
      return;
    }
    if (!customerName.trim()) {
      setCheckoutError('Silakan masukkan nama pemesan.');
      return;
    }
    if (!customerPhone.trim()) {
      setCheckoutError('Silakan masukkan nomor WhatsApp / HP.');
      return;
    }
    if (orderType === 'DINE_IN' && !tableName.trim()) {
      setCheckoutError('Silakan masukkan nomor meja untuk makan di tempat.');
      return;
    }

    try {
      setSubmittingOrder(true);
      setCheckoutError(null);

      const payload = {
        store_id: store.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        order_type: orderType,
        table_name: orderType === 'DINE_IN' ? tableName.trim() : null,
        payment_method: paymentMethod,
        notes: orderNotes.trim() || undefined,
        items: cart.map((it) => ({
          product_id: it.product.id,
          product_name: it.product.name,
          quantity: it.quantity,
          note: it.note || '',
        })),
      };

      const res = await api.createPublicOrder(payload);

      if (res.success && res.order) {
        setPlacedOrder({
          ...res.order,
          store_name: store.name,
          store_phone: store.whatsapp || store.phone,
          items: [...cart],
          total_amount: totalCartAmount,
        });

        // Clear cart
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutStep(false);
        setIsSuccessModalOpen(true);

        // Broadcast event so cashier sees incoming order immediately
        window.dispatchEvent(new CustomEvent('orders:updated', { detail: res.order }));
        window.dispatchEvent(new CustomEvent('order:placed', { detail: res.order }));
      } else {
        setCheckoutError(res.message || 'Gagal membuat pesanan. Silakan periksa formulir.');
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Terjadi kesalahan saat memproses pesanan.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Memuat katalog menu toko...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl shadow-xl text-center space-y-4 border border-slate-200">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Toko Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'Alamat toko yang Anda tuju tidak tersedia atau telah dinonaktifkan.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            {onNavigateHome && (
              <button
                onClick={onNavigateHome}
                className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Kembali ke Beranda
              </button>
            )}
            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Login Staf Toko
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-xl flex items-center space-x-2 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Toko */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo & Store Info */}
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 overflow-hidden font-black text-lg shrink-0">
              {store.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <StoreIcon className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="truncate">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base block leading-snug truncate">
                {store.name}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline-block">
                {store.opening_hours || 'Buka Setiap Hari: 08:00 - 22:00 WIB'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Header Cart Button */}
            <button
              onClick={() => {
                setIsCheckoutStep(false);
                setIsCartOpen(true);
              }}
              className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-2 cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="w-4 h-4" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-400 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {totalCartCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">
                {totalCartCount > 0 ? `Keranjang (${totalCartCount})` : 'Keranjang'}
              </span>
            </button>

            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="px-3 sm:px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                <span>Login Staf</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Toko */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white py-10 lg:py-12 border-b border-slate-200">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Selamat Datang di {store.name}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Pesan Menu Favorit Anda
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {store.description ||
                'Pilih menu makanan atau minuman favorit Anda langsung dari halaman ini. Nikmati sajian segar, higienis, dan terjangkau.'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2 text-xs font-semibold text-slate-300">
              <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{store.opening_hours || '08:00 - 22:00 WIB'}</span>
              </div>
              {store.address && (
                <div className="flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-xs">{store.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Katalog Menu & Pemesanan Langsung */}
      <section id="katalog-menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1 w-full pb-28 sm:pb-12">
        {/* Section Title & Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Katalog Menu & Pemesanan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih makanan atau minuman favorit Anda. Tekan <b>Pesan Menu Ini</b> untuk langsung memesan tanpa berpindah halaman.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari menu makanan atau minuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-2xs cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua Menu ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-2xs cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-xs font-bold text-slate-700">Menu belum ditemukan.</p>
            <p className="text-[11px] text-slate-400">Silakan ubah kata kunci atau pilih kategori menu lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((p) => {
              const inCartItem = cart.find((it) => it.product.id === p.id);

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-emerald-300 transition-all group relative"
                >
                  {/* Badge if already in cart */}
                  {inCartItem && (
                    <div className="absolute top-2 right-2 z-10 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>{inCartItem.quantity} di keranjang</span>
                    </div>
                  )}

                  <div>
                    {/* Foto Produk */}
                    <div
                      onClick={() => handleOpenItemOrder(p)}
                      className="aspect-4/3 overflow-hidden bg-slate-100 relative cursor-pointer"
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                          <UtensilsCrossed className="w-7 h-7 text-slate-300 stroke-1" />
                        </div>
                      )}
                      {p.category_name && (
                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                          {p.category_name}
                        </span>
                      )}
                    </div>

                    {/* Info Produk */}
                    <div className="p-3 space-y-1">
                      <h3
                        onClick={() => handleOpenItemOrder(p)}
                        className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-snug cursor-pointer hover:text-emerald-700 transition-colors"
                      >
                        {p.name}
                      </h3>
                      <p className="text-emerald-700 font-extrabold text-xs sm:text-sm pt-0.5 font-mono">
                        Rp {Number(p.sell_price).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Pesan Menu Ini -> Buka Modal di Halaman yang Sama */}
                  <div className="p-3 pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenItemOrder(p)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Pesan Menu Ini</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-300">
            <StoreIcon className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">{store.name}</span>
            <span>• Seluruh hak cipta dilindungi</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setIsCheckoutStep(false);
                setIsCartOpen(true);
              }}
              className="hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
            >
              Lihat Keranjang ({totalCartCount})
            </button>
            {onNavigateHome && (
              <>
                <span className="text-slate-600">|</span>
                <button
                  onClick={onNavigateHome}
                  className="hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
                >
                  Beranda
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 5. FLOATING CART BUTTON (Selalu terlihat & menunjukkan item) */}
      {/* ======================================================== */}
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-6 sm:bottom-6 z-40">
        <button
          onClick={() => {
            setIsCheckoutStep(false);
            setIsCartOpen(true);
          }}
          className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl shadow-xl active:scale-95 flex items-center justify-between sm:justify-start sm:space-x-4 transition-all duration-200 cursor-pointer border backdrop-blur-md ${
            totalCartCount > 0
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30 border-emerald-400/30 ring-2 ring-emerald-400/30 animate-in slide-in-from-bottom-2'
              : 'bg-slate-900/90 hover:bg-slate-900 text-slate-200 shadow-slate-950/40 border-slate-700/60'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs relative ${
                totalCartCount > 0 ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalCartCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <span className={`text-[10px] block ${totalCartCount > 0 ? 'text-emerald-100' : 'text-slate-400'}`}>
                {totalCartCount > 0 ? `${totalCartCount} Menu di Keranjang` : 'Keranjang Pesanan'}
              </span>
              <span className="font-extrabold text-sm sm:text-base leading-tight font-mono">
                {totalCartCount > 0 ? `Rp ${totalCartAmount.toLocaleString('id-ID')}` : '0 Item'}
              </span>
            </div>
          </div>

          <div
            className={`flex items-center space-x-1.5 font-bold text-xs px-3 py-1.5 rounded-xl border ${
              totalCartCount > 0
                ? 'bg-emerald-700/80 text-white border-white/20'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <span>Buka Keranjang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 6. MODAL PEMESANAN PRODUK (Ketika menekan "Pesan Menu Ini") */}
      {/* ======================================================== */}
      {selectedProductForOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Foto Produk */}
            <div className="relative aspect-video bg-slate-100 overflow-hidden">
              {selectedProductForOrder.image_url ? (
                <img
                  src={selectedProductForOrder.image_url}
                  alt={selectedProductForOrder.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <UtensilsCrossed className="w-12 h-12 text-slate-300 stroke-1" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedProductForOrder(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedProductForOrder.category_name && (
                <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  {selectedProductForOrder.category_name}
                </span>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Nama & Harga */}
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-snug">
                  {selectedProductForOrder.name}
                </h3>
                <p className="text-emerald-700 font-extrabold text-base font-mono mt-1">
                  Rp {Number(selectedProductForOrder.sell_price).toLocaleString('id-ID')}
                </p>
                {selectedProductForOrder.stock !== undefined && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tersedia: {selectedProductForOrder.stock} {selectedProductForOrder.unit || 'pcs'}
                  </p>
                )}
              </div>

              {/* Pilihan Jumlah (+ dan -) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Jumlah Pesanan</label>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setOrderQuantity((q) => Math.max(1, q - 1))}
                      disabled={orderQuantity <= 1}
                      className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-extrabold text-sm text-slate-900">
                      {orderQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOrderQuantity((q) => Math.min(selectedProductForOrder.stock || 99, q + 1))
                      }
                      disabled={
                        selectedProductForOrder.stock !== undefined &&
                        orderQuantity >= selectedProductForOrder.stock
                      }
                      className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Subtotal:{' '}
                    <span className="font-bold text-slate-900 font-mono">
                      Rp {(selectedProductForOrder.sell_price * orderQuantity).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan / Permintaan Khusus */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Catatan / Permintaan Khusus</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Contoh: Es sedikit, jangan terlalu manis, pedas sedang..."
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Tombol Tambah ke Pesanan */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForOrder(null)}
                  className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Tambah ke Pesanan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. DRAWER / MODAL KERANJANG & CHECKOUT */}
      {/* ======================================================== */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Header Keranjang */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {isCheckoutStep ? 'Checkout Pesanan' : 'Keranjang Pesanan'}
                  </h3>
                  <p className="text-[11px] text-slate-500">{store.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutStep(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Konten: List Item ATAU Form Checkout */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {!isCheckoutStep ? (
                /* VIEW 1: DAFTAR ITEM KERANJANG */
                <>
                  {cart.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 space-y-3">
                      <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                      <p className="text-sm font-bold text-slate-700">Keranjang Masih Kosong</p>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Silakan pilih menu lezat di katalog dan tekan tombol <b>Pesan Menu Ini</b>.
                      </p>
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors cursor-pointer"
                      >
                        Pilih Menu Sekarang
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 divide-y divide-slate-100">
                      {cart.map((item, idx) => (
                        <div key={idx} className="pt-3 first:pt-0 flex items-start space-x-3">
                          {/* Foto thumbnail */}
                          <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {item.product.image_url ? (
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <UtensilsCrossed className="w-6 h-6 stroke-1" />
                              </div>
                            )}
                          </div>

                          {/* Info & Qty */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                                {item.product.name}
                              </h4>
                              <button
                                type="button"
                                onClick={() => handleRemoveCartItem(idx)}
                                className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                                title="Hapus produk dari keranjang"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <p className="text-[11px] text-emerald-700 font-mono font-bold">
                              Rp {Number(item.product.sell_price).toLocaleString('id-ID')}
                            </p>

                            {item.note && (
                              <p className="text-[10px] text-slate-500 bg-slate-50 p-1 rounded-md italic">
                                &ldquo;{item.note}&rdquo;
                              </p>
                            )}

                            {/* Qty Controls & Subtotal */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(idx, -1)}
                                  className="w-6 h-6 rounded bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center font-bold text-xs text-slate-900">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCartQty(idx, 1)}
                                  className="w-6 h-6 rounded bg-white shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <span className="font-black text-xs text-slate-900 font-mono">
                                Rp {(item.product.sell_price * item.quantity).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* VIEW 2: FORM CHECKOUT */
                <form id="public-checkout-form" onSubmit={handleCreateOrder} className="space-y-4 text-xs">
                  {checkoutError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  {/* Nama Pelanggan */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">
                      Nama Pelanggan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Masukkan nama lengkap Anda"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 font-medium"
                    />
                  </div>

                  {/* Nomor WhatsApp */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">
                      Nomor WhatsApp / HP <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 font-medium font-mono"
                    />
                  </div>

                  {/* Tipe Pesanan: Makan di Tempat / Bawa Pulang */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Jenis Pesanan</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType('DINE_IN')}
                        className={`py-2 px-3 rounded-xl font-bold border text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                          orderType === 'DINE_IN'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" />
                        <span>Makan di Tempat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('TAKEAWAY')}
                        className={`py-2 px-3 rounded-xl font-bold border text-xs flex items-center justify-center space-x-1.5 cursor-pointer transition-colors ${
                          orderType === 'TAKEAWAY'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Bawa Pulang</span>
                      </button>
                    </div>
                  </div>

                  {/* Nomor Meja / Alamat Pengantaran */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">
                      {orderType === 'DINE_IN' ? 'Nomor Meja' : 'Alamat / Catatan Lokasi'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    {orderType === 'DINE_IN' && tables.length > 0 ? (
                      <select
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 font-medium cursor-pointer"
                      >
                        <option value="">-- Pilih Nomor Meja --</option>
                        {tables.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} (Kapasitas: {t.capacity} orang)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder={
                          orderType === 'DINE_IN'
                            ? 'Contoh: Meja 03'
                            : 'Contoh: Ambil di kasir atau alamat pengantaran'
                        }
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 font-medium"
                      />
                    )}
                  </div>

                  {/* Metode Pembayaran */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">Metode Pembayaran</label>
                    <div className="space-y-1.5">
                      <label className="flex items-center space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                        <input
                          type="radio"
                          name="paymentMethodCust"
                          value="TUNAI"
                          checked={paymentMethod === 'TUNAI'}
                          onChange={() => setPaymentMethod('TUNAI')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            Tunai (Bayar di Kasir)
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Bayar langsung saat mengambil pesanan
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                        <input
                          type="radio"
                          name="paymentMethodCust"
                          value="QRIS"
                          checked={paymentMethod === 'QRIS'}
                          onChange={() => setPaymentMethod('QRIS')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">
                            QRIS (Gopay/OVO/ShopeePay/BCA)
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Scan QRIS saat konfirmasi pesanan
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center space-x-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
                        <input
                          type="radio"
                          name="paymentMethodCust"
                          value="TRANSFER"
                          checked={paymentMethod === 'TRANSFER'}
                          onChange={() => setPaymentMethod('TRANSFER')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block text-xs">Transfer Bank</span>
                          <span className="text-[10px] text-slate-500">
                            Rekening bank resmi milik toko
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Catatan Keseluruhan */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block">Catatan Pesanan Tambahan</label>
                    <textarea
                      rows={2}
                      placeholder="Permintaan khusus lainnya jika ada..."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-emerald-500 font-medium"
                    />
                  </div>
                </form>
              )}
            </div>

            {/* Footer Keranjang / Checkout */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Pembayaran ({totalCartCount} item)</span>
                  <span className="font-black text-base text-slate-900 font-mono">
                    Rp {totalCartAmount.toLocaleString('id-ID')}
                  </span>
                </div>

                {!isCheckoutStep ? (
                  <button
                    type="button"
                    onClick={() => setIsCheckoutStep(true)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <span>Lanjut ke Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutStep(false)}
                      className="w-1/3 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      form="public-checkout-form"
                      disabled={submittingOrder}
                      className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <span>{submittingOrder ? 'Menyimpan Pesanan...' : 'Buat Pesanan Sekarang'}</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. MODAL SUKSES PESANAN (Konfirmasi & Nomor Pesanan Kasir) */}
      {/* ======================================================== */}
      {isSuccessModalOpen && placedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 space-y-5 text-center border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full mb-1">
                Menunggu Konfirmasi Kasir
              </span>
              <h3 className="text-xl font-black text-slate-900">Pesanan Berhasil Dibuat!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Pesanan Anda telah otomatis tersimpan di database dan masuk ke sistem kasir toko.
              </p>
            </div>

            {/* Kartu Detail Pesanan */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Nomor Pesanan</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {placedOrder.order_number}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nama Pemesan</span>
                <span className="font-bold text-slate-800">{placedOrder.customer_name}</span>
              </div>
              {placedOrder.table_name && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nomor Meja</span>
                  <span className="font-bold text-slate-800">{placedOrder.table_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Metode Pembayaran</span>
                <span className="font-bold text-emerald-700">{placedOrder.payment_method}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-800">Total Tagihan</span>
                <span className="font-black text-slate-900 font-mono text-sm">
                  Rp {Number(placedOrder.total_amount).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* WhatsApp Store Chat Button */}
            {placedOrder.store_phone && (
              <a
                href={`https://wa.me/${placedOrder.store_phone.replace(/^0/, '62')}?text=${encodeURIComponent(
                  `Halo ${placedOrder.store_name}, saya telah membuat pesanan #${placedOrder.order_number} atas nama ${placedOrder.customer_name} sebesar Rp ${Number(
                    placedOrder.total_amount
                  ).toLocaleString('id-ID')}. Mohon dikonfirmasi ya kak.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/25"
              >
                <Phone className="w-4 h-4" />
                <span>Konfirmasi via WhatsApp Toko</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setIsSuccessModalOpen(false);
                setPlacedOrder(null);
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup & Pesan Menu Lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
