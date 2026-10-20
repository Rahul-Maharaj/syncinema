/**
 * SynCinema Hindi Love Instrumental Lo-Fi Synthesizer Engine
 * Generates soulful, nostalgic Hindi romantic lo-fi melodies (Tum Hi Ho, Pehli Nazar,
 * Raataan Lambiyan, Kesariya) with warm acoustic Bansuri flutes, Rhodes chords,
 * gentle vinyl tape crackle, and chill heartbeat lo-fi beats.
 */

export const HINDI_LOFI_SONGS = [
  {
    id: 'tum_hi_ho',
    title: 'Tum Hi Ho • Aashiqui Lofi',
    subtitle: 'Soulful Bansuri Flute & Rain Ambiance',
    bpm: 78,
    scale: 'E Minor (Raag Yaman Melancholy)',
    // Melody notes in Hz (Hum tere bin ab reh nahi sakte... Tere bina kya wajood mera)
    melody: [
      246.94, // B3
      329.63, // E4
      392.00, // G4
      369.99, // F#4
      329.63, // E4
      311.13, // D#4
      329.63, // E4
      392.00, // G4
      493.88, // B4
      440.00, // A4
      392.00, // G4
      369.99, // F#4
      329.63, // E4
      293.66, // D4
      329.63, // E4
      369.99, // F#4
    ],
    bassRoots: [82.41, 73.42, 65.41, 73.42], // E2 -> D2 -> C2 -> D2
    chords: [
      [164.81, 196.00, 246.94], // Em
      [146.83, 185.00, 220.00], // D
      [130.81, 164.81, 196.00], // C
      [146.83, 185.00, 220.00], // D
    ],
  },
  {
    id: 'pehli_nazar',
    title: 'Pehli Nazar Mein • Coffee Date Lofi',
    subtitle: 'Nostalgic Plucked Guitar & Chillhop Waves',
    bpm: 82,
    scale: 'C Major (Pure Romance)',
    // Pehli nazar mein, kaisa jaadu kar diya...
    melody: [
      392.00, // G4
      329.63, // E4
      392.00, // G4
      440.00, // A4
      392.00, // G4
      329.63, // E4
      261.63, // C4
      293.66, // D4
      329.63, // E4
      349.23, // F4
      329.63, // E4
      293.66, // D4
      261.63, // C4
      293.66, // D4
      329.63, // E4
      261.63, // C4
    ],
    bassRoots: [65.41, 55.00, 43.65, 49.00], // C2 -> A1 -> F1 -> G1
    chords: [
      [130.81, 164.81, 196.00], // C
      [110.00, 130.81, 164.81], // Am
      [87.31, 110.00, 130.81],  // F
      [98.00, 123.47, 146.83],  // G
    ],
  },
  {
    id: 'raataan_lambiyan',
    title: 'Raataan Lambiyan • Midnight Starlight Lofi',
    subtitle: 'Nocturnal Piano & Warm Ambient Tape',
    bpm: 80,
    scale: 'D Major (Starlit Date)',
    // Kaate kate na re katena... Tere bin sajan mora jiya lage na
    melody: [
      369.99, // F#4
      440.00, // A4
      493.88, // B4
      440.00, // A4
      369.99, // F#4
      329.63, // E4
      293.66, // D4
      329.63, // E4
      369.99, // F#4
      440.00, // A4
      369.99, // F#4
      329.63, // E4
      293.66, // D4
      246.94, // B3
      293.66, // D4
      329.63, // E4
    ],
    bassRoots: [73.42, 61.74, 49.00, 55.00], // D2 -> B1 -> G1 -> A1
    chords: [
      [146.83, 185.00, 220.00], // D
      [123.47, 146.83, 185.00], // Bm
      [98.00, 123.47, 146.83],  // G
      [110.00, 138.59, 164.81], // A
    ],
  },
  {
    id: 'kesariya',
    title: 'Kesariya Ishq • Warm Sunset Lofi',
    subtitle: 'Acoustic Harmonium & Tape Flutter Bloom',
    bpm: 76,
    scale: 'F Major (Golden Sunset)',
    // Kesariya tera ishq hai piya... Rang jaaun jo main haath lagaun
    melody: [
      349.23, // F4
      440.00, // A4
      523.25, // C5
      466.16, // Bb4
      440.00, // A4
      392.00, // G4
      440.00, // A4
      349.23, // F4
      392.00, // G4
      440.00, // A4
      466.16, // Bb4
      440.00, // A4
      392.00, // G4
      349.23, // F4
      329.63, // E4
      349.23, // F4
    ],
    bassRoots: [87.31, 65.41, 73.42, 58.27], // F2 -> C2 -> D2 -> Bb1
    chords: [
      [174.61, 220.00, 261.63], // F
      [130.81, 164.81, 196.00], // C
      [146.83, 174.61, 220.00], // Dm
      [116.54, 146.83, 174.61], // Bb
    ],
  },
];

class HindiLofiEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.filter = null;
    this.analyser = null;
    this.vinylGain = null;
    this.activeSongId = 'tum_hi_ho';
    this.stepIndex = 0;
    this.timerId = null;
    this.vinylTimerId = null;
    this.active = false;
    this.volume = 0.55;
    this.ducked = false;
  }

  get currentSong() {
    return (
      HINDI_LOFI_SONGS.find((s) => s.id === this.activeSongId) ||
      HINDI_LOFI_SONGS[0]
    );
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain Node
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume * 0.14, this.ctx.currentTime);

      // Warm Lo-Fi Analog Filter (Warm 1200 Hz lowpass to give that mellow tape tone)
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(1250, this.ctx.currentTime);
      this.filter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      // Real-time Analyser for Visualizers
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.filter.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Vinyl Noise Gain Node (subtle tape crackle)
      this.vinylGain = this.ctx.createGain();
      this.vinylGain.gain.setValueAtTime(0.006, this.ctx.currentTime);
      this.vinylGain.connect(this.filter);
    } catch (e) {
      console.warn('HindiLofiEngine init error:', e);
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
    this.scheduleNextBeat();
    this.startVinylCrackle();
  }

  stop() {
    this.active = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.vinylTimerId) {
      clearTimeout(this.vinylTimerId);
      this.vinylTimerId = null;
    }
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      } catch {}
    }
  }

  setSong(songId) {
    if (this.activeSongId !== songId) {
      this.activeSongId = songId;
      this.stepIndex = 0;
    }
  }

  setDucked(isDucked) {
    this.ducked = isDucked;
    if (!this.masterGain || !this.ctx) return;
    const target = isDucked ? this.volume * 0.025 : this.volume * 0.14;
    try {
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
    } catch {}
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      const target = this.ducked ? this.volume * 0.025 : this.volume * 0.14;
      try {
        this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
      } catch {}
    }
  }

  getByteFrequencyData(array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    }
  }

  scheduleNextBeat() {
    if (!this.active || !this.ctx) return;

    const song = this.currentSong;
    const noteFreq = song.melody[this.stepIndex % song.melody.length];
    const isBarStart = this.stepIndex % 4 === 0;
    const isBeat2or4 = this.stepIndex % 2 === 1;

    // 1. Play Bansuri Flute Lead Note with gentle Indian meend (glide)
    const prevNote = song.melody[(this.stepIndex - 1 + song.melody.length) % song.melody.length];
    this.playBansuriNote(noteFreq, prevNote);

    // 2. Play Lo-Fi Rhodes Chord & Bass Root on Bar Changes
    if (isBarStart) {
      const chordIndex = Math.floor(this.stepIndex / 4) % song.chords.length;
      this.playRhodesChord(song.chords[chordIndex]);
      this.playSubBass(song.bassRoots[chordIndex]);
      this.playLofiKick();
    }

    // 3. Play Chill Rimshot / Finger Snap on Beats 2 and 4
    if (isBeat2or4) {
      this.playLofiSnare();
    }

    this.stepIndex++;

    // Calculate tempo delay based on BPM (eighth note step)
    const stepDurationMs = Math.round((60000 / song.bpm) / 2);
    this.timerId = setTimeout(() => {
      this.scheduleNextBeat();
    }, stepDurationMs);
  }

  // Authentic Bansuri Flute Synth: Warm triangle oscillator with gentle breath vibrato and meend glide
  playBansuriNote(targetFreq, prevFreq) {
    if (!this.ctx || !this.filter) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();

    osc.type = 'triangle';

    // Meend / Portamento (glide from previous note for that soulful Indian classical touch)
    const startFreq = prevFreq ? (prevFreq + targetFreq) / 2 : targetFreq;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.08);

    // Subtle 4.8 Hz Bansuri breath vibrato
    vibrato.frequency.setValueAtTime(4.8, now);
    vibratoGain.gain.setValueAtTime(2.2, now);
    vibrato.connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + 0.65);

    // ADSR Envelope: Soft breathy attack, warm sustain, gentle release
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.62);
  }

  // Mellow Lo-Fi Rhodes Electric Piano Chords
  playRhodesChord(chordNotes) {
    if (!this.ctx || !this.filter || !chordNotes) return;
    const now = this.ctx.currentTime;

    chordNotes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now + idx * 0.015);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.03 + idx * 0.015);
      gain.gain.exponentialRampToValueAtTime(0.02, now + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(gain);
      gain.connect(this.filter);

      osc.start(now + idx * 0.015);
      osc.stop(now + 1.45);
    });
  }

  // Deep Warm Sub-Bass Root
  playSubBass(freq) {
    if (!this.ctx || !this.filter || !freq) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 1.25);
  }

  // Soft Lo-Fi Kick Drum (75 Hz down to 42 Hz pitch sweep)
  playLofiKick() {
    if (!this.ctx || !this.filter) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(75, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Chill Brushed Snare / Rimshot Click
  playLofiSnare() {
    if (!this.ctx || !this.filter) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.08);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.filter);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Authentic Vinyl Crackle & Ambient Tape Dust
  startVinylCrackle() {
    if (!this.active || !this.ctx || !this.vinylGain) return;

    // Trigger subtle random vinyl micro-pops
    const now = this.ctx.currentTime;
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();

    popOsc.type = 'square';
    popOsc.frequency.setValueAtTime(600 + Math.random() * 2000, now);

    popGain.gain.setValueAtTime(0.004, now);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    popOsc.connect(popGain);
    popGain.connect(this.vinylGain);

    popOsc.start(now);
    popOsc.stop(now + 0.025);

    // Random interval for vinyl dust pops
    const nextPopDelay = 150 + Math.random() * 450;
    this.vinylTimerId = setTimeout(() => {
      this.startVinylCrackle();
    }, nextPopDelay);
  }
}

// Global Singleton Accessor
let globalHindiLofiEngine = null;

export function getHindiLofiEngine() {
  if (typeof window === 'undefined') return null;
  if (!globalHindiLofiEngine) {
    globalHindiLofiEngine = new HindiLofiEngine();
  }
  return globalHindiLofiEngine;
}

export const hindiLofi = {
  start: () => getHindiLofiEngine()?.start(),
  stop: () => getHindiLofiEngine()?.stop(),
  setSong: (id) => getHindiLofiEngine()?.setSong(id),
  setDucked: (isDucked) => getHindiLofiEngine()?.setDucked(isDucked),
  setVolume: (vol) => getHindiLofiEngine()?.setVolume(vol),
  getByteFrequencyData: (arr) => getHindiLofiEngine()?.getByteFrequencyData(arr),
  get active() {
    return getHindiLofiEngine()?.active || false;
  },
  get activeSongId() {
    return getHindiLofiEngine()?.activeSongId || 'tum_hi_ho';
  },
  get currentSong() {
    return getHindiLofiEngine()?.currentSong || HINDI_LOFI_SONGS[0];
  },
  get analyser() {
    return getHindiLofiEngine()?.analyser || null;
  },
};
