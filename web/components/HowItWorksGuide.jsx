'use client';

import { useState } from 'react';
import {
  Lock,
  Film,
  Zap,
  Heart,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Video,
  Radio,
  Share2,
  Users,
  CheckCircle,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Tv,
  Layers,
  Volume2
} from 'lucide-react';

const STEPS = [
  {
    id: 'room',
    stepNumber: '01',
    title: 'Create Room & Set Passcode',
    subtitle: '100% Private, Zero Sign-Up Required',
    badge: 'Security Vault',
    image: '/ad-privacy-vault.jpg',
    description:
      'Start by creating your private cinema auditorium. SynCinema is built on zero-knowledge architecture—no accounts, no emails, and no passwords stored in plaintext.',
    keyPoints: [
      {
        title: 'Custom or Random Room Name',
        desc: 'Pick a romantic name like "Velvet-Couch" or tap the magic sparkle button to auto-generate a memorable auditorium title.',
      },
      {
        title: 'Mandatory 6-Character Passcode',
        desc: 'Every room is protected with a mandatory passcode. Uninvited guests or strangers can NEVER enter without this key.',
      },
      {
        title: 'Custom Seat Capacity',
        desc: 'Choose your room size: 2 seats for intimate couple date nights, 4 seats for double dates, or expand up to 30 seats for squad parties.',
      },
      {
        title: '1-Click Magic Invite Link',
        desc: 'Hit "Copy Invite Link" to generate a shareable link that embeds the room passcode so your partner joins in one simple tap.',
      },
    ],
    proTip: 'As the host, you can update your room passcode or member capacity at any time from inside the room settings modal.',
  },
  {
    id: 'media',
    stepNumber: '02',
    title: 'Universal Media & Local Streaming',
    subtitle: 'YouTube, Direct MP4s, HLS & Local Laptop Files',
    badge: 'Universal Engine',
    image: '/ad-universal-media.jpg',
    description:
      'Play virtually any video format on the web or from your personal computer with crisp high-definition 1080p and 4K playback support.',
    keyPoints: [
      {
        title: 'YouTube & Live Streams',
        desc: 'Paste any standard YouTube video URL, music clip, or 24/7 livestream. SynCinema auto-extracts video details and loads the synchronized player.',
      },
      {
        title: 'Direct Video Links (MP4 / WebM / HLS)',
        desc: 'Stream directly from any CDN, cloud drive, or direct URL. Full support for adaptive bitrate HLS (m3u8) streams.',
      },
      {
        title: 'P2P Local File Playback',
        desc: 'Want to watch a downloaded movie? Select any video file from your laptop or phone. SynCinema streams it peer-to-peer to your partner without uploading to any server.',
      },
      {
        title: 'Queue & Continuous Playlist',
        desc: 'Queue up your favorite movie trailers, anime episodes, or music videos. The room automatically transitions to the next item when one finishes.',
      },
    ],
    proTip: 'Local file playback requires zero cloud storage. Your file streams directly device-to-device through encrypted WebRTC data channels.',
  },
  {
    id: 'sync',
    stepNumber: '03',
    title: '0ms Lockstep Sync Engine',
    subtitle: 'Microsecond Clock Alignment Across All Devices',
    badge: 'Zero Drift',
    image: '/ad-sync-engine.jpg',
    description:
      'Never count "3, 2, 1, play" over the phone again. SynCinema\'s proprietary lockstep engine keeps video timelines synchronized down to the exact millisecond.',
    keyPoints: [
      {
        title: 'Instant Play, Pause & Seek',
        desc: 'When anyone taps play, pause, or scrubs the seekbar, all participants\' screens mirror the exact frame instantaneously.',
      },
      {
        title: 'Smart Drift Compensation',
        desc: 'If someone experiences a temporary WiFi dip, the sync engine smoothly nudges their playback speed to snap back into lockstep without jarring stutters.',
      },
      {
        title: 'Host Control Lock',
        desc: 'Want uninterrupted viewing? The host can lock room playback controls with 1 click so guests cannot accidentally pause or skip ahead.',
      },
      {
        title: 'Cross-Device State Handoff',
        desc: 'Seamlessly switch from your phone to your smart TV or laptop while preserving your exact playback timestamp and room queue.',
      },
    ],
    proTip: 'Watch for the green sync badge on the playback toolbar. It continuously checks synchronization status and network jitter.',
  },
  {
    id: 'intimacy',
    stepNumber: '04',
    title: 'Duo Cam, Voice & Luxury Ambiance',
    subtitle: 'See Each Other\'s Smiles & Set the Mood',
    badge: 'Couples & Squads',
    image: '/ad-duo-cinema.jpg',
    description:
      'Experience true cinema intimacy. Watch side-by-side with your partner, hear crystal-clear reactions, and customize ambient auditorium lighting.',
    keyPoints: [
      {
        title: 'Draggable & Floating Duo Cam',
        desc: 'Place your partner\'s video feed anywhere on screen, stack vertically, or switch to dedicated "Date Night Duo Mode" next to the cinema screen.',
      },
      {
        title: 'Voice Activity Detection (VAD)',
        desc: 'High-fidelity Opus voice chat with intelligent noise suppression and speaking glow indicators so you know who is talking.',
      },
      {
        title: '6 Room Ambiance Themes',
        desc: 'Transform the auditorium vibe with one tap: Midnight Velvet, Rose Gold, Cyberpunk Neon, Emerald Cinema, Celestial Aurora, or Obsidian Black.',
      },
      {
        title: 'Relaxing Lo-Fi Soundscapes',
        desc: 'Blend ambient rain, penthouse night showers, crackling fireplace warmth, or gentle ocean waves into the background while you watch.',
      },
    ],
    proTip: 'When you turn your camera or microphone off, SynCinema physically powers down your device sensor so your camera light completely turns off.',
  },
];

const FAQS = [
  {
    q: 'Do my partner and I need an account or credit card?',
    a: 'No! SynCinema is 100% free, anonymous, and requires zero registration. Just pick a room name, create a passcode, and share the link.',
  },
  {
    q: 'Can we watch on mobile phones (iPhone or Android)?',
    a: 'Absolutely! SynCinema is fully optimized for iOS Safari and Android Chrome. Video calls collapse into sleek, non-intrusive mini-pills so you can chat and watch without screen clutter.',
  },
  {
    q: 'How do I play movies saved on my computer?',
    a: 'In the room media bar, select "Local File". Choose your video (.mp4, .webm, .mkv) and SynCinema will stream it directly peer-to-peer to your partner without uploading to any third-party server.',
  },
  {
    q: 'Are our video calls and rooms secure and private?',
    a: 'Yes. Video and voice streams travel directly between peers using end-to-end encrypted WebRTC. Rooms are protected by mandatory passcodes, and uninvited guests are strictly blocked.',
  },
];

export default function HowItWorksGuide({ onStartRoom }) {
  const [activeStep, setActiveStep] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  const cur = STEPS[activeStep];

  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-4 py-12 sm:py-16 text-slate-100">
      {/* Section Header */}
      <div className="text-center space-y-3 mb-10 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF6D1F]/15 border border-[#FF6D1F]/30 text-[#FAF3E1] text-xs font-bold tracking-wide uppercase shadow-lg shadow-[#FF6D1F]/10">
          <Sparkles className="h-3.5 w-3.5 text-[#FF6D1F]" />
          <span>Detailed Guide &bull; How It Works</span>
        </div>
        <h2 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#FAF3E1] tracking-tight drop-shadow-md">
          How <span className="bg-gradient-to-r from-[#FF6D1F] via-[#FF8E42] to-[#FAF3E1] bg-clip-text text-transparent">SynCinema</span> Works
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-[#F5E7C6]/80 max-w-2xl mx-auto font-medium">
          Step-by-step master guide to creating rooms, streaming movies, 0ms lockstep synchronization, duo video calls, and romantic cinema ambiance.
        </p>
      </div>

      {/* Step Selector Tab Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-8">
        {STEPS.map((st, idx) => {
          const isActive = activeStep === idx;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between gap-2 ${
                isActive
                  ? 'bg-gradient-to-br from-[#222222] via-[#2A1C16] to-[#161619] border-[#FF6D1F]/60 shadow-xl shadow-[#FF6D1F]/20 ring-1 ring-[#FF6D1F]/40'
                  : 'bg-[#161619]/60 border-white/10 hover:border-white/20 hover:bg-white/5 text-[#F5E7C6]/60 hover:text-[#FAF3E1]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[11px] font-mono font-bold ${isActive ? 'text-[#FF6D1F]' : 'text-slate-500'}`}>
                  STEP {st.stepNumber}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${
                  isActive ? 'bg-[#FF6D1F]/20 text-[#FAF3E1] border-[#FF6D1F]/40' : 'bg-white/5 text-[#F5E7C6]/60 border-white/10'
                }`}>
                  {st.badge}
                </span>
              </div>
              <h3 className={`text-xs sm:text-sm font-bold line-clamp-1 ${isActive ? 'text-[#FAF3E1]' : 'text-[#F5E7C6]/80'}`}>
                {st.title}
              </h3>
            </button>
          );
        })}
      </div>

      {/* Active Step Showcase Card */}
      <div className="border-beam-card rounded-3xl border border-white/10 bg-[#161619]/90 p-5 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/80 transition-all duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Left Visual Column */}
          <div className="lg:col-span-5 relative group">
            <div className="relative aspect-video sm:aspect-square lg:aspect-video rounded-2xl overflow-hidden border border-white/15 shadow-2xl">
              <img
                src={cur.image}
                alt={cur.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

              {/* Step Badge Over Image */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-black/80 border border-white/20 text-[10px] font-bold text-[#FAF3E1] backdrop-blur-md">
                  Step {cur.stepNumber} of 04
                </span>
              </div>

              {/* Bottom Image Overlay */}
              <div className="absolute bottom-3 left-3 right-3 text-left">
                <span className="text-[10px] font-bold text-[#FF6D1F] uppercase tracking-widest block mb-0.5">
                  {cur.badge}
                </span>
                <h4 className="text-sm sm:text-base font-extrabold text-[#FAF3E1] drop-shadow-md">
                  {cur.subtitle}
                </h4>
              </div>
            </div>
          </div>

          {/* Right Information Column */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-[#FF6D1F]">Step {cur.stepNumber}</span>
                <span className="h-1 w-1 rounded-full bg-slate-500" />
                <span className="text-xs text-[#F5E7C6] font-semibold">{cur.badge}</span>
              </div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#FAF3E1] tracking-tight">
                {cur.title}
              </h3>
              <p className="text-xs sm:text-sm text-[#F5E7C6]/80 mt-2 leading-relaxed">
                {cur.description}
              </p>
            </div>

            {/* Key Features List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-2">
              {cur.keyPoints.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#0D0D10]/60 border border-white/10 hover:border-[#FF6D1F]/40 hover:bg-[#0D0D10]/80 transition"
                >
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-[#FF6D1F] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#FAF3E1] mb-0.5">{pt.title}</h4>
                      <p className="text-[11px] text-[#F5E7C6]/80 leading-snug">{pt.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pro Tip Callout */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#222222] via-[#241B17] to-[#1C1C1F] border border-[#FF6D1F]/30 text-xs flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-[#FF6D1F] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#FF6D1F]">Pro Tip: </span>
                <span className="text-[#FAF3E1]">{cur.proTip}</span>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  activeStep === 0
                    ? 'opacity-40 cursor-not-allowed border-white/5 text-slate-500'
                    : 'border-white/15 text-[#F5E7C6]/80 hover:text-white hover:bg-white/10 cursor-pointer'
                }`}
              >
                &larr; Previous Step
              </button>

              {activeStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
                  className="btn-tangerine px-5 py-2.5 rounded-xl text-xs font-bold text-[#FAF3E1] shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Next: {STEPS[activeStep + 1].title.split(' ')[0]}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartRoom}
                  className="btn-tangerine px-5 py-2.5 rounded-xl text-xs font-extrabold text-[#FAF3E1] shadow-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Create Your Room Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <div className="mt-12 sm:mt-16 space-y-4 max-w-4xl mx-auto text-left">
        <div className="text-center space-y-1 mb-6">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white flex items-center justify-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#FF8E42]" />
            <span>Frequently Asked Questions</span>
          </h3>
          <p className="text-xs text-slate-400">Everything you need to know about watching together</p>
        </div>

        <div className="space-y-2.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-white hover:text-[#FAF3E1] transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-[#FF8E42] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-2 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Start Room CTA Banner */}
      <div className="mt-10 sm:mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#222222] via-[#241B17] to-[#161619] border border-[#FF6D1F]/40 backdrop-blur-xl text-center space-y-3 shadow-2xl">
        <h3 className="text-lg sm:text-2xl font-extrabold text-[#FAF3E1]">
          Ready for your synchronized cinema night?
        </h3>
        <p className="text-xs sm:text-sm text-[#F5E7C6]/85 max-w-lg mx-auto">
          Create your private room in 5 seconds. Password protected, 0ms latency sync, and completely free.
        </p>
        <button
          type="button"
          onClick={onStartRoom}
          className="btn-tangerine inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-[#FAF3E1] font-extrabold text-sm shadow-xl active:scale-95 transition cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Launch Free Room Now</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
