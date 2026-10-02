import { useState } from 'react';
import { Printer, X, Check } from 'lucide-react';
import BarcodeRenderer from './BarcodeRenderer.tsx';

interface ReceiptData {
  transaction_number: string;
  created_at: string;
  cashier_name: string;
  customer_name?: string;
  table_name?: string;
  order_type?: string;
  subtotal: number;
  discount: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  notes?: string;
  is_offline?: boolean;
  items: Array<{
    product_name: string;
    quantity: number;
    sell_price: number;
    subtotal: number;
  }>;
  store?: {
    name: string;
    logo_url?: string;
    address?: string;
    phone?: string;
    receipt_footer?: string;
  };
}

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData | null;
}

export default function ReceiptPrintModal({ isOpen, onClose, receiptData }: ReceiptPrintModalProps) {
  const [paperWidth, setPaperWidth] = useState<'58' | '80'>('58');

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const store = receiptData.store || {
    name: 'KASIR UMKM',
    address: 'Indonesia',
    phone: '',
    receipt_footer: 'Terima kasih atas kunjungan Anda!',
  };

  const dateObj = new Date(receiptData.created_at || Date.now());
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      {/* Modal Card - hidden during print */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto no-print">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Cetak Struk Transaksi</h3>
              <p className="text-xs text-slate-500">Printer Thermal Kasir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size selector */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
          <span className="font-medium">Ukuran Kertas Thermal:</span>
          <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setPaperWidth('58')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                paperWidth === '58' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              58 mm
            </button>
            <button
              onClick={() => setPaperWidth('80')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                paperWidth === '80' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              80 mm
            </button>
          </div>
        </div>

        {/* Receipt Preview on Screen */}
        <div className="p-6 bg-slate-100 max-h-[60vh] overflow-y-auto flex justify-center">
          <div
            className={`bg-white p-4 shadow-md border border-slate-200 rounded-sm font-mono text-xs text-slate-800 ${
              paperWidth === '58' ? 'w-[280px]' : 'w-[360px]'
            }`}
          >
            {/* Store Info */}
            <div className="text-center mb-3">
              {receiptData.is_offline && (
                <div className="mb-2 py-0.5 px-1.5 bg-amber-100 border border-amber-300 text-amber-900 text-[9px] font-bold text-center rounded-sm">
                  *** TRANSAKSI OFFLINE TERSIMPAN ***
                </div>
              )}
              {store.logo_url && (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="w-12 h-12 rounded-full object-cover mx-auto mb-1.5 grayscale"
                />
              )}
              <h4 className="font-bold text-sm tracking-wide uppercase">{store.name}</h4>
              {store.address && <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{store.address}</p>}
              {store.phone && <p className="text-[11px] text-slate-600">Telp: {store.phone}</p>}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Meta */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Trx:</span>
                <span className="font-bold">{receiptData.transaction_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>
                  {formattedDate} {formattedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{receiptData.cashier_name}</span>
              </div>
              {receiptData.customer_name && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{receiptData.customer_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Layanan:</span>
                <span className="font-bold">
                  {receiptData.order_type === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang (Takeaway)'}
                  {receiptData.table_name ? ` - ${receiptData.table_name}` : ''}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Items */}
            <div className="space-y-1.5 text-[11px]">
              {receiptData.items.map((it, idx) => (
                <div key={idx}>
                  <div className="font-medium truncate">{it.product_name}</div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {it.quantity} x Rp {it.sell_price.toLocaleString('id-ID')}
                    </span>
                    <span className="font-bold text-slate-900">Rp {it.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Financials */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rp {receiptData.subtotal.toLocaleString('id-ID')}</span>
              </div>
              {receiptData.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span>
                  <span>-Rp {receiptData.discount.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-300">
                <span>TOTAL</span>
                <span>Rp {receiptData.total_amount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Metode Bayar</span>
                <span className="font-bold">{receiptData.payment_method}</span>
              </div>
              {receiptData.payment_method === 'TUNAI' && (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima</span>
                    <span>Rp {receiptData.amount_paid.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kembalian</span>
                    <span>Rp {receiptData.change_amount.toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}
            </div>

            {receiptData.notes && (
              <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
                Catatan: {receiptData.notes}
              </div>
            )}

            <div className="border-t border-dashed border-slate-400 my-3" />

            {/* Barcode representation */}
            <div className="text-center mb-2">
              <BarcodeRenderer
                value={receiptData.transaction_number}
                width={1.2}
                height={32}
                fontSize={10}
                className="mx-auto"
              />
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 whitespace-pre-line leading-tight">
              {store.receipt_footer || 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar.'}
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk Sekarang</span>
          </button>
        </div>
      </div>

      {/* Print-only container */}
      <div
        className={`hidden print:block ${
          paperWidth === '58' ? 'thermal-receipt-area' : 'thermal-receipt-area-80'
        }`}
      >
        <div className="text-center mb-2">
          <h4 className="font-bold text-sm tracking-wide uppercase">{store.name}</h4>
          {store.address && <p className="text-[10px] leading-tight mt-0.5">{store.address}</p>}
          {store.phone && <p className="text-[10px]">Telp: {store.phone}</p>}
        </div>

        <div className="border-t border-dashed border-black my-1.5" />

        <div className="text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>No. Trx:</span>
            <span className="font-bold">{receiptData.transaction_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu:</span>
            <span>
              {formattedDate} {formattedTime}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Kasir:</span>
            <span>{receiptData.cashier_name}</span>
          </div>
          {receiptData.customer_name && (
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{receiptData.customer_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Layanan:</span>
            <span className="font-bold">
              {receiptData.order_type === 'DINE_IN' ? 'Makan di Tempat' : 'Bawa Pulang'}
              {receiptData.table_name ? ` (${receiptData.table_name})` : ''}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-1.5" />

        <div className="space-y-1 text-[10px]">
          {receiptData.items.map((it, idx) => (
            <div key={idx}>
              <div className="font-medium">{it.product_name}</div>
              <div className="flex justify-between">
                <span>
                  {it.quantity} x Rp {it.sell_price.toLocaleString('id-ID')}
                </span>
                <span className="font-bold">Rp {it.subtotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black my-1.5" />

        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>Rp {receiptData.subtotal.toLocaleString('id-ID')}</span>
          </div>
          {receiptData.discount > 0 && (
            <div className="flex justify-between">
              <span>Diskon:</span>
              <span>-Rp {receiptData.discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-xs pt-1 border-t border-black">
            <span>TOTAL:</span>
            <span>Rp {receiptData.total_amount.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span>Bayar:</span>
            <span>{receiptData.payment_method}</span>
          </div>
          {receiptData.payment_method === 'TUNAI' && (
            <>
              <div className="flex justify-between">
                <span>Diterima:</span>
                <span>Rp {receiptData.amount_paid.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Kembali:</span>
                <span>Rp {receiptData.change_amount.toLocaleString('id-ID')}</span>
              </div>
            </>
          )}
        </div>

        {receiptData.notes && (
          <div className="mt-1 text-[9px]">Catatan: {receiptData.notes}</div>
        )}

        <div className="border-t border-dashed border-black my-2" />

        <div className="text-center text-[9px] whitespace-pre-line leading-tight">
          {store.receipt_footer || 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat ditukar.'}
        </div>
      </div>
    </div>
  );
}
