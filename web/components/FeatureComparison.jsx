'use client';

import { useState } from 'react';
import {
  Check,
  X,
  Sparkles,
  Zap,
  Shield,
  Film,
  Heart,
  HelpCircle,
  ArrowRight,
  Tv,
  Layers,
  ChevronRight,
  Sliders,
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

const COMPARISON_CATEGORIES = [
  {
    id: 'all',
    label: 'All Features',
    icon: Sparkles,
  },
  {
    id: 'sync',
    label: '0ms Sync & Playback',
    icon: SyncBolt3D,
  },
  {
    id: 'video',
    label: 'Webcams & Media',
    icon: DuoCam3D,
  },
  {
    id: 'security',
    label: 'Security & Zero-Logs',
    icon: Shield3D,
  },
  {
    id: 'romance',
    label: 'Couples & Ambiance',
    icon: Heart3D,
  },
];

const MATRIX_DATA = [
  {
    category: 'sync',
    name: '0ms Clock-Locked Sync',
    desc: 'Micro-rate drift adjustment keeps timeline locked without jarring pauses',
    syncinema: 'Proprietary 0ms Drift Engine',
    syncinemaState: true,
    discord: 'Frequent 2-5s Stream Lag',
    discordState: false,
    zoom: 'Choppy 15-20 FPS Video',
    zoomState: false,
    teleparty: 'High Desync / Constant Drift',
    telepartyState: false,
  },
  {
    category: 'sync',
    name: 'Simultaneous Play / Pause / Seek',
    desc: 'When anyone scrubs or pauses, all participant screens mirror instantly',
    syncinema: 'Instant Sub-Second Mirroring',
    syncinemaState: true,
    discord: 'Manual 3-2-1 countdown',
    discordState: false,
    zoom: 'Host-only control',
    zoomState: false,
    teleparty: 'Laggy reload on seek',
    telepartyState: false,
  },
  {
    category: 'video',
    name: 'Dual In-Room Video Call Webcams',
    desc: 'See and hear your partner side-by-side without covering the movie screen',
    syncinema: 'Dedicated Zero-Overlap Tiles',
    syncinemaState: true,
    discord: 'Blocks video player surface',
    discordState: false,
    zoom: 'Cluttered UI overlay',
    zoomState: false,
    teleparty: 'No live webcam support',
    telepartyState: false,
  },
  {
    category: 'video',
    name: 'DRM-Proof Media Support',
    desc: 'YouTube, direct MP4, HLS (.m3u8), and disk files without black screens',
    syncinema: 'Native Stream & P2P Engine',
    syncinemaState: true,
    discord: 'Frequent DRM Black Screen',
    discordState: false,
    zoom: 'Pixelated screen grab',
    zoomState: false,
    teleparty: 'Requires paid browser extension',
    telepartyState: false,
  },
  {
    category: 'video',
    name: 'P2P Local File Player (0MB Upload)',
    desc: 'Watch movies saved on your laptop or phone without uploading to cloud servers',
    syncinema: 'Direct Encrypted WebRTC P2P',
    syncinemaState: true,
    discord: 'Requires full PC screen broadcast',
    discordState: false,
    zoom: 'Heavy bandwidth encoding',
    zoomState: false,
    teleparty: 'Unsupported (Web only)',
    telepartyState: false,
  },
  {
    category: 'security',
    name: 'Zero Logins / No Account Needed',
    desc: 'No email, no phone number, and no tracking cookies stored anywhere',
    syncinema: '100% Anonymous & Ephemeral',
    syncinemaState: true,
    discord: 'Requires Discord Account & App',
    discordState: false,
    zoom: 'Account & Software Install',
    zoomState: false,
    teleparty: 'Account & Extension Install',
    telepartyState: false,
  },
  {
    category: 'security',
    name: 'Bcrypt-Guarded Private Rooms',
    desc: 'Rooms are strictly protected with encrypted keys. No strangers can enter.',
    syncinema: 'Mandatory Bcrypt Passcodes',
    syncinemaState: true,
    discord: 'Server permissions required',
    discordState: false,
    zoom: 'Waiting rooms / meeting IDs',
    zoomState: false,
    teleparty: 'Open link vulnerability',
    telepartyState: false,
  },
  {
    category: 'security',
    name: 'Auto-Destruct on Inactivity',
    desc: 'Empty rooms and session traces wipe automatically after 10 minutes',
    syncinema: 'Auto-Purge Inactive Memory',
    syncinemaState: true,
    discord: 'Data retained permanently',
    discordState: false,
    zoom: 'Session logs stored in cloud',
    zoomState: false,
    teleparty: 'Telemetry logged on servers',
    telepartyState: false,
  },
  {
    category: 'romance',
    name: 'Authentic Date Polaroids',
    desc: 'Snap vintage keepsake photos blending the movie scene and live video call webcams',
    syncinema: 'Live Couples Keepsake Booth',
    syncinemaState: true,
    discord: 'None',
    discordState: false,
    zoom: 'None',
    zoomState: false,
    teleparty: 'None',
    telepartyState: false,
  },
  {
    category: 'romance',
    name: 'Rain & Fireplace Soundscapes',
    desc: 'Background atmospheric audio behind movie dialogue for cozy late-night dates',
    syncinema: 'Synthesized Cozy Soundscapes',
    syncinemaState: true,
    discord: 'Requires music bot setup',
    discordState: false,
    zoom: 'None',
    zoomState: false,
    teleparty: 'None',
    telepartyState: false,
  },
  {
    category: 'romance',
    name: 'Touch Hugs & Screen Pulses',
    desc: 'Send real-time haptic screen pulses with glowing rose hearts to your partner',
    syncinema: 'Interactive Intimacy Mode',
    syncinemaState: true,
    discord: 'Text-only emojis',
    discordState: false,
    zoom: 'Meeting reactions only',
    zoomState: false,
    teleparty: 'Chat emojis only',
    telepartyState: false,
  },
];

export default function FeatureComparison({ onStartRoom }) {
  const [selectedCat, setSelectedCat] = useState('all');

  const filteredData =
    selectedCat === 'all'
      ? MATRIX_DATA
      : MATRIX_DATA.filter((item) => item.category === selectedCat);

  return (
    <section className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Section Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-100 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md shadow-md">
          <SparkleStar3D size={18} />
          <span>The Next-Gen Cinema Standard</span>
        </div>
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-pink-100 tracking-tight">
          Why SynCinema Beats Old Watch Parties
        </h3>
        <p className="text-xs sm:text-sm text-pink-200/80 font-medium">
          Say goodbye to countdowns, blacked-out screens, and invasive account logins. Engineered from the ground up for movie nights.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {COMPARISON_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCat === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCat(cat.id)}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer shadow-sm ${
                isActive
                  ? 'btn-pink text-white border-pink-400 shadow-md shadow-pink-500/30'
                  : 'bg-[#1A1A1D] border-pink-500/20 text-pink-300/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {typeof Icon === 'function' ? (
                <Icon className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Comparison Matrix Table Card */}
      <div className="rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(236,72,153,0.14)] overflow-hidden">
        {/* Table Wrapper for Horizontal Scroll on Mobile */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-pink-500/25 bg-[#1A1A1D]/90">
                <th className="py-4 px-4 sm:px-6 font-extrabold text-pink-200 text-xs sm:text-sm w-2/5">
                  Cinema Platform Capabilities
                </th>
                <th className="py-4 px-3 sm:px-5 font-black text-white text-xs sm:text-sm bg-gradient-to-r from-pink-600/30 to-pink-500/20 border-x border-pink-500/40 text-center w-1/5 shadow-inner">
                  <div className="flex items-center justify-center gap-1.5 text-pink-100">
                    <SparkleStar3D size={18} />
                    <span className="text-white font-black tracking-wide">SynCinema</span>
                  </div>
                </th>
                <th className="py-4 px-3 sm:px-4 font-bold text-pink-300/70 text-center w-1/5 hidden md:table-cell">
                  Discord Screen Share
                </th>
                <th className="py-4 px-3 sm:px-4 font-bold text-pink-300/70 text-center w-1/5 hidden lg:table-cell">
                  Zoom / Meet
                </th>
                <th className="py-4 px-3 sm:px-4 font-bold text-pink-300/70 text-center w-1/5">
                  Teleparty (Netflix Party)
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-pink-500/15">
              {filteredData.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Feature Name & Description */}
                  <td className="py-3.5 px-4 sm:px-6 space-y-1">
                    <div className="font-extrabold text-pink-100 text-xs sm:text-sm flex items-center gap-2 group-hover:text-pink-300 transition">
                      <span>{row.name}</span>
                    </div>
                    <p className="text-[11px] text-pink-300/70 leading-relaxed font-normal">
                      {row.desc}
                    </p>
                  </td>

                  {/* SynCinema Column (Highlighted in Soft Pink Glow) */}
                  <td className="py-3.5 px-3 sm:px-5 text-center bg-pink-500/10 border-x border-pink-500/30 shadow-sm">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-pink-500/20 border border-pink-400 text-pink-100 font-extrabold text-[11px] shadow-sm">
                      <Check className="h-3.5 w-3.5 text-pink-300 shrink-0 stroke-[3]" />
                      <span className="truncate">{row.syncinema}</span>
                    </div>
                  </td>

                  {/* Discord */}
                  <td className="py-3.5 px-3 sm:px-4 text-center hidden md:table-cell text-pink-300/60 font-medium">
                    <div className="inline-flex items-center gap-1 text-[11px]">
                      <X className="h-3 w-3 text-rose-400 shrink-0" />
                      <span>{row.discord}</span>
                    </div>
                  </td>

                  {/* Zoom */}
                  <td className="py-3.5 px-3 sm:px-4 text-center hidden lg:table-cell text-pink-300/60 font-medium">
                    <div className="inline-flex items-center gap-1 text-[11px]">
                      <X className="h-3 w-3 text-rose-400 shrink-0" />
                      <span>{row.zoom}</span>
                    </div>
                  </td>

                  {/* Teleparty */}
                  <td className="py-3.5 px-3 sm:px-4 text-center text-pink-300/60 font-medium">
                    <div className="inline-flex items-center gap-1 text-[11px]">
                      <X className="h-3 w-3 text-rose-400 shrink-0" />
                      <span>{row.teleparty}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Banner inside Card */}
        <div className="p-4 sm:p-5 bg-[#1A1A1D]/90 border-t border-pink-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <Shield3D size={24} />
            <div>
              <p className="text-xs font-bold text-pink-100">
                100% Free • Open Universal Streaming • No Installation
              </p>
              <p className="text-[11px] text-pink-300/70">
                Runs directly inside your browser on iOS, Android, macOS, and Windows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (typeof onStartRoom === 'function') onStartRoom();
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-pink py-2.5 px-5 rounded-xl text-xs font-extrabold text-white shadow-lg shadow-pink-500/30 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Create Your Free Room</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
