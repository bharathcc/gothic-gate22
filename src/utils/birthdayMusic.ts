/**
 * Soft Music-Box / Celesta Birthday Music Synthesizer
 * Plays a warm, sweet, gentle rendition of "Happy Birthday" using Web Audio API
 * Runs only after the user clicks [ OPEN ]
 */

class BirthdayMusicPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private timeoutIds: number[] = [];
  private loopInterval: number | null = null;

  // Notes in Hz for Happy Birthday melody in C / F major with soft sweet voicing
  // C4, D4, E4, F4, G4, A4, Bb4, B4, C5, D5, E5, F5
  private notes: { [key: string]: number } = {
    C4: 261.63,
    D4: 293.66,
    E4: 329.63,
    F4: 349.23,
    G4: 392.00,
    A4: 440.00,
    Bb4: 466.16,
    B4: 493.88,
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    F5: 698.46,
    G5: 783.99,
  };

  private melody: Array<{ note: string; dur: number; delay: number; chord?: string[] }> = [
    // Phrase 1: "Happy Birthday to you"
    { note: 'C4', dur: 0.35, delay: 0.0, chord: ['F4', 'A4'] },
    { note: 'C4', dur: 0.25, delay: 0.4 },
    { note: 'D4', dur: 0.65, delay: 0.7 },
    { note: 'C4', dur: 0.65, delay: 1.4 },
    { note: 'F4', dur: 0.65, delay: 2.1, chord: ['A4', 'C5'] },
    { note: 'E4', dur: 1.10, delay: 2.8, chord: ['G4', 'C5'] },

    // Phrase 2: "Happy Birthday to you"
    { note: 'C4', dur: 0.35, delay: 4.2, chord: ['G4', 'B4'] },
    { note: 'C4', dur: 0.25, delay: 4.6 },
    { note: 'D4', dur: 0.65, delay: 4.9 },
    { note: 'C4', dur: 0.65, delay: 5.6 },
    { note: 'G4', dur: 0.65, delay: 6.3, chord: ['B4', 'D5'] },
    { note: 'F4', dur: 1.10, delay: 7.0, chord: ['A4', 'C5'] },

    // Phrase 3: "Happy Birthday dear Dracula"
    { note: 'C4', dur: 0.35, delay: 8.4, chord: ['F4', 'A4'] },
    { note: 'C4', dur: 0.25, delay: 8.8 },
    { note: 'C5', dur: 0.65, delay: 9.1, chord: ['F4', 'A4', 'C5'] },
    { note: 'A4', dur: 0.65, delay: 9.8, chord: ['D4', 'F4'] },
    { note: 'F4', dur: 0.65, delay: 10.5, chord: ['A4', 'C5'] },
    { note: 'E4', dur: 0.65, delay: 11.2, chord: ['G4', 'C5'] },
    { note: 'D4', dur: 1.10, delay: 11.9, chord: ['F4', 'Bb4'] },

    // Phrase 4: "Happy Birthday to you"
    { note: 'Bb4', dur: 0.35, delay: 13.3, chord: ['G4', 'D5'] },
    { note: 'Bb4', dur: 0.25, delay: 13.7 },
    { note: 'A4', dur: 0.65, delay: 14.0, chord: ['F4', 'C5'] },
    { note: 'F4', dur: 0.65, delay: 14.7, chord: ['A4', 'C5'] },
    { note: 'G4', dur: 0.65, delay: 15.4, chord: ['B4', 'D5'] },
    { note: 'F4', dur: 1.60, delay: 16.1, chord: ['F4', 'A4', 'C5', 'F5'] },
  ];

  private totalDuration = 18.5; // seconds per loop

  private initAudio() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playChime(freq: number, startTime: number, duration: number, volume: number = 0.18) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      // Primary sine oscillator (music box fundamental)
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Warm shimmer overtone (celesta bell harmonic)
      const overtone = this.ctx.createOscillator();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2.0, startTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.8);

      const overtoneGain = this.ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.0001, startTime);
      overtoneGain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.015);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      gain.connect(this.masterGain);
      overtoneGain.connect(this.masterGain);

      osc.start(startTime);
      overtone.start(startTime);
      osc.stop(startTime + duration + 0.9);
      overtone.stop(startTime + duration + 0.9);
    } catch {
      // Ignore audio synthesis errors
    }
  }

  private playSequence() {
    if (!this.ctx || !this.isPlaying || this.isMuted) return;

    const baseTime = this.ctx.currentTime + 0.05;

    this.melody.forEach((item) => {
      const freq = this.notes[item.note];
      if (freq) {
        this.playChime(freq, baseTime + item.delay, item.dur, 0.22);
      }
      if (item.chord) {
        item.chord.forEach((chordNote, i) => {
          const cFreq = this.notes[chordNote];
          if (cFreq) {
            this.playChime(cFreq, baseTime + item.delay + 0.015 * (i + 1), item.dur * 1.2, 0.09);
          }
        });
      }
    });
  }

  public start() {
    this.initAudio();
    this.stop(); // Clear any existing
    this.isPlaying = true;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }

    this.playSequence();

    // Loop every totalDuration seconds
    this.loopInterval = window.setInterval(() => {
      if (this.isPlaying) {
        this.playSequence();
      }
    }, this.totalDuration * 1000);
  }

  public stop() {
    this.isPlaying = false;
    if (this.loopInterval !== null) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    this.timeoutIds.forEach((id) => clearTimeout(id));
    this.timeoutIds = [];
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime, 0.1);
    }
    if (!this.isMuted && this.isPlaying) {
      this.playSequence();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const birthdayMusicPlayer = new BirthdayMusicPlayer();
