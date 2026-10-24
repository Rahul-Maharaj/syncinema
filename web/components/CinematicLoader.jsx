'use client';
import React, { useState, useEffect } from 'react';
import { Film, Sparkles, Shield, Heart } from 'lucide-react';
import { Popcorn3D, Clapper3D, SparkleStar3D } from '@/components/Icons3D';

const LOADING_STEPS = [
  '🍿 Dimming auditorium lights & preparing cinema couch...',
  '⚡ Calibrating zero-latency P2P sync clock...',
  '🔒 Securing end-to-end encrypted media tunnel...',
  '✨ Optimizing Dolby Atmos soundscape & frame alignment...',
  '🎬 Entering private VIP cinema suite...'
];

export default function CinematicLoader({
  title = 'Entering Virtual Cinema',
  subtitle = 'Securing zero-latency sync tunnel & encrypted stream...',
  fullScreen = true,
  showWallpaper = true
}) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center p-6 text-center select-none ${
        fullScreen
          ? 'fixed inset-0 z-50 min-h-screen w-full bg-[#101015]'
          : 'relative min-h-[360px] w-full rounded-3xl bg-[#14141B] border-2 border-pink-500/25'
      }`}
    >
      {/* 1. Romantic Couples Ambient Wallpaper with Darkened Vignette */}
      {showWallpaper && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none opacity-20 transition-opacity duration-1000 scale-105"
            style={{ backgroundImage: `url('/home-bg.jpg')`, backgroundPosition: 'center 40%' }}
          />
          <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent via-[#101015]/80 to-[#101015] pointer-events-none" />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#101015] via-[#101015]/60 to-[#101015]/90 pointer-events-none" />
        </>
      )}

      {/* 2. Overhead Cinema Projector Light Cone Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[340px] pointer-events-none anim-projector-beam z-0 opacity-40">
        <div className="w-full h-full bg-gradient-to-b from-pink-500/25 via-purple-500/10 to-transparent blur-2xl" />
      </div>

      {/* 3. Central Hero Cinema Orbital Core */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full space-y-6">
        <div className="relative grid place-items-center">
          {/* Outer Multi-Color Celestial Orbital Halo */}
          <div className="absolute h-36 w-36 rounded-full border-2 border-dashed border-pink-500/40 anim-celestial-spin" />
          
          {/* Inner Counter-Rotating Neon Ring with Glow Dots */}
          <div className="absolute h-28 w-28 rounded-full border-2 border-t-purple-400 border-r-transparent border-b-pink-400 border-l-transparent anim-celestial-spin-reverse shadow-[0_0_25px_rgba(236,72,153,0.3)]" />
          
          {/* Pulsing Ambient Core Aura */}
          <div className="absolute h-24 w-24 rounded-full bg-gradient-to-tr from-purple-600/30 via-pink-600/40 to-rose-500/30 blur-xl animate-pulse" />

          {/* Central 3D Floating Cinema Core */}
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-tr from-[#1E1A29] to-[#2B1D38] border-2 border-pink-500/60 shadow-[0_12px_32px_rgba(236,72,153,0.4)] grid place-items-center transform transition-transform hover:scale-105">
            <Popcorn3D size={44} className="drop-shadow-[0_4px_12px_rgba(236,72,153,0.6)]" />
            
            {/* Sparkle Badges */}
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-gradient-to-tr from-pink-500 to-rose-400 text-[9px] font-black text-white items-center justify-center">
                ✨
              </span>
            </span>
          </div>
        </div>

        {/* 4. Audio-Visual Waveform Equalizer (16 Dynamic Frequency Bars) */}
        <div className="flex items-end justify-center gap-1.5 h-8 py-1">
          {[35, 65, 45, 90, 60, 100, 75, 85, 50, 95, 70, 80, 45, 90, 60, 40].map((h, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-pink-500 via-rose-400 to-white anim-audio-bar"
              style={{
                height: `${h}%`,
                animationDelay: `${i * 75}ms`,
                animationDuration: '1.1s',
                boxShadow: '0 0 8px rgba(236,72,153,0.5)'
              }}
            />
          ))}
        </div>

        {/* 5. Typography & Title */}
        <div className="space-y-1.5 w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-300 text-[11px] font-extrabold uppercase tracking-widest shadow-inner mb-1">
            <Film className="h-3 w-3 text-pink-400 animate-spin [animation-duration:6s]" />
            <span>Virtual Cinema</span>
          </div>

          <h3 className="font-display font-black text-xl sm:text-2xl text-white tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-pink-200/90 font-medium max-w-xs mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* 6. High-Precision Laser Shimmer Progress Bar */}
        <div className="w-full max-w-xs space-y-2 pt-1">
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/15 p-0.5 shadow-inner">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-[#181822]">
              <div
                className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-pink-500 to-rose-300 anim-shimmer-sweep shadow-[0_0_12px_rgba(236,72,153,0.8)]"
              />
            </div>
          </div>

          {/* 7. Rotating Step Status Badge with Smooth Reveal */}
          <div className="h-6 flex items-center justify-center">
            <p
              key={stepIdx}
              className="text-[11px] sm:text-xs font-semibold text-pink-300/95 flex items-center gap-1.5 anim-reveal"
            >
              <span>{LOADING_STEPS[stepIdx]}</span>
            </p>
          </div>
        </div>

        {/* 8. Security & Zero-Lag Certification Pill */}
        <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-bold uppercase tracking-wider pt-2">
          <span className="flex items-center gap-1 text-emerald-400">
            <Shield className="h-3 w-3" /> 256-Bit Encrypted
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-pink-400">
            <Heart className="h-3 w-3 fill-current" /> Zero Lag Sync
          </span>
        </div>
      </div>
    </div>
  );
}
