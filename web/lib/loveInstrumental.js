/**
 * SynCinema English Love Instrumental Synthesizer Engine
 * Generates a warm, tender acoustic piano / music-box romantic love ballad melody
 * using Web Audio API with ADSR envelopes, low-pass filter, and stereo depth.
 */

// Romantic English Love Ballad Note Frequencies (in Hz)
// Progression: Cmaj7 -> Am7 -> Fmaj7 -> Gsus4 / G7
const LOVE_MELODY_NOTES = [
  // Cmaj7 arpeggio (C4, E4, G4, B4, C5, G4, E4, G4)
  261.63, 329.63, 392.00, 493.88, 523.25, 392.00, 329.63, 392.00,
  // Am7 arpeggio (A3, C4, E4, G4, C5, G4, E4, C4)
  220.00, 261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63,
  // Fmaj7 arpeggio (F3, A3, C4, E4, A4, E4, C4, A3)
  174.61, 220.00, 261.63, 329.63, 440.00, 329.63, 261.63, 220.00,
  // Gsus4 / G7 arpeggio (G3, B3, D4, F4, G4, D4, B3, D4)
  196.00, 246.94, 293.66, 349.23, 392.00, 293.66, 246.94, 293.66,
];

// Warm Bass Root Notes
const BASS_ROOTS = [
  130.81, // C3
  110.00, // A2
  87.31,  // F2
  98.00,  // G2
];

class LoveInstrumentalEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.filter = null;
    this.analyser = null;
    this.stepIndex = 0;
    this.timerId = null;
    this.active = false;
    this.volume = 0.5;
    this.ducked = false;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain Node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume * 0.12, this.ctx.currentTime);

      // Warm Acoustic Low-Pass Filter (eliminates harsh highs, gives romantic velvet tone)
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

      // Real-time Analyser for Visualizer Bars
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.75;

      this.filter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch (e) {
      console.warn('LoveInstrumentalEngine init error:', e);
    }
  }

  start() {
    if (this.active) return;
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.active = true;
    this.stepIndex = 0;
    this.scheduleNextNote();
  }

  stop() {
    this.active = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      } catch {}
    }
  }

  scheduleNextNote() {
    if (!this.active || !this.ctx) return;

    const noteFreq = LOVE_MELODY_NOTES[this.stepIndex % LOVE_MELODY_NOTES.length];
    const isChordRoot = this.stepIndex % 8 === 0;

    this.playNote(noteFreq, isChordRoot ? BASS_ROOTS[Math.floor(this.stepIndex / 8) % BASS_ROOTS.length] : null);

    this.stepIndex++;

    // Tempo: 260ms per note (~115 BPM 8th notes, romantic flowing love ballad pace)
    this.timerId = setTimeout(() => {
      this.scheduleNextNote();
    }, 260);
  }

  playNote(freq, bassFreq = null) {
    if (!this.ctx || !this.filter) return;
    const now = this.ctx.currentTime;

    // 1. Primary Melody Oscillator (Soft Warm Triangle)
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // 2. Harmonic Celesta Shimmer (Sine an octave up at lower gain)
    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 2, now);

    // ADSR Envelope: Soft piano/celesta attack, warm sustain, gentle release
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(0.28, now + 0.03);
    noteGain.gain.exponentialRampToValueAtTime(0.09, now + 0.22);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    shimmerGain.gain.setValueAtTime(0.001, now);
    shimmerGain.gain.linearRampToValueAtTime(0.07, now + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(noteGain);
    noteGain.connect(this.filter);

    shimmer.connect(shimmerGain);
    shimmerGain.connect(this.filter);

    osc.start(now);
    shimmer.start(now);
    osc.stop(now + 0.6);
    shimmer.stop(now + 0.5);

    // Play soft bass root on bar changes
    if (bassFreq) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sine';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassGain.gain.setValueAtTime(0.001, now);
      bassGain.gain.linearRampToValueAtTime(0.25, now + 0.04);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      bassOsc.connect(bassGain);
      bassGain.connect(this.filter);

      bassOsc.start(now);
      bassOsc.stop(now + 1.3);
    }
  }

  setDucked(isDucked) {
    this.ducked = isDucked;
    if (!this.masterGain || !this.ctx) return;
    const target = isDucked ? this.volume * 0.025 : this.volume * 0.12;
    try {
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
    } catch {}
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      const target = this.ducked ? this.volume * 0.025 : this.volume * 0.12;
      try {
        this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      } catch {}
    }
  }

  getByteFrequencyData(array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    }
  }
}

import { hindiLofi, HINDI_LOFI_SONGS } from './hindiLofiSongs';

// Re-export Hindi Lo-Fi as primary love instrumental engine
export { hindiLofi, HINDI_LOFI_SONGS };

export const loveInstrumental = {
  start: () => hindiLofi.start(),
  stop: () => hindiLofi.stop(),
  setSong: (id) => hindiLofi.setSong(id),
  setDucked: (isDucked) => hindiLofi.setDucked(isDucked),
  setVolume: (vol) => hindiLofi.setVolume(vol),
  getByteFrequencyData: (arr) => hindiLofi.getByteFrequencyData(arr),
  get active() {
    return hindiLofi.active;
  },
  get activeSongId() {
    return hindiLofi.activeSongId;
  },
  get currentSong() {
    return hindiLofi.currentSong;
  },
  get analyser() {
    return hindiLofi.analyser;
  },
};


