import React, { useState } from 'react';
import { X, Sparkles, Loader2, Check, CheckSquare, Square, BookOpen, AlertCircle } from 'lucide-react';
import { Question } from '../types/quiz';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestions: (questions: Question[]) => void;
}

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  onAddQuestions,
}) => {
  const [topic, setTopic] = useState<string>('Sains dan Kehidupan Hewan');
  const [gradeLevel, setGradeLevel] = useState<string>('SD / SMP');
  const [difficulty, setDifficulty] = useState<string>('Sedang');
  const [count, setCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [generatedList, setGeneratedList] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const quickTopics = [
    'Tata Surya & Antariksa',
    'Biologi & Tubuh Manusia',
    'Sejarah Kemerdekaan RI',
    'Geografi Nusantara',
    'Logika & Matematika Dasar',
    'Fakta Unik Hewan & Tumbuhan',
    'Mitos vs Fakta Sehari-hari',
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedList([]);

    try {
      const res = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          gradeLevel,
          difficulty,
          count,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setGeneratedList(data.questions);
        setSelectedIds(new Set(data.questions.map((q: Question) => q.id)));
      } else {
        throw new Error(data.error || 'Gagal menghasilkan soal');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memproses permintaan AI');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === generatedList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(generatedList.map((q) => q.id)));
    }
  };

  const handleConfirmAdd = () => {
    const toAdd = generatedList.filter((q) => selectedIds.has(q.id));
    if (toAdd.length > 0) {
      onAddQuestions(toAdd);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                AI Generator Soal Evaluasi
              </h3>
              <p className="text-xs text-slate-400">
                Buat seketika paket soal Benar/Salah berkualitas tinggi dengan Gemini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Topik / Materi Kuis
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Contoh: Tata Surya, Fotosintesis, Kerajaan Majapahit..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Quick Topic Chips */}
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                Saran Topik Populer:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickTopics.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTopic(item)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      topic === item
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tingkat / Kelas
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="SD (Kelas 1-3)">SD (Kelas 1-3)</option>
                  <option value="SD (Kelas 4-6)">SD (Kelas 4-6)</option>
                  <option value="SMP">SMP (Kelas 7-9)</option>
                  <option value="SMA / SMK">SMA / SMK (Kelas 10-12)</option>
                  <option value="Umum & Fun Trivia">Umum & Fun Trivia</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tingkat Kesulitan
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="Mudah">Mudah</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Menantang & Kritis">Menantang & Kritis</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Jumlah Soal
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value={3}>3 Soal</option>
                  <option value={5}>5 Soal</option>
                  <option value={8}>8 Soal</option>
                  <option value={10}>10 Soal</option>
                  <option value={12}>12 Soal</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang Menghasilkan Soal Cerdas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Pernyataan Sekarang</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-600/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated Questions List Preview */}
          {generatedList.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Hasil ({selectedIds.size} dipilih dari {generatedList.length})
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {selectedIds.size === generatedList.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {generatedList.map((q) => {
                  const isChecked = selectedIds.has(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleSelect(q.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-slate-800/90 border-indigo-500/70 shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          className="mt-0.5 text-indigo-400"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-slate-100">
                            {q.text}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                q.isCorrect
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              Kunci: {q.isCorrect ? 'BENAR' : 'SALAH'}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">
                              {q.explanation}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {generatedList.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmAdd}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Tambahkan {selectedIds.size} Soal ke Kuis</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
