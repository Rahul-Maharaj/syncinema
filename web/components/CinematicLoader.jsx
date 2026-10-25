'use client';
import React from 'react';

/**
 * Sleek, Minimal Animated Cinema Loader
 * Modern animated loading effects with pure orbital rings, glowing aperture, and zero cluttered text blocks.
 */
export default function CinematicLoader({
  title = 'SyncCinema',
  subtitle = 'Loading cinema suite…',
  fullScreen = true,
  showWallpaper = false
}) {
  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center p-6 text-center select-none ${
        fullScreen
          ? 'fixed inset-0 z-50 min-h-screen w-full bg-[#0D0B14]'
          : 'relative min-h-[300px] w-full rounded-2xl bg-[#12101B] border border-pink-500/20'
      }`}
    >
      {/* Subtle ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-pink-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* Central Animated Loading Effect */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        <div className="relative h-20 w-20 flex items-center justify-center">
          {/* Outer Pulsing Glow Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-pink-500/20 animate-ping opacity-40 [animation-duration:2.5s]" />

          {/* Counter-Rotating Orbital Gradient Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 border-r-rose-400 animate-spin [animation-duration:1.2s] shadow-[0_0_16px_rgba(236,72,153,0.35)]" />

          {/* Inner Counter-Rotating Ring */}
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-purple-400 border-l-pink-300 animate-spin [animation-duration:1.8s] [animation-direction:reverse]" />

          {/* Center Pulsing Core */}
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 flex items-center justify-center shadow-lg shadow-pink-500/40 animate-pulse">
            <span className="text-white text-xs font-black">▶</span>
          </div>
        </div>

        {/* Minimal Animated Dots & Label */}
        <div className="space-y-1.5 text-center">
          <p className="font-extrabold text-white text-sm tracking-wider uppercase drop-shadow">
            {title}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-pink-300/70 font-medium">
            <span>{subtitle}</span>
            <span className="inline-flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-pink-400 animate-bounce [animation-delay:0ms]" />
              <span className="h-1 w-1 rounded-full bg-pink-400 animate-bounce [animation-delay:150ms]" />
              <span className="h-1 w-1 rounded-full bg-pink-400 animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
