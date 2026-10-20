'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles, Shield, Laptop, Film, Zap, Heart } from 'lucide-react';
import { SparkleStar3D, Shield3D } from '@/components/Icons3D';

const FAQ_ITEMS = [
  {
    q: 'Do my partner and I need to install any app, account, or browser extension?',
    a: 'No! SynCinema runs 100% inside any standard browser (Safari, Chrome, Edge, Firefox, Brave). You don’t need to download any extension, sign up with an email, or install heavy software. Just create a room, send the link to your partner, and enjoy the movie.',
    tag: 'Instant Setup',
  },
  {
    q: 'Can we watch our own downloaded movie files without uploading them?',
    a: 'Yes! Use the P2P Local File Player. Choose any video file stored on your laptop or phone. SynCinema streams the video data directly peer-to-peer to your partner through encrypted browser channels. Zero bytes are uploaded to any external server, guaranteeing instant playback and absolute privacy.',
    tag: '0MB Cloud Upload',
  },
  {
    q: 'How does the 0ms lockstep synchronization work?',
    a: 'Traditional screen shares suffer from audio compression lag and 2-5 second visual delays. SynCinema uses server-synchronized microsecond timestamps combined with adaptive playback rate steering. If your partner’s WiFi hiccups, their player micro-adjusts speed by 2% to seamlessly lock back onto your exact video frame without buffering or pausing.',
    tag: '0ms Drift Engine',
  },
  {
    q: 'Can anyone else enter our room or listen to our video call?',
    a: 'Never. Every room is guarded by a mandatory password set by you. Uninvited guests or bots cannot enter. Furthermore, camera and microphone streams connect directly browser-to-browser via WebRTC DTLS/SRTP encryption—no voice or camera pixels ever pass through or get saved on our servers.',
    tag: '100% P2P Confidential',
  },
  {
    q: 'Does it work cross-platform between different devices?',
    a: 'Absolutely. You can watch on a Windows laptop or Mac while your partner watches on an iPhone, iPad, or Android phone. The responsive cinema UI and WebRTC calling engine adapt fluidly to every screen size.',
    tag: 'iOS, Android & PC',
  },
  {
    q: 'What happens if a video freezes or the link has an issue?',
    a: 'SynCinema features an integrated Auto-Healing Watchdog. If a stream stalls or encounters a playback error, the watchdog automatically refreshes the media source or switches to an optimized proxy mirror in under 2 seconds, preserving your current timeline position so your movie date is uninterrupted.',
    tag: 'Auto-Healing Watchdog',
  },
];

export default function CinemaFaq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2.5 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-100 text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md shadow-md">
          <SparkleStar3D size={18} />
          <span>Frequently Asked Questions</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-pink-100 tracking-tight">
          Everything You Need to Know
        </h3>
        <p className="text-xs sm:text-sm text-pink-200/80 font-medium">
          Straightforward answers about our sync technology, video calls, and zero-leak privacy.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isOpen
                  ? 'border-pink-500/50 bg-[#222222] shadow-[0_10px_30px_rgba(236,72,153,0.12)]'
                  : 'border-pink-500/20 bg-[#222222]/80 hover:border-pink-500/35 hover:bg-[#222222]'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 transition-colors ${
                      isOpen ? 'bg-pink-400' : 'bg-pink-500/30'
                    }`}
                  />
                  <span className="font-extrabold text-sm sm:text-base text-pink-100">
                    {item.q}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-200 border border-pink-500/25 hidden sm:inline">
                    {item.tag}
                  </span>
                  <div
                    className={`p-1.5 rounded-xl bg-pink-500/10 text-pink-300 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-pink-500/25 text-pink-100' : ''
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-pink-200/85 font-medium leading-relaxed border-t border-pink-500/15 animate-in fade-in duration-200">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
