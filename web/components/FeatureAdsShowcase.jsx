'use client';

import { useState } from 'react';
import {
  Maximize2,
  Check,
  Play,
  ArrowRight,
  X,
  Sparkles,
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

export default function FeatureAdsShowcase({ onStartRoom }) {
  const [zoomImage, setZoomImage] = useState(null);

  const FEATURE_ADS = [
    {
      id: 'duo-cam',
      badge: 'Duo Date Night',
      badgeColor: 'bg-[#FF6D1F]/20 text-[#FAF3E1] border-[#FF6D1F]/40',
      icon3D: DuoCam3D,
      title: 'Duo Video Cam & Real-Time Voice',
      tagline: 'See their reaction to every plot twist live.',
      image: '/ad-duo-cinema.jpg',
      imageAlt: 'Cinematic Duo Cinema Artwork',
      description:
        'Watch side-by-side with peer-to-peer low-latency video and crystal-clear voice tiles right beside the player. Features intimacy lighting, popcorn sharing, and heart reactions.',
      specs: ['0ms WebRTC Cam Lag', 'Intimacy Lighting', 'Floating Gestures', 'Mobile & PC Ready'],
    },
    {
      id: 'theater-auditorium',
      badge: 'Watch Party Mode',
      badgeColor: 'bg-[#FF6D1F]/20 text-[#FAF3E1] border-[#FF6D1F]/40',
      icon3D: Clapper3D,
      title: 'Virtual Cinema & Shared Queue',
      tagline: 'From cozy date nights for 2 up to 30 friends.',
      image: '/ad-theater-experience.jpg',
      imageAlt: 'VIP Virtual Cinema Auditorium Artwork',
      description:
        'Host private watch parties with a collaborative Up Next video queue, synchronized intermission timers, live emoji streams, and audience seat capacity controls.',
      specs: ['2 to 30 Member Seats', 'Collaborative Queue', 'Intermission Timer', 'Timestamp Reactions'],
    },
    {
      id: 'drift-sync',
      badge: 'Proprietary 0ms Drift',
      badgeColor: 'bg-[#FF6D1F]/20 text-[#FAF3E1] border-[#FF6D1F]/40',
      icon3D: SyncBolt3D,
      title: 'Sub-Second Precision Clock Sync',
      tagline: 'Never count down "3, 2, 1, Play" ever again.',
      image: '/ad-sync-engine.jpg',
      imageAlt: 'Multi-Device 0ms Lockstep Sync Engine Artwork',
      description:
        'Our server-side clock algorithm continuously monitors playback position across all viewers and applies micro-rate corrections, guaranteeing exact frame-locked synchronization.',
      specs: ['Frame-Locked Accuracy', 'Auto Buffer Drift Fix', 'Multi-Audio & Subtitles', 'Pause/Seek Synced'],
    },
    {
      id: 'universal-streaming',
      badge: 'Play Anything',
      badgeColor: 'bg-[#FF6D1F]/20 text-[#FAF3E1] border-[#FF6D1F]/40',
      icon3D: Ticket3D,
      title: 'Universal Media & Screen Share',
      tagline: 'Paste any video link or play directly from your disk.',
      image: '/ad-universal-media.jpg',
      imageAlt: 'Holographic Streaming Media Portal Artwork',
      description:
        'Supports YouTube, direct MP4/HLS streams, local computer files without uploading to external servers, and instant browser screen sharing in crisp 1080p and 4K.',
      specs: ['YouTube Integration', 'Direct MP4 & HLS Links', 'Local File Sync', '1-Click Screen Share'],
    },
    {
      id: 'strict-security',
      badge: 'Hacker-Proof Privacy',
      badgeColor: 'bg-[#FF6D1F]/20 text-[#FAF3E1] border-[#FF6D1F]/40',
      icon3D: Shield3D,
      title: 'Zero Logins & Bcrypt Passcodes',
      tagline: 'Strictly confidential. No accounts or trackers.',
      image: '/ad-privacy-vault.jpg',
      imageAlt: 'Cryptographic Privacy Vault Artwork',
      description:
        'SynCinema never asks for email, passwords, or personal logins. Every room is locked with bcrypt passcodes and automatically locks its doors when capacity is reached.',
      specs: ['No Accounts Needed', 'Bcrypt Hashed Passcodes', 'Auto-Lock on Entry', 'Zero Tracking Logs'],
    },
    {
      id: 'soundscapes-ambiance',
      badge: 'Luxury Atmosphere',
      badgeColor: 'bg-[#FF6D1F]/20 text-[#FAF3E1] border-[#FF6D1F]/40',
      icon3D: Popcorn3D,
      title: '4 Cinema Palettes & Soundscapes',
      tagline: 'Cozy vibes: rain on window, crackling fireplace.',
      image: '/ad-luxury-soundscape.jpg',
      imageAlt: 'Luxury Penthouse Night Rain & Fireplace Soundscape Artwork',
      description:
        'Immerse your room in Electric Tangerine & Black Hole, Cyberpunk Neon, Velvet Lounge, or Emerald Aurora. Turn on background ambient rain or fireplace sounds for the ultimate date night.',
      specs: ['Curated Color Themes', 'Fireplace & Rain Audio', 'Synchronized Ambiance', 'OLED Zero Glare'],
    },
  ];

  return (
    <section className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FF6D1F]/15 border border-[#FF6D1F]/30 text-[#FAF3E1] text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md shadow-md">
          <SparkleStar3D size={18} />
          <span>Real Room Previews &amp; Platform Features</span>
        </div>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#FAF3E1] tracking-tight">
          How It Looks &amp; How It Works
        </h3>
        <p className="text-xs sm:text-sm text-[#F5E7C6]/80 font-medium">
          Compact, distraction-free rooms engineered for couples and friends to watch in true harmony.
        </p>
      </div>

      {/* Bento Grid with 3D Art Icons (Aceternity UI / 21st.dev style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FEATURE_ADS.map((card) => {
          const IconComponent = card.icon3D;
          return (
            <div
              key={card.id}
              className="group rounded-3xl border border-white/10 bg-[#222222] p-4 sm:p-5 shadow-lg hover:shadow-2xl hover:border-[#FF6D1F]/60 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between space-y-3.5 relative overflow-hidden"
            >
              {/* Electric Tangerine Ambient Hover Glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#FF6D1F]/10 rounded-full blur-2xl group-hover:bg-[#FF6D1F]/25 transition duration-500 pointer-events-none" />

              {/* Card Top Pill & 3D Art Icon */}
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                  {card.badge}
                </span>
                <div className="shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <IconComponent size={34} />
                </div>
              </div>

              {/* Room Screenshot Preview Box */}
              <div
                onClick={() => setZoomImage({ src: card.image, title: card.title })}
                className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0A0A0C] h-36 sm:h-40 group/img cursor-pointer shadow-inner"
              >
                <img
                  src={card.image}
                  alt={card.imageAlt}
                  className="w-full h-full object-cover object-top transition duration-500 group-hover/img:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D10]/90 via-black/20 to-transparent opacity-85 group-hover/img:opacity-60 transition" />
                
                {/* Expand Pill */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/20 text-[10px] font-bold text-[#FAF3E1] opacity-90 group-hover/img:opacity-100 transition shadow-md">
                  <Maximize2 className="h-3 w-3 text-[#FF6D1F]" />
                  <span>Zoom Screenshot</span>
                </div>
              </div>

              {/* Text Information */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-[#FAF3E1] text-base leading-snug group-hover:text-[#FF8E42] transition">
                  {card.title}
                </h4>
                <p className="text-[11px] font-semibold text-[#FF6D1F] leading-tight">
                  {card.tagline}
                </p>
                <p className="text-xs text-[#F5E7C6]/85 leading-relaxed pt-1">
                  {card.description}
                </p>
              </div>

              {/* Specs Micro Pills */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/10 text-[10px]">
                {card.specs.map((spec, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[#F5E7C6]/90 truncate">
                    <Check className="h-3 w-3 text-[#FF6D1F] shrink-0" />
                    <span className="truncate">{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Quick Call To Action Banner */}
      <div className="rounded-3xl border border-[#FF6D1F]/30 bg-[#222222] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-[#FF6D1F]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 text-center sm:text-left relative z-10">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <SparkleStar3D size={20} />
            <h4 className="font-black text-[#FAF3E1] text-base sm:text-lg">
              Ready for Movie Night?
            </h4>
          </div>
          <p className="text-xs text-[#F5E7C6]/80 font-medium">
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
          className="btn-tangerine shrink-0 py-3 px-6 rounded-2xl text-[#FAF3E1] font-extrabold text-xs shadow-xl transition active:scale-95 flex items-center gap-2 cursor-pointer relative z-10"
        >
          <Play className="h-4 w-4 fill-[#FAF3E1]" />
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
            className="w-full max-w-4xl rounded-3xl border border-[#FF6D1F]/40 bg-[#161619] p-4 sm:p-5 shadow-2xl space-y-3 relative"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h4 className="font-bold text-[#FAF3E1] text-sm sm:text-base flex items-center gap-2">
                <Clapper3D size={22} />
                <span>{zoomImage.title} • Live Room Screenshot</span>
              </h4>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="p-1.5 rounded-xl text-[#F5E7C6]/60 hover:text-[#FAF3E1] hover:bg-white/10 transition"
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
