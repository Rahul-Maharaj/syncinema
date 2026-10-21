'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Zap,
  ShieldCheck,
  Heart,
  ArrowRight,
  X,
  Radio,
  Eye,
  CheckCircle2,
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

export default function CinematicReelSpotlight({
  reelId,
  src,
  badge,
  badgeColor = 'bg-pink-500/20 text-pink-100 border-pink-500/40',
  title,
  headline,
  tagline,
  description,
  bullets = [],
  specs = [],
  icon: IconComponent = SparkleStar3D,
  layout = 'left', // 'left' = video on left on desktop, 'right' = video on right on desktop
  glowColor = 'rgba(236,72,153,0.2)',
  onStartRoom,
}) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Anti-Lag Intersection Observer: Play ONLY when in viewport to eliminate 100% idle GPU/CPU usage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (videoRef.current) {
          if (entry.isIntersecting && isPlaying) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
      },
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isPlaying]);

  const togglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (videoRef.current) {
      if (next) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  return (
    <section
      ref={containerRef}
      className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16"
    >
      {/* Background Ambient Radial Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] rounded-full blur-[140px] pointer-events-none anim-mesh-glow"
        style={{ backgroundColor: glowColor }}
      />

      {/* Main Glassmorphic Showcase Box (Anti-Vibe Precision Craftsmanship) */}
      <div className="relative rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-2xl p-6 sm:p-10 shadow-[0_25px_70px_rgba(236,72,153,0.18)] overflow-hidden transition-all duration-300 hover:border-pink-500/50">
        {/* Subtle Ambient Grid & Laser Accent */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ec48990a_1px,transparent_1px),linear-gradient(to_bottom,#ec48990a_1px,transparent_1px)] bg-[size:28px_28px] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-pink-400/60 to-transparent pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* VIDEO REEL FRAME (9:16 VERTICAL CINEMA MOCKUP) */}
          <div
            className={`w-full max-w-xs sm:max-w-sm mx-auto ${
              layout === 'right' ? 'lg:col-span-5 lg:order-2' : 'lg:col-span-5 lg:order-1'
            }`}
          >
            <div className="relative rounded-3xl p-2 sm:p-2.5 bg-gradient-to-b from-[#2a2a30] via-[#1a1a20] to-[#121216] border-2 border-pink-500/40 shadow-2xl group hover:border-pink-400 transition-all duration-300">
              {/* Phone Speaker Notch / Status Pill */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-0.5 rounded-full bg-black/85 border border-pink-500/30 text-[10px] text-pink-200/80 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>4K Cinema Reel</span>
              </div>

              {/* Viewport Canvas with Hardware-Accelerated Video */}
              <div className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-black border border-pink-500/30 shadow-inner group/video">
                <video
                  ref={videoRef}
                  src={src}
                  loop
                  muted={isMuted}
                  playsInline
                  preload="none"
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-102"
                  style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                />

                {/* SynCinema Logo in Right Top Corner */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-pink-500/40 text-white shadow-xl pointer-events-none select-none">
                  <img
                    src="/logo.png"
                    alt="SynCinema Logo"
                    className="h-3 w-3 object-contain shrink-0"
                  />
                  <span className="text-[9px] font-black tracking-tight leading-none">
                    <span className="text-white">Syn</span>
                    <span className="text-pink-400">Cinema</span>
                  </span>
                </div>

                {/* Video Playhead Progress Line */}
                <div className="absolute bottom-12 inset-x-3 z-20 h-1 bg-white/15 rounded-full overflow-hidden pointer-events-none">
                  <div
                    className="h-full bg-pink-500 transition-all duration-150 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Video HUD Floating Action Buttons */}
                <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between">
                  {/* Play / Pause Toggle */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-2 rounded-xl bg-black/80 hover:bg-pink-600 border border-pink-500/40 text-white transition cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5 text-[11px] font-bold"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Audio Toggle */}
                    <button
                      type="button"
                      onClick={toggleMute}
                      className={`p-2 rounded-xl border transition cursor-pointer shadow-lg active:scale-95 ${
                        !isMuted
                          ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                          : 'bg-black/80 border-pink-500/40 text-pink-300 hover:text-white'
                      }`}
                      title={isMuted ? 'Click to unmute reel audio' : 'Click to mute'}
                    >
                      {!isMuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    </button>

                    {/* Fullscreen Expand */}
                    <button
                      type="button"
                      onClick={() => setIsFullscreen(true)}
                      className="p-2 rounded-xl bg-black/80 hover:bg-pink-600 border border-pink-500/40 text-white transition cursor-pointer shadow-lg active:scale-95"
                      title="Expand to Fullscreen"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtle dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* EDITORIAL DESCRIPTION & METRICS (RIGHT OR LEFT) */}
          <div
            className={`space-y-5 text-center lg:text-left ${
              layout === 'right' ? 'lg:col-span-7 lg:order-1' : 'lg:col-span-7 lg:order-2'
            }`}
          >
            {/* Reel Badge */}
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-md ${badgeColor}`}>
              <IconComponent size={18} className="anim-float-slow" />
              <span>{badge}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-ping" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-pink-100 tracking-tight leading-tight">
                {headline}
              </h3>
              <p className="text-sm sm:text-base text-pink-300 font-bold">
                {title} • {tagline}
              </p>
            </div>

            <p className="text-xs sm:text-sm text-pink-200/85 font-medium leading-relaxed bg-[#1A1A1D]/80 p-4 sm:p-5 rounded-2xl border border-pink-500/20 shadow-inner">
              {description}
            </p>

            {/* Bullet Highlights */}
            {bullets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                {bullets.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1A1A1D] border border-pink-500/15 text-pink-200 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hardware-Accelerated Specs Ribbon */}
            {specs.length > 0 && (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 font-mono text-[11px]">
                {specs.map((spec) => (
                  <span
                    key={spec}
                    className="px-3 py-1 rounded-xl bg-[#1A1A1D] border border-pink-500/25 text-pink-300 font-bold"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}

            {/* CTA Button */}
            {onStartRoom && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <button
                  type="button"
                  onClick={onStartRoom}
                  className="btn-pink py-3 px-6 rounded-2xl text-white font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition active:scale-95 shadow-pink-500/30"
                >
                  <span>Experience This Now — Create Room</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN ZOOM MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#1c1c20] border border-pink-500/40 p-4 shadow-2xl space-y-3 flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b border-pink-500/20 pb-2">
              <span className="text-xs font-black text-pink-100 truncate pr-2">
                {title}
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-[9/16] w-full bg-black border border-pink-500/30 shadow-2xl">
              <video
                src={src}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-[11px] text-pink-200/80 text-center leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
