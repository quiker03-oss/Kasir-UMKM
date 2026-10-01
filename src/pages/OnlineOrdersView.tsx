import { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  Printer,
  RefreshCw,
  Phone,
  AlertCircle,
  Filter,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { Order, OrderStatus } from '../types/index.ts';
import ReceiptPrintModal from '../components/ReceiptPrintModal.tsx';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.tsx';

export default function OnlineOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Deletion modal state
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.getOrders({ status: selectedStatus });
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await api.updateOrderStatus(orderId, { status: newStatus });
      if (res.success) {
        setNotification({ message: `Status pesanan berhasil diubah menjadi "${newStatus}".`, type: 'success' });
        loadOrders();
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal mengubah status pesanan.', type: 'error' });
    }
  };

  const executeDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteOrder(deleteOrderTarget.id);
      setNotification({ message: `Pesanan #${deleteOrderTarget.order_number} berhasil dihapus.`, type: 'success' });
      setDeleteOrderTarget(null);
      loadOrders();
    } catch (err: any) {
      setNotification({ message: err.message || 'Gagal menghapus pesanan.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrintOrder = (order: any) => {
    setReceiptData({
      transaction_number: order.order_number,
      created_at: order.created_at,
      cashier_name: 'Online Customer',
      customer_name: order.customer_name,
      table_name: order.table_name,
      order_type: order.order_type,
      subtotal: order.total_amount,
      discount: 0,
      total_amount: order.total_amount,
      payment_method: order.payment_method,
      amount_paid: order.total_amount,
      change_amount: 0,
      notes: order.notes,
      items: order.items.map((it: any) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        sell_price: it.price,
        subtotal: it.subtotal,
      })),
    });
    setIsReceiptOpen(true);
  };

  const statusColors: Record<string, string> = {
    Menunggu: 'bg-amber-100 text-amber-800 border-amber-300',
    Diterima: 'bg-blue-100 text-blue-800 border-blue-300',
    Diproses: 'bg-purple-100 text-purple-800 border-purple-300',
    Siap: 'bg-teal-100 text-teal-800 border-teal-300',
    Selesai: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    Dibatalkan: 'bg-rose-100 text-rose-800 border-rose-300',
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
            className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pesanan Pelanggan Online</h2>
          <p className="text-xs text-slate-500">
            Daftar pesanan masuk dari toko online mandiri atau scan meja pelanggan.
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
        {['ALL', 'Menunggu', 'Diproses', 'Siap', 'Selesai', 'Dibatalkan'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors shadow-2xs ${
              selectedStatus === st
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st === 'ALL' ? 'Semua Status' : st}
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto stroke-1" />
          <h3 className="font-bold text-slate-700 text-sm">Tidak ada pesanan</h3>
          <p className="text-xs text-slate-400">Belum ada pesanan dengan status yang dipilih.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => {
            const dateStr = new Date(order.created_at).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-800">
                        #{order.order_number}
                      </span>
                      <p className="text-[11px] text-slate-400">{dateStr}</p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border cursor-pointer focus:outline-hidden ${
                          statusColors[order.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <option value="Menunggu">Menunggu</option>
                        <option value="Diproses">Diproses</option>
                        <option value="Siap">Siap</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Dibatalkan">Dibatalkan</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 space-y-2 text-xs border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{order.customer_name}</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        {order.order_type === 'DINE_IN'
                          ? `Meja: ${order.table_name || '-'}`
                          : 'Bawa Pulang'}
                      </span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{order.customer_phone}</span>
                      </div>
                    )}
                    {order.notes && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        Catatan Pesanan: {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Order Items List */}
                  <div className="p-4 space-y-2 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Rincian Menu ({order.items?.length || 0} item):
                    </p>
                    {order.items?.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start gap-2 pt-1.5 first:pt-0 border-t border-slate-50 first:border-0">
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-800 font-semibold block leading-tight">
                            {it.quantity}x {it.product_name}
                          </span>
                          {it.note && (
                            <span className="text-[10px] text-amber-700 italic block mt-0.5">
                              &ldquo;{it.note}&rdquo;
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 font-mono shrink-0">
                          Rp {Number(it.subtotal).toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">
                      Total ({order.payment_method})
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 font-mono">
                      Rp {Number(order.total_amount).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {/* Status update buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {order.status === 'Menunggu' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Diproses')}
                          className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <ChefHat className="w-3.5 h-3.5" />
                          <span>Proses Pesanan</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Dibatalkan')}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Tolak
                        </button>
                      </>
                    )}

                    {order.status === 'Diproses' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Siap')}
                          className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Pesanan Siap</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Dibatalkan')}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Batalkan
                        </button>
                      </>
                    )}

                    {order.status === 'Siap' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Selesai')}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesaikan Pesanan</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Dibatalkan')}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Batalkan
                        </button>
                      </>
                    )}

                    {order.status === 'Selesai' && (
                      <div className="flex-1 py-1 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                        Pesanan Selesai
                      </div>
                    )}

                    {order.status === 'Dibatalkan' && (
                      <div className="flex-1 py-1 text-center text-xs font-bold text-rose-700 bg-rose-50 rounded-lg border border-rose-200">
                        Pesanan Dibatalkan
                      </div>
                    )}

                    {/* Print Receipt button */}
                    <button
                      onClick={() => handlePrintOrder(order)}
                      title="Cetak Struk Pesanan"
                      className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {/* Delete Order button */}
                    <button
                      onClick={() => setDeleteOrderTarget(order)}
                      title="Hapus Pesanan"
                      className="p-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptPrintModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receiptData={receiptData}
      />

      {/* Confirm Delete Order Modal */}
      <ConfirmDeleteModal
        isOpen={deleteOrderTarget !== null}
        title="Hapus Pesanan Online"
        itemName={deleteOrderTarget ? `Pesanan #${deleteOrderTarget.order_number} (${deleteOrderTarget.customer_name})` : ''}
        message="Apakah Anda yakin ingin menghapus data pesanan ini secara permanen?"
        confirmText="Ya, Hapus Pesanan"
        isDeleting={isDeleting}
        onConfirm={executeDeleteOrder}
        onClose={() => setDeleteOrderTarget(null)}
      />
    </div>
  );
}
