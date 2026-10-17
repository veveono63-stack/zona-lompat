import React from 'react';
import { Volume2, Play, ArrowRight, RotateCcw, ShieldAlert, Check, X, Users, Sparkles } from 'lucide-react';
import { GamePhase, Question } from '../types/quiz';

interface QuestionOverlayProps {
  question: Question | null;
  currentIndex: number;
  totalQuestions: number;
  phase: GamePhase;
  readingTimer: number; // 0 to 10
  jumpingTimer: number; // 0 to 3
  onStartReading: () => void;
  onNextQuestion: () => void;
  onRepeatQuestion: () => void;
  onSpeakQuestion: () => void;
}

export const QuestionOverlay: React.FC<QuestionOverlayProps> = ({
  question,
  currentIndex,
  totalQuestions,
  phase,
  readingTimer,
  jumpingTimer,
  onStartReading,
  onNextQuestion,
  onRepeatQuestion,
  onSpeakQuestion,
}) => {
  if (!question) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-800 text-center text-slate-300 text-xs">
        Pilih materi kuis terlebih dahulu di menu Admin.
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-950/65 backdrop-blur-md border border-slate-700/50 rounded-2xl p-3 sm:p-4 shadow-2xl transition-all">
      {/* Top Single Row: Trackers, Phase Status, Timers, and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80 text-xs">
        {/* Left: Tracker */}
        <div className="flex items-center gap-2">
          <span className="bg-indigo-600/40 text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-500/30 font-heading">
            Soal {currentIndex + 1} / {totalQuestions}
          </span>
          {question.category && (
            <span className="text-slate-400 font-medium text-[11px] hidden sm:inline">
              Materi: <strong className="text-slate-200">{question.category}</strong>
            </span>
          )}
        </div>

        {/* Center: Phase Timers */}
        <div className="flex items-center gap-2">
          {phase === 'idle' && (
            <div className="flex items-center gap-1.5 text-amber-300 font-medium bg-slate-900/90 px-3 py-1 rounded-lg border border-amber-500/30 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Menunggu Guru Membuka Soal...</span>
            </div>
          )}

          {phase === 'reading' && (
            <div className="flex items-center gap-2.5 bg-amber-950/90 border border-amber-500/60 px-3 py-1 rounded-xl text-amber-200 shadow-md">
              <span className="text-[11px] font-bold hidden sm:inline">BACA & BERPIKIR:</span>
              <div className="w-7 h-7 rounded-full bg-amber-500 text-amber-950 font-black text-sm font-heading flex items-center justify-center shadow-inner">
                {readingTimer}s
              </div>
            </div>
          )}

          {phase === 'jumping' && (
            <div className="flex items-center gap-2 bg-rose-600/90 border border-rose-400 px-3 py-1 rounded-xl text-white shadow-lg shadow-rose-600/40 animate-pulse">
              <span className="text-[11px] font-black uppercase tracking-wider font-heading">
                HITUNG MUNDUR:
              </span>
              <div className="w-7 h-7 rounded-full bg-white text-rose-600 font-black text-base font-heading flex items-center justify-center shadow">
                {jumpingTimer}
              </div>
            </div>
          )}

          {phase === 'revealed' && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-heading font-black text-xs uppercase tracking-wide shadow-md ${
                question.isCorrect
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-rose-600 text-white shadow-rose-600/30'
              }`}
            >
              {question.isCorrect ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>KUNCI: BENAR (KIRI)</span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 stroke-[3]" />
                  <span>KUNCI: SALAH (KANAN)</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {phase !== 'idle' && (
            <button
              type="button"
              onClick={onSpeakQuestion}
              title="Dengarkan Suara Soal"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}

          {phase === 'revealed' && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRepeatQuestion}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ulang</span>
              </button>
              <button
                type="button"
                onClick={onNextQuestion}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <span>{currentIndex + 1 >= totalQuestions ? 'Selesaikan Evaluasi' : 'Soal Berikutnya'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Area: If IDLE -> Standby Screen with Start Button; If ACTIVE -> Show Question */}
      {phase === 'idle' ? (
        <div className="py-2.5 px-3 sm:px-4 text-center flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/50 rounded-xl border border-dashed border-indigo-500/40">
          <div className="text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-base font-heading shrink-0">
              #{currentIndex + 1}
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Persiapan Mulai Kuis Evaluasi</span>
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Siswa silakan berbaris rapi di tengah koridor (depan ke belakang). Klik tombol untuk memulai soal pertama!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartReading}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transform active:scale-95 transition-all shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mulai Kuis & Buka Soal Pertama (10s)</span>
          </button>
        </div>
      ) : (
        /* Statement Display when Reading, Jumping, or Revealed */
        <div className="text-center py-1.5 animate-in fade-in zoom-in-95 duration-200">
          <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            "{question.text}"
          </h2>

          {/* Compact explanation if revealed */}
          {phase === 'revealed' && (
            <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-center gap-2 text-xs md:text-sm text-slate-100 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-amber-400 font-bold shrink-0">💡 Penjelasan:</span>
              <span className="line-clamp-2">{question.explanation}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
