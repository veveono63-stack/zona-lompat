import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Users, CameraOff, Sparkles, Frown, Smile } from 'lucide-react';
import { GamePhase } from '../types/quiz';

interface CameraViewProps {
  phase: GamePhase;
  currentAnswer: boolean | null; // true = BENAR, false = SALAH
  isMirrored: boolean;
  jumpingTimer: number; // 3, 2, 1
  selectedDeviceId: string;
  onDevicesDetected: (devices: MediaDeviceInfo[]) => void;
  onCaptureSnapshot?: (dataUrl: string, winningSide: 'left' | 'right') => void;
  shouldCapture?: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  phase,
  currentAnswer,
  isMirrored,
  jumpingTimer,
  selectedDeviceId,
  onDevicesDetected,
  onCaptureSnapshot,
  shouldCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState<boolean>(false);

  // Start camera stream
  const startCamera = async (deviceId?: string) => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Enumerate devices and notify parent
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      onDevicesDetected(videoInputs);
      setIsSimulatedCamera(false);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak di peramban. Klik ikon gembok pada URL bar untuk mengizinkan kamera.'
          : 'Kamera tidak terdeteksi atau sedang dipakai aplikasi lain.'
      );
    }
  };

  useEffect(() => {
    startCamera(selectedDeviceId);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId]);

  // Handle snapshot trigger
  useEffect(() => {
    if (shouldCapture && onCaptureSnapshot) {
      takeSnapshot();
    }
  }, [shouldCapture]);

  const takeSnapshot = () => {
    if (currentAnswer === null) return;
    const winningSide: 'left' | 'right' = currentAnswer ? 'left' : 'right';

    if (videoRef.current && stream && !isSimulatedCamera) {
      const vWidth = videoRef.current.videoWidth || 1280;
      const vHeight = videoRef.current.videoHeight || 720;

      // 1. Draw full mirrored frame
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = vWidth;
      fullCanvas.height = vHeight;
      const fCtx = fullCanvas.getContext('2d');
      if (!fCtx) return;

      fCtx.save();
      if (isMirrored) {
        fCtx.translate(vWidth, 0);
        fCtx.scale(-1, 1);
      }
      fCtx.drawImage(videoRef.current, 0, 0, vWidth, vHeight);
      fCtx.restore();

      // 2. Crop ONLY the winning area:
      // Left zone is roughly 0% to 45% of width.
      // Right zone is roughly 55% to 100% of width.
      const cropW = Math.floor(vWidth * 0.45);
      const cropH = vHeight;
      const cropX = winningSide === 'left' ? 0 : Math.floor(vWidth * 0.55);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cCtx = cropCanvas.getContext('2d');
      if (!cCtx) return;

      // Draw cropped slice
      cCtx.drawImage(fullCanvas, cropX, 0, cropW, cropH, 0, 0, cropW, cropH);

      // Add a clean celebratory watermarked tag at top of snapshot
      cCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      cCtx.fillRect(16, 16, cropW - 32, 44);
      cCtx.fillStyle = '#4ade80'; // Emerald green
      cCtx.font = 'bold 18px sans-serif';
      cCtx.fillText(
        `🏆 ZONA PEMENANG: ${winningSide === 'left' ? 'BENAR (KIRI)' : 'SALAH (KANAN)'}`,
        28,
        44
      );

      const dataUrl = cropCanvas.toDataURL('image/jpeg', 0.9);
      onCaptureSnapshot?.(dataUrl, winningSide);
    }
  };

  // Determine Zone Highlight State
  const isRevealed = phase === 'revealed';
  const isJumping = phase === 'jumping';
  const isReading = phase === 'reading';

  // Rule:
  // Before answered (idle, reading, jumping): Left and Right have EQUAL neutral color.
  // After answered (revealed):
  // If currentAnswer === true, Left (BENAR) is correct/green (happy emoji), Right (SALAH) is wrong/red (sad emoji).
  // If currentAnswer === false, Right (SALAH) is correct/green (happy emoji), Left (BENAR) is wrong/red (sad emoji).
  const isLeftWinning = isRevealed && currentAnswer === true;
  const isLeftLosing = isRevealed && currentAnswer === false;

  const isRightWinning = isRevealed && currentAnswer === false;
  const isRightLosing = isRevealed && currentAnswer === true;

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-slate-950 flex flex-col justify-between">
      {/* Hidden Snapshot Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Full Viewport Camera Feed */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        {!cameraError && !isSimulatedCamera ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-200 ${
              isMirrored ? 'scale-x-[-1]' : 'scale-x-1'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 text-center">
            <div className="relative w-full max-w-xl border-2 border-dashed border-slate-700/80 rounded-2xl flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
              <CameraOff className="w-12 h-12 text-slate-500 mb-3" />
              <p className="text-slate-300 font-medium text-sm max-w-md mb-4">
                {cameraError || 'Mode simulasi kelas aktif (gambar kamera virtual).'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => startCamera(selectedDeviceId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
                >
                  Coba Akses Kamera Lagi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulatedCamera(true);
                    setCameraError(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-600"
                >
                  Lanjut dengan Simulasi Kelas
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Minimal ambient darken overlay for contrast without darkening classroom visibility */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />
      </div>

      {/* JUMPING ACTION BANNER (When jumpingTimer is 1) */}
      {isJumping && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none flex flex-col items-center justify-center">
          {jumpingTimer === 1 ? (
            <div className="bg-rose-600/95 border-4 border-yellow-300 px-8 py-5 rounded-3xl shadow-2xl shadow-rose-600/70 animate-bounce flex flex-col items-center">
              <span className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white font-heading tracking-wider uppercase drop-shadow-lg">
                🚀 LOMPAT!
              </span>
              <span className="text-sm sm:text-lg font-bold text-yellow-200 mt-1 uppercase tracking-widest">
                Pilih Sisi Sekarang!
              </span>
            </div>
          ) : (
            <div className="bg-slate-900/80 backdrop-blur-md border-2 border-indigo-500/60 px-6 py-3 rounded-2xl flex items-center gap-3">
              <span className="text-3xl font-black text-amber-400 font-heading">
                {jumpingTimer}
              </span>
              <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                {jumpingTimer === 3 ? 'Siap-siap...' : 'Bersiap...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* THREE INTERACTIVE ZONES OVERLAY */}
      {/*
        Requirements:
        1. Kiri dan Kanan paling lebar (~41% each)
        2. Tengah (~18%) adalah posisi siswa sebelum menjawab (berbaris depan-belakang)
        3. SEBELUM MENJAWAB: Kiri dan Kanan memiliki warna yang SAMA (netral semi-transparan).
        4. SETELAH MENJAWAB:
           - Area yang jawabannya BETUL diberi background HIJAU transparan + emot gembira/selamat.
           - Area yang jawabannya TIDAK BETUL diberi background MERAH transparan + emot sedih (yah masih salah).
      */}
      <div className="absolute inset-0 z-10 grid grid-cols-12 pointer-events-none select-none">
        {/* ========================================================= */}
        {/* ZONA KIRI: BENAR (Columns 1 to 5: ~41.6% Width)           */}
        {/* ========================================================= */}
        <div
          className={`col-span-5 h-full transition-all duration-500 flex flex-col justify-between p-4 md:p-6 border-r-2 ${
            isLeftWinning
              ? 'bg-emerald-600/50 border-emerald-400 animate-pulse-green'
              : isLeftLosing
              ? 'bg-rose-600/40 border-rose-500'
              : 'bg-slate-950/20 border-slate-700/40' // Warna netral sebelum menjawab
          }`}
        >
          {/* Header Zona Kiri */}
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl backdrop-blur-md transition-all ${
                isLeftWinning
                  ? 'bg-emerald-500 text-white scale-105 shadow-xl shadow-emerald-500/50'
                  : isLeftLosing
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                  : 'bg-slate-900/80 text-slate-200 border border-slate-700/60'
              }`}
            >
              <CheckCircle2
                className={`w-7 h-7 ${
                  isLeftWinning
                    ? 'text-white'
                    : isLeftLosing
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                }`}
              />
              <div>
                <span className="text-xl md:text-2xl lg:text-3xl font-black tracking-wide font-heading uppercase">
                  BENAR
                </span>
                <span className="block text-[10px] md:text-xs opacity-80 font-medium">
                  ZONA KIRI
                </span>
              </div>
            </div>

            {/* Banner Reveal Selamat / Sedih */}
            {isLeftWinning && (
              <div className="px-3.5 py-1.5 bg-emerald-500 text-white font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg animate-bounce flex items-center gap-1.5">
                <span>🥳 SELAMAT! BETUL!</span>
              </div>
            )}
            {isLeftLosing && (
              <div className="px-3.5 py-1.5 bg-rose-600/90 text-white font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5">
                <span>😢 YAH, MASIH SALAH</span>
              </div>
            )}
          </div>

          {/* Center Graphic & Animated Emoji for Left Zone */}
          <div className="flex flex-col items-center justify-center my-auto">
            {isLeftWinning ? (
              // Happy / Celebratory Animated Emoji
              <div className="flex flex-col items-center animate-bounce">
                <div className="text-6xl sm:text-7xl md:text-8xl drop-shadow-2xl">
                  🥳 🎉 😃
                </div>
                <div className="mt-3 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-black text-sm md:text-base uppercase tracking-widest shadow-xl">
                  Horeee! Jawaban Betul!
                </div>
              </div>
            ) : isLeftLosing ? (
              // Sad / Disappointed Animated Emoji
              <div className="flex flex-col items-center animate-pulse">
                <div className="text-6xl sm:text-7xl md:text-8xl drop-shadow-2xl">
                  😢 🥺 💔
                </div>
                <div className="mt-3 px-4 py-1.5 rounded-full bg-rose-600 text-white font-bold text-xs md:text-sm uppercase tracking-wide shadow-xl">
                  Yah, masih salah! Jangan menyerah!
                </div>
              </div>
            ) : (
              // Neutral State Before Answered (Both Left & Right look identical)
              <div className="flex flex-col items-center opacity-85">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-slate-400/50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center text-slate-300">
                  <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-slate-200" />
                </div>
                <p className="mt-2 text-xs md:text-sm font-bold text-slate-200 uppercase tracking-widest text-center drop-shadow">
                  Area Pilihan BENAR
                </p>
              </div>
            )}
          </div>

          {/* Footer Guide Kiri */}
          <div className="flex items-center justify-center">
            <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 text-[11px] text-slate-300 font-medium">
              ← Sisi Kiri Layar
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ZONA TENGAH: PERSIAPAN SISWA (Columns 6 to 7: ~16.6-18%)   */}
        {/* Posisi siswa sebelum menjawab (berbaris depan-belakang)    */}
        {/* ========================================================= */}
        <div
          className={`col-span-2 h-full transition-all duration-300 flex flex-col justify-between py-4 px-2 border-r-2 ${
            isReading
              ? 'bg-amber-500/20 border-amber-400/80'
              : 'bg-slate-950/40 border-slate-700/50'
          }`}
        >
          {/* Header Zona Tengah */}
          <div className="flex flex-col items-center text-center">
            <div
              className={`px-2 py-1.5 rounded-xl backdrop-blur-md flex flex-col items-center ${
                isReading
                  ? 'bg-amber-500 text-amber-950 font-bold shadow-md animate-pulse'
                  : 'bg-slate-900/80 text-slate-300 border border-slate-700/50'
              }`}
            >
              <Users className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] md:text-xs font-black uppercase font-heading leading-tight">
                POSISI SISWA
              </span>
              <span className="text-[8px] md:text-[9px] opacity-90 font-medium">
                Berbaris Tengah
              </span>
            </div>
          </div>

          {/* Koridor Visual Siswa Berbaris Depan ke Belakang */}
          <div className="flex flex-col items-center justify-center my-auto gap-2">
            <div className="w-full flex flex-col items-center gap-1.5 py-1">
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-amber-300/80 bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-200 font-bold">
                1
              </div>
              <div className="w-0.5 h-3 bg-amber-400/60 border-dashed" />
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-amber-300/60 bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-200 font-bold">
                2
              </div>
              <div className="w-0.5 h-3 bg-amber-400/60 border-dashed" />
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-amber-300/40 bg-amber-500/20 flex items-center justify-center text-[10px] text-amber-200 font-bold">
                3
              </div>
            </div>

            <div className="bg-slate-950/85 px-2 py-1 rounded-lg text-center border border-amber-500/30">
              <p className="text-[9px] md:text-[10px] font-bold text-amber-300 leading-tight">
                BARIS DEPAN - BELAKANG
              </p>
              {isReading && (
                <p className="text-[8px] text-amber-200 animate-pulse mt-0.5 font-medium">
                  Diam di tengah!
                </p>
              )}
            </div>
          </div>

          {/* Footer Guide Tengah */}
          <div className="flex items-center justify-center">
            <span className="text-[9px] text-slate-400 font-mono tracking-tighter">
              KORIDOR
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ZONA KANAN: SALAH (Columns 8 to 12: ~41.6% Width)         */}
        {/* ========================================================= */}
        <div
          className={`col-span-5 h-full transition-all duration-500 flex flex-col justify-between p-4 md:p-6 ${
            isRightWinning
              ? 'bg-emerald-600/50 border-emerald-400 animate-pulse-green'
              : isRightLosing
              ? 'bg-rose-600/40 border-rose-500'
              : 'bg-slate-950/20' // Warna netral sebelum menjawab
          }`}
        >
          {/* Header Zona Kanan */}
          <div className="flex items-center justify-between">
            {/* Banner Reveal Selamat / Sedih */}
            {isRightWinning && (
              <div className="px-3.5 py-1.5 bg-emerald-500 text-white font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg animate-bounce flex items-center gap-1.5">
                <span>🥳 SELAMAT! BETUL!</span>
              </div>
            )}
            {isRightLosing && (
              <div className="px-3.5 py-1.5 bg-rose-600/90 text-white font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg flex items-center gap-1.5">
                <span>😢 YAH, MASIH SALAH</span>
              </div>
            )}

            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl backdrop-blur-md ml-auto transition-all ${
                isRightWinning
                  ? 'bg-emerald-500 text-white scale-105 shadow-xl shadow-emerald-500/50'
                  : isRightLosing
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                  : 'bg-slate-900/80 text-slate-200 border border-slate-700/60'
              }`}
            >
              <div className="text-right">
                <span className="text-xl md:text-2xl lg:text-3xl font-black tracking-wide font-heading uppercase">
                  SALAH
                </span>
                <span className="block text-[10px] md:text-xs opacity-80 font-medium">
                  ZONA KANAN
                </span>
              </div>
              <XCircle
                className={`w-7 h-7 ${
                  isRightWinning
                    ? 'text-white'
                    : isRightLosing
                    ? 'text-rose-400'
                    : 'text-rose-400'
                }`}
              />
            </div>
          </div>

          {/* Center Graphic & Animated Emoji for Right Zone */}
          <div className="flex flex-col items-center justify-center my-auto">
            {isRightWinning ? (
              // Happy / Celebratory Animated Emoji
              <div className="flex flex-col items-center animate-bounce">
                <div className="text-6xl sm:text-7xl md:text-8xl drop-shadow-2xl">
                  🥳 🎉 😃
                </div>
                <div className="mt-3 px-4 py-1.5 rounded-full bg-emerald-500 text-white font-black text-sm md:text-base uppercase tracking-widest shadow-xl">
                  Horeee! Jawaban Betul!
                </div>
              </div>
            ) : isRightLosing ? (
              // Sad / Disappointed Animated Emoji
              <div className="flex flex-col items-center animate-pulse">
                <div className="text-6xl sm:text-7xl md:text-8xl drop-shadow-2xl">
                  😢 🥺 💔
                </div>
                <div className="mt-3 px-4 py-1.5 rounded-full bg-rose-600 text-white font-bold text-xs md:text-sm uppercase tracking-wide shadow-xl">
                  Yah, masih salah! Jangan menyerah!
                </div>
              </div>
            ) : (
              // Neutral State Before Answered (Both Left & Right look identical)
              <div className="flex flex-col items-center opacity-85">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-slate-400/50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center text-slate-300">
                  <XCircle className="w-12 h-12 md:w-16 md:h-16 text-slate-200" />
                </div>
                <p className="mt-2 text-xs md:text-sm font-bold text-slate-200 uppercase tracking-widest text-center drop-shadow">
                  Area Pilihan SALAH
                </p>
              </div>
            )}
          </div>

          {/* Footer Guide Kanan */}
          <div className="flex items-center justify-center">
            <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-slate-700/50 text-[11px] text-slate-300 font-medium">
              Sisi Kanan Layar →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
