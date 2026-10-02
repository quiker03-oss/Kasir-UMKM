import { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  ShieldCheck,
  ShoppingBag,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import {
  OfflineQueueItem,
  getPendingOfflineTransactions,
  syncOfflineQueue,
} from '../lib/offlineQueue.ts';

interface OfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt: (receipt: any) => void;
  storeId?: string;
}

export default function OfflineQueueModal({
  isOpen,
  onClose,
  onViewReceipt,
  storeId,
}: OfflineQueueModalProps) {
  const [items, setItems] = useState<OfflineQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const data = await getPendingOfflineTransactions(storeId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load offline queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
      setSyncResult(null);
    }
  }, [isOpen, storeId]);

  if (!isOpen) return null;

  const handleSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      setSyncResult(null);
      const res = await syncOfflineQueue(storeId);
      await loadQueue();

      if (res.syncedCount > 0) {
        setSyncResult({
          message: `${res.syncedCount} transaksi offline berhasil disinkronkan ke database server!`,
          type: 'success',
        });
        window.dispatchEvent(new CustomEvent('pos:transaction_completed'));
      } else if (res.failedCount > 0) {
        setSyncResult({
          message: `Gagal menyinkronkan: ${res.errors.join(', ')}`,
          type: 'error',
        });
      } else {
        setSyncResult({
          message: 'Tidak ada transaksi dalam antrean atau perangkat masih offline.',
          type: 'info' as any,
        });
      }
    } catch (err: any) {
      setSyncResult({
        message: err.message || 'Terjadi kesalahan sinkronisasi.',
        type: 'error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const totalQueuedAmount = items.reduce((sum, it) => sum + (Number(it.payload?.total_amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900">
                Antrean Transaksi Offline (IndexedDB)
              </h3>
              <p className="text-xs text-slate-500">
                Data disimpan aman di browser & otomatis disinkronkan saat online
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Result Banner */}
        {syncResult && (
          <div
            className={`px-5 py-3 text-xs font-semibold flex items-center justify-between ${
              syncResult.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-b border-rose-200'
            }`}
          >
            <span>{syncResult.message}</span>
            <button onClick={() => setSyncResult(null)} className="p-1 hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Summary Bar */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-500 font-medium">Total Antrean:</span>{' '}
              <span className="font-extrabold text-slate-900">{items.length} Transaksi</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Total Nilai:</span>{' '}
              <span className="font-black text-emerald-800">
                Rp {totalQueuedAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing || items.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 max-h-[55vh] overflow-y-auto space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-semibold">Membaca antrean IndexedDB lokal...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">Antrean Offline Bersih</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Semua transaksi kasir telah tersinkronkan dengan sempurna ke database server. Tidak ada data tertinggal.
              </p>
            </div>
          ) : (
            items.map((it) => {
              const itemCount = it.payload?.items?.length || 0;
              const statusBadge =
                it.status === 'SYNCING'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : it.status === 'FAILED'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300';

              return (
                <div
                  key={it.id}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900">
                        {it.transaction_number}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusBadge}`}>
                        {it.status === 'SYNCING' ? 'Menyinkronkan...' : it.status === 'FAILED' ? 'Gagal Sinkron' : 'Menunggu Sinkron'}
                      </span>
                    </div>

                    <div className="text-slate-600 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>Pelanggan: <strong className="text-slate-800">{it.payload?.customer_name || 'Pelanggan Umum'}</strong></span>
                      <span>• {itemCount} item produk</span>
                      <span>• Metode: <strong className="text-slate-800">{it.payload?.payment_method}</strong></span>
                      <span className="text-slate-400">
                        {new Date(it.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </div>

                    {it.last_error && (
                      <p className="text-[10px] text-rose-600 font-medium">
                        *Catatan error: {it.last_error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                    <span className="font-black text-emerald-800 text-sm">
                      Rp {Number(it.payload?.total_amount || 0).toLocaleString('id-ID')}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onViewReceipt(it.receipt);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                      title="Lihat / Cetak Struk Bukti Transaksi"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cetak Struk</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Anti-Kehilangan Data: Terenkripsi di IndexedDB perangkat browser</span>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
