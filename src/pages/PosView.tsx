import { useState, useEffect, useRef } from 'react';
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  UtensilsCrossed,
  RefreshCw,
  ShoppingBag,
  Percent,
  Bookmark,
  Inbox,
  X,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  FileText,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api, playBeep } from '../lib/api.ts';
import { Product, Category, TableItem } from '../types/index.ts';
import BarcodeScannerModal from '../components/BarcodeScannerModal.tsx';
import ReceiptPrintModal from '../components/ReceiptPrintModal.tsx';
import ProductPhotoModal from '../components/ProductPhotoModal.tsx';

interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
}

interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  selectedTable: string;
  customerName: string;
  notes: string;
  discount: number;
  savedAt: string;
  linkedOrderId?: string | null;
}

export default function PosView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);

  // Mobile / Responsive Cart Sheet
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Held Carts (Simpan / Parkir Pesanan)
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    try {
      const saved = localStorage.getItem('pos_held_carts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);

  // Incoming Online & QR Orders (Pesanan Masuk)
  const [incomingOrders, setIncomingOrders] = useState<any[]>([]);
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [loadingIncoming, setLoadingIncoming] = useState(false);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'TRANSFER' | 'QRIS'>('TUNAI');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Scanner & Receipt Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Transaction History & Reprint Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Quick Product Photo Modal State
  const [photoModalProduct, setPhotoModalProduct] = useState<Product | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const handlePhotoUpdated = (productId: string, newImageUrl: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, image_url: newImageUrl } : p))
    );
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, product: { ...item.product, image_url: newImageUrl } }
          : item
      )
    );
  };

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const [scanToast, setScanToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showScanToast = (message: string, type: 'success' | 'error') => {
    setScanToast({ message, type });
    setTimeout(() => {
      setScanToast((cur) => (cur?.message === message ? null : cur));
    }, 3200);
  };

  // Autofocus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Restore focus to barcode input when modals close
  useEffect(() => {
    if (
      !isPaymentModalOpen &&
      !isScannerOpen &&
      !isHeldModalOpen &&
      !isHistoryModalOpen &&
      !isPhotoModalOpen &&
      !isIncomingModalOpen
    ) {
      const timer = setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [
    isPaymentModalOpen,
    isScannerOpen,
    isHeldModalOpen,
    isHistoryModalOpen,
    isPhotoModalOpen,
    isIncomingModalOpen,
  ]);

  useEffect(() => {
    loadData();
    fetchIncomingOrders();
    const interval = setInterval(fetchIncomingOrders, 12000);
    return () => clearInterval(interval);
  }, []);

  // Save held carts to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('pos_held_carts', JSON.stringify(heldCarts));
    } catch (e) {
      console.error('Failed to save held carts', e);
    }
  }, [heldCarts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, tblRes] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getTables(),
      ]);
      if (prodRes.success) setProducts(prodRes.products || []);
      if (catRes.success) setCategories(catRes.categories || []);
      if (tblRes.success) {
        setTables(tblRes.tables || []);
        if (tblRes.tables && tblRes.tables.length > 0 && !selectedTable) {
          setSelectedTable(tblRes.tables[0].name);
        }
      }
    } catch (err: any) {
      console.error('POS load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIncomingOrders = async () => {
    try {
      const res = await api.getOrders({ status: 'Menunggu' });
      if (res.success && res.orders) {
        setIncomingOrders(res.orders);
      }
    } catch {
      // silent
    }
  };

  const openHistoryModal = async () => {
    setIsHistoryModalOpen(true);
    try {
      setLoadingHistory(true);
      const res = await api.getTransactions();
      if (res.success) {
        setRecentTransactions(res.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleReprintReceipt = async (trxId: string) => {
    try {
      const res = await api.getTransactionReceipt(trxId);
      if (res.success && res.transaction) {
        setReceiptData({
          ...res.transaction,
          store: res.store,
        });
        setIsReceiptModalOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Gagal memuat struk transaksi.');
    }
  };

  const addToCart = (product: Product) => {
    const stock = Number(product.stock) || 0;
    if (stock <= 0) {
      alert(`Stok untuk "${product.name}" habis.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          alert(`Maksimal stok tersedia untuk "${product.name}" adalah ${stock}.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Barcode & QR processor (supports USB & Bluetooth Barcode Scanners in HID Keyboard Emulation mode)
  const processBarcode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // 1. Instant check in loaded products (0ms latency)
    const cleanLower = code.toLowerCase();
    const localProduct = products.find(
      (p) =>
        (p.barcode && p.barcode.trim().toLowerCase() === cleanLower) ||
        p.id.toLowerCase() === cleanLower ||
        p.name.trim().toLowerCase() === cleanLower
    );

    if (localProduct) {
      const stock = Number(localProduct.stock) || 0;
      if (stock <= 0) {
        playBeep('error');
        showScanToast(`Stok "${localProduct.name}" habis (0).`, 'error');
      } else {
        addToCart(localProduct);
        playBeep('success');
        showScanToast(
          `✓ "${localProduct.name}" (Rp ${Number(localProduct.sell_price).toLocaleString('id-ID')}) masuk keranjang!`,
          'success'
        );
      }
      setBarcodeInput('');
      setSearchQuery('');
      barcodeInputRef.current?.focus();
      return;
    }

    // 2. Fetch from backend API if not found in loaded array
    try {
      const res = await api.getProductByBarcode(code);
      if (res.success && res.product) {
        const prod = res.product;
        const stock = Number(prod.stock) || 0;
        if (stock <= 0) {
          playBeep('error');
          showScanToast(`Stok "${prod.name}" habis (0).`, 'error');
        } else {
          addToCart(prod);
          playBeep('success');
          showScanToast(
            `✓ "${prod.name}" (Rp ${Number(prod.sell_price).toLocaleString('id-ID')}) masuk keranjang!`,
            'success'
          );
        }
        setBarcodeInput('');
        setSearchQuery('');
      } else {
        playBeep('error');
        showScanToast(`Barcode "${code}" tidak ditemukan dalam sistem.`, 'error');
      }
    } catch {
      playBeep('error');
      showScanToast(`Barcode "${code}" tidak ditemukan.`, 'error');
    } finally {
      barcodeInputRef.current?.focus();
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      processBarcode(barcodeInput.trim());
    }
  };

  const handleScannedCode = (barcode: string) => {
    processBarcode(barcode);
  };

  // Global keydown event listener for USB & Bluetooth Barcode Scanners (HID Keyboard Emulation)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not capture if any modal is currently open
      if (
        isPaymentModalOpen ||
        isScannerOpen ||
        isHeldModalOpen ||
        isHistoryModalOpen ||
        isPhotoModalOpen ||
        isIncomingModalOpen
      ) {
        return;
      }

      const activeEl = document.activeElement;
      const activeTag = activeEl?.tagName.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
      const isBarcodeInput = activeEl === barcodeInputRef.current;
      const isSearchInput = activeEl === searchInputRef.current;

      // If user is focused on a different form field (e.g. customer name or discount), don't hijack unless it's an Enter from a fast scanner
      if (isInput && !isBarcodeInput && !isSearchInput) {
        return;
      }

      const now = Date.now();

      // Scanner sends characters and terminates with Enter key (HID keycode 13)
      if (e.key === 'Enter') {
        // If we captured keystrokes in the global scanner buffer
        if (barcodeBufferRef.current.trim().length >= 2) {
          const scannedCode = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          e.preventDefault();
          e.stopPropagation();
          processBarcode(scannedCode);
          return;
        }

        // If user scanned directly into barcode input
        if (isBarcodeInput && barcodeInput.trim()) {
          e.preventDefault();
          processBarcode(barcodeInput.trim());
          return;
        }

        // If user scanned directly into search input
        if (isSearchInput && searchQuery.trim()) {
          e.preventDefault();
          processBarcode(searchQuery.trim());
          return;
        }
      }

      // Collect single printable characters from keyboard / scanner
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If elapsed time between characters is > 250ms, start a fresh scanner buffer
        if (now - lastKeyTimeRef.current > 250) {
          barcodeBufferRef.current = '';
        }
        lastKeyTimeRef.current = now;
        barcodeBufferRef.current += e.key;

        // If no input was focused when scanning started, focus the barcode input automatically
        if (!isInput && barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [
    products,
    barcodeInput,
    searchQuery,
    isPaymentModalOpen,
    isScannerOpen,
    isHeldModalOpen,
    isHistoryModalOpen,
    isPhotoModalOpen,
    isIncomingModalOpen,
  ]);

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const stock = Number(item.product.stock) || 0;
            if (newQty > stock) {
              alert(`Maksimal stok tersedia untuk "${item.product.name}" adalah ${stock}.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setDirectQuantity = (productId: string, qty: number) => {
    const targetQty = Math.max(1, Math.floor(qty) || 1);
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const stock = Number(item.product.stock) || 0;
          if (targetQty > stock) {
            alert(`Maksimal stok tersedia untuk "${item.product.name}" adalah ${stock}.`);
            return { ...item, quantity: stock };
          }
          return { ...item, quantity: targetQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscount(0);
    setNotes('');
    setCustomerName('');
    setLinkedOrderId(null);
  };

  // Simpan / Parkir Pesanan Sementara (Hold Cart)
  const handleHoldCart = () => {
    if (cart.length === 0) return;

    const defaultLabel = customerName.trim()
      ? customerName.trim()
      : orderType === 'DINE_IN' && selectedTable
      ? `Meja ${selectedTable}`
      : `Pesanan #${heldCarts.length + 1}`;

    const newHeld: HeldCart = {
      id: `hold-${Date.now()}`,
      label: defaultLabel,
      items: [...cart],
      orderType,
      selectedTable,
      customerName,
      notes,
      discount,
      savedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      linkedOrderId,
    };

    setHeldCarts((prev) => [newHeld, ...prev]);

    // Reset current active cart
    setCart([]);
    setDiscount(0);
    setNotes('');
    setCustomerName('');
    setLinkedOrderId(null);
    setIsMobileCartOpen(false);
  };

  // Restore Held Cart
  const handleRestoreHeldCart = (held: HeldCart) => {
    setCart(held.items);
    setOrderType(held.orderType);
    setSelectedTable(held.selectedTable);
    setCustomerName(held.customerName);
    setNotes(held.notes);
    setDiscount(held.discount);
    setLinkedOrderId(held.linkedOrderId || null);

    // Remove from held
    setHeldCarts((prev) => prev.filter((h) => h.id !== held.id));
    setIsHeldModalOpen(false);
  };

  const handleDeleteHeldCart = (heldId: string) => {
    setHeldCarts((prev) => prev.filter((h) => h.id !== heldId));
  };

  // Load an Incoming Online / QR Order into Cashier Cart
  const handleLoadIncomingOrder = (order: any) => {

    const orderItems: CartItem[] = (order.items || []).map((it: any) => {
      // Find matching product in catalog if available, or create mock product object
      const found = products.find((p) => p.id === it.product_id);
      return {
        product: found || {
          id: it.product_id,
          store_id: order.store_id,
          category_id: null,
          name: it.product_name,
          barcode: '',
          buy_price: it.buy_price || 0,
          sell_price: it.price || it.sell_price,
          stock: 999,
          unit: 'pcs',
          min_stock: 0,
          image_url: null,
          is_active: 1,
          created_at: '',
          updated_at: '',
        },
        quantity: it.quantity,
        note: it.note,
      };
    });

    setCart(orderItems);
    setCustomerName(order.customer_name || '');
    setOrderType(order.order_type === 'TAKEAWAY' ? 'TAKEAWAY' : 'DINE_IN');
    if (order.table_name) setSelectedTable(order.table_name);
    setNotes(order.notes || '');
    setLinkedOrderId(order.id);
    setDiscount(0);

    setIsIncomingModalOpen(false);
    setIsMobileCartOpen(true);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.sell_price * item.quantity, 0);
  const totalAmount = Math.max(0, subtotal - discount);
  const changeAmount = paymentMethod === 'TUNAI' ? Math.max(0, amountPaid - totalAmount) : 0;
  const totalQuantity = cart.reduce((s, i) => s + i.quantity, 0);

  const openPaymentModal = () => {
    if (cart.length === 0) {
      alert('Keranjang kasir masih kosong. Silakan pilih produk terlebih dahulu.');
      return;
    }
    setAmountPaid(totalAmount);
    setIsPaymentModalOpen(true);
  };

  const handleProcessCheckout = async () => {
    if (processingPayment) return;

    if (paymentMethod === 'TUNAI' && amountPaid < totalAmount) {
      alert('Jumlah uang yang diterima kurang dari total tagihan.');
      return;
    }

    try {
      setProcessingPayment(true);
      const payload = {
        idempotency_key: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        customer_name: customerName.trim() || 'Pelanggan Umum',
        order_type: orderType,
        table_name: orderType === 'DINE_IN' ? selectedTable || '-' : null,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'TUNAI' ? amountPaid : totalAmount,
        discount: discount,
        notes: notes,
        order_id: linkedOrderId || undefined,
        items: cart.map((c) => ({
          product_id: c.product.id,
          product_name: c.product.name,
          quantity: c.quantity,
        })),
      };

      const res = await api.checkout(payload);
      if (res.success && res.receipt) {
        playBeep('success');

        // Reset POS cart
        setCart([]);
        setDiscount(0);
        setCustomerName('');
        setNotes('');
        setLinkedOrderId(null);
        setIsPaymentModalOpen(false);
        setIsMobileCartOpen(false);

        // Open Receipt Modal
        setReceiptData(res.receipt);
        setIsReceiptModalOpen(true);

        // Refresh product stock list & incoming orders
        loadData();
        fetchIncomingOrders();

        // Broadcast event so dashboard immediately updates omzet, laba, and 7-day chart
        window.dispatchEvent(new CustomEvent('pos:transaction_completed', { detail: res.receipt }));
      }
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Gagal memproses transaksi kasir.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch && p.is_active;
  });

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col lg:flex-row overflow-hidden bg-slate-100 relative">
      {/* LEFT AREA: Product Catalog & Search & Toolbar (Desktop 60%+, Mobile 100%) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white overflow-hidden">
        {/* Top Control Bar: Search & Barcode Input & Tools */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-2.5">
          {/* Search by Name / Barcode */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Cari nama produk / ketik barcode lalu Enter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  e.preventDefault();
                  processBarcode(searchQuery.trim());
                }
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
            />
          </div>

          {/* Barcode scanner input for laser gun / manual input */}
          <form onSubmit={handleBarcodeSubmit} className="flex gap-1.5 sm:w-auto items-center overflow-x-auto">
            {/* Status Scanner Hardware HID */}
            <div
              onClick={() => barcodeInputRef.current?.focus()}
              title="Scanner Barcode USB & Bluetooth aktif (Mode Emulasi Keyboard). Klik untuk fokus."
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold cursor-pointer hover:bg-emerald-100 transition-colors shrink-0 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Scanner USB/BT Siap</span>
            </div>

            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              autoFocus
              className="w-28 sm:w-40 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              title="Buka Kamera Barcode Scanner"
              className="px-2.5 sm:px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kamera</span>
            </button>

            {/* Simpan / Keranjang Tertunda Button */}
            <button
              type="button"
              onClick={() => setIsHeldModalOpen(true)}
              title="Lihat Keranjang Tertunda / Parkir"
              className="px-2.5 sm:px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors shrink-0 relative cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Tertunda</span>
              {heldCarts.length > 0 && (
                <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {heldCarts.length}
                </span>
              )}
            </button>

            {/* Pesanan Masuk (Online / QR Meja) */}
            <button
              type="button"
              onClick={() => {
                fetchIncomingOrders();
                setIsIncomingModalOpen(true);
              }}
              title="Pesanan Masuk dari Pelanggan Online / Meja"
              className="px-2.5 sm:px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors shrink-0 relative cursor-pointer"
            >
              <Inbox className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Pesanan Masuk</span>
              {incomingOrders.length > 0 && (
                <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  {incomingOrders.length}
                </span>
              )}
            </button>

            {/* Cetak Ulang Struk Riwayat */}
            <button
              type="button"
              onClick={openHistoryModal}
              title="Lihat Riwayat & Cetak Ulang Struk"
              className="px-2.5 sm:px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">Struk</span>
            </button>
          </form>
        </div>

        {/* Scan Feedback Notification Banner */}
        {scanToast && (
          <div
            className={`mx-3 sm:mx-4 mt-2.5 p-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm border transition-all animate-in slide-in-from-top-1 duration-150 ${
              scanToast.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-500'
                : 'bg-rose-950 text-rose-100 border-rose-500'
            }`}
          >
            <div className="flex items-center space-x-2">
              {scanToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{scanToast.message}</span>
            </div>
            <button
              onClick={() => setScanToast(null)}
              className="p-1 hover:opacity-75 cursor-pointer text-white/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Pills */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-200/60 bg-white flex space-x-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto pb-24 lg:pb-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
              <UtensilsCrossed className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="text-xs font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
              <p className="text-[11px] text-slate-400">Silakan ubah kata kunci atau kategori produk.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.product.id === product.id);
                const isOut = product.stock <= 0;
                const isLow = product.stock <= product.min_stock && product.stock > 0;

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOut && addToCart(product)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group select-none cursor-pointer ${
                      isOut
                        ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                        : inCart
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-2 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-sm'
                    }`}
                  >
                    {/* Foto Produk di Depan */}
                    <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-slate-100 mb-2 shrink-0 group/img">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-linear-to-br from-slate-100 to-slate-200">
                          <UtensilsCrossed className="w-6 h-6 text-slate-300 stroke-1 mb-1" />
                          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-0.5">
                            <Camera className="w-3 h-3 text-emerald-600" /> + Foto
                          </span>
                        </div>
                      )}

                      {/* Badge Jumlah di Keranjang */}
                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white font-mono font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white z-10">
                          {inCart.quantity}
                        </span>
                      )}

                      {/* Tombol Cepat Tambah/Ganti Foto */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoModalProduct(product);
                          setIsPhotoModalOpen(true);
                        }}
                        title="Tambah / Ubah Foto Produk"
                        className="absolute bottom-1.5 right-1.5 p-1.5 rounded-lg bg-slate-900/75 hover:bg-slate-900 text-white backdrop-blur-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all shadow-xs z-10"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Info Produk */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {product.barcode && (
                          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                            {product.barcode}
                          </p>
                        )}
                        <h4 className="font-bold text-xs text-slate-800 line-clamp-2 mt-0.5 leading-snug">
                          {product.name}
                        </h4>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="font-extrabold text-xs text-emerald-700">
                          Rp {product.sell_price.toLocaleString('id-ID')}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isOut ? 'Habis' : `Stok: ${product.stock}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT AREA: Desktop Side Cart (lg and above) */}
      <div className="hidden lg:flex w-[430px] bg-slate-50 flex-col h-full border-l border-slate-200 shadow-xl shrink-0">
        <CartContent
          cart={cart}
          orderType={orderType}
          setOrderType={setOrderType}
          selectedTable={selectedTable}
          setSelectedTable={setSelectedTable}
          customerName={customerName}
          setCustomerName={setCustomerName}
          notes={notes}
          setNotes={setNotes}
          tables={tables}
          subtotal={subtotal}
          discount={discount}
          setDiscount={setDiscount}
          totalAmount={totalAmount}
          totalQuantity={totalQuantity}
          linkedOrderId={linkedOrderId}
          setLinkedOrderId={setLinkedOrderId}
          onUpdateQuantity={updateQuantity}
          onSetDirectQuantity={setDirectQuantity}
          onRemoveFromCart={removeFromCart}
          onClearCart={handleClearCart}
          onHoldCart={handleHoldCart}
          onOpenPaymentModal={openPaymentModal}
        />
      </div>

      {/* MOBILE STICKY FLOATING CART BAR (< lg) */}
      <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className={`w-full p-3.5 rounded-2xl shadow-2xl flex items-center justify-between transition-transform active:scale-98 ${
            cart.length > 0
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white ring-2 ring-emerald-400/50'
              : 'bg-slate-900 text-slate-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {totalQuantity > 0 && (
                <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-900 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {totalQuantity}
                </span>
              )}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-tight">
                {cart.length === 0 ? 'Keranjang Kasir Kosong' : `${totalQuantity} Menu Terpilih`}
              </div>
              <div className="text-[11px] opacity-90 font-mono font-bold">
                Rp {totalAmount.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl">
            <span>Buka Keranjang & Bayar</span>
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* MOBILE SLIDE-UP CART MODAL / BOTTOM SHEET (< lg) */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Mobile Sheet Handle & Header */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-slate-800">Keranjang Kasir ({totalQuantity} Item)</span>
              </div>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="p-1.5 rounded-xl bg-slate-200 text-slate-600 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <CartContent
                cart={cart}
                orderType={orderType}
                setOrderType={setOrderType}
                selectedTable={selectedTable}
                setSelectedTable={setSelectedTable}
                customerName={customerName}
                setCustomerName={setCustomerName}
                notes={notes}
                setNotes={setNotes}
                tables={tables}
                subtotal={subtotal}
                discount={discount}
                setDiscount={setDiscount}
                totalAmount={totalAmount}
                totalQuantity={totalQuantity}
                linkedOrderId={linkedOrderId}
                setLinkedOrderId={setLinkedOrderId}
                onUpdateQuantity={updateQuantity}
                onSetDirectQuantity={setDirectQuantity}
                onRemoveFromCart={removeFromCart}
                onClearCart={handleClearCart}
                onHoldCart={handleHoldCart}
                onOpenPaymentModal={() => {
                  setIsMobileCartOpen(false);
                  openPaymentModal();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Pembayaran Kasir</h3>
                <p className="text-[11px] text-slate-300">Pilih metode & selesaikan transaksi</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Metode Bayar:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('TUNAI');
                      setAmountPaid(totalAmount);
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center space-y-1 transition-colors ${
                      paymentMethod === 'TUNAI'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Tunai (Cash)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('QRIS');
                      setAmountPaid(totalAmount);
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center space-y-1 transition-colors ${
                      paymentMethod === 'QRIS'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRIS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('TRANSFER');
                      setAmountPaid(totalAmount);
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border flex flex-col items-center space-y-1 transition-colors ${
                      paymentMethod === 'TRANSFER'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Transfer Bank</span>
                  </button>
                </div>
              </div>

              {/* Cash Input & Quick Pay Buttons */}
              {paymentMethod === 'TUNAI' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">Uang Diterima dari Pelanggan (Rp):</label>
                  <input
                    type="number"
                    step="1000"
                    value={amountPaid || ''}
                    onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                    className="w-full text-lg font-extrabold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  />

                  {/* Quick Cash Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setAmountPaid(totalAmount)}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountPaid(amt)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
                      >
                        {(amt / 1000).toLocaleString('id-ID')}k
                      </button>
                    ))}
                    {[200000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountPaid(amt)}
                        className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
                      >
                        {(amt / 1000).toLocaleString('id-ID')}k
                      </button>
                    ))}
                  </div>

                  {/* Change display */}
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Uang Kembalian:</span>
                    <span
                      className={`font-extrabold text-base ${
                        amountPaid < totalAmount ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {amountPaid < totalAmount
                        ? `Kurang Rp ${(totalAmount - amountPaid).toLocaleString('id-ID')}`
                        : `Rp ${changeAmount.toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS / Transfer info */}
              {paymentMethod === 'QRIS' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <QrCode className="w-16 h-16 mx-auto text-emerald-800" />
                  <p className="text-xs font-bold text-emerald-900">Scan QRIS Kasir Toko</p>
                  <p className="text-[11px] text-emerald-700">
                    Pastikan pelanggan telah melakukan pembayaran sejumlah:
                  </p>
                  <p className="text-lg font-black text-emerald-950 font-mono">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {paymentMethod === 'TRANSFER' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-1">
                  <CreditCard className="w-8 h-8 mx-auto text-blue-700" />
                  <p className="text-xs font-bold text-blue-900">Pembayaran Transfer Bank</p>
                  <p className="text-xs text-blue-700">Verifikasi mutasi rekening masuk sebesar:</p>
                  <p className="text-lg font-black text-blue-950 font-mono">
                    Rp {totalAmount.toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {/* Total Summary */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-800">Total Tagihan:</span>
                <span className="font-extrabold text-base text-emerald-950 font-mono">
                  Rp {totalAmount.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Complete Action Button */}
              <button
                onClick={handleProcessCheckout}
                disabled={processingPayment || (paymentMethod === 'TUNAI' && amountPaid < totalAmount)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-lg transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{processingPayment ? 'Menyimpan Transaksi...' : 'Selesaikan Transaksi & Cetak Struk'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HELD CARTS MODAL (Keranjang Tertunda / Parkir) */}
      {isHeldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-800">Daftar Keranjang Tertunda (Parkir)</h3>
              </div>
              <button
                onClick={() => setIsHeldModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {heldCarts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Bookmark className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <p className="text-xs font-semibold">Tidak ada keranjang yang disimpan.</p>
                  <p className="text-[11px] text-slate-400">
                    Gunakan tombol "Simpan" di kasir saat pelanggan ingin mengambil barang tambahan.
                  </p>
                </div>
              ) : (
                heldCarts.map((held) => {
                  const heldTotal = held.items.reduce((s, it) => s + it.product.sell_price * it.quantity, 0);
                  const itemCount = held.items.reduce((s, it) => s + it.quantity, 0);

                  return (
                    <div key={held.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-800">{held.label}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                            {held.savedAt}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {itemCount} item &bull; Rp {heldTotal.toLocaleString('id-ID')}
                          {held.selectedTable && ` &bull; Meja ${held.selectedTable}`}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleRestoreHeldCart(held)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center space-x-1"
                        >
                          <span>Lanjutkan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteHeldCart(held.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsHeldModalOpen(false)}
                className="px-4 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING ORDERS MODAL (Pesanan Masuk dari Pelanggan Online / Meja) */}
      {isIncomingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Inbox className="w-4 h-4 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Pesanan Masuk dari Pelanggan (Online / Meja)</h3>
                  <p className="text-xs text-slate-500">Tarik pesanan langsung ke kasir untuk proses pembayaran</p>
                </div>
              </div>
              <button
                onClick={() => setIsIncomingModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {incomingOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Inbox className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <p className="text-xs font-semibold">Tidak ada pesanan online/meja berstatus "Menunggu".</p>
                  <p className="text-[11px] text-slate-400">
                    Pesanan baru yang dikirim pelanggan melalui QR Meja atau Toko Online akan muncul di sini.
                  </p>
                </div>
              ) : (
                incomingOrders.map((ord) => (
                  <div key={ord.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs font-mono text-slate-900">#{ord.order_number}</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                          {ord.order_type === 'DINE_IN' ? `Meja ${ord.table_name || '-'}` : 'Bawa Pulang'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        {ord.customer_name} {ord.customer_phone ? `(${ord.customer_phone})` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {ord.items?.length || 0} macam menu &bull; Total: Rp{' '}
                        {Number(ord.total_amount).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleLoadIncomingOrder(ord)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Muat ke Kasir & Bayar</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={fetchIncomingOrders}
                className="text-xs text-blue-600 font-semibold hover:underline flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan Pesanan</span>
              </button>
              <button
                onClick={() => setIsIncomingModalOpen(false)}
                className="px-4 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScannedCode}
        title="Scan Barcode Produk"
        subtitle="Arahkan kamera ke kemasan atau barcode produk"
      />

      {/* Thermal Receipt Print Modal */}
      <ReceiptPrintModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptData={receiptData}
      />

      {/* Transaction History & Reprint Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                  <Printer className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Riwayat Transaksi & Cetak Ulang Struk</h3>
                  <p className="text-xs text-slate-500">Pilih transaksi untuk mencetak ulang struk kasir</p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-500">Memuat riwayat transaksi...</div>
              ) : recentTransactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">Belum ada transaksi tersimpan.</div>
              ) : (
                recentTransactions.map((trx: any) => (
                  <div key={trx.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">{trx.transaction_number}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                          {trx.payment_method}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {trx.customer_name || 'Pelanggan Umum'} {trx.table_name ? `• ${trx.table_name}` : ''} •{' '}
                        <span className="text-slate-400 text-[11px]">
                          {new Date(trx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-extrabold text-xs text-slate-900">
                        Rp {Number(trx.total_amount).toLocaleString('id-ID')}
                      </span>
                      <button
                        onClick={() => handleReprintReceipt(trx.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Ulang</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Product Photo Add/Change Modal */}
      <ProductPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setPhotoModalProduct(null);
        }}
        product={photoModalProduct}
        onPhotoUpdated={handlePhotoUpdated}
      />
    </div>
  );
}

// Subcomponent: Cart Content (Used for Desktop side panel & Mobile slide-up drawer)
interface CartContentProps {
  cart: CartItem[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  setOrderType: (val: 'DINE_IN' | 'TAKEAWAY') => void;
  selectedTable: string;
  setSelectedTable: (val: string) => void;
  customerName: string;
  setCustomerName: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  tables: TableItem[];
  subtotal: number;
  discount: number;
  setDiscount: (val: number) => void;
  totalAmount: number;
  totalQuantity: number;
  linkedOrderId: string | null;
  setLinkedOrderId: (val: string | null) => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetDirectQuantity: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  onHoldCart: () => void;
  onOpenPaymentModal: () => void;
}

function CartContent({
  cart,
  orderType,
  setOrderType,
  selectedTable,
  setSelectedTable,
  customerName,
  setCustomerName,
  notes,
  setNotes,
  tables,
  subtotal,
  discount,
  setDiscount,
  totalAmount,
  totalQuantity,
  linkedOrderId,
  setLinkedOrderId,
  onUpdateQuantity,
  onSetDirectQuantity,
  onRemoveFromCart,
  onClearCart,
  onHoldCart,
  onOpenPaymentModal,
}: CartContentProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Cart Header */}
      <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <ShoppingBag className="w-4 h-4 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm">Keranjang Transaksi</h3>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {totalQuantity} item
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {cart.length > 0 && (
            <>
              <button
                onClick={onHoldCart}
                title="Simpan keranjang ini sementara"
                className="text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-md font-semibold border border-amber-200 flex items-center space-x-1"
              >
                <Bookmark className="w-3 h-3" />
                <span>Simpan</span>
              </button>
              <button
                onClick={onClearCart}
                className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold px-1 py-1"
              >
                Kosongkan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Linked Online Order Alert */}
      {linkedOrderId && (
        <div className="bg-blue-50 border-b border-blue-200 px-3 py-2 flex items-center justify-between text-xs text-blue-900 shrink-0">
          <span className="flex items-center space-x-1 font-semibold">
            <Inbox className="w-3.5 h-3.5 text-blue-600" />
            <span>Memuat Pesanan Pelanggan #{linkedOrderId.substring(0, 8)}</span>
          </span>
          <button
            onClick={() => setLinkedOrderId(null)}
            className="text-[10px] text-blue-600 underline font-bold hover:text-blue-800"
          >
            Lepas Tautan
          </button>
        </div>
      )}

      {/* Order Details Config (Table, Dine-in/Takeaway, Customer) */}
      <div className="p-3 bg-white border-b border-slate-200/80 grid grid-cols-2 gap-2 text-xs shrink-0">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Tipe Pesanan:</label>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setOrderType('DINE_IN')}
              className={`py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${
                orderType === 'DINE_IN'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Makan Sini
            </button>
            <button
              type="button"
              onClick={() => setOrderType('TAKEAWAY')}
              className={`py-1.5 text-[11px] font-bold rounded-lg border transition-colors ${
                orderType === 'TAKEAWAY'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Bawa Pulang
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
            {orderType === 'DINE_IN' ? 'Nomor Meja:' : 'Nama Pemesan:'}
          </label>
          {orderType === 'DINE_IN' ? (
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden"
            >
              <option value="">-- Tanpa Meja --</option>
              {tables.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Nama pemesan..."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
            />
          )}
        </div>
      </div>

      {/* Cart Item List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[160px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-8">
            <ShoppingBag className="w-10 h-10 stroke-1 text-slate-300" />
            <p className="text-xs font-semibold">Keranjang kasir masih kosong.</p>
            <p className="text-[11px] text-slate-400 text-center">
              Pilih produk di samping atau scan barcode untuk menambahkan pesanan.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.product.id}
              className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs gap-2"
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                {item.product.image_url ? (
                  <img
                    src={item.product.image_url}
                    alt={item.product.name}
                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-xs text-slate-800 line-clamp-1">{item.product.name}</h5>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Rp {item.product.sell_price.toLocaleString('id-ID')}
                  </p>
                  {item.note && (
                    <p className="text-[10px] text-amber-700 italic truncate">Ket: {item.note}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.product.id, -1)}
                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 flex items-center justify-center font-bold text-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onSetDirectQuantity(item.product.id, Number(e.target.value))}
                  className="font-bold text-xs w-10 text-center py-0.5 bg-slate-50 border border-slate-200 rounded font-mono"
                />

                <button
                  type="button"
                  onClick={() => onUpdateQuantity(item.product.id, 1)}
                  className="w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 flex items-center justify-center font-bold text-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>

                <span className="font-bold text-xs text-slate-900 w-16 text-right font-mono">
                  Rp {(item.product.sell_price * item.quantity).toLocaleString('id-ID')}
                </span>

                <button
                  type="button"
                  onClick={() => onRemoveFromCart(item.product.id)}
                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Calculation & Payment Area */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
        {/* Notes input */}
        <div>
          <input
            type="text"
            placeholder="Catatan transaksi kasir (opsional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
          />
        </div>

        {/* Subtotal & Discount row */}
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-semibold text-slate-800 font-mono">
              Rp {subtotal.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center space-x-1">
              <Percent className="w-3 h-3 text-rose-500" />
              <span>Potongan Diskon (Rp):</span>
            </span>
            <input
              type="number"
              min="0"
              step="500"
              value={discount || ''}
              placeholder="0"
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded text-xs font-semibold focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Grand Total */}
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex justify-between items-center">
          <span className="font-bold text-xs text-emerald-900">TOTAL TAGIHAN:</span>
          <span className="font-extrabold text-base text-emerald-950 font-mono">
            Rp {totalAmount.toLocaleString('id-ID')}
          </span>
        </div>

        {/* Bayar Button */}
        <button
          onClick={onOpenPaymentModal}
          disabled={cart.length === 0}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
        >
          <Banknote className="w-4 h-4" />
          <span>PROSES BAYAR (Rp {totalAmount.toLocaleString('id-ID')})</span>
        </button>
      </div>
    </div>
  );
}
