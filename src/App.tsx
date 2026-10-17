/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RefreshCw } from 'lucide-react';
import { CameraView } from './components/CameraView';
import { QuestionOverlay } from './components/QuestionOverlay';
import { GameControls } from './components/GameControls';
import { AdminPanel } from './components/AdminPanel';
import { LoginModal } from './components/LoginModal';
import { EvaluationSummary } from './components/EvaluationSummary';
import { PermissionGuideModal } from './components/PermissionGuideModal';
import { DEFAULT_QUIZZES } from './data/defaultQuizzes';
import { sound } from './services/sound';
import { speech } from './services/speech';
import { QuizSet, GamePhase, GameSettings, WinningSnapshot } from './types/quiz';

export default function App() {
  // Quiz datasets state
  const [quizSets, setQuizSets] = useState<QuizSet[]>(() => {
    try {
      const saved = localStorage.getItem('app_quiz_sets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved quiz sets:', e);
    }
    return DEFAULT_QUIZZES;
  });

  const [activeQuizId, setActiveQuizId] = useState<string>(() => {
    return quizSets[0]?.id || DEFAULT_QUIZZES[0].id;
  });

  // Active quiz set & question
  const activeQuiz = quizSets.find((q) => q.id === activeQuizId) || quizSets[0] || DEFAULT_QUIZZES[0];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const currentQuestion = activeQuiz?.questions[currentQuestionIndex] || null;

  // Game Phase & Timers
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [readingTimer, setReadingTimer] = useState<number>(10);
  const [jumpingTimer, setJumpingTimer] = useState<number>(3);
  const [shouldCaptureSnapshot, setShouldCaptureSnapshot] = useState<boolean>(false);
  const [snapshots, setSnapshots] = useState<WinningSnapshot[]>([]);

  // Camera devices state
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('app_game_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      readingTime: 10,
      jumpingTime: 3,
      soundEnabled: true,
      voiceEnabled: true,
      musicEnabled: true, // Default ON for Millionaire BGM tension!
      isMirrored: true, // Default mirror so physical jump matches screen
      enableSnapshots: true,
      showCenterGuideline: true,
    };
  });

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync sound, music & voice services with settings
  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
    sound.setMusicEnabled(settings.musicEnabled);
    speech.setEnabled(settings.voiceEnabled);
    localStorage.setItem('app_game_settings', JSON.stringify(settings));
  }, [settings]);

  // Persist quizSets to localStorage
  useEffect(() => {
    localStorage.setItem('app_quiz_sets', JSON.stringify(quizSets));
  }, [quizSets]);

  // Floating notification state for auto-sync on initial app load
  const [syncToast, setSyncToast] = useState<{
    show: boolean;
    type: 'loading' | 'success' | 'error';
    text: string;
  }>({ show: false, type: 'loading', text: '' });
  const [isPermissionGuideOpen, setIsPermissionGuideOpen] = useState(false);
  const [isRetryingAutoSync, setIsRetryingAutoSync] = useState(false);
  const [isAuthErrorToast, setIsAuthErrorToast] = useState(false);

  // Auto-sync questions from Google Spreadsheet / Script on initial load
  const triggerAutoSync = async (customUrl?: string) => {
    const savedUrl = localStorage.getItem('smart_jump_spreadsheet_url');
    const DEFAULT_BACKEND_URL =
      'https://script.google.com/macros/s/AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj/exec';

    const targetUrl = (customUrl || savedUrl || '').trim() || DEFAULT_BACKEND_URL;
    setIsRetryingAutoSync(true);
    setSyncToast({
      show: true,
      type: 'loading',
      text: 'Menghubungkan ke database Google Spreadsheet (Bu Melisa)...',
    });

    try {
      const res = await fetch('/api/sync-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();

      if (data && data.success && data.groups) {
        setIsAuthErrorToast(false);
        setIsPermissionGuideOpen(false);
        setQuizSets(() => {
          const spreadsheetSets: QuizSet[] = [];
          Object.entries(data.groups as { [title: string]: any[] }).forEach(([title, questions], idx) => {
            spreadsheetSets.push({
              id: `quiz-set-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
              title: title,
              description: `Paket soal tersinkron dari Google Spreadsheet (${questions.length} soal)`,
              category: questions[0]?.category || 'Spreadsheet',
              createdAt: new Date().toISOString(),
              questions: questions,
              isFromSpreadsheet: true,
            } as any);
          });
          return spreadsheetSets;
        });

        const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
        localStorage.setItem('smart_jump_last_synced', nowStr);

        setSyncToast({
          show: true,
          type: 'success',
          text: `✅ Berhasil memuat ${data.totalQuestions} soal dari Google Spreadsheet (${nowStr})`,
        });
        setTimeout(() => {
          setSyncToast((prev) => ({ ...prev, show: false }));
        }, 4500);
      } else {
        const isAuth = Boolean(data.isAuthError || res.status === 403);
        setIsAuthErrorToast(isAuth);
        throw new Error(data.error || 'Respon spreadsheet tidak valid');
      }
    } catch (err: any) {
      console.warn('Auto-sync spreadsheet error:', err);
      const isAuth = err.message?.includes('izin') || err.message?.includes('access') || isAuthErrorToast;
      setIsAuthErrorToast(Boolean(isAuth));
      setSyncToast({
        show: true,
        type: 'error',
        text: `⚠️ Info Spreadsheet: ${err.message || 'Periksa koneksi/izin spreadsheet'}`,
      });
      setTimeout(() => {
        setSyncToast((prev) => ({ ...prev, show: false }));
      }, isAuth ? 15000 : 7000);
    } finally {
      setIsRetryingAutoSync(false);
    }
  };

  useEffect(() => {
    const autoSyncSetting = localStorage.getItem('smart_jump_auto_sync');
    const isAutoSyncEnabled = autoSyncSetting !== 'false';
    const savedUrl = localStorage.getItem('smart_jump_spreadsheet_url');
    const DEFAULT_BACKEND_URL =
      'https://script.google.com/macros/s/AKfycbxud-Zz3_8qx7LqvSGc717ig9f8zW5I7-bJJGM8Vicie6hmYTAVIAf_6gLVkyQgeJVj/exec';

    if (!savedUrl) {
      localStorage.setItem('smart_jump_spreadsheet_url', DEFAULT_BACKEND_URL);
    }

    if (isAutoSyncEnabled) {
      triggerAutoSync();
    }
  }, []);

  // Handle Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Timer Countdown Controller & Millionaire BGM triggers
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (phase === 'reading') {
      if (settings.musicEnabled) {
        sound.startCompetitionBGM(false);
      }

      interval = setInterval(() => {
        setReadingTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            triggerJumpingPhase();
            return 0;
          }
          sound.playTick(500 + prev * 20);
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'jumping') {
      if (settings.musicEnabled) {
        sound.startCompetitionBGM(true);
      }

      interval = setInterval(() => {
        setJumpingTimer((prev) => {
          if (prev === 2) {
            // Count 1 is next! Speak "Lompat!" on count 1
            if (settings.voiceEnabled) {
              speech.speak('Lompat!');
            }
          }
          if (prev <= 1) {
            clearInterval(interval!);
            triggerRevealPhase();
            return 0;
          }
          sound.playTick(800 + (4 - prev) * 150);
          return prev - 1;
        });
      }, 1000);
    } else {
      sound.stopBGM();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, settings.musicEnabled]);

  // Phase transition triggers
  const startReading = () => {
    if (!currentQuestion) return;
    sound.init(); // Explicit user gesture unlocking AudioContext!
    setPhase('reading');
    setReadingTimer(settings.readingTime);
    sound.playClick();

    if (settings.musicEnabled) {
      sound.startCompetitionBGM(false);
    }

    if (settings.voiceEnabled) {
      speech.speak(`Soal nomor ${currentQuestionIndex + 1}: ${currentQuestion.text}`);
    }
  };

  const triggerJumpingPhase = () => {
    setPhase('jumping');
    setJumpingTimer(settings.jumpingTime);
    sound.playJumpWhistle();
    if (settings.musicEnabled) {
      sound.startCompetitionBGM(true);
    }
  };

  const triggerRevealPhase = () => {
    sound.stopBGM();
    setPhase('revealed');
    setShouldCaptureSnapshot(true);
    setTimeout(() => setShouldCaptureSnapshot(false), 500);

    if (currentQuestion) {
      const isAnswerTrue = currentQuestion.isCorrect;
      if (isAnswerTrue) {
        sound.playCorrect();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.25, y: 0.5 },
        });
      } else {
        sound.playCorrect();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.75, y: 0.5 },
        });
      }

      if (settings.voiceEnabled) {
        speech.speak(
          `Kunci jawaban yang betul adalah: ${isAnswerTrue ? 'Benar, di sisi kiri.' : 'Salah, di sisi kanan.'} ${currentQuestion.explanation}`
        );
      }
    }
  };

  const handleNextQuestion = () => {
    sound.init();
    sound.playClick();
    speech.stop();
    sound.stopBGM();
    if (currentQuestionIndex + 1 < activeQuiz.questions.length) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      // Immediately start reading countdown and show next question
      setPhase('reading');
      setReadingTimer(settings.readingTime);
      setJumpingTimer(settings.jumpingTime);

      if (settings.musicEnabled) {
        sound.startCompetitionBGM(false);
      }
      if (settings.voiceEnabled && activeQuiz.questions[nextIndex]) {
        speech.speak(`Soal nomor ${nextIndex + 1}: ${activeQuiz.questions[nextIndex].text}`);
      }
    } else {
      setPhase('finished');
    }
  };

  const handleRepeatQuestion = () => {
    sound.init();
    sound.playClick();
    speech.stop();
    sound.stopBGM();
    // Immediately repeat reading countdown
    setPhase('reading');
    setReadingTimer(settings.readingTime);
    setJumpingTimer(settings.jumpingTime);

    if (settings.musicEnabled) {
      sound.startCompetitionBGM(false);
    }
    if (settings.voiceEnabled && currentQuestion) {
      speech.speak(`Mengulang soal nomor ${currentQuestionIndex + 1}: ${currentQuestion.text}`);
    }
  };

  const handleResetSession = () => {
    sound.init();
    sound.playClick();
    speech.stop();
    sound.stopSuspenseBGM();
    setCurrentQuestionIndex(0);
    setPhase('idle');
    setReadingTimer(settings.readingTime);
    setJumpingTimer(settings.jumpingTime);
    setSnapshots([]);
  };

  const handleSpeakCurrentQuestion = () => {
    if (!currentQuestion) return;
    speech.speak(`Soal nomor ${currentQuestionIndex + 1}: ${currentQuestion.text}`);
  };

  const handleCaptureSnapshot = (dataUrl: string, winningSide: 'left' | 'right') => {
    if (!settings.enableSnapshots || !currentQuestion) return;
    const newSnap: WinningSnapshot = {
      questionIndex: currentQuestionIndex,
      questionText: currentQuestion.text,
      winningSide,
      winningLabel: winningSide === 'left' ? 'BENAR (Kiri)' : 'SALAH (Kanan)',
      dataUrl,
      timestamp: new Date().toLocaleTimeString('id-ID'),
    };
    setSnapshots((prev) => [
      ...prev.filter((s) => s.questionIndex !== currentQuestionIndex),
      newSnap,
    ]);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  const handleDevicesDetected = (devices: MediaDeviceInfo[]) => {
    setAvailableDevices(devices);
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].deviceId);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('admin_authenticated', 'true');
    setIsLoginOpen(false);
    setIsAdminPanelOpen(true);
  };

  const handleLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('admin_authenticated');
    setIsAdminPanelOpen(false);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Top Header with Brand, Camera Selection, Music, AI Voice, SFX, Fullscreen, Admin */}
      <GameControls
        quizTitle={activeQuiz?.title || 'Kuis Interaktif'}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdmin={() => setIsAdminPanelOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        settings={settings}
        onToggleSound={() => setSettings((s) => ({ ...s, soundEnabled: !s.soundEnabled }))}
        onToggleVoice={() => setSettings((s) => ({ ...s, voiceEnabled: !s.voiceEnabled }))}
        onToggleMusic={() => {
          sound.init();
          const nextState = !settings.musicEnabled;
          setSettings((s) => ({ ...s, musicEnabled: nextState }));
          sound.setMusicEnabled(nextState);
          if (nextState && (phase === 'reading' || phase === 'jumping')) {
            sound.startSuspenseBGM(phase === 'jumping');
          }
        }}
        onToggleMirror={() => setSettings((s) => ({ ...s, isMirrored: !s.isMirrored }))}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onResetSession={handleResetSession}
        availableDevices={availableDevices}
        selectedDeviceId={selectedDeviceId}
        onSelectDevice={setSelectedDeviceId}
      />

      {/* Main Full-Height Viewport (Ideal for IFP 75 inch) */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {phase === 'finished' ? (
          <div className="h-full w-full overflow-y-auto pt-8 pb-20 px-3 sm:px-6">
            <EvaluationSummary
              quizSet={activeQuiz}
              onRestart={handleResetSession}
              onOpenAdmin={() => {
                if (isAdminLoggedIn) {
                  setIsAdminPanelOpen(true);
                } else {
                  setIsLoginOpen(true);
                }
              }}
              snapshots={snapshots}
            />
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Camera Viewport (Fills 100% of the screen area) */}
            <CameraView
              phase={phase}
              currentAnswer={phase === 'revealed' && currentQuestion ? currentQuestion.isCorrect : null}
              isMirrored={settings.isMirrored}
              jumpingTimer={jumpingTimer}
              selectedDeviceId={selectedDeviceId}
              onDevicesDetected={handleDevicesDetected}
              onCaptureSnapshot={handleCaptureSnapshot}
              shouldCapture={shouldCaptureSnapshot}
            />

            {/* Floating Sleek HUD Question Overlay (Compact, semi-transparent at top, doesn't block camera) */}
            <div className="absolute top-2.5 sm:top-3.5 left-3 right-3 sm:left-6 sm:right-6 max-w-5xl mx-auto z-20 pointer-events-auto">
              <QuestionOverlay
                question={currentQuestion}
                currentIndex={currentQuestionIndex}
                totalQuestions={activeQuiz.questions.length}
                phase={phase}
                readingTimer={readingTimer}
                jumpingTimer={jumpingTimer}
                onStartReading={startReading}
                onNextQuestion={handleNextQuestion}
                onRepeatQuestion={handleRepeatQuestion}
                onSpeakQuestion={handleSpeakCurrentQuestion}
              />
            </div>
          </div>
        )}
      </main>

      {/* Floating Auto-Sync Notification Toast on App Open */}
      {syncToast.show && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-bounce-in transition-all">
          <div
            className={`px-4 py-3.5 rounded-2xl border shadow-2xl backdrop-blur-md flex flex-col gap-2.5 text-xs font-medium ${
              syncToast.type === 'loading'
                ? 'bg-indigo-950/95 border-indigo-500/50 text-indigo-100 shadow-indigo-900/40'
                : syncToast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-900/40'
                : 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-900/40'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {syncToast.type === 'loading' && (
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
                )}
                <span className="leading-snug">{syncToast.text}</span>
              </div>
              <button
                onClick={() => setSyncToast((prev) => ({ ...prev, show: false }))}
                className="text-slate-400 hover:text-white p-0.5 ml-1 transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* If Auth / Permission Error, provide direct help button */}
            {syncToast.type === 'error' && isAuthErrorToast && (
              <div className="flex items-center gap-2 pt-1 border-t border-rose-800/60">
                <button
                  type="button"
                  onClick={() => setIsPermissionGuideOpen(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <span>💡 Cara Perbaiki Izin (1 Menit)</span>
                </button>
                <button
                  type="button"
                  disabled={isRetryingAutoSync}
                  onClick={() => triggerAutoSync()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetryingAutoSync ? 'animate-spin' : ''}`} />
                  <span>Coba Lagi</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Permission Guide Modal */}
      <PermissionGuideModal
        isOpen={isPermissionGuideOpen}
        onClose={() => setIsPermissionGuideOpen(false)}
        onRetrySync={() => triggerAutoSync()}
        isRetrying={isRetryingAutoSync}
      />

      {/* Admin Panel Modal */}
      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        quizSets={quizSets}
        activeQuizId={activeQuizId}
        onSelectQuiz={(id) => {
          setActiveQuizId(id);
          setCurrentQuestionIndex(0);
          setPhase('idle');
          setSnapshots([]);
        }}
        onUpdateQuizSets={setQuizSets}
        settings={settings}
        onUpdateSettings={setSettings}
        onLogout={handleLogout}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onLoginSuccess={handleLoginSuccess}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}
