/**
 * Web Audio API Procedural Gothic Sound Engine
 * Provides crisp UI tones, lightning thunder, and gatekeeper transition sequences with NO continuous background rain/wind noise.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime, 0.1);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Background rain & wind sounds are completely disabled for clean silence */
  public startAtmosphere() {
    // Intentionally no background rain, wind, or drone sound.
  }

  /** Trigger a distant lightning crash & thunder rumble */
  public playThunder() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 2.5);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.8));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);
      filter.frequency.exponentialRampToValueAtTime(35, now + 2.0);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);

      // Sub-bass rumble
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 1.8);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 2.0);
    } catch (e) {
      console.warn("Thunder sound notice:", e);
    }
  }

  /** Trigger speech recognition start pulse tone */
  public playMicListening() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.18); // A4

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      // Ignored
    }
  }

  public playMicClick() {
    this.playMicListening();
  }

  /** Trigger subtle click / hover UI sound */
  public playHoverTone() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(246.94, now + 0.05);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      // Ignored
    }
  }

  /** Trigger rejection sound */
  public playRejection() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [130.81, 138.59, 98.0]; // C3, C#3, G2
      freqs.forEach(f => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now);
        filter.frequency.exponentialRampToValueAtTime(60, now + 0.5);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 0.65);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Trigger correct answer / gates opening magical transition sequence */
  public playSuccessGateOpen() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const chord = [110.0, 164.81, 220.0, 261.63, 493.88, 659.25];
      chord.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.08);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.08 + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + idx * 0.08);
        osc.stop(now + 3.1);
      });

      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(45, now + 0.4);
      sub.frequency.linearRampToValueAtTime(65, now + 1.8);
      sub.frequency.exponentialRampToValueAtTime(30, now + 3.2);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.001, now + 0.4);
      subGain.gain.linearRampToValueAtTime(0.3, now + 1.2);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(now + 0.4);
      sub.stop(now + 3.3);
    } catch (e) {
      // Ignored
    }
  }

  /** Subtle crystal chime when selecting or picking up a puzzle piece */
  public playPieceSelect() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      // Ignored
    }
  }

  /** Smooth slide / snap chime when moving or swapping puzzle pieces */
  public playPieceSwap(isCorrectPlacement: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = isCorrectPlacement ? [523.25, 659.25, 783.99] : [440, 554.37, 659.25]; // C5-E5-G5 if placed correctly, else A4-C#5-E5
      freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = isCorrectPlacement ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.035);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(isCorrectPlacement ? 0.08 : 0.06, now + i * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.035 + 0.18);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.035);
        osc.stop(now + i * 0.035 + 0.19);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Mystery chime when requesting a hint */
  public playHint() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.07);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.05, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.4);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.45);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Grand cinematic restoration chime sequence when memory puzzle is completed */
  public playMemoryRestored() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Radiant major pentatonic sequence ascending
      const melody = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      melody.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.09);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + i * 0.09);
        gain.gain.linearRampToValueAtTime(0.16, now + i * 0.09 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 1.3);
      });

      // Warm shimmer pad
      const pad = this.ctx.createOscillator();
      pad.type = 'sine';
      pad.frequency.setValueAtTime(130.81, now + 0.2); // C3
      pad.frequency.linearRampToValueAtTime(261.63, now + 1.5);

      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.001, now + 0.2);
      padGain.gain.linearRampToValueAtTime(0.2, now + 0.8);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      pad.connect(padGain);
      padGain.connect(this.masterGain);
      pad.start(now + 0.2);
      pad.stop(now + 2.9);
    } catch (e) {
      // Ignored
    }
  }

  /** Subtle mechanical/crystal tick for timer countdown */
  public playTimerTick(isUrgent: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = isUrgent ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isUrgent ? 880 : 440, now);
      osc.frequency.exponentialRampToValueAtTime(isUrgent ? 440 : 220, now + 0.04);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isUrgent ? 0.06 : 0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      // Ignored
    }
  }

  /** Dramatic cinematic gong and dark rumble when time runs out / puzzle fails */
  public playFailureGong() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Dissonant low bells
      [130.81, 138.59, 174.61].forEach((f) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        osc.frequency.exponentialRampToValueAtTime(f * 0.9, now + 1.5);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 1.8);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 2.1);
      });

      // Sub drop
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(75, now);
      sub.frequency.exponentialRampToValueAtTime(25, now + 2.2);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.28, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

      sub.connect(subGain);
      subGain.connect(this.masterGain);
      sub.start(now);
      sub.stop(now + 2.3);
    } catch (e) {
      // Ignored
    }
  }

  /** Ethereal uplifting chime and shimmer when Easy Mode is unlocked */
  public playEasyModeUnlock() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Ascending mystical celestial harp/chimes (Eb Major / C minor pentatonic)
      const freqs = [311.13, 392.0, 466.16, 622.25, 783.99, 932.33];
      freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.12);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.14, now + i * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 1.3);
      });

      // Warm soothing chord swell
      const pad = this.ctx.createOscillator();
      pad.type = 'triangle';
      pad.frequency.setValueAtTime(233.08, now + 0.2); // Bb3
      const padGain = this.ctx.createGain();
      padGain.gain.setValueAtTime(0.001, now + 0.2);
      padGain.gain.linearRampToValueAtTime(0.16, now + 0.8);
      padGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      pad.connect(padGain);
      padGain.connect(this.masterGain);
      pad.start(now + 0.2);
      pad.stop(now + 2.6);
    } catch (e) {
      // Ignored
    }
  }

  /** Subtle sub-bass and air whoosh during the memory vortex zoom */
  public playMemoryVortex() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 1.2);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.4);
    } catch (e) {
      // Ignored
    }
  }

  /** Chime when discovering a clue in the Treasure Hunt */
  public playClueFound() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Celestial chime sequence (F#5, A5, C#6, E6)
      const freqs = [739.99, 880.0, 1108.73, 1318.51];
      freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.14, now + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.85);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Mystery chime when an object is unlocked */
  public playMysteryChime() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = [440, 554.37, 659.25, 830.61];
      freqs.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.07);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.08, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.55);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Sound of heavy chest lock snapping open */
  public playChestUnlock() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Mechanical metallic clicks
      const click1 = this.ctx.createOscillator();
      click1.type = 'sawtooth';
      click1.frequency.setValueAtTime(1200, now);
      click1.frequency.exponentialRampToValueAtTime(200, now + 0.06);

      const gain1 = this.ctx.createGain();
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      click1.connect(gain1);
      gain1.connect(this.masterGain);
      click1.start(now);
      click1.stop(now + 0.09);

      // Heavy resonant latch
      const latch = this.ctx.createOscillator();
      latch.type = 'square';
      latch.frequency.setValueAtTime(320, now + 0.12);
      latch.frequency.exponentialRampToValueAtTime(80, now + 0.35);

      const gainLatch = this.ctx.createGain();
      gainLatch.gain.setValueAtTime(0.15, now + 0.12);
      gainLatch.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      latch.connect(gainLatch);
      gainLatch.connect(this.masterGain);
      latch.start(now + 0.12);
      latch.stop(now + 0.4);
    } catch (e) {
      // Ignored
    }
  }

  /** Grand revelation chord when chest is opened */
  public playChestOpen() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const chord = [220, 277.18, 329.63, 440, 554.37, 659.25, 880];
      chord.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.05);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 2.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 2.6);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Subtle dull pulse when tapping on inactive scenery */
  public playIncorrectTap() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      // Ignored
    }
  }

  /** Dracula snore sound */
  public playDraculaSnore() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.4);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.9);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(220, now);
      filter.Q.setValueAtTime(4, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.0);
    } catch (e) {
      // Ignored
    }
  }

  /** Poke / Tap Dracula sound */
  public playDraculaPoke(intensity: number = 1) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const baseFreq = 160 + intensity * 18;
      const osc = this.ctx.createOscillator();
      osc.type = intensity > 12 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.09);

      const gain = this.ctx.createGain();
      const vol = Math.min(0.2, 0.06 + intensity * 0.006);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {
      // Ignored
    }
  }

  /** Dracula Annoyed / Grumble voice reaction */
  public playDraculaAnnoyed(level: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const freqs = level > 12 ? [110, 146.8, 164.8] : [90, 115];
      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(f * 1.3, now + idx * 0.04 + 0.15);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.04 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.24);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Dramatic Dracula awakening fanfare */
  public playDraculaWakeUp() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Dramatic minor chord blast
      const chord = [130.81, 164.81, 196.0, 246.94, 392.0];
      chord.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 1.8);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now);
        osc.stop(now + 2.1);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Twinkling Key Appearance Shimmer */
  public playKeyGlow() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const sparkles = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      sparkles.forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.08);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1.3);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Subtle realistic heartbeat sound for diagnosis / medical suspense */
  public playHeartbeat() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      // Lub (1st beat)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);

      const gain1 = this.ctx.createGain();
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.18, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Dub (2nd beat slightly after)
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(75, now + 0.22);
      osc2.frequency.exponentialRampToValueAtTime(45, now + 0.35);

      const gain2 = this.ctx.createGain();
      gain2.gain.setValueAtTime(0.001, now + 0.22);
      gain2.gain.linearRampToValueAtTime(0.14, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.4);
    } catch (e) {
      // Ignored
    }
  }

  /** Quiz Correct crisp chime */
  public playQuizCorrect() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        const gain = this.ctx!.createGain();
        gain.gain.setValueAtTime(0.001, now + i * 0.07);
        gain.gain.linearRampToValueAtTime(0.12, now + i * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.55);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Quiz Wrong blunt thud / buzzer */
  public playQuizWrong() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.28);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Ignored
    }
  }

  /** Sweet playful cake slice swish and magical sparkle chime */
  public playCakeSlice() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;

      // Soft slice swoosh
      const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.2), this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.05));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(600, now + 0.18);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.15, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(now);

      // Magical sweet chime notes
      const notes = [587.33, 880.0, 1174.66, 1318.51]; // D5, A5, D6, E6
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.001, now + idx * 0.06);
        g.gain.linearRampToValueAtTime(0.16, now + idx * 0.06 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.6);

        osc.connect(g);
        g.connect(this.masterGain!);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.65);
      });
    } catch (e) {
      // Ignored
    }
  }

  /** Playful cute dodge whoosh */
  public playCakeDodge() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {
      // Ignored
    }
  }
}

export const soundEngine = new SoundEngine();
