import React from 'react';
import { 
  Volume2, VolumeX, Maximize2, Minimize2, Settings, Lock, 
  FlipHorizontal, Mic, MicOff, RotateCcw, Music, Video
} from 'lucide-react';
import { GameSettings } from '../types/quiz';

interface GameControlsProps {
  quizTitle: string;
  isAdminLoggedIn: boolean;
  onOpenAdmin: () => void;
  onOpenLogin: () => void;
  settings: GameSettings;
  onToggleSound: () => void;
  onToggleVoice: () => void;
  onToggleMusic: () => void;
  onToggleMirror: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onResetSession: () => void;
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelectDevice: (deviceId: string) => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  quizTitle,
  isAdminLoggedIn,
  onOpenAdmin,
  onOpenLogin,
  settings,
  onToggleSound,
  onToggleVoice,
  onToggleMusic,
  onToggleMirror,
  isFullscreen,
  onToggleFullscreen,
  onResetSession,
  availableDevices,
  selectedDeviceId,
  onSelectDevice,
}) => {
  return (
    <header className="w-full flex flex-wrap items-center justify-between py-2.5 px-3 md:px-5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 z-30 gap-2">
      {/* Brand & Quiz Set Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-indigo-500 to-rose-500 p-0.5 flex items-center justify-center shadow-md">
          <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
            <span className="font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-rose-400 text-base">
              Z
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-black text-white font-heading tracking-tight leading-none">
              Zona Lompat Cerdas
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[160px] sm:max-w-xs mt-0.5">
              Materi: <strong className="text-slate-200">{quizTitle}</strong>
            </p>
          </div>

          <div className="hidden sm:block w-[1px] h-6 bg-slate-800 mx-1" />

          {/* Prominent Teacher Attribution Stamp */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/40 shadow-sm">
            <span className="text-xs sm:text-sm md:text-base font-bold text-amber-300 font-heading tracking-wide">
              Created by: Bu Melisa - SDN 2 Jeli
            </span>
          </div>
        </div>
      </div>

      {/* Middle & Right Controls: Camera Selection, Music, AI Voice, SFX, Fullscreen, Admin */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {/* CAMERA SELECTION DROPDOWN (In Header as requested) */}
        <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700/80">
          <Video className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <select
            value={selectedDeviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="bg-transparent text-slate-200 text-xs focus:outline-none max-w-[110px] sm:max-w-[150px] truncate"
            title="Pilih Perangkat Kamera"
          >
            {availableDevices.length > 0 ? (
              availableDevices.map((dev, i) => (
                <option key={dev.deviceId || i} value={dev.deviceId} className="bg-slate-900 text-slate-100">
                  {dev.label || `Kamera ${i + 1}`}
                </option>
              ))
            ) : (
              <option value="" className="bg-slate-900 text-slate-100">
                Kamera Default
              </option>
            )}
          </select>
        </div>

        {/* Camera Mirror Toggle */}
        <button
          type="button"
          onClick={onToggleMirror}
          title={settings.isMirrored ? 'Kamera Mirror: ON' : 'Kamera Mirror: OFF'}
          className={`px-2 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors ${
            settings.isMirrored
              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white'
          }`}
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{settings.isMirrored ? 'Mirror: ON' : 'Mirror: OFF'}</span>
        </button>

        {/* BACKGROUND MUSIC (BGM) TOGGLE (Who Wants to Be a Millionaire style) */}
        <button
          type="button"
          onClick={onToggleMusic}
          title={settings.musicEnabled ? 'Musik Ketegangan (Millionaire): ON' : 'Musik BGM: OFF'}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            settings.musicEnabled
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white'
          }`}
        >
          <Music className={`w-3.5 h-3.5 ${settings.musicEnabled ? 'animate-pulse text-amber-400' : ''}`} />
          <span>Musik BGM: {settings.musicEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* AI VOICE SPEECH TOGGLE */}
        <button
          type="button"
          onClick={onToggleVoice}
          title={settings.voiceEnabled ? 'Pembacaan Soal AI: ON' : 'Pembacaan Soal AI: OFF'}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
            settings.voiceEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:text-white'
          }`}
        >
          {settings.voiceEnabled ? (
            <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <MicOff className="w-3.5 h-3.5" />
          )}
          <span>Baca AI: {settings.voiceEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Sound SFX toggle */}
        <button
          type="button"
          onClick={onToggleSound}
          title={settings.soundEnabled ? 'Efek Suara SFX: ON' : 'Efek Suara SFX: OFF'}
          className={`p-1.5 rounded-xl text-xs border transition-colors ${
            settings.soundEnabled
              ? 'text-indigo-300 bg-indigo-500/20 border-indigo-500/30'
              : 'text-slate-500 bg-slate-900/80 border-slate-700/80'
          }`}
        >
          {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Reset session button */}
        <button
          type="button"
          onClick={onResetSession}
          title="Ulangi dari Soal Pertama"
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen toggle (Great for 75" IFP) */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (Cocok untuk IFP 75 Inch)'}
          className="p-1.5 rounded-xl text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 transition-colors border border-slate-700/80"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Admin Login / Manage Button */}
        {isAdminLoggedIn ? (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1 transition-transform active:scale-95"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kelola Kuis & AI</span>
            <span className="sm:hidden">Admin</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Login Guru</span>
          </button>
        )}
      </div>
    </header>
  );
};
