/**
 * SynCinema Best Romantic Hindi Instrumental Songs Engine
 * Plays real, studio-recorded, high-fidelity romantic Hindi songs:
 * 1. Aaja Sanam Madhur Chandni (Mandolin & Hawaiian Guitar Romance)
 * 2. Dekha Ek Khwab To Yeh Silsile (Soulful Bansuri Flute & Silsila Strings)
 * 3. Gaata Rahe Mera Dil (Hawaiian Guitar & Accordion Romance)
 * 4. Roop Tera Mastana (Smooth Saxophone & Midnight Blues Guitar)
 * 
 * Connected with Web Audio API Analyser for real-time 60fps audio visualizers,
 * smooth volume control, and dynamic voice ducking for couples.
 */

export const HINDI_LOFI_SONGS = [
  {
    id: 'aaja_sanam',
    title: 'Aaja Sanam Madhur Chandni',
    subtitle: 'Romantic Mandolin & Hawaiian Guitar Classic',
    file: '/hindi-lofi-1.mp3',
    genre: 'Raj Kapoor & Nargis Classic Romance',
    tempo: '82 BPM',
    instrument: 'Mandolin • Hawaiian Guitar • Accordion',
  },
  {
    id: 'dekha_ek_khwab',
    title: 'Dekha Ek Khwab • Silsila',
    subtitle: 'Soulful Indian Bansuri Flute & Romantic Strings',
    file: '/hindi-lofi-2.mp3',
    genre: 'Evergreen Silsila Romance',
    tempo: '78 BPM',
    instrument: 'Indian Bansuri Flute • Violins • Sitar',
  },
  {
    id: 'gaata_rahe_dil',
    title: 'Gaata Rahe Mera Dil • Guide',
    subtitle: 'Hawaiian Guitar, Accordion & Romantic Beat',
    file: '/hindi-lofi-3.mp3',
    genre: 'Dev Anand Classic Love Anthem',
    tempo: '88 BPM',
    instrument: 'Hawaiian Lap Steel • Accordion • Rhythm',
  },
  {
    id: 'roop_tera_mastana',
    title: 'Roop Tera Mastana • Midnight Romance',
    subtitle: 'Sensual Saxophone, Piano & Lo-Fi Blues',
    file: '/hindi-lofi-4.mp3',
    genre: 'Aradhana Sensual Midnight Romance',
    tempo: '80 BPM',
    instrument: 'Alto Saxophone • Piano • Acoustic Bass',
  },
];

class HindiLofiEngine {
  constructor() {
    this.audio = null;
    this.ctx = null;
    this.sourceNode = null;
    this.masterGain = null;
    this.analyser = null;
    this.activeSongId = 'aaja_sanam';
    this.active = false;
    this.volume = 0.65;
    this.ducked = false;
    this.connectedToWebAudio = false;
  }

  get currentSong() {
    return (
      HINDI_LOFI_SONGS.find((s) => s.id === this.activeSongId) ||
      HINDI_LOFI_SONGS[0]
    );
  }

  init() {
    if (typeof window === 'undefined') return;

    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.crossOrigin = 'anonymous';
      this.audio.preload = 'auto';
      this.audio.src = this.currentSong.file;
      this.updateAudioVolume();
    }

    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

        // Try connecting media element to Web Audio
        try {
          if (!this.sourceNode && this.audio) {
            this.sourceNode = this.ctx.createMediaElementSource(this.audio);
            this.sourceNode.connect(this.masterGain);
            this.masterGain.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);
            this.connectedToWebAudio = true;
          }
        } catch {
          // Fallback direct destination connection
        }
      } catch (e) {
        console.warn('Web Audio init fallback:', e);
      }
    }
  }

  start() {
    if (typeof window === 'undefined') return;
    this.init();
    this.active = true;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.audio) {
      if (this.audio.src !== window.location.origin + this.currentSong.file && !this.audio.src.endsWith(this.currentSong.file)) {
        this.audio.src = this.currentSong.file;
      }
      this.updateAudioVolume();
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay policy handled gracefully on next user click
        });
      }
    }
  }

  stop() {
    this.active = false;
    if (this.audio) {
      try {
        this.audio.pause();
      } catch {}
    }
  }

  setSong(songId) {
    if (this.activeSongId !== songId) {
      this.activeSongId = songId;
      const song = this.currentSong;
      if (this.audio) {
        const wasPlaying = !this.audio.paused && this.active;
        this.audio.src = song.file;
        this.audio.currentTime = 0;
        this.updateAudioVolume();
        if (wasPlaying) {
          this.audio.play().catch(() => {});
        }
      }
    }
  }

  setDucked(isDucked) {
    this.ducked = isDucked;
    this.updateAudioVolume();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateAudioVolume();
  }

  updateAudioVolume() {
    const target = this.ducked ? this.volume * 0.2 : this.volume;
    if (this.audio) {
      this.audio.volume = target;
    }
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
      } catch {}
    }
  }

  getByteFrequencyData(array) {
    if (this.analyser && this.connectedToWebAudio) {
      this.analyser.getByteFrequencyData(array);
    } else {
      // Harmonic fallback animation if browser security prevents direct media element analysis
      if (this.active && array) {
        const now = Date.now() / 150;
        for (let i = 0; i < array.length; i++) {
          const val = 80 + Math.sin(now + i * 0.5) * 60 + Math.cos(now * 0.7 + i * 0.3) * 40;
          array[i] = Math.max(20, Math.min(255, Math.round(val)));
        }
      }
    }
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
    return getHindiLofiEngine()?.activeSongId || 'aaja_sanam';
  },
  get currentSong() {
    return getHindiLofiEngine()?.currentSong || HINDI_LOFI_SONGS[0];
  },
  get analyser() {
    return getHindiLofiEngine()?.analyser || null;
  },
};
