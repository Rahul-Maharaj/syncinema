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
  Smartphone,
  Laptop,
  ArrowRight,
  X,
  Radio,
  Eye,
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
import { isSearchBot } from '@/lib/antiBot';

const CINEMATIC_REELS = [
  {
    id: 'reel_sync_arc',
    src: '/ads.mp4',
    badge: '0.00ms Satellite Sync',
    badgeColor: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40',
    title: 'Quantum Sync Arc: Connected Across Cities',
    tagline: 'Miles apart. One glowing sync beam. Zero drift.',
    icon: SyncBolt3D,
    specs: ['10s 4K Reel', 'Frame-Locked P2P', 'Quantum Drift Correction', '0 Lag'],
    description:
      'Miles apart, watching together on the same screen. The glowing quantum sync arc visualizes how SynCinema continuously calibrates both lovers\' frames to the sub-millisecond, so every smile, laugh, and plot twist happens in exact real-time unison.',
  },
  {
    id: 'reel_platform_tour',
    src: '/ads(2).mp4',
    badge: 'Zero-Log Privacy',
    badgeColor: 'bg-pink-500/20 text-pink-100 border-pink-500/40',
    title: 'Next-Gen Cinema Interface & Security Vault',
    tagline: 'Dark velvet UI with private cryptographic keys.',
    icon: Shield3D,
    specs: ['10s 4K Reel', 'PBKDF2 Password Lock', 'Instant Local Play', 'Zero Tracking'],
    description:
      'Step inside our private virtual auditorium. Featuring zero tracking logs, instant local file playback with 0-second wait, and military-grade password protection. Create or enter private cinema rooms without ever giving up your email or personal information.',
  },
  {
    id: 'reel_video_call_date',
    src: '/ads(3).mp4',
    badge: '1080p Duo Webcams',
    badgeColor: 'bg-rose-500/20 text-rose-100 border-rose-500/40',
    title: 'Live Duo Video Calls & Cinema Date Night',
    tagline: 'See their reaction to every movie twist in real-time.',
    icon: Heart3D,
    specs: ['10s 4K Reel', '1080p Video Calls', 'Intelligent Voice Ducking', 'Shared Fairy Lights'],
    description:
      'Feel like you\'re sitting on the same couch. High-definition 1080p video calls with real-time intimacy lighting, couple reactions, and intelligent audio ducking that softly lowers the movie volume whenever you speak.',
  },
];

export default function CinematicReelsShowcase({ onStartRoom }) {
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [modalReel, setModalReel] = useState(null);

  const videoRefs = useRef([]);
  const containerRef = useRef(null);

  // Anti-Lag Intersection Observer: Only play videos when scrolled into view
  useEffect(() => {
    if (typeof window === 'undefined' || isSearchBot()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            if (isPlaying) {
              video.play().catch(() => {});
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );

    videoRefs.current.forEach((v) => {
      if (v) observer.observe(v);
    });

    return () => observer.disconnect();
  }, [isPlaying]);

  const togglePlayAll = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    videoRefs.current.forEach((v) => {
      if (!v) return;
      if (next) v.play().catch(() => {});
      else v.pause();
    });
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRefs.current.forEach((v) => {
      if (v) v.muted = nextMuted;
    });
  };

  return (
    <section ref={containerRef} className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10">
      {/* Section Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/35 text-pink-200 text-xs font-black uppercase tracking-wider shadow-lg backdrop-blur-md">
          <Clapper3D size={20} className="anim-float-slow" />
          <span>Cinematic Ad Reels Showcase</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-pink-100 tracking-tight leading-tight">
          Experience SynCinema in Action.{' '}
          <span className="anim-text-shimmer inline-block">Real 4K Cinema Reels.</span>
        </h2>

        <p className="text-xs sm:text-sm lg:text-base text-pink-200/80 font-medium leading-relaxed">
          Watch our official 10-second cinematic reels showcasing long-distance couple synchronization, the zero-log private theater interface, and real-time duo video call intimacy.
        </p>

        {/* Global Reel Playback Controls */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={togglePlayAll}
            className="py-1.5 px-3.5 rounded-xl bg-[#1A1A1D] hover:bg-white/10 border border-pink-500/30 text-pink-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-pink-200" /> : <Play className="h-3.5 w-3.5 fill-pink-200" />}
            <span>{isPlaying ? 'Pause Reels' : 'Play Reels'}</span>
          </button>

          <button
            type="button"
            onClick={toggleMute}
            className={`py-1.5 px-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
              !isMuted
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-[#1A1A1D] border-pink-500/30 text-pink-300/70 hover:text-white'
            }`}
          >
            {!isMuted ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{!isMuted ? 'Sound ON' : 'Unmute Reels'}</span>
          </button>
        </div>
      </div>

      {/* 3-COLUMN REEL CARDS GRID (9:16 VERTICAL CINEMA FRAMES) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {CINEMATIC_REELS.map((reel, idx) => {
          const IconComp = reel.icon;
          return (
            <div
              key={reel.id}
              className="group rounded-3xl bg-[#1c1c20] border-2 border-pink-500/30 hover:border-pink-400 p-4 sm:p-5 shadow-2xl flex flex-col justify-between space-y-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(236,72,153,0.25)] relative overflow-hidden"
              style={{ transform: 'translate3d(0, 0, 0)' }}
            >
              {/* Ambient Top Glow */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-24 bg-pink-500/15 rounded-full blur-[80px] pointer-events-none" />

              {/* Reel Video Viewport (Anti-Lag, Muted Loop, 9:16 Aspect Ratio) */}
              <div className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-black border border-pink-500/30 shadow-inner group/video">
                <video
                  ref={(el) => (videoRefs.current[idx] = el)}
                  src={reel.src}
                  loop
                  muted={isMuted}
                  playsInline
                  preload="none"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-102"
                />

                {/* Top Overlay HUD */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
                  <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shadow-md backdrop-blur-md ${reel.badgeColor}`}>
                    {reel.badge}
                  </span>

                  {/* SynCinema Logo in Right Top Corner */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-pink-500/40 text-white shadow-xl pointer-events-none select-none">
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
                </div>

                {/* Bottom Overlay Pill */}
                <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md border border-pink-500/30 text-[10px] text-pink-200 font-bold shadow-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Real 4K Reel</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalReel(reel);
                    }}
                    className="pointer-events-auto p-1.5 rounded-xl bg-black/80 hover:bg-pink-600 border border-pink-500/40 text-white transition cursor-pointer shadow-md active:scale-95"
                    title="Watch in Fullscreen"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Reel Text & Accurate Description */}
              <div className="space-y-3 flex-1 flex flex-col justify-between pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      <IconComp size={16} />
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-pink-100 group-hover:text-pink-200 transition-colors">
                      {reel.title}
                    </h3>
                  </div>
                  <p className="text-xs text-pink-300/90 font-medium">
                    {reel.tagline}
                  </p>
                </div>

                <p className="text-[11px] text-pink-200/80 leading-relaxed bg-[#141416] p-3 rounded-xl border border-pink-500/15">
                  {reel.description}
                </p>

                {/* Specs Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-mono">
                  {reel.specs.map((spec) => (
                    <span
                      key={spec}
                      className="px-2 py-0.5 rounded-md bg-[#141416] border border-pink-500/20 text-pink-300/80"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULLSCREEN ZOOM REEL MODAL */}
      {modalReel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#1c1c20] border border-pink-500/40 p-4 shadow-2xl space-y-3 flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b border-pink-500/20 pb-2">
              <span className="text-xs font-black text-pink-100 truncate pr-2">
                {modalReel.title}
              </span>
              <button
                type="button"
                onClick={() => setModalReel(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-[9/16] w-full bg-black border border-pink-500/30 shadow-2xl">
              <video
                src={modalReel.src}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-[11px] text-pink-200/80 text-center leading-relaxed">
              {modalReel.description}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
