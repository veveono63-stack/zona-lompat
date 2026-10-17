// Web Audio API Synthesizer with Energetic Quiz Competition BGM & SFX

class SoundService {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private isMusicEnabled: boolean = true;

  // BGM Nodes & Timers
  private bgmGain: GainNode | null = null;
  private activeBgmOscs: OscillatorNode[] = [];
  private stepInterval: any = null;
  private isBGMPlaying: boolean = false;
  private currentStep: number = 0;

  constructor() {
    // Attach listener for first user interaction anywhere in the window
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.init();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('click', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }
  }

  public init(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.warn('Audio resume failed:', err));
    }
    return this.ctx;
  }

  private async getActiveContext(): Promise<AudioContext | null> {
    const ctx = this.init();
    if (ctx && ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext:', e);
      }
    }
    return ctx;
  }

  public setEnabled(val: boolean) {
    this.isEnabled = val;
  }

  public setMusicEnabled(val: boolean) {
    this.isMusicEnabled = val;
    if (!val) {
      this.stopBGM();
    }
  }

  /**
   * Energetic Game Show / School Competition BGM (Upbeat, lively, driving rhythm)
   */
  public async startCompetitionBGM(isAccelerated: boolean = false) {
    if (!this.isMusicEnabled) return;
    const ctx = await this.getActiveContext();
    if (!ctx) return;

    this.stopBGM();

    try {
      this.isBGMPlaying = true;
      this.currentStep = 0;

      const masterBgm = ctx.createGain();
      // Well-balanced output volume
      masterBgm.gain.setValueAtTime(0.38, ctx.currentTime);
      masterBgm.connect(ctx.destination);
      this.bgmGain = masterBgm;

      // Filter for bright, bouncy energetic synth tone
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isAccelerated ? 2400 : 1800, ctx.currentTime);
      filter.Q.setValueAtTime(1.8, ctx.currentTime);
      filter.connect(masterBgm);

      // Tempo: 132 BPM for reading, 160 BPM for jumping action
      // Step duration = 16th notes
      const bpm = isAccelerated ? 162 : 132;
      const stepDurationMs = (60 / bpm / 4) * 1000; // ~113ms or ~92ms

      // Energetic bassline pitches (C major / pentatonic upbeat game progression)
      // C2, E2, G2, A2, C3, F2, A2, G2, B2
      const bassProgression = [
        130.81, 130.81, 261.63, 130.81, // C3, C3, C4, C3
        164.81, 196.00, 261.63, 196.00, // E3, G3, C4, G3
        174.61, 174.61, 349.23, 174.61, // F3, F3, F4, F3
        196.00, 246.94, 293.66, 392.00, // G3, B3, D4, G4
      ];

      // Brass / Synth stab chords on upbeat 16ths
      const chordNotes = [
        [261.63, 329.63, 392.00], // C maj
        [261.63, 329.63, 392.00],
        [349.23, 440.00, 523.25], // F maj
        [392.00, 493.88, 587.33], // G maj
      ];

      const playStep = () => {
        if (!this.isBGMPlaying || !this.bgmGain) return;
        const now = ctx.currentTime;
        const step = this.currentStep % 16;
        const bar = Math.floor(this.currentStep / 4) % 4;

        // 1. KICK DRUM on beats 0, 4, 8, 12 (driving four-on-the-floor)
        if (step % 4 === 0) {
          const kick = ctx.createOscillator();
          const kickGain = ctx.createGain();

          kick.type = 'sine';
          kick.frequency.setValueAtTime(130, now);
          kick.frequency.exponentialRampToValueAtTime(38, now + 0.12);

          kickGain.gain.setValueAtTime(0.5, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          kick.connect(kickGain);
          kickGain.connect(masterBgm);

          kick.start(now);
          kick.stop(now + 0.15);
        }

        // 2. SNARE / CLAP on beats 4, 12 (or on every beat during accelerated jump)
        if (step === 4 || step === 12 || (isAccelerated && step % 2 === 0)) {
          const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          const whiteNoise = ctx.createBufferSource();
          whiteNoise.buffer = noiseBuffer;

          const snareFilter = ctx.createBiquadFilter();
          snareFilter.type = 'highpass';
          snareFilter.frequency.setValueAtTime(1000, now);

          const snareGain = ctx.createGain();
          snareGain.gain.setValueAtTime(0.28, now);
          snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          whiteNoise.connect(snareFilter);
          snareFilter.connect(snareGain);
          snareGain.connect(masterBgm);

          whiteNoise.start(now);
          whiteNoise.stop(now + 0.09);
        }

        // 3. HI-HAT on off-beats
        if (step % 2 === 1) {
          const hatOsc = ctx.createOscillator();
          const hatGain = ctx.createGain();

          hatOsc.type = 'triangle';
          hatOsc.frequency.setValueAtTime(6500, now);

          hatGain.gain.setValueAtTime(0.12, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          hatOsc.connect(hatGain);
          hatGain.connect(masterBgm);

          hatOsc.start(now);
          hatOsc.stop(now + 0.04);
        }

        // 4. BOUNCY BASSLINE (driving energetic pulse)
        const bassFreq = bassProgression[step];
        if (bassFreq) {
          const bass = ctx.createOscillator();
          const bassGain = ctx.createGain();

          bass.type = 'sawtooth';
          bass.frequency.setValueAtTime(bassFreq, now);

          bassGain.gain.setValueAtTime(0.22, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

          bass.connect(bassGain);
          bassGain.connect(filter);

          bass.start(now);
          bass.stop(now + 0.1);
        }

        // 5. UPBEAT SYNTH STAB (every 4th step on beats 2 & 6)
        if (step === 2 || step === 10) {
          const chord = chordNotes[bar] || chordNotes[0];
          chord.forEach((freq) => {
            const chordOsc = ctx.createOscillator();
            const chordGain = ctx.createGain();

            chordOsc.type = 'square';
            chordOsc.frequency.setValueAtTime(freq, now);

            chordGain.gain.setValueAtTime(0.06, now);
            chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            chordOsc.connect(chordGain);
            chordGain.connect(filter);

            chordOsc.start(now);
            chordOsc.stop(now + 0.12);
          });
        }

        this.currentStep++;
      };

      playStep();
      this.stepInterval = setInterval(playStep, stepDurationMs);
    } catch (e) {
      console.warn('Competition BGM error:', e);
    }
  }

  // Alias for backward compatibility
  public startSuspenseBGM(isAccelerated: boolean = false) {
    return this.startCompetitionBGM(isAccelerated);
  }

  public stopBGM() {
    this.isBGMPlaying = false;
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
    if (this.activeBgmOscs.length > 0) {
      this.activeBgmOscs.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      this.activeBgmOscs = [];
    }
    if (this.bgmGain) {
      try {
        this.bgmGain.disconnect();
      } catch (e) {}
      this.bgmGain = null;
    }
  }

  public stopSuspenseBGM() {
    this.stopBGM();
  }

  public async playTick(pitch: number = 600) {
    if (!this.isEnabled) return;
    const ctx = await this.getActiveContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  public async playJumpWhistle() {
    if (!this.isEnabled) return;
    const ctx = await this.getActiveContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  public async playCorrect() {
    if (!this.isEnabled) return;
    const ctx = await this.getActiveContext();
    if (!ctx) return;

    // Cheerful triumphant fanfare (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  }

  public async playWrong() {
    if (!this.isEnabled) return;
    const ctx = await this.getActiveContext();
    if (!ctx) return;

    // Dramatic reveal buzzer
    const notes = [220.00, 196.00, 185.00];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = ctx.currentTime + idx * 0.1;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  public async playClick() {
    if (!this.isEnabled) return;
    const ctx = await this.getActiveContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }
}

export const sound = new SoundService();
