'use client';

import { useState } from 'react';
import {
  Film,
  Heart,
  ShieldCheck,
  Zap,
  Users,
  Sparkles,
  Maximize2,
  Check,
  Play,
  Volume2,
  Lock,
  ArrowRight,
  X,
  Tv,
} from 'lucide-react';

export default function FeatureAdsShowcase({ onStartRoom }) {
  const [zoomImage, setZoomImage] = useState(null);

  const FEATURE_ADS = [
    {
      id: 'duo-cam',
      badge: 'Duo Date Night',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: Users,
      iconColor: 'text-rose-400',
      title: 'Duo Video Cam & Real-Time Voice',
      tagline: 'See their reaction to every plot twist live.',
      image: '/room-ss-duo.png',
      imageAlt: 'Real Duo Cam Room Interface Screenshot',
      description:
        'Watch side-by-side with peer-to-peer low-latency video and crystal-clear voice tiles right beside the player. Features intimacy lighting, popcorn sharing, and heart reactions.',
      specs: ['0ms WebRTC Cam Lag', 'Intimacy Lighting', 'Floating Gestures', 'Mobile & PC Ready'],
    },
    {
      id: 'theater-auditorium',
      badge: 'Watch Party Mode',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: Film,
      iconColor: 'text-purple-400',
      title: 'Virtual Cinema & Shared Queue',
      tagline: 'From cozy date nights for 2 up to 30 friends.',
      image: '/room-ss-theater.png',
      imageAlt: 'Auditorium Watch Party Screenshot',
      description:
        'Host private watch parties with a collaborative Up Next video queue, synchronized intermission timers, live emoji streams, and audience seat capacity controls.',
      specs: ['2 to 30 Member Seats', 'Collaborative Queue', 'Intermission Timer', 'Timestamp Reactions'],
    },
    {
      id: 'drift-sync',
      badge: 'Proprietary 0ms Drift',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: Zap,
      iconColor: 'text-emerald-400',
      title: 'Sub-Second Precision Clock Sync',
      tagline: 'Never count down "3, 2, 1, Play" ever again.',
      image: '/room-ss-player.png',
      imageAlt: 'High Contrast Video Controls Screenshot',
      description:
        'Our server-side clock algorithm continuously monitors playback position across all viewers and applies micro-rate corrections, guaranteeing exact frame-locked synchronization.',
      specs: ['Frame-Locked Accuracy', 'Auto Buffer Drift Fix', 'Multi-Audio & Subtitles', 'Pause/Seek Synced'],
    },
    {
      id: 'universal-streaming',
      badge: 'Play Anything',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: Tv,
      iconColor: 'text-cyan-400',
      title: 'Universal Media & Screen Share',
      tagline: 'Paste any video link or play directly from your disk.',
      image: '/feature-cinema-preview.png',
      imageAlt: 'Website Cinema Player UI Screenshot',
      description:
        'Supports YouTube, direct MP4/HLS streams, local computer files without uploading to external servers, and instant browser screen sharing in crisp 1080p and 4K.',
      specs: ['YouTube Integration', 'Direct MP4 & HLS Links', 'Local File Sync', '1-Click Screen Share'],
    },
    {
      id: 'strict-security',
      badge: 'Hacker-Proof Privacy',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: ShieldCheck,
      iconColor: 'text-amber-400',
      title: 'Zero Logins & Bcrypt Passcodes',
      tagline: 'Strictly confidential. No accounts or trackers.',
      image: '/feature-couple.jpg',
      imageAlt: 'Couple Streaming Confidentially',
      description:
        'SynCinema never asks for email, passwords, or personal logins. Every room is locked with bcrypt passcodes and automatically locks its doors when capacity is reached.',
      specs: ['No Accounts Needed', 'Bcrypt Hashed Passcodes', 'Auto-Lock on Entry', 'Zero Tracking Logs'],
    },
    {
      id: 'soundscapes-ambiance',
      badge: 'Luxury Atmosphere',
      badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      icon: Sparkles,
      iconColor: 'text-pink-400',
      title: '4 Cinema Palettes & Soundscapes',
      tagline: 'Cozy vibes: rain on window, crackling fireplace.',
      image: '/room-ss-theater.png',
      imageAlt: 'Soundscapes & Ambiance Themes',
      description:
        'Immerse your room in Soft Pink Romance, Cyberpunk Neon, Velvet Lounge, or Emerald Aurora. Turn on background ambient rain or fireplace sounds for the ultimate date night.',
      specs: ['4 Curated Color Themes', 'Fireplace & Rain Audio', 'Synchronized Ambiance', 'OLED Zero Glare'],
    },
  ];

  return (
    <section className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 border border-pink-500/30 text-pink-300 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md shadow-md">
          <Sparkles className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
          <span>Real Room Previews &amp; Platform Features</span>
        </div>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
          How It Looks &amp; How It Works
        </h3>
        <p className="text-xs sm:text-sm text-slate-300">
          Compact, distraction-free rooms engineered for couples and friends to watch in true harmony.
        </p>
      </div>

      {/* Compact Animated Ads Grid (Small Boxes, Rich Information, User Room Screenshots) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURE_ADS.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              className="group rounded-3xl border border-white/15 bg-black/55 backdrop-blur-xl p-4 sm:p-5 shadow-lg hover:shadow-2xl hover:border-pink-500/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between space-y-3.5 relative overflow-hidden"
            >
              {/* Subtle Ambient Hover Glow */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition duration-500 pointer-events-none" />

              {/* Card Top Pill & Icon */}
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                  {card.badge}
                </span>
                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <IconComponent className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>

              {/* Real User Room Screenshot Preview Box */}
              <div
                onClick={() => setZoomImage({ src: card.image, title: card.title })}
                className="relative rounded-2xl overflow-hidden border border-white/15 bg-black h-36 sm:h-40 group/img cursor-pointer shadow-inner"
              >
                <img
                  src={card.image}
                  alt={card.imageAlt}
                  className="w-full h-full object-cover object-top transition duration-500 group-hover/img:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover/img:opacity-60 transition" />
                
                {/* Expand Pill */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg border border-white/20 text-[10px] font-bold text-white opacity-90 group-hover/img:opacity-100 transition shadow-md">
                  <Maximize2 className="h-3 w-3 text-pink-400" />
                  <span>Zoom Screenshot</span>
                </div>
              </div>

              {/* Text Information */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-white text-base leading-snug group-hover:text-pink-200 transition">
                  {card.title}
                </h4>
                <p className="text-[11px] font-semibold text-pink-300/90 leading-tight">
                  {card.tagline}
                </p>
                <p className="text-xs text-slate-300/90 leading-relaxed pt-1">
                  {card.description}
                </p>
              </div>

              {/* Specs Micro Pills */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/10 text-[10px]">
                {card.specs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-300 truncate">
                    <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Quick Call To Action Banner */}
      <div className="rounded-3xl border border-pink-500/35 bg-gradient-to-r from-purple-950/40 via-pink-950/30 to-black/60 p-5 sm:p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="font-black text-white text-base sm:text-lg">
            Ready for Movie Night?
          </h4>
          <p className="text-xs text-slate-300">
            Create your password-protected room in 5 seconds and invite your partner.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (typeof onStartRoom === 'function') {
              onStartRoom();
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="shrink-0 py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-pink-600/30 transition active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <Play className="h-4 w-4 fill-white" />
          <span>Launch Your Room Now</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Screenshot Lightbox Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 sm:p-8 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-3xl border border-pink-500/40 bg-[#0c0716] p-4 sm:p-5 shadow-2xl space-y-3 relative"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Film className="h-4 w-4 text-pink-400" />
                <span>{zoomImage.title} • Live Room Screenshot</span>
              </h4>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-white/15 max-h-[75vh] flex items-center justify-center bg-black shadow-inner">
              <img
                src={zoomImage.src}
                alt="Enlarged Room Preview"
                className="max-h-[72vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
