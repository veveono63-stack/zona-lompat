import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: () => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const getSavedPassword = () => {
    return localStorage.getItem('app_admin_password') || 'admin';
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = getSavedPassword();
    if (password === correctPassword) {
      setError(null);
      setPassword('');
      onLoginSuccess();
    } else {
      setError('Password salah! Password default adalah "admin"');
    }
  };

  const handleQuickFill = () => {
    setPassword(getSavedPassword());
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
        {/* Top Icon Badge */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-bold text-white font-heading mb-1">
          Login Guru / Administrator
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Masukkan password untuk mengelola bank soal kuis, AI Generator, dan setelan evaluasi.
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Password Masuk
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="Masukkan password admin..."
                required
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/70 border border-rose-600/50 rounded-xl text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Helper Default Password */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Default password: <strong className="text-indigo-300 font-mono">admin</strong>
            </span>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline"
            >
              Isi Otomatis
            </button>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <span>Masuk Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
