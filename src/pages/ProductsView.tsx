import { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Printer,
  X,
  Check,
  RefreshCw,
  Layers,
  Camera,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Product, Category } from '../types/index.ts';
import BarcodeRenderer from '../components/BarcodeRenderer.tsx';
import ImageUploadPicker from '../components/ImageUploadPicker.tsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.tsx';
import ProductPhotoModal from '../components/ProductPhotoModal.tsx';

interface ProductsViewProps {
  initialFilterLowStock?: boolean;
}

export default function ProductsView({ initialFilterLowStock = false }: ProductsViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterLowStock, setFilterLowStock] = useState(initialFilterLowStock);

  useEffect(() => {
    if (initialFilterLowStock) {
      setFilterLowStock(true);
    }
  }, [initialFilterLowStock]);

  // Deletion modals state
  const [deleteProductTarget, setDeleteProductTarget] = useState<Product | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [isBarcodePrintOpen, setIsBarcodePrintOpen] = useState(false);
  const [barcodePrintProduct, setBarcodePrintProduct] = useState<Product | null>(null);
  const [barcodePrintCount, setBarcodePrintCount] = useState<number>(4);

  // Category Manager Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Quick Photo Modal
  const [photoProduct, setPhotoProduct] = useState<Product | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const handlePhotoUpdated = (productId: string, newImageUrl: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, image_url: newImageUrl } : p))
    );
    setNotification({
      message: 'Foto produk berhasil diperbarui!',
      type: 'success',
    });
  };

  // Form states for Add/Edit
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formBuyPrice, setFormBuyPrice] = useState<number>(0);
  const [formSellPrice, setFormSellPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(10);
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formUnit, setFormUnit] = useState('Pcs');
  const [formImageUrl, setFormImageUrl] = useState('');

  // Stock Adjust form
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustNote, setAdjustNote] = useState('');

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await api.getProducts({
        search: searchQuery,
        category_id: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        low_stock: filterLowStock,
      });
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success) {
        setCategories(res.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, filterLowStock]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategoryId(categories[0]?.id || '');
    // Auto-generate barcode (12 digits)
    const randomCode = '899' + Math.floor(100000000 + Math.random() * 900000000);
    setFormBarcode(randomCode);
    setFormBuyPrice(0);
    setFormSellPrice(0);
    setFormStock(10);
    setFormMinStock(5);
    setFormUnit('Pcs');
    setFormImageUrl('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategoryId(p.category_id || '');
    setFormBarcode(p.barcode);
    setFormBuyPrice(p.buy_price);
    setFormSellPrice(p.sell_price);
    setFormStock(p.stock);
    setFormMinStock(p.min_stock);
    setFormUnit(p.unit);
    setFormImageUrl(p.image_url || '');
    setIsAddEditOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Nama produk wajib diisi.');
      return;
    }
    if (!formBarcode.trim()) {
      alert('Barcode produk wajib diisi.');
      return;
    }

    try {
      const payload = {
        name: formName,
        category_id: formCategoryId || null,
        barcode: formBarcode,
        buy_price: formBuyPrice,
        sell_price: formSellPrice,
        stock: formStock,
        min_stock: formMinStock,
        unit: formUnit,
        image_url: formImageUrl || null,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
      } else {
        await api.createProduct(payload);
      }

      setIsAddEditOpen(false);
      loadProducts();
      window.dispatchEvent(new CustomEvent('product:updated'));
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan produk.');
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setDeleteProductTarget(product);
  };

  const executeDeleteProduct = async () => {
    if (!deleteProductTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteProduct(deleteProductTarget.id);
      setNotification({ message: `Produk "${deleteProductTarget.name}" berhasil dihapus.`, type: 'success' });
      setDeleteProductTarget(null);
      loadProducts();
      window.dispatchEvent(new CustomEvent('product:updated'));
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus produk.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const openStockModal = (p: Product) => {
    setStockProduct(p);
    setAdjustType('IN');
    setAdjustQty(10);
    setAdjustNote('');
    setIsStockModalOpen(true);
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProduct) return;
    if (adjustQty <= 0) {
      setNotification({ message: 'Jumlah perubahan stok harus lebih besar dari 0.', type: 'error' });
      return;
    }

    try {
      await api.adjustStock(stockProduct.id, {
        type: adjustType,
        quantity: adjustQty,
        note: adjustNote,
      });
      setIsStockModalOpen(false);
      setNotification({ message: 'Stok produk berhasil disesuaikan.', type: 'success' });
      loadProducts();
      window.dispatchEvent(new CustomEvent('product:updated'));
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal memperbarui stok.', type: 'error' });
    }
  };

  const openBarcodePrintModal = (p: Product) => {
    setBarcodePrintProduct(p);
    setBarcodePrintCount(6);
    setIsBarcodePrintOpen(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.createCategory({ name: newCatName.trim() });
      setNewCatName('');
      setNotification({ message: 'Kategori berhasil ditambahkan.', type: 'success' });
      loadCategories();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menambah kategori.', type: 'error' });
    }
  };

  const handleDeleteCategory = (cat: Category) => {
    setDeleteCategoryTarget(cat);
  };

  const executeDeleteCategory = async () => {
    if (!deleteCategoryTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteCategory(deleteCategoryTarget.id);
      setNotification({ message: `Kategori "${deleteCategoryTarget.name}" berhasil dihapus.`, type: 'success' });
      setDeleteCategoryTarget(null);
      loadCategories();
      loadProducts();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus kategori.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manajemen Produk & Stok</h2>
          <p className="text-xs text-slate-500">
            Kelola katalog barang, barcode produk, penyesuaian stok opname, dan cetak label barcode.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
          >
            <Layers className="w-4 h-4" />
            <span>Kategori</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama produk atau nomor barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </form>

          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              filterLowStock
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Stok Menipis</span>
          </button>
        </div>

        {/* Categories row */}
        <div className="flex space-x-1.5 overflow-x-auto no-scrollbar pt-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                selectedCategory === c.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Produk</th>
                <th className="p-3.5">Barcode</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5 text-right">Harga Beli</th>
                <th className="p-3.5 text-right">Harga Jual</th>
                <th className="p-3.5 text-center">Stok</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada produk yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.stock <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoProduct(p);
                              setIsPhotoModalOpen(true);
                            }}
                            title="Klik untuk tambah / ganti foto produk"
                            className="relative group/thumb cursor-pointer shrink-0"
                          >
                            {p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shadow-2xs group-hover/thumb:border-emerald-500 transition-colors"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 flex flex-col items-center justify-center font-bold border border-slate-200 transition-colors">
                                <Camera className="w-4 h-4 mb-0.5" />
                                <span className="text-[8px] font-bold">+ Foto</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Camera className="w-4 h-4" />
                            </div>
                          </div>

                          <div>
                            <span className="font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {p.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-700">
                        <div className="flex items-center space-x-1.5">
                          <Barcode className="w-4 h-4 text-slate-400" />
                          <span>{p.barcode}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">{p.category_name || '-'}</td>
                      <td className="p-3.5 text-right font-medium text-slate-500">
                        Rp {p.buy_price.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        Rp {p.sell_price.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            p.stock <= 0
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openStockModal(p)}
                            title="Sesuaikan Stok"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openBarcodePrintModal(p)}
                            title="Cetak Label Barcode"
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Produk"
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            title="Hapus Produk"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kopi Susu Aren"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="">Tanpa Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode / SKU *</label>
                  <div className="flex space-x-1">
                    <input
                      type="text"
                      required
                      placeholder="899..."
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormBarcode('899' + Math.floor(100000000 + Math.random() * 900000000))
                      }
                      title="Generate Acak"
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                    >
                      Acak
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Beli / Modal (HPP)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Minimal</label>
                  <input
                    type="number"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    placeholder="Pcs/Porsi"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <ImageUploadPicker
                label="Foto Produk"
                value={formImageUrl}
                onChange={(url) => setFormImageUrl(url)}
                placeholderText="Pilih foto produk dari Galeri / Kamera"
                helperText="Format JPG, PNG, WEBP. Maks 8MB."
              />

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {isStockModalOpen && stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Sesuaikan Stok Produk</h3>
                <p className="text-xs text-slate-500">{stockProduct.name}</p>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStockSubmit} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <span className="text-slate-600">Stok Saat Ini:</span>
                <span className="font-extrabold text-sm text-slate-900">
                  {stockProduct.stock} {stockProduct.unit}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tipe Penyesuaian:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 text-[11px] font-bold rounded-lg border ${
                      adjustType === 'IN'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Masuk (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 text-[11px] font-bold rounded-lg border ${
                      adjustType === 'OUT'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Keluar (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUST')}
                    className={`py-2 text-[11px] font-bold rounded-lg border ${
                      adjustType === 'ADJUST'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Koreksi (=)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {adjustType === 'ADJUST' ? 'Set Stok Menjadi' : 'Jumlah Perubahan'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan / Alasan</label>
                <input
                  type="text"
                  placeholder="Cth: Kulakan dari distributor, barang rusak"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                >
                  Simpan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Sticker Print Modal */}
      {isBarcodePrintOpen && barcodePrintProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto no-print">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Cetak Label Barcode Produk</h3>
              </div>
              <button
                onClick={() => setIsBarcodePrintOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Jumlah Label Dicetak:</label>
                <div className="flex space-x-1.5">
                  {[2, 4, 6, 12].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setBarcodePrintCount(cnt)}
                      className={`px-3 py-1 rounded-lg font-bold border transition-colors ${
                        barcodePrintCount === cnt
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview of 1 Label */}
              <div className="p-4 bg-slate-100 rounded-xl flex justify-center">
                <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-sm w-56 text-center space-y-1">
                  <p className="font-bold text-[11px] text-slate-900 line-clamp-1">
                    {barcodePrintProduct.name}
                  </p>
                  <BarcodeRenderer
                    value={barcodePrintProduct.barcode}
                    width={1.3}
                    height={38}
                    fontSize={11}
                    className="mx-auto"
                  />
                  <p className="font-extrabold text-xs text-emerald-800 pt-0.5">
                    Rp {barcodePrintProduct.sell_price.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  onClick={() => setIsBarcodePrintOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Label</span>
                </button>
              </div>
            </div>
          </div>

          {/* Print only barcode labels repeated */}
          <div className="hidden print:grid print:grid-cols-3 print:gap-4 print:p-4">
            {Array.from({ length: barcodePrintCount }).map((_, i) => (
              <div key={i} className="border border-black p-2 text-center rounded-sm">
                <p className="font-bold text-[10px] truncate">{barcodePrintProduct.name}</p>
                <BarcodeRenderer
                  value={barcodePrintProduct.barcode}
                  width={1.2}
                  height={32}
                  fontSize={10}
                  className="mx-auto"
                />
                <p className="font-bold text-[11px] mt-0.5">
                  Rp {barcodePrintProduct.sell_price.toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Kelola Kategori Produk</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <form onSubmit={handleAddCategory} className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="Nama kategori baru..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold"
                >
                  Tambah
                </button>
              </form>

              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {categories.map((cat) => (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Hapus Kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Product Modal */}
      <ConfirmDeleteModal
        isOpen={deleteProductTarget !== null}
        title="Hapus Produk"
        itemName={deleteProductTarget ? `${deleteProductTarget.name} (${deleteProductTarget.barcode})` : ''}
        message="Apakah Anda yakin ingin menghapus produk ini dari katalog toko? Produk tidak akan muncul lagi di kasir POS atau toko online."
        confirmText="Ya, Hapus Produk"
        isDeleting={isDeleting}
        onConfirm={executeDeleteProduct}
        onClose={() => setDeleteProductTarget(null)}
      />

      {/* Confirm Delete Category Modal */}
      <ConfirmDeleteModal
        isOpen={deleteCategoryTarget !== null}
        title="Hapus Kategori"
        itemName={deleteCategoryTarget?.name}
        message="Apakah Anda yakin ingin menghapus kategori ini? Produk yang terhubung dengan kategori ini akan dipindahkan ke Tanpa Kategori."
        confirmText="Ya, Hapus Kategori"
        isDeleting={isDeleting}
        onConfirm={executeDeleteCategory}
        onClose={() => setDeleteCategoryTarget(null)}
      />

      {/* Quick Product Photo Add/Change Modal */}
      <ProductPhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setPhotoProduct(null);
        }}
        product={photoProduct}
        onPhotoUpdated={handlePhotoUpdated}
      />
    </div>
  );
}
