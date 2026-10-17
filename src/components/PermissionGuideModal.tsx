import React from 'react';
import { ExternalLink, CheckCircle, AlertTriangle, X, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface PermissionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetrySync?: () => void;
  isRetrying?: boolean;
}

export const PermissionGuideModal: React.FC<PermissionGuideModalProps> = ({
  isOpen,
  onClose,
  onRetrySync,
  isRetrying = false,
}) => {
  if (!isOpen) return null;

  const scriptEditUrl = 'https://script.google.com/macros/edit?lib=1ze_zo31ylaLLIaDGaiJANYgHcruKn0WvRuORDIzTexgO7GEl8cJfINsb';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl text-white my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black font-heading tracking-wide text-white flex items-center gap-2">
                Panduan Perbaiki Izin Google Apps Script
              </h3>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Solusi pesan &quot;You need access&quot; / Membutuhkan Izin Akses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-1 space-y-4 py-4 text-xs leading-relaxed text-slate-300">
          {/* Explanation Box */}
          <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Kenapa pesan ini muncul?</p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Secara bawaan, Google mengatur Web App Apps Script ke <em>&quot;Only myself&quot; (Hanya saya)</em>. 
                Agar aplikasi game Smart Jump dapat mengambil soal dari Spreadsheet secara otomatis untuk siswa tanpa perlu meminta login Google, izin akses Web App harus diubah menjadi <strong>&quot;Siapa saja&quot; (Anyone)</strong>.
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-xs">
                ✓
              </span>
              Langkah Cepat (Hanya 1 Menit di Google Sheets):
            </h4>

            {/* Step 1 */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">
                1
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">Buka Apps Script di Google Sheets</p>
                <p className="text-slate-400 text-[11px]">
                  Buka Google Spreadsheet soal Anda, klik menu atas: <span className="text-emerald-300 font-semibold">Ekstensi</span> &gt; <span className="text-emerald-300 font-semibold">Apps Script</span>.
                </p>
                <div className="pt-1">
                  <a
                    href={scriptEditUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    <span>Klik Di Sini untuk Buka Script Langsung</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">
                2
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">Kelola Penerapan (Manage Deployments)</p>
                <p className="text-slate-400 text-[11px]">
                  Di pojok kanan atas layar Apps Script, klik tombol biru <strong className="text-white">Terapkan (Deploy)</strong> &gt; pilih <strong className="text-white">Kelola penerapan (Manage deployments)</strong>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">
                3
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">Edit Penerapan Aktif</p>
                <p className="text-slate-400 text-[11px]">
                  Klik ikon <strong className="text-amber-300">Pensil ✏️ (Edit)</strong> pada penerapan Web App yang aktif saat ini.
                </p>
              </div>
            </div>

            {/* Step 4 & 5 - Crucial */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-600/40 text-emerald-300 border border-emerald-500/60 flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">
                4
              </div>
              <div className="space-y-1.5">
                <p className="font-bold text-emerald-300 text-xs">
                  Ubah Izin Akses Menjadi &quot;Siapa saja&quot; (KUNCI UTAMA):
                </p>
                <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                  <li>
                    <strong>Yang memiliki akses (Who has access):</strong> Ubah dari <em>Hanya saya (Only myself)</em> menjadi <span className="bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold border border-emerald-500/40">Siapa saja (Anyone)</span>.
                  </li>
                  <li>
                    <strong>Jalankan sebagai (Execute as):</strong> Pastikan dipilih <span className="text-white font-semibold">Saya (email guru/admin) / Me</span>.
                  </li>
                  <li>
                    <strong>Versi (Version):</strong> Pilih <span className="text-white font-semibold">Versi baru (New version)</span>.
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 6 */}
            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold shrink-0 mt-0.5 text-xs">
                5
              </div>
              <div className="space-y-1">
                <p className="font-medium text-white">Klik Terapkan (Deploy)</p>
                <p className="text-slate-400 text-[11px]">
                  Klik tombol biru <strong className="text-white">Terapkan (Deploy)</strong> di pojok kanan bawah jendela dialog.
                </p>
              </div>
            </div>
          </div>

          {/* Spreadsheet Sharing tip */}
          <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl text-[11px] text-slate-400 space-y-1">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tips Tambahan: Izin Berbagi Spreadsheet
            </span>
            <p>
              Di Google Sheets Anda, pastikan juga tombol biru <strong>Bagikan (Share)</strong> di kanan atas diatur: <em>Akses umum &gt; &quot;Siapa saja yang memiliki link&quot; (Anyone with the link)</em>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <a
            href={scriptEditUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
          >
            <span>Buka Editor Script</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
            >
              Tutup
            </button>

            {onRetrySync && (
              <button
                type="button"
                disabled={isRetrying}
                onClick={onRetrySync}
                className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Sedang Mencoba...' : 'Coba Hubungkan Sekarang'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
