'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  Film,
  Zap,
  Play,
  Pause,
  Maximize2,
  Heart,
  Radio,
  Activity,
  Layers,
  ArrowRight,
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

const PORTAL_MODES = [
  {
    id: 'cinema',
    title: '4K Cinema Auditorium',
    subtitle: 'Widescreen 16:9 • Dolby Stereo Phase',
    badge: 'Ultra HD',
    icon: Clapper3D,
    image: '/ad-theater-experience.jpg',
    soundLabel: 'Spatial Audio • 48 kHz',
    eqSpeed: 1,
  },
  {
    id: 'duo',
    title: 'Couples Duo Ambiance',
    subtitle: 'Live Webcams • Fireplace & Rain',
    badge: 'Romantic Date',
    icon: Heart3D,
    image: '/ad-duo-cinema.jpg',
    soundLabel: 'Rain on Window • Cozy Lounge',
    eqSpeed: 1.4,
  },
  {
    id: 'sync',
    title: '0ms Clock-Locked Engine',
    subtitle: 'Sub-Millisecond Micro Rate Calibration',
    badge: '0ms Drift',
    icon: SyncBolt3D,
    image: '/ad-sync-engine.jpg',
    soundLabel: 'Frame-Locked P2P Pipeline',
    eqSpeed: 0.8,
  },
];

export default function HolographicStreamPortal({ onStartRoom }) {
  const [activeMode, setActiveMode] = useState('cinema');
  const [isPlaying, setIsPlaying] = useState(true);
  const [seconds, setSeconds] = useState(3842);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const currentMode = PORTAL_MODES.find((m) => m.id === activeMode) || PORTAL_MODES[0];
  const IconComponent = currentMode.icon;

  const formatTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  return (
    <section className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-100 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md shadow-md">
          <SparkleStar3D size={18} />
          <span>Interactive Cinema Visualizer</span>
        </div>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-pink-100 tracking-tight">
          Holographic Stream Portal &amp; Audio Visualizer
        </h3>
        <p className="text-xs sm:text-sm text-pink-200/80 font-medium">
          Experience how SynCinema blends synchronized 4K video, real-time duo audio waveforms, and floating video calls into one unified stage.
        </p>
      </div>

      {/* Mode Switcher Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {PORTAL_MODES.map((mode) => {
          const ModeIcon = mode.icon;
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setActiveMode(mode.id)}
              className={`py-2.5 px-4 rounded-2xl text-xs font-bold border transition flex items-center gap-2.5 cursor-pointer shadow-md ${
                isActive
                  ? 'btn-pink text-white border-pink-400 shadow-pink-500/30 scale-105'
                  : 'bg-[#1A1A1D] border-pink-500/20 text-pink-200/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <ModeIcon size={20} />
              <span>{mode.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Holographic Interactive Portal Stage */}
      <div className="rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_25px_70px_rgba(236,72,153,0.18)] space-y-5 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-pink-500/20 rounded-full blur-[110px] pointer-events-none" />

        {/* Portal Header & Live Visualizer HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-500/20 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
              <IconComponent size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-pink-100 text-base sm:text-lg">
                  {currentMode.title}
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/40">
                  {currentMode.badge}
                </span>
              </div>
              <p className="text-xs text-pink-300 font-medium">
                {currentMode.subtitle}
              </p>
            </div>
          </div>

          {/* Interactive Play/Pause Simulator Control */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="py-1.5 px-3.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 fill-pink-200" /> : <Play className="h-3.5 w-3.5 fill-pink-200" />}
              <span>{isPlaying ? 'Pause Simulator' : 'Play Simulator'}</span>
            </button>

            <span className="text-xs font-mono font-bold text-pink-300 px-3 py-1.5 rounded-xl bg-[#1A1A1D] border border-pink-500/20">
              {formatTime(seconds)}
            </span>
          </div>
        </div>

        {/* Centerpiece: Holographic Cinema Screen with Dynamic Overlay */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-pink-500/30 bg-[#161619] aspect-video max-h-[440px] w-full shadow-2xl group">
          <img
            src={currentMode.image}
            alt={currentMode.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#222222] via-transparent to-black/40 opacity-90" />

          {/* Holographic Top Status HUD */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-xs pointer-events-none">
            <div className="flex items-center gap-2 bg-[#222222]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/30 text-pink-100 font-bold shadow-md">
              <span className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isPlaying ? '0ms P2P Stream Active' : 'Held in Buffer Sync'}</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-[#222222]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-pink-500/30 text-pink-200 font-mono text-[11px] shadow-md">
              <Activity className="h-3.5 w-3.5 text-pink-400" />
              <span>Lossless WebRTC Audio</span>
            </div>
          </div>

          {/* Floating In-Screen Live Video Call Tiles */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 pointer-events-none">
            {/* User 1 Tile */}
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#222222]/90 backdrop-blur-md border border-pink-500/40 shadow-xl">
              <div className="h-9 w-9 rounded-xl bg-purple-950 flex items-center justify-center font-bold text-xs text-pink-200 border border-pink-400/50">
                You
              </div>
              <div className="text-left pr-2">
                <p className="text-[11px] font-bold text-pink-100">You (Host)</p>
                <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Mic &amp; Cam Active</span>
                </div>
              </div>
            </div>

            {/* User 2 Tile */}
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#222222]/90 backdrop-blur-md border border-rose-500/40 shadow-xl">
              <div className="h-9 w-9 rounded-xl bg-rose-950 flex items-center justify-center font-bold text-xs text-rose-200 border border-rose-400/50">
                ❤️
              </div>
              <div className="text-left pr-2">
                <p className="text-[11px] font-bold text-pink-100">Partner</p>
                <div className="flex items-center gap-1 text-[9px] text-pink-300 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-ping" />
                  <span>Watching with you</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 24-Bar Live Audio Spectrum Visualizer Ribbon */}
        <div className="p-3 sm:p-4 rounded-2xl bg-[#1A1A1D]/90 border border-pink-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Volume2 className="h-4 w-4 text-pink-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-pink-100">
                {currentMode.soundLabel}
              </p>
              <p className="text-[10px] text-pink-300/70 font-mono">
                Stereo Phasor • Synchronized Peak-Hold Detection
              </p>
            </div>
          </div>

          {/* 24 Dynamic Audio Frequency Bars */}
          <div className="flex items-end gap-1 h-6">
            {[45, 85, 60, 95, 35, 75, 100, 50, 80, 40, 90, 65, 70, 95, 45, 80, 60, 35, 85, 75, 90, 50, 65, 40].map(
              (h, i) => (
                <span
                  key={i}
                  className={`w-1 sm:w-1.5 rounded-full transition-all duration-150 ${
                    isPlaying
                      ? 'bg-gradient-to-t from-pink-600 via-rose-500 to-pink-300 anim-eq-bar'
                      : 'bg-pink-500/25 h-1.5'
                  }`}
                  style={{
                    height: isPlaying ? undefined : '5px',
                    animationDelay: `${(i % 6) * 0.12}s`,
                    animationDuration: `${1.2 / currentMode.eqSpeed}s`,
                  }}
                />
              )
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-1 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-pink-200/80 font-medium">
            Ready to experience synchronized theater soundscapes in your private room?
          </p>

          <button
            type="button"
            onClick={() => {
              if (typeof onStartRoom === 'function') onStartRoom();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-pink py-2.5 px-5 rounded-2xl text-xs font-extrabold text-white shadow-xl shadow-pink-500/30 flex items-center gap-2 cursor-pointer"
          >
            <span>Launch Private Cinema</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
