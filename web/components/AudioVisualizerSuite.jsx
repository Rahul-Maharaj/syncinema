'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Activity,
  Radio,
  Sliders,
  Sparkles,
  Zap,
  Layers,
  Heart,
  Disc,
  Music,
  CloudRain,
  Compass,
} from 'lucide-react';
import {
  Popcorn3D,
  Clapper3D,
  Heart3D,
  DuoCam3D,
  Shield3D,
  SyncBolt3D,
  Ticket3D,
  SparkleStar3D,
} from '@/components/Icons3D';
import { hindiLofi, HINDI_LOFI_SONGS } from '@/lib/hindiLofiSongs';

const VISUALIZER_MODES = [
  {
    id: 'spectrum',
    title: '32-Band Spectrum',
    subtitle: 'High-Watermark Peak-Hold Equalizer',
    icon: Activity,
    badge: '48 kHz Dolby',
  },
  {
    id: 'turntable',
    title: 'Lofi Vinyl Turntable',
    subtitle: '33-RPM Grooves & Floating Stylus',
    icon: Disc,
    badge: 'Analog Vinyl',
  },
  {
    id: 'bansuri',
    title: 'Bansuri Harmonic Wave',
    subtitle: 'Soulful Indian Flute Acoustic Scope',
    icon: Music,
    badge: 'Raag Yaman',
  },
  {
    id: 'heartbeat',
    title: 'Couples Heartbeat ECG',
    subtitle: 'Synchronized Cardiac Pulse Waves',
    icon: Heart,
    badge: '78 BPM Sync',
  },
  {
    id: 'monsoon',
    title: 'Monsoon Raindrop Scope',
    subtitle: 'Concentric Rain Ripples on Cinema Glass',
    icon: CloudRain,
    badge: 'Rain Ambiance',
  },
  {
    id: 'radar',
    title: 'Circular Doppler Radar',
    subtitle: 'Concentric Acoustic Orbit Waves',
    icon: Radio,
    badge: '360° Spatial',
  },
  {
    id: 'oscilloscope',
    title: 'Lissajous Vector Scope',
    subtitle: 'Dual-Phase Stereo Waveform',
    icon: Zap,
    badge: 'Analog Phase',
  },
  {
    id: 'particle',
    title: 'Soundwave Particle Core',
    subtitle: 'Radial Harmonic Constellation',
    icon: Disc,
    badge: 'Zero-Lag 60FPS',
  },
];

export default function AudioVisualizerSuite({ inRoom = false, onStartRoom }) {
  const [activeMode, setActiveMode] = useState('spectrum');
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('aaja_sanam');
  const [gainLevel, setGainLevel] = useState(100);
  const [pulseTick, setPulseTick] = useState(0);

  // Dynamic animation loop for smooth 60fps wave changes
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPulseTick((t) => (t + 1) % 720);
    }, 45);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Hindi Love Instrumental Lo-Fi Synthesizer Controller
  useEffect(() => {
    if (soundEnabled) {
      hindiLofi.setSong(selectedSongId);
      hindiLofi.setVolume(gainLevel / 100);
      hindiLofi.start();
    } else {
      hindiLofi.stop();
    }
    return () => {
      hindiLofi.stop();
    };
  }, [soundEnabled, selectedSongId]);

  // Adjust volume on gainLevel change
  useEffect(() => {
    if (soundEnabled) {
      hindiLofi.setVolume(gainLevel / 100);
    }
  }, [gainLevel, soundEnabled]);

  const activeSong = HINDI_LOFI_SONGS.find((s) => s.id === selectedSongId) || HINDI_LOFI_SONGS[0];

  return (
    <div
      className={`rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(236,72,153,0.18)] space-y-6 relative overflow-hidden ${
        inRoom ? 'my-3 max-w-full' : 'max-w-6xl w-full mx-auto my-12'
      }`}
    >
      {/* Ambient Top Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[550px] h-[200px] bg-pink-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pink-500/20 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 shrink-0">
            <Volume2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-pink-100 text-base sm:text-lg">
                Dynamic Cinema Audio Visualizer Studio
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/40">
                8 Live Modes
              </span>
            </div>
            <p className="text-xs text-pink-300 font-medium">
              Real-time multi-mode acoustic wave visualizer with soulful Hindi love instrumental lo-fi.
            </p>
          </div>
        </div>

        {/* Play/Pause & Soundscape Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="py-1.5 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-pink-200" /> : <Play className="h-3.5 w-3.5 fill-pink-200" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`py-1.5 px-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
              soundEnabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30'
                : 'bg-[#1A1A1D] border-pink-500/20 text-pink-300/70 hover:text-white'
            }`}
            title="Toggle Hindi love instrumental lo-fi songs (Bansuri flute, vinyl crackle & Rhodes)"
          >
            <Music className={`h-3.5 w-3.5 ${soundEnabled ? 'text-emerald-400 animate-pulse' : 'text-pink-400'}`} />
            <span>{soundEnabled ? 'Hindi Lofi ON' : 'Hindi Lofi OFF'}</span>
          </button>
        </div>
      </div>

      {/* HINDI LOVE LO-FI SONG SELECTOR JUKEBOX */}
      <div className="rounded-2xl bg-[#1A1A1D] border border-pink-500/20 p-3 sm:p-4 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>Select Hindi Love Lo-Fi Track:</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/30">
              {activeSong.scale}
            </span>
          </div>

          <div className="text-[11px] font-mono text-pink-300/80">
            Tempo: {activeSong.bpm} BPM • Bansuri Flute + Vinyl Tape
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {HINDI_LOFI_SONGS.map((song) => {
            const isSelected = selectedSongId === song.id;
            return (
              <button
                key={song.id}
                type="button"
                onClick={() => {
                  setSelectedSongId(song.id);
                  if (!soundEnabled) setSoundEnabled(true);
                }}
                className={`p-2 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'btn-pink text-white border-pink-400 shadow-md ring-1 ring-pink-500/60'
                    : 'bg-[#141416] border-pink-500/20 text-pink-200/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold truncate">{song.title.split('•')[0]}</span>
                  {isSelected && soundEnabled && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <span className="text-[10px] text-pink-300/70 truncate mt-0.5">{song.subtitle.split('&')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Switcher Pills (8 Modes) */}
      <div className="flex flex-wrap items-center gap-2">
        {VISUALIZER_MODES.map((mode) => {
          const ModeIcon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setActiveMode(mode.id)}
              className={`py-2 px-3 sm:px-3.5 rounded-2xl text-xs font-bold border transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm ${
                isActive
                  ? 'btn-pink text-white border-pink-400 shadow-pink-500/30 scale-102 ring-1 ring-pink-500/50'
                  : 'bg-[#1A1A1D] border-pink-500/20 text-pink-200/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <ModeIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{mode.title}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN VISUALIZER CANVAS STAGE */}
      <div className="relative rounded-2xl bg-[#141416] border border-pink-500/30 p-5 sm:p-6 min-h-[250px] flex items-center justify-center overflow-hidden shadow-inner">
        {/* Ambient Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ec48990a_1px,transparent_1px),linear-gradient(to_bottom,#ec48990a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* MODE 1: 32-BAND EQUALIZER FREQUENCY SPECTRUM */}
        {activeMode === 'spectrum' && (
          <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-40 px-2 relative z-10">
            {Array.from({ length: 32 }).map((_, i) => {
              const baseHeight = 20 + Math.sin((pulseTick / 8) + i * 0.4) * 35 + Math.cos(i * 0.3) * 25;
              const dynamicH = isPlaying ? Math.max(12, Math.min(100, Math.round(baseHeight))) : 8;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span
                    className="w-full max-w-[8px] h-1 rounded-full bg-pink-200 mb-1 transition-all duration-300"
                    style={{
                      opacity: isPlaying ? 0.9 : 0.2,
                      transform: isPlaying ? `translateY(-${Math.round(dynamicH * 0.1)}px)` : 'none',
                    }}
                  />
                  <span
                    className="w-full max-w-[8px] rounded-full bg-gradient-to-t from-pink-600 via-rose-500 to-amber-300 transition-all duration-75 shadow-[0_0_8px_rgba(236,72,153,0.4)]"
                    style={{
                      height: `${dynamicH}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* MODE 2: LOFI VINYL TURNTABLE & GROOVES */}
        {activeMode === 'turntable' && (
          <div className="relative flex items-center justify-center w-full py-4">
            {/* Concentric Bass Wave Rings */}
            {[1, 2, 3].map((ring) => (
              <div
                key={ring}
                className="absolute rounded-full border border-pink-500/25 transition-all duration-500"
                style={{
                  width: `${210 + ring * 40}px`,
                  height: `${210 + ring * 40}px`,
                  transform: isPlaying ? `scale(${1 + Math.sin(pulseTick / 8 + ring) * 0.05})` : 'scale(1)',
                  opacity: isPlaying ? 0.35 : 0.1,
                }}
              />
            ))}

            {/* Rotating 33-RPM Vinyl Record */}
            <div
              className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#0d0d0f] border-4 border-[#222225] shadow-2xl flex items-center justify-center transition-transform duration-75"
              style={{
                transform: isPlaying ? `rotate(${pulseTick * 2.5}deg)` : 'rotate(0deg)',
                backgroundImage: 'radial-gradient(circle, #1a1a1f 1px, transparent 1px), radial-gradient(circle, #121216 1px, transparent 1px)',
                backgroundSize: '8px 8px',
              }}
            >
              {/* Vinyl Grooves */}
              <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-7 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-11 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute inset-15 rounded-full border border-white/5 pointer-events-none" />

              {/* Glossy Sheen Highlights */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

              {/* Center Vinyl Label */}
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 border-2 border-amber-300/60 shadow-lg flex flex-col items-center justify-center text-center p-1">
                <Heart3D size={20} />
                <span className="text-[8px] font-black tracking-tight text-white mt-0.5">
                  SynCinema Lofi
                </span>
                <span className="text-[7px] font-mono text-pink-200">
                  33⅓ RPM
                </span>
                {/* Spindle Center Hole */}
                <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/40 mt-0.5" />
              </div>
            </div>

            {/* Tonearm & Stylus */}
            <div className="absolute top-2 right-8 sm:right-16 pointer-events-none hidden sm:block">
              <div className="relative w-24 h-32">
                {/* Pivot Base */}
                <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-600 border border-white/40 shadow-lg" />
                {/* Arm Shaft */}
                <div
                  className="absolute top-3 right-3 w-1 bg-gradient-to-b from-amber-300 to-zinc-400 origin-top transition-transform duration-500"
                  style={{
                    height: '85px',
                    transform: isPlaying ? 'rotate(-28deg)' : 'rotate(-10deg)',
                  }}
                >
                  {/* Cartridge & Stylus Head */}
                  <div className="absolute bottom-0 -left-1.5 w-4 h-5 rounded-sm bg-pink-600 border border-white/50 shadow-md">
                    <span className="absolute -bottom-1 left-1.5 w-1 h-1 rounded-full bg-rose-300 animate-ping" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: INDIAN BANSURI FLUTE HARMONIC WAVE */}
        {activeMode === 'bansuri' && (
          <div className="w-full h-44 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Bansuri Bamboo Flute Graphic Silhouette */}
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/30 mb-2">
              <Music className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-200 font-mono">
                Acoustic Indian Bansuri • Meend Pitch Glide (Raag Yaman)
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6].map((hole) => (
                  <span
                    key={hole}
                    className={`w-2 h-2 rounded-full border border-amber-400/60 ${
                      (pulseTick + hole * 2) % 6 === 0 ? 'bg-amber-300' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Multi-layered Acoustic Sine Ribbons */}
            <svg className="w-full h-28 max-w-2xl text-pink-500 overflow-visible" viewBox="0 0 600 120" fill="none">
              {/* Fundamental Note Ribbon */}
              <path
                d={Array.from({ length: 60 })
                  .map((_, idx) => {
                    const x = idx * 10;
                    const y =
                      60 +
                      (isPlaying
                        ? Math.sin(x * 0.04 + pulseTick * 0.12) * 32 * Math.sin(x * 0.015)
                        : 0);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                stroke="url(#bansuriGrad1)"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-75"
              />

              {/* Harmonic Breath Shimmer Ribbon */}
              <path
                d={Array.from({ length: 60 })
                  .map((_, idx) => {
                    const x = idx * 10;
                    const y =
                      60 +
                      (isPlaying
                        ? Math.cos(x * 0.08 + pulseTick * 0.18) * 18 * Math.cos(x * 0.02)
                        : 0);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                stroke="url(#bansuriGrad2)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.8"
                className="transition-all duration-75"
              />

              <defs>
                <linearGradient id="bansuriGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#F43F5E" />
                </linearGradient>
                <linearGradient id="bansuriGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="50%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#FCD34D" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* MODE 4: COUPLES HEARTBEAT ECG PULSE */}
        {activeMode === 'heartbeat' && (
          <div className="w-full h-44 flex flex-col items-center justify-center relative">
            <div className="flex items-center gap-3 px-4 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 mb-2">
              <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400 animate-pulse" />
              <span className="text-xs font-bold text-rose-200 font-mono">
                Couples Heart Rate Sync: 78 BPM • Systolic Wave Lock
              </span>
            </div>

            {/* Neon ECG Oscilloscope Line */}
            <svg className="w-full h-28 max-w-2xl overflow-visible" viewBox="0 0 600 120" fill="none">
              <path
                d={Array.from({ length: 60 })
                  .map((_, idx) => {
                    const x = idx * 10;
                    const phase = (idx + Math.floor(pulseTick / 3)) % 30;
                    let y = 60;
                    // Cardiac P-Q-R-S-T wave pattern
                    if (phase === 12) y = 52; // P wave
                    else if (phase === 14) y = 62; // Q dip
                    else if (phase === 15) y = 15; // R peak
                    else if (phase === 16) y = 95; // S dip
                    else if (phase === 18) y = 48; // T wave
                    else y = 60 + Math.sin(x * 0.02) * 2;
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${isPlaying ? y : 60}`;
                  })
                  .join(' ')}
                stroke="#EC4899"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="drop-shadow(0 0 8px #ec4899)"
              />
            </svg>
          </div>
        )}

        {/* MODE 5: MONSOON RAINDROP RIPPLE SCOPE */}
        {activeMode === 'monsoon' && (
          <div className="relative flex items-center justify-center h-44 w-full">
            <div className="absolute inset-0 bg-blue-950/20 backdrop-blur-sm pointer-events-none" />

            {/* Concentric Raindrop Ripples */}
            {[0, 1, 2, 3, 4].map((drop) => {
              const basePhase = (pulseTick + drop * 35) % 120;
              const size = basePhase * 2.2;
              const opacity = Math.max(0, 1 - basePhase / 120);
              const xOffsets = [-70, 60, -20, 80, 0];
              const yOffsets = [-25, 20, 30, -30, 0];
              return (
                <div
                  key={drop}
                  className="absolute rounded-full border border-sky-400/60 shadow-[0_0_12px_rgba(56,189,248,0.4)] transition-all pointer-events-none"
                  style={{
                    width: `${size}px`,
                    height: `${size * 0.6}px`,
                    transform: `translate(${xOffsets[drop]}px, ${yOffsets[drop]}px)`,
                    opacity: isPlaying ? opacity : 0.1,
                  }}
                />
              );
            })}

            <div className="relative z-10 px-4 py-2 rounded-2xl bg-[#1A1A1D]/90 border border-sky-500/30 text-center space-y-1 shadow-xl">
              <CloudRain className="h-6 w-6 text-sky-400 mx-auto animate-bounce" />
              <p className="text-xs font-bold text-sky-100 font-mono">Monsoon Coffee Date</p>
              <p className="text-[10px] text-sky-200/70">Cozy Raindrops on Cinema Glass</p>
            </div>
          </div>
        )}

        {/* MODE 6: CIRCULAR DOPPLER RADAR WAVE SCOPE */}
        {activeMode === 'radar' && (
          <div className="relative flex items-center justify-center h-44 w-44 sm:h-52 sm:w-52 my-2">
            {[1, 2, 3, 4].map((ring) => (
              <div
                key={ring}
                className="absolute rounded-full border border-pink-500/30 transition-all duration-700"
                style={{
                  inset: `${ring * 16}px`,
                  opacity: isPlaying ? 0.3 + (ring * 0.15) : 0.15,
                  transform: isPlaying ? `scale(${1 + Math.sin(pulseTick / 10 + ring) * 0.06})` : 'scale(1)',
                  boxShadow: ring === 2 ? '0 0 20px rgba(236,72,153,0.2)' : 'none',
                }}
              />
            ))}

            {/* Rotating Radar Scanner Needle */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
              style={{
                transform: isPlaying ? `rotate(${pulseTick * 5}deg)` : 'rotate(0deg)',
              }}
            >
              <div className="h-1/2 w-0.5 bg-gradient-to-t from-transparent via-pink-400 to-white origin-bottom shadow-[0_0_12px_#ec4899]" />
            </div>

            {/* Glowing Core Radar Beacon */}
            <div className="relative z-10 p-3 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 border-2 border-pink-400 shadow-xl shadow-pink-500/50 anim-heartbeat">
              <Radio className="h-6 w-6 text-white" />
            </div>

            {/* Orbiting Acoustic Blips */}
            <span
              className="absolute h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]"
              style={{
                top: `${40 + Math.sin(pulseTick / 15) * 35}%`,
                left: `${40 + Math.cos(pulseTick / 15) * 35}%`,
              }}
            />
          </div>
        )}

        {/* MODE 7: LISSAJOUS STEREO VECTOR WAVE */}
        {activeMode === 'oscilloscope' && (
          <div className="w-full h-40 flex items-center justify-center relative overflow-hidden">
            <svg
              className="w-full h-full max-w-xl text-pink-500 overflow-visible"
              viewBox="0 0 600 140"
              fill="none"
            >
              <path
                d={Array.from({ length: 60 })
                  .map((_, idx) => {
                    const x = idx * 10;
                    const y =
                      70 +
                      (isPlaying
                        ? Math.sin(x * 0.05 + pulseTick * 0.15) * 35 * Math.sin(x * 0.02)
                        : 0);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                stroke="url(#oscWaveGrad1)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-75"
              />

              <path
                d={Array.from({ length: 60 })
                  .map((_, idx) => {
                    const x = idx * 10;
                    const y =
                      70 +
                      (isPlaying
                        ? Math.cos(x * 0.05 + pulseTick * 0.12) * 30 * Math.cos(x * 0.02)
                        : 0);
                    return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ')}
                stroke="url(#oscWaveGrad2)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
                className="transition-all duration-75"
              />

              <defs>
                <linearGradient id="oscWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="50%" stopColor="#F472B6" />
                  <stop offset="100%" stopColor="#FDE047" />
                </linearGradient>
                <linearGradient id="oscWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* MODE 8: SOUNDWAVE PARTICLE CORE */}
        {activeMode === 'particle' && (
          <div className="relative flex items-center justify-center h-44 w-full">
            <div className="relative p-4 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 border border-pink-400 shadow-[0_0_35px_rgba(236,72,153,0.6)] anim-heartbeat z-10">
              <SparkleStar3D size={32} />
            </div>

            {Array.from({ length: 16 }).map((_, i) => {
              const angle = (i * (360 / 16) + pulseTick * 2) * (Math.PI / 180);
              const distance = isPlaying ? 55 + (i % 3) * 18 + Math.sin(pulseTick / 10 + i) * 12 : 55;
              const x = Math.cos(angle) * distance;
              const y = Math.sin(angle) * distance;
              return (
                <span
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-pink-400 to-rose-300 shadow-[0_0_8px_#ec4899] transition-all duration-75"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    opacity: 0.4 + (i % 4) * 0.18,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Visualizer Footer Telemetry */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-pink-200/80 pt-1">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-pink-300 font-bold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Harmonic Engine: {activeSong.title}</span>
          </span>
          <span className="text-pink-400/50 hidden sm:inline">•</span>
          <span className="text-[11px] text-pink-300/70 hidden sm:inline">
            Zero-Lag Canvas Render (60 FPS WebAudio)
          </span>
        </div>

        {/* Volume Slider Control */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Volume2 className="h-3.5 w-3.5 text-pink-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="100"
            value={gainLevel}
            onChange={(e) => setGainLevel(Number(e.target.value))}
            className="w-24 sm:w-32 accent-pink-500 h-1.5 rounded-full bg-white/10 cursor-pointer"
            title="Adjust synthesizer volume"
          />
          <span className="font-mono text-[11px] text-pink-300 w-8">{gainLevel}%</span>
        </div>
      </div>
    </div>
  );
}
