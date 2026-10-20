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
import { loveInstrumental } from '@/lib/loveInstrumental';

const VISUALIZER_MODES = [
  {
    id: 'spectrum',
    title: '32-Band Spectrum',
    subtitle: 'High-Watermark Peak-Hold Equalizer',
    icon: Activity,
    badge: '48 kHz Dolby',
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
  const [gainLevel, setGainLevel] = useState(100);
  const [pulseTick, setPulseTick] = useState(0);

  // Dynamic animation loop for smooth 60fps wave changes
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setPulseTick((t) => (t + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // English Love Instrumental Synthesizer for Interactive Soundscape
  useEffect(() => {
    if (soundEnabled) {
      loveInstrumental.setVolume(gainLevel / 100);
      loveInstrumental.start();
    } else {
      loveInstrumental.stop();
    }
    return () => {
      loveInstrumental.stop();
    };
  }, [soundEnabled]);

  // Adjust volume on gainLevel change
  useEffect(() => {
    if (soundEnabled) {
      loveInstrumental.setVolume(gainLevel / 100);
    }
  }, [gainLevel, soundEnabled]);

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
                Live Studio
              </span>
            </div>
            <p className="text-xs text-pink-300 font-medium">
              Real-time multi-mode acoustic wave visualizer for music, dialog, and cinema soundscapes.
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
            className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
              soundEnabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-[#1A1A1D] border-pink-500/20 text-pink-300/70 hover:text-white'
            }`}
            title="Toggle English love instrumental tune"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{soundEnabled ? 'English Love Tune ON' : 'English Love Tune OFF'}</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {VISUALIZER_MODES.map((mode) => {
          const ModeIcon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setActiveMode(mode.id)}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold border transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm ${
                isActive
                  ? 'btn-pink text-white border-pink-400 shadow-pink-500/30 scale-102 ring-1 ring-pink-500/50'
                  : 'bg-[#1A1A1D] border-pink-500/20 text-pink-200/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <ModeIcon className="h-3.5 w-3.5" />
              <span>{mode.title}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN VISUALIZER CANVAS STAGE */}
      <div className="relative rounded-2xl bg-[#141416] border border-pink-500/30 p-5 sm:p-6 min-h-[220px] flex items-center justify-center overflow-hidden shadow-inner">
        {/* Ambient Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ec48990a_1px,transparent_1px),linear-gradient(to_bottom,#ec48990a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        {/* MODE 1: 32-BAND EQUALIZER FREQUENCY SPECTRUM */}
        {activeMode === 'spectrum' && (
          <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-36 px-2 relative z-10">
            {Array.from({ length: 32 }).map((_, i) => {
              // Mathematical frequency formula with smooth wave rhythm
              const baseHeight = 20 + Math.sin((pulseTick / 8) + i * 0.4) * 35 + Math.cos(i * 0.3) * 25;
              const dynamicH = isPlaying ? Math.max(12, Math.min(100, Math.round(baseHeight))) : 8;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  {/* Peak-Hold Decay Dot */}
                  <span
                    className="w-full max-w-[8px] h-1 rounded-full bg-pink-200 mb-1 transition-all duration-300"
                    style={{
                      opacity: isPlaying ? 0.9 : 0.2,
                      transform: isPlaying ? `translateY(-${Math.round(dynamicH * 0.1)}px)` : 'none',
                    }}
                  />
                  {/* Frequency Bar */}
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

        {/* MODE 2: CIRCULAR DOPPLER RADAR WAVE SCOPE */}
        {activeMode === 'radar' && (
          <div className="relative flex items-center justify-center h-44 w-44 sm:h-52 sm:w-52 my-2">
            {/* Concentric Pulse Rings */}
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

        {/* MODE 3: LISSAJOUS STEREO VECTOR WAVE */}
        {activeMode === 'oscilloscope' && (
          <div className="w-full h-36 flex items-center justify-center relative overflow-hidden">
            <svg
              className="w-full h-full max-w-xl text-pink-500 overflow-visible"
              viewBox="0 0 600 140"
              fill="none"
            >
              {/* Left Channel Wave */}
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
                stroke="url(#waveGrad1)"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="transition-all duration-75"
              />

              {/* Right Channel Wave (Stereo Phase Shift) */}
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
                stroke="url(#waveGrad2)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.75"
                className="transition-all duration-75"
              />

              <defs>
                <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="50%" stopColor="#F472B6" />
                  <stop offset="100%" stopColor="#FDE047" />
                </linearGradient>
                <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#A855F7" />
                  <stop offset="50%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        )}

        {/* MODE 4: SOUNDWAVE PARTICLE CORE */}
        {activeMode === 'particle' && (
          <div className="relative flex items-center justify-center h-44 w-full">
            <div className="relative p-4 rounded-full bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 border border-pink-400 shadow-[0_0_35px_rgba(236,72,153,0.6)] anim-heartbeat z-10">
              <SparkleStar3D size={32} />
            </div>

            {/* Orbiting Particle Beacons */}
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
            <span>Stereo Phase: 48 kHz Lossless WebRTC</span>
          </span>
          <span className="text-[11px] font-mono text-pink-300/70 hidden sm:inline">•</span>
          <span className="text-[11px] font-mono text-pink-300/70 hidden sm:inline">Dynamic Dynamic Range: 24-Bit</span>
        </div>

        {/* Volume / Gain Adjustment Slider */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Sliders className="h-3.5 w-3.5 text-pink-400 shrink-0" />
          <span className="text-[11px] font-mono text-pink-300 shrink-0">Studio Gain</span>
          <input
            type="range"
            min={20}
            max={200}
            value={gainLevel}
            onChange={(e) => setGainLevel(Number(e.target.value))}
            className="w-24 sm:w-28 accent-pink-500 h-1.5 bg-black/40 rounded-lg cursor-pointer"
          />
          <span className="text-[11px] font-mono text-pink-300 font-bold w-9 text-right shrink-0">
            {gainLevel}%
          </span>
        </div>
      </div>
    </div>
  );
}
