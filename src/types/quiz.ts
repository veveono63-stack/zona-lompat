export interface Question {
  id: string;
  text: string;
  isCorrect: boolean; // true = BENAR, false = SALAH
  explanation: string;
  category?: string;
}

export interface QuizSet {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: Question[];
  createdAt: string;
}

export type GamePhase = 
  | 'idle'          // Belum mulai ronde
  | 'reading'       // 10 detik membaca soal & berpikir di baris tengah
  | 'jumping'       // 3 detik hitung mundur untuk melompat ke sisi kiri/kanan
  | 'revealed'      // Jawaban terungkap, visual highlight & penjelasan
  | 'finished';     // Sesi kuis selesai

export interface GameSettings {
  readingTime: number;   // default 10s
  jumpingTime: number;   // default 3s
  soundEnabled: boolean;
  voiceEnabled: boolean;
  musicEnabled: boolean;
  isMirrored: boolean;
  enableSnapshots: boolean;
  showCenterGuideline: boolean;
}

export interface WinningSnapshot {
  questionIndex: number;
  questionText: string;
  winningSide: 'left' | 'right';
  winningLabel: string; // 'BENAR (Kiri)' or 'SALAH (Kanan)'
  dataUrl: string;
  timestamp: string;
}
