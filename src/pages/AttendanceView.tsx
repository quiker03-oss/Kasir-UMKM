import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  Printer,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react';
import { api, playBeep } from '../lib/api.ts';
import { Attendance } from '../types/index.ts';
import BarcodeScannerModal from '../components/BarcodeScannerModal.tsx';

export default function AttendanceView() {
  const [records, setRecords] = useState<any[]>([]);
  const [todaySummary, setTodaySummary] = useState<any>({ total_today: 0, hadir_count: 0, terlambat_count: 0 });
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Scanner & Result
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadAttendance();
  }, [startDate, statusFilter]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.getAttendanceHistory({
        start_date: startDate,
        end_date: startDate,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      if (res.success) {
        setRecords(res.records || []);
        if (res.today_summary) {
          setTodaySummary(res.today_summary);
        }
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceScan = async (code: string) => {
    try {
      setScanError(null);
      const res = await api.scanAttendance(code);
      if (res.success) {
        playBeep('success');
        setScanResult(res);
        setManualBarcode('');
        loadAttendance();
        window.dispatchEvent(new CustomEvent('attendance:scanned', { detail: res }));
      }
    } catch (err: any) {
      playBeep('error');
      setScanError(err.message || 'Gagal memproses absensi.');
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    processAttendanceScan(manualBarcode.trim());
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Absensi Karyawan Berbasis Barcode</h2>
          <p className="text-xs text-slate-500">
            Karyawan scan kartu barcode untuk absensi Masuk dan Pulang otomatis secara real-time.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs self-start"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Laporan Absensi</span>
        </button>
      </div>

      {/* Live Barcode Scanner Box */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
              Mesin Absensi Toko
            </span>
            <h3 className="font-extrabold text-lg">Scan Barcode Kartu Karyawan</h3>
            <p className="text-xs text-slate-300 max-w-md">
              Gunakan kamera perangkat atau pemindai laser USB barcode untuk mencatat kehadiran hari ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera Scanner</span>
            </button>
          </div>
        </div>

        {/* Input Barcode Box */}
        <form onSubmit={handleManualScanSubmit} className="flex gap-2 max-w-md pt-2">
          <input
            ref={barcodeInputRef}
            type="text"
            placeholder="Scan atau ketik kode barcode karyawan (cth: EMP-1001)..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            className="flex-1 px-4 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!manualBarcode.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Absen
          </button>
        </form>

        {/* Live Result Banner */}
        {scanResult && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-700/60 rounded-2xl flex items-center space-x-3 text-white animate-fade-in">
            <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            <div className="flex-1 text-xs">
              <p className="font-extrabold text-emerald-300 text-sm">{scanResult.message}</p>
              <p className="text-slate-300 mt-0.5">
                Karyawan: <b className="text-white">{scanResult.employee?.name}</b> ({scanResult.employee?.position}) • Jam: <b className="text-white">{scanResult.time}</b> • Status: <b className={scanResult.status === 'HADIR' ? 'text-emerald-400' : 'text-amber-400'}>{scanResult.status}</b>
              </p>
            </div>
          </div>
        )}

        {/* Live Error Banner */}
        {scanError && (
          <div className="p-4 bg-rose-950/80 border border-rose-700/60 rounded-2xl flex items-center space-x-3 text-white">
            <AlertCircle className="w-7 h-7 text-rose-400 shrink-0" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-rose-300 text-sm">Gagal Absensi</p>
              <p className="text-slate-300 mt-0.5">{scanError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary Today Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-slate-500 font-medium">Total Absensi Hari Ini</span>
          <div className="text-xl font-black text-slate-900">{todaySummary.total_today || 0} Orang</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-emerald-600 font-medium">Tepat Waktu (Hadir)</span>
          <div className="text-xl font-black text-emerald-700">{todaySummary.hadir_count || 0} Orang</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs text-amber-600 font-medium">Terlambat</span>
          <div className="text-xl font-black text-amber-700">{todaySummary.terlambat_count || 0} Orang</div>
        </div>
      </div>

      {/* Date Filter & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Tanggal Log:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
            />
          </div>

          <div className="flex space-x-1.5">
            {['ALL', 'HADIR', 'TERLAMBAT'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Semua' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Karyawan</th>
                <th className="p-3">Barcode</th>
                <th className="p-3">Jabatan</th>
                <th className="p-3 text-center">Jam Masuk</th>
                <th className="p-3 text-center">Jam Pulang</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada data absensi untuk tanggal ini.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const checkInTime = rec.check_in ? rec.check_in.split(' ')[1] : '-';
                  const checkOutTime = rec.check_out ? rec.check_out.split(' ')[1] : '-';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{rec.employee_name}</td>
                      <td className="p-3 font-mono text-slate-500">{rec.barcode_id}</td>
                      <td className="p-3 text-slate-600">{rec.position}</td>
                      <td className="p-3 text-center font-bold font-mono text-emerald-700">{checkInTime}</td>
                      <td className="p-3 text-center font-bold font-mono text-blue-700">{checkOutTime}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            rec.status === 'HADIR'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500">{rec.notes || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={processAttendanceScan}
        title="Scan Barcode Absensi Karyawan"
        subtitle="Arahkan kamera ke barcode pada ID Card karyawan"
      />
    </div>
  );
}
