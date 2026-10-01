import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Keyboard, X, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { playBeep } from '../lib/api.ts';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode',
  subtitle = 'Arahkan kamera ke barcode produk atau ID karyawan',
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'barcode-reader-viewport';

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setManualCode('');
      setCameraError(null);
      setLastScanned(null);
      return;
    }

    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 160 },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // Frame scan pass, ignore
        }
      );
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Anda tetap dapat memasukkan barcode secara manual di bawah.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn('Camera stop error:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  };

  const handleSuccess = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    playBeep('success');
    setLastScanned(trimmed);
    stopCamera();
    setTimeout(() => {
      onScan(trimmed);
      onClose();
    }, 400);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (trimmed) {
      handleSuccess(trimmed);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center min-h-[260px] relative">
          <div
            id={readerElementId}
            className="w-full max-w-[340px] rounded-xl overflow-hidden shadow-inner relative"
          />

          {cameraError && (
            <div className="absolute inset-4 bg-slate-900/90 rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-300">
              <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center space-x-1 border border-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Coba Akses Ulang</span>
              </button>
            </div>
          )}

          {lastScanned && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white">
              <CheckCircle className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <span className="text-xs text-emerald-200">Terdeteksi:</span>
              <span className="font-mono font-bold text-lg">{lastScanned}</span>
            </div>
          )}
        </div>

        {/* Manual Barcode Input / USB Scanner input */}
        <div className="p-5 border-t border-slate-100 bg-white">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-medium text-slate-600">
              Atau masukkan nomor barcode secara manual / laser scanner:
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Contoh: 8991001001 atau EMP-1001"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-hidden font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
              >
                Kirim
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
