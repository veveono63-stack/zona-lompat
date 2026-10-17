import React, { useEffect, useState } from 'react';
import { 
  Trophy, RotateCcw, CheckCircle2, XCircle, Sparkles, 
  Layers, ZoomIn, ZoomOut, Maximize2, X, Download, Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizSet, WinningSnapshot } from '../types/quiz';

interface EvaluationSummaryProps {
  quizSet: QuizSet;
  onRestart: () => void;
  onOpenAdmin: () => void;
  snapshots: WinningSnapshot[];
}

export const EvaluationSummary: React.FC<EvaluationSummaryProps> = ({
  quizSet,
  onRestart,
  onOpenAdmin,
  snapshots,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<WinningSnapshot | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    // Launch festive confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  // Reset zoom when modal opens/closes
  const handleOpenZoom = (snap: WinningSnapshot) => {
    setSelectedSnapshot(snap);
    setZoomLevel(1);
  };

  const handleCloseZoom = () => {
    setSelectedSnapshot(null);
    setZoomLevel(1);
  };

  const handleDownloadSnapshot = (snap: WinningSnapshot) => {
    const a = document.createElement('a');
    a.href = snap.dataUrl;
    a.download = `pemenang_soal_${snap.questionIndex + 1}_${snap.winningSide}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <>
      <div className="w-full max-w-5xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300 mt-4 mb-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xl">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
            Evaluasi Selesai! Kerja Bagus Semua Siswa! 🎉
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mt-2">
            Seluruh {quizSet.questions.length} pernyataan dalam materi{' '}
            <strong className="text-indigo-300">"{quizSet.title}"</strong> telah dibahas.
          </p>
        </div>

        {/* SNAPSHOT MOMENT REVIEW OF WINNING STUDENTS (9:16 Portrait) */}
        {snapshots.length > 0 && (
          <div className="text-left bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  📸 Tangkapan Kamera Siswa yang Menjawab Betul:
                </span>
                <p className="text-[11px] text-slate-400">
                  Format potret 9:16 (Klik foto untuk memperbesar & mengecek wajah siswa yang benar)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {snapshots.map((snap, i) => (
                <div
                  key={i}
                  onClick={() => handleOpenZoom(snap)}
                  className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 group cursor-pointer hover:border-emerald-500 hover:shadow-xl transition-all flex flex-col"
                >
                  <div className="aspect-[9/16] w-full overflow-hidden bg-black flex items-center justify-center">
                    <img
                      src={snap.dataUrl}
                      alt={`Pemenang Soal ${snap.questionIndex + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Overlay Tag */}
                  <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Soal #{snap.questionIndex + 1}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        {snap.winningLabel}
                      </span>
                    </div>

                    <div className="p-1 rounded-lg bg-slate-800 text-slate-300 group-hover:text-emerald-300 group-hover:bg-slate-700 transition-colors">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Hover visual cue */}
                  <div className="absolute inset-0 bg-emerald-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-slate-900/90 text-white text-xs font-bold shadow flex items-center gap-1.5 border border-emerald-500/50">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      Klik untuk Perbesar
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recap of Questions & Answers */}
        <div className="text-left bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 max-h-64 overflow-y-auto space-y-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Ringkasan Materi & Kunci Jawaban:
          </span>
          {quizSet.questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-start gap-3"
            >
              <div className="mt-0.5">
                {q.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-100">
                  {idx + 1}. {q.text}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      q.isCorrect
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    KUNCI: {q.isCorrect ? 'BENAR (KIRI)' : 'SALAH (KANAN)'}
                  </span>
                  <span className="text-xs text-slate-400 line-clamp-1">
                    {q.explanation}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={onRestart}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-transform active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ulangi Evaluasi Ini</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Pilih / Buat Materi Lain</span>
          </button>
        </div>
      </div>

      {/* FULLSCREEN LIGHTBOX ZOOM MODAL */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[95vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-600/40 text-indigo-300 font-bold text-xs">
                    Soal #{selectedSnapshot.questionIndex + 1}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    🏆 {selectedSnapshot.winningLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-1 line-clamp-1">
                  "{selectedSnapshot.questionText}"
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Perbesar (Zoom In)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Perkecil (Zoom Out)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
                  title="Reset Zoom"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSnapshot(selectedSnapshot)}
                  className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  title="Unduh / Simpan Foto Ini"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseZoom}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Tutup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Body with Zoom / Pan */}
            <div className="flex-1 overflow-auto bg-black p-4 flex items-center justify-center select-none">
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full max-h-[70vh] flex items-center justify-center cursor-grab active:cursor-grabbing"
              >
                <img
                  src={selectedSnapshot.dataUrl}
                  alt="Tangkapan Siswa Pemenang"
                  className="rounded-xl shadow-2xl object-contain max-h-[70vh] border border-slate-700"
                />
              </div>
            </div>

            {/* Lightbox Footer Instruction */}
            <div className="p-3 bg-slate-950 text-center border-t border-slate-800 text-xs text-slate-400">
              Guru dapat memeriksa detail wajah siswa yang berhasil melompat ke area yang tepat.
            </div>
          </div>
        </div>
      )}
    </>
  );
};
