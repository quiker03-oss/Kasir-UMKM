import { useState } from 'react';
import {
  Printer,
  X,
  CreditCard,
  Users,
  Palette,
  Check,
  Building2,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { Employee } from '../types/index.ts';
import BarcodeRenderer from './BarcodeRenderer.tsx';
import { printHtmlDirect } from '../lib/printer.ts';

interface EmployeeIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmployee: Employee | null;
  allEmployees?: Employee[];
  storeName?: string;
  storeAddress?: string;
}

export default function EmployeeIdCardModal({
  isOpen,
  onClose,
  selectedEmployee,
  allEmployees = [],
  storeName = 'KASIR UMKM',
  storeAddress = 'Indonesia',
}: EmployeeIdCardModalProps) {
  const [printMode, setPrintMode] = useState<'single' | 'batch'>('single');
  const [colorTheme, setColorTheme] = useState<'blue' | 'classic'>('blue');

  if (!isOpen || (!selectedEmployee && printMode === 'single')) return null;

  const currentEmp = selectedEmployee || allEmployees[0];
  const targetEmployees = printMode === 'single' ? (currentEmp ? [currentEmp] : []) : allEmployees;

  // Build clean HTML string for isolated printing
  const generatePrintHtml = () => {
    const isSingle = printMode === 'single';

    const cardsHtml = targetEmployees
      .map((emp) => {
        const photoHtml = emp.photo_url
          ? `<img src="${emp.photo_url}" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid ${
              colorTheme === 'blue' ? '#3b82f6' : '#0f172a'
            }; display: block; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`
          : `<div style="width: 72px; height: 72px; border-radius: 50%; background: ${
              colorTheme === 'blue' ? '#1e3a8a' : '#f1f5f9'
            }; color: ${
              colorTheme === 'blue' ? '#ffffff' : '#0f172a'
            }; font-size: 26px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 2px solid #cbd5e1;">${emp.name.charAt(
              0
            )}</div>`;

        return `
          <div style="
            width: 260px;
            padding: 16px 14px;
            border-radius: 16px;
            border: 2px solid ${colorTheme === 'blue' ? '#2563eb' : '#0f172a'};
            background: ${colorTheme === 'blue' ? '#0f172a' : '#ffffff'};
            color: ${colorTheme === 'blue' ? '#ffffff' : '#0f172a'};
            text-align: center;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            font-family: system-ui, -apple-system, sans-serif;
            page-break-inside: avoid;
            margin: 0 auto 16px auto;
            position: relative;
          ">
            <!-- Lanyard slot cutout indicator -->
            <div style="width: 44px; height: 5px; background: ${
              colorTheme === 'blue' ? '#334155' : '#cbd5e1'
            }; border-radius: 3px; margin: 0 auto 10px auto;"></div>
            
            <div style="font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: ${
              colorTheme === 'blue' ? '#60a5fa' : '#2563eb'
            }; margin-bottom: 2px;">
              ${storeName}
            </div>
            <div style="font-size: 9px; font-weight: 600; color: ${
              colorTheme === 'blue' ? '#94a3b8' : '#64748b'
            }; margin-bottom: 12px; text-transform: uppercase;">
              KARTU TANDA PENGENAL & ABSENSI
            </div>

            ${photoHtml}

            <div style="margin-top: 10px; margin-bottom: 2px;">
              <div style="font-size: 15px; font-weight: 800; line-height: 1.2; word-break: break-word;">${emp.name}</div>
              <div style="display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; background: ${
                colorTheme === 'blue' ? '#1e293b' : '#f1f5f9'
              }; color: ${colorTheme === 'blue' ? '#93c5fd' : '#1e40af'}; border: 1px solid ${
          colorTheme === 'blue' ? '#334155' : '#e2e8f0'
        };">
                ${emp.position}
              </div>
            </div>

            <!-- Barcode Container -->
            <div style="
              background: #ffffff;
              border-radius: 10px;
              padding: 8px 6px 4px 6px;
              margin-top: 12px;
              border: 1px solid ${colorTheme === 'blue' ? '#334155' : '#cbd5e1'};
              color: #0f172a;
            ">
              <div style="font-family: monospace; font-size: 11px; font-weight: 700; margin-bottom: 3px; letter-spacing: 1px;">
                ${emp.barcode_id}
              </div>
              <div style="font-size: 8px; color: #64748b;">Scan untuk Absensi Masuk / Pulang</div>
            </div>

            <div style="margin-top: 10px; font-size: 8px; color: ${
              colorTheme === 'blue' ? '#94a3b8' : '#64748b'
            }; display: flex; justify-content: space-between; padding: 0 4px;">
              <span>No HP: ${emp.phone || '-'}</span>
              <span>Aktif</span>
            </div>
          </div>
        `;
      })
      .join('');

    if (isSingle) {
      return `
        <div style="display: flex; justify-content: center; align-items: center; min-height: 80vh; padding: 20px;">
          ${cardsHtml}
        </div>
      `;
    }

    return `
      <div>
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #94a3b8; padding-bottom: 10px;">
          <h2 style="font-size: 16px; margin: 0; text-transform: uppercase;">DAFTAR KARTU IDENTITAS KARYAWAN — ${storeName}</h2>
          <p style="font-size: 11px; color: #64748b; margin: 4px 0 0 0;">Gunting sesuai garis batas kartu untuk laminating atau dimasukkan ke holder id card.</p>
        </div>
        <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px;">
          ${cardsHtml}
        </div>
      </div>
    `;
  };

  const handlePrintCard = () => {
    const html = generatePrintHtml();
    printHtmlDirect(
      html,
      printMode === 'single'
        ? `Kartu-ID-${currentEmp?.name || 'Karyawan'}`
        : `Semua-Kartu-Karyawan-${storeName}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto no-print">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Cetak Kartu Tanda Pengenal Karyawan</h3>
              <p className="text-[11px] text-slate-500">
                Kartu ID resmi dengan foto galeri & barcode absensi instan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Toolbar */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setPrintMode('single')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                printMode === 'single'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Kartu Ini Saja</span>
            </button>
            <button
              onClick={() => setPrintMode('batch')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                printMode === 'batch'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Semua Karyawan ({allEmployees.length})</span>
            </button>
          </div>

          {/* Color Switcher */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setColorTheme('blue')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 ${
                colorTheme === 'blue'
                  ? 'bg-slate-900 text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Warna Biru POS Modern"
            >
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Biru Modern</span>
            </button>
            <button
              onClick={() => setColorTheme('classic')}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 ${
                colorTheme === 'classic'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Format Putih Minimalis (Hemat Tinta Printer)"
            >
              <div className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400"></div>
              <span>Putih Bersih</span>
            </button>
          </div>
        </div>

        {/* Card Preview Container */}
        <div className="p-6 bg-slate-50/80 overflow-y-auto max-h-[58vh] flex flex-col items-center justify-center">
          {printMode === 'single' && currentEmp && (
            <div
              className={`w-68 rounded-3xl p-5 text-center shadow-xl border-2 transition-all relative overflow-hidden ${
                colorTheme === 'blue'
                  ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white border-blue-600/60 shadow-blue-900/20'
                  : 'bg-white text-slate-900 border-slate-800 shadow-slate-200'
              }`}
            >
              {/* Lanyard slot hole */}
              <div
                className={`w-11 h-1.5 rounded-full mx-auto mb-3.5 ${
                  colorTheme === 'blue' ? 'bg-slate-700/80' : 'bg-slate-200'
                }`}
              ></div>

              <div className="space-y-0.5 mb-3">
                <div
                  className={`text-[10px] font-extrabold uppercase tracking-widest ${
                    colorTheme === 'blue' ? 'text-blue-400' : 'text-blue-600'
                  }`}
                >
                  {storeName}
                </div>
                <div
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    colorTheme === 'blue' ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Kartu Tanda Pengenal & Absensi
                </div>
              </div>

              {/* Photo */}
              <div className="my-3">
                {currentEmp.photo_url ? (
                  <img
                    src={currentEmp.photo_url}
                    alt={currentEmp.name}
                    className="w-18 h-18 rounded-full mx-auto object-cover border-2 border-blue-400 shadow-md ring-4 ring-blue-500/10"
                  />
                ) : (
                  <div className="w-18 h-18 rounded-full mx-auto bg-blue-600 text-white font-black text-2xl flex items-center justify-center border-2 border-blue-400 shadow-md">
                    {currentEmp.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* Name & Role */}
              <div className="space-y-1 my-2.5">
                <h4 className="font-extrabold text-base tracking-wide leading-tight">
                  {currentEmp.name}
                </h4>
                <span
                  className={`inline-block text-[11px] font-bold px-3 py-0.5 rounded-full border ${
                    colorTheme === 'blue'
                      ? 'bg-blue-950 text-blue-300 border-blue-500/30'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {currentEmp.position}
                </span>
              </div>

              {/* Barcode Box */}
              <div className="bg-white p-2.5 rounded-2xl text-slate-900 shadow-inner mt-4 border border-slate-200">
                <BarcodeRenderer
                  value={currentEmp.barcode_id}
                  width={1.3}
                  height={38}
                  fontSize={11}
                  className="mx-auto"
                />
                <p className="text-[9px] font-medium text-slate-500 mt-0.5">
                  Scan Barcode untuk Absensi Mandiri
                </p>
              </div>

              {/* Footer info */}
              <div
                className={`mt-4 pt-3 border-t flex items-center justify-between text-[10px] font-medium ${
                  colorTheme === 'blue'
                    ? 'border-slate-800 text-slate-400'
                    : 'border-slate-100 text-slate-500'
                }`}
              >
                <span>Telp: {currentEmp.phone}</span>
                <span className="flex items-center text-emerald-500 font-bold">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  Karyawan Aktif
                </span>
              </div>
            </div>
          )}

          {printMode === 'batch' && (
            <div className="w-full space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Pratinjau lembar cetak massal: <b>{allEmployees.length} kartu karyawan</b> akan dicetak
                  tersusun rapi siap digunting.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {allEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className={`rounded-2xl p-4 text-center border ${
                      colorTheme === 'blue'
                        ? 'bg-slate-900 text-white border-blue-600/40'
                        : 'bg-white text-slate-900 border-slate-300'
                    }`}
                  >
                    <div className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                      {storeName}
                    </div>
                    {emp.photo_url ? (
                      <img
                        src={emp.photo_url}
                        alt={emp.name}
                        className="w-12 h-12 rounded-full mx-auto object-cover border-2 border-blue-400 my-2"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full mx-auto bg-blue-600 text-white font-bold text-sm flex items-center justify-center my-2">
                        {emp.name.charAt(0)}
                      </div>
                    )}
                    <h5 className="font-bold text-xs truncate">{emp.name}</h5>
                    <p className="text-[10px] text-blue-300 font-semibold">{emp.position}</p>
                    <div className="bg-white p-1 rounded-lg mt-2 text-slate-900">
                      <BarcodeRenderer
                        value={emp.barcode_id}
                        width={1.1}
                        height={26}
                        fontSize={9}
                        className="mx-auto"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Siap cetak via printer biasa (kertas A4 / Glossy) atau printer kartu ID Card PVC.
          </p>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrintCard}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {printMode === 'single' ? 'Cetak Kartu Ini' : `Cetak Semua (${allEmployees.length} Kartu)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
