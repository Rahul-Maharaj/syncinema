'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import FeatureAdsShowcase from '@/components/FeatureAdsShowcase';
import CinematicReelSpotlight from '@/components/CinematicReelSpotlight';
import HolographicStreamPortal from '@/components/HolographicStreamPortal';
import AudioVisualizerSuite from '@/components/AudioVisualizerSuite';
import VisualFeatureVisualizer from '@/components/VisualFeatureVisualizer';
import HowItWorksGuide from '@/components/HowItWorksGuide';
import CinemaPlatformMetrics from '@/components/CinemaPlatformMetrics';
import FeatureComparison from '@/components/FeatureComparison';
import CinemaFaq from '@/components/CinemaFaq';
import VisitorCounter from '@/components/VisitorCounter';
import InstallPrompt from '@/components/InstallPrompt';
import { parseHybridInvite } from '@/lib/invite';
import {
  PlusCircle,
  Link2,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  Zap,
  ShieldCheck,
  Film,
  Heart,
  Smartphone,
  Laptop,
  Radio,
  Activity,
  Volume2,
  Camera,
  Layers,
  CheckCircle2,
  ShieldAlert,
  Clock,
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

const slug = (v) => {
  if (!v) return '';
  let str = String(v).trim();
  str = str.split('?')[0].split('#')[0];
  const last = str.split('/').filter(Boolean).pop() || '';
  return last.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};

const sanitizeInput = (str) => {
  if (!str) return '';
  return String(str).replace(/[<>'"`;()]/g, '').trim().slice(0, 80);
};

// Romantic and memorable room name generator
const RANDOM_ROOM_NAMES = [
  'Midnight-Cinema',
  'Starlight-Lounge',
  'Velvet-Couch',
  'Cosy-Date-Night',
  'Neon-Auditorium',
  'Popcorn-Haven',
  'Moonlight-Flix',
  'Cinema-Paradiso',
  'Galaxy-Auditorium',
  'Lovers-Screen',
];

export default function SynCinemaPlatform() {
  const router = useRouter();

  // Active Tab: 'create' | 'join'
  const [activeTab, setActiveTab] = useState('create');

  // Detailed Info Section Tab: 'security' | 'media' | 'intimacy'
  const [infoTab, setInfoTab] = useState('security');

  // Kinetic Rotating Audience Ticker
  const AUDIENCES = [
    'Long-Distance Couples 💕',
    'Late-Night Movie Dates 🍿',
    'Virtual Cinema Watch Parties 🎬',
    'Anime & YouTube Marathons ✨',
    'Best Friends Anywhere 🥂',
  ];
  const [audienceIndex, setAudienceIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAudienceIndex((prev) => (prev + 1) % AUDIENCES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Interactive Telemetry Simulator state
  const [simPlaying, setSimPlaying] = useState(true);
  const [simSeconds, setSimSeconds] = useState(2535.2);
  const [simFrame, setSimFrame] = useState(76056);

  useEffect(() => {
    if (!simPlaying) return;
    const timer = setInterval(() => {
      setSimSeconds((s) => s + 0.1);
      setSimFrame((f) => f + 3);
    }, 100);
    return () => clearInterval(timer);
  }, [simPlaying]);

  const formatSimTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = (totalSec % 60).toFixed(3);
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${pad(hrs)}:${pad(mins)}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  // Create Room State (Strictly Password Protected)
  const [roomName, setRoomName] = useState('');
  const [roomPass, setRoomPass] = useState('');
  const [showRoomPass, setShowRoomPass] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const [maxSeats, setMaxSeats] = useState(2);
  const [createError, setCreateError] = useState('');

  // Join Room State
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [showJoinPass, setShowJoinPass] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Notifications
  const [toastMessage, setToastMessage] = useState('');

  // Initialize storage & auto-generate strong passcodes
  useEffect(() => {
    try {
      generatePasscode();
      if (typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const j = sp.get('join') || sp.get('r') || sp.get('room');
        const p = sp.get('p') || sp.get('pass');
        if (j) {
          setJoinCode(j);
          setActiveTab('join');
        }
        if (p) {
          setJoinPass(p);
        }
      }
    } catch {}
  }, []);

  const notify = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const generatePasscode = () => {
    const chars = '23456789abcdefghjkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomPass(code);
    setShowRoomPass(true);
    setCreateError('');
  };

  const getRandomRoomName = () => {
    const pick = RANDOM_ROOM_NAMES[Math.floor(Math.random() * RANDOM_ROOM_NAMES.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const generated = `${pick}-${num}`;
    setRoomName(generated);
    return generated;
  };

  const copyPassword = (pwd) => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
    notify('Room password copied to clipboard 📋');
  };

  // Launch / Create Room (Strict password enforcement)
  const handleCreateRoom = (e) => {
    e?.preventDefault?.();
    setCreateError('');
    const p = roomPass.trim();
    if (!p || p.length < 4) {
      setCreateError('Room password is required (minimum 4 characters) so no unauthorized person can enter.');
      return;
    }
    let id = roomName.trim();
    if (id) {
      id = slug(id);
      if (id.length < 2 || id.length > 64) {
        setCreateError('Room name must be between 2 and 64 letters, numbers, or dashes.');
        return;
      }
    } else {
      id = getRandomRoomName().toLowerCase();
    }

    try {
      sessionStorage.setItem('rp_' + id, p);
      sessionStorage.setItem('is_create_' + id, '1');
      sessionStorage.setItem('max_users_' + id, String(maxSeats));
      localStorage.setItem('rp_' + id, p);
      localStorage.setItem('lastRoom', id);
    } catch {}

    notify(`🔒 Launching password-protected cinema room "${id}"...`);
    router.push(`/room/${id}`);
  };

  // Join Room with Code or Link (Strict password check)
  const handleJoinRoom = (e) => {
    e?.preventDefault?.();
    setJoinError('');
    let c = slug(joinCode);
    let p = joinPass.trim();

    // Check if user pasted a small dynamic link, short link, or invite URL
    try {
      const raw = joinCode.trim();
      if (raw.includes('/j/')) {
        const parts = raw.split('/j/');
        const code = parts[parts.length - 1].split('?')[0].split('#')[0].trim();
        if (code) {
          router.push(`/j/${encodeURIComponent(code)}`);
          return;
        }
      }
      if (raw.includes('inv=') || raw.includes('#pass=') || raw.includes('?p=') || raw.includes('?pass=') || raw.includes('/room/')) {
        const urlObj = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
        const invTicket = urlObj.searchParams.get('inv');
        const queryPass = urlObj.searchParams.get('p') || urlObj.searchParams.get('pass');
        const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''));
        const hashPass = hashParams.get('pass') || hashParams.get('p');
        const roomSlug = slug(urlObj.pathname.replace(/^\/room\//, ''));
        if (roomSlug) {
          c = roomSlug;
          if (invTicket) {
            const parsed = parseHybridInvite(invTicket, roomSlug);
            if (parsed?.pass && !p) p = parsed.pass;
          }
          if (queryPass && !p) p = queryPass;
          if (hashPass && !p) p = hashPass;
        }
      }
    } catch {}

    if (!c || c.length < 2) {
      setJoinError('Please enter a valid room code or link.');
      return;
    }
    if (!p || p.length < 4) {
      setJoinError('Room password is required to enter. Please ask the room host for the password.');
      return;
    }

    try {
      sessionStorage.setItem('rp_' + c, p);
      localStorage.setItem('rp_' + c, p);
      localStorage.setItem('lastRoom', c);
    } catch {}

    router.push(`/room/${c}`);
  };

  return (
    <div suppressHydrationWarning className="min-h-screen text-pink-100 font-sans selection:bg-pink-500 selection:text-white flex flex-col antialiased relative overflow-x-hidden bg-[#222222]">
      {/* Toast Notification */}
      {toastMessage && (
        <div suppressHydrationWarning className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-[#222222] text-pink-100 font-semibold text-xs sm:text-sm shadow-2xl shadow-black/80 flex items-center gap-2.5 border border-pink-500/50 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-md">
          <SparkleStar3D size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* High-Resolution Couple Cinema Background - Clear & Visible */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700 opacity-65"
        style={{ 
          backgroundImage: `url('/home-bg.jpg')`,
          backgroundPosition: 'center 40%',
        }}
      />

      {/* Cinematic Vignette Overlay in Solid Black Hole HEX #222222 */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-[#222222] via-[#222222]/60 to-[#222222]/35 pointer-events-none" />

      {/* Soft Ambient Romantic Pink Glow & Floating Cinema Bokeh Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-pink-500/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-[480px] h-[300px] bg-pink-600/15 rounded-full blur-[130px] pointer-events-none anim-bokeh" />
      <div className="fixed top-1/2 right-1/4 w-[450px] h-[350px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none anim-bokeh" style={{ animationDelay: '-4s' }} />
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-pink-500/10 rounded-full blur-[150px] pointer-events-none anim-bokeh" style={{ animationDelay: '-2s' }} />

      {/* Transparent Floating Header */}
      <header className="relative z-20 px-4 sm:px-8 py-4 sm:py-5 bg-transparent border-none flex items-center justify-between gap-4">
        {/* Brand */}
        <BrandLogo size="md" href="/" />

        {/* Status Pill & Privacy Security Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <InstallPrompt variant="button" />

          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#222222] border border-pink-500/30 text-pink-200 text-xs font-semibold backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-pink-400 animate-pulse" />
            <span>0ms Drift Clock Sync Active</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#222222] border border-pink-500/30 text-pink-200 text-xs font-bold backdrop-blur-md shadow-sm">
            <Shield3D size={18} />
            <span className="hidden sm:inline">Zero Logins</span>
            <span className="hidden sm:inline">•</span>
            <span>100% Protected</span>
          </div>
        </div>
      </header>

      {/* Main Hero: SIDE-BY-SIDE (Left: Text & High-Security Highlights, Right: Create Room Box) */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT SIDE: Text, 3D Art Badges, Live Sync Telemetry & Informational Deck */}
          <div className="lg:col-span-7 xl:col-span-7 order-1 lg:order-1 space-y-6 text-center lg:text-left">
            {/* Kinetic Animated Audience Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#222222]/90 border border-pink-500/40 text-pink-200 text-xs font-bold tracking-wider uppercase shadow-md backdrop-blur-md">
              <SparkleStar3D size={20} className="anim-float-slow shrink-0" />
              <span>Virtual Cinema For</span>
              <span className="text-pink-300 font-extrabold transition-all duration-300 min-w-[210px] text-left">
                {AUDIENCES[audienceIndex]}
              </span>
            </div>

            {/* Kinetic Shimmer Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-pink-100 tracking-tight leading-[1.1] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              Same Movie.{' '}
              <span className="anim-text-shimmer inline-block">
                Different Places.
              </span>
              <br />
              One Screen.
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-pink-200/90 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              Stream YouTube, movies, or direct links in sub-second synchronization with real-time video calls. Every room is strictly password protected with zero-leak peer-to-peer privacy.
            </p>

            {/* Floating 3D Art Stickers (Hardware-Accelerated, Zero-Lag) */}
            <div className="relative flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1 text-xs">
              <div className="anim-float-slow px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/30 text-pink-100 font-bold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400 transition cursor-default">
                <Popcorn3D size={22} />
                <span>🍿 Crisp 1080p/4K</span>
              </div>
              <div className="anim-heartbeat px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/30 text-pink-100 font-bold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400 transition cursor-default">
                <Heart3D size={22} />
                <span>💖 Duo Webcams</span>
              </div>
              <div className="anim-float-reverse px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/30 text-pink-100 font-bold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400 transition cursor-default">
                <SyncBolt3D size={22} />
                <span>⚡ 0ms Clock Drift</span>
              </div>
              <div className="anim-float-sway px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/30 text-pink-100 font-bold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400 transition cursor-default">
                <Shield3D size={22} />
                <span>🔒 100% P2P Vault</span>
              </div>
              <div className="anim-float-slow px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/30 text-pink-100 font-bold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400 transition cursor-default">
                <Ticket3D size={22} />
                <span>🎟️ Ad-Free Theater</span>
              </div>
            </div>

            {/* MOTION GRAPHICS DUAL-DEVICE SYNC TELEMETRY SIMULATOR (ZERO LAG, GPU-ACCELERATED) */}
            <div className="rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-md p-4 sm:p-5 shadow-[0_15px_40px_rgba(236,72,153,0.18)] space-y-3.5 overflow-hidden relative">
              {/* Simulator Header with Interactive Sync Controls */}
              <div className="flex items-center justify-between border-b border-pink-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${simPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-xs font-black tracking-wider text-pink-100 uppercase flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-pink-400" />
                    <span>Live Lockstep Sync Telemetry</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSimPlaying(!simPlaying)}
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                      simPlaying
                        ? 'bg-pink-500/20 text-pink-200 border-pink-500/40 hover:bg-pink-500/30'
                        : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30'
                    }`}
                    title="Click to test live synchronized play / pause in real-time"
                  >
                    <span>{simPlaying ? '⏸ Pause Sync' : '▶ Play Sync'}</span>
                  </button>

                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30 hidden sm:flex items-center gap-1">
                    <Zap className="h-3 w-3 text-emerald-400" />
                    <span>0.00ms Drift Lock</span>
                  </span>
                </div>
              </div>

              {/* Visual Dual-Device Interactive Stage */}
              <div className="grid grid-cols-11 items-center gap-2 py-1">
                {/* Device 1: Phone (You) */}
                <div className="col-span-5 rounded-2xl bg-[#1A1A1D] border border-pink-500/25 p-3 space-y-2 text-left relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-pink-300 flex items-center gap-1">
                      <Smartphone className="h-3 w-3 text-pink-400" />
                      <span>Phone (London)</span>
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${simPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </div>
                  <div className="h-14 rounded-xl bg-gradient-to-tr from-pink-950/60 to-purple-950/60 border border-pink-500/30 flex items-center justify-between px-3 relative overflow-hidden">
                    <Film className="h-5 w-5 text-pink-400 shrink-0" />
                    <div className="text-right">
                      <p className="text-[11px] font-mono font-bold text-pink-100">{formatSimTime(simSeconds)}</p>
                      <p className="text-[9px] text-pink-300/70 font-semibold">Frame #{simFrame.toLocaleString()}</p>
                    </div>
                    {/* Animated Playhead Track */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-500/20">
                      <div
                        className="h-full bg-pink-500 transition-all duration-100"
                        style={{ width: `${((simSeconds % 60) / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Center Motion Graphics Pulse Wave Laser */}
                <div className="col-span-1 flex flex-col items-center justify-center relative">
                  <div className="h-7 w-px bg-pink-500/30 relative overflow-hidden">
                    <div className="absolute inset-x-0 h-3 bg-pink-400 anim-sync-laser" />
                  </div>
                  <div className={`p-1.5 rounded-full bg-pink-600/30 border border-pink-500/50 shrink-0 ${simPlaying ? 'anim-heartbeat' : ''}`}>
                    <Zap className="h-3.5 w-3.5 text-pink-300" />
                  </div>
                  <div className="h-7 w-px bg-pink-500/30 relative overflow-hidden">
                    <div className="absolute inset-x-0 h-3 bg-pink-400 anim-sync-laser" />
                  </div>
                </div>

                {/* Device 2: Laptop (Partner) */}
                <div className="col-span-5 rounded-2xl bg-[#1A1A1D] border border-pink-500/25 p-3 space-y-2 text-left relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-pink-300 flex items-center gap-1">
                      <Laptop className="h-3 w-3 text-pink-400" />
                      <span>Laptop (New York)</span>
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${simPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </div>
                  <div className="h-14 rounded-xl bg-gradient-to-tr from-pink-950/60 to-purple-950/60 border border-pink-500/30 flex items-center justify-between px-3 relative overflow-hidden">
                    <Film className="h-5 w-5 text-pink-400 shrink-0" />
                    <div className="text-right">
                      <p className="text-[11px] font-mono font-bold text-pink-100">{formatSimTime(simSeconds)}</p>
                      <p className="text-[9px] text-pink-300/70 font-semibold">Frame #{simFrame.toLocaleString()}</p>
                    </div>
                    {/* Animated Playhead Track */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-500/20">
                      <div
                        className="h-full bg-pink-500 transition-all duration-100"
                        style={{ width: `${((simSeconds % 60) / 60) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEREO WEBRTC AUDIO SPECTRUM EQUALIZER GRAPHIC */}
              <div className="rounded-2xl bg-[#1A1A1D]/90 border border-pink-500/20 p-2.5 px-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                  <span className="text-[10px] font-mono font-semibold text-pink-200">
                    Dual Stereo Audio Phase: {simPlaying ? 'Synced 48kHz' : 'Paused (0 Drift)'}
                  </span>
                </div>

                {/* 18-Bar Dynamic Spectrum Graphic */}
                <div className="flex items-end gap-1 h-5 shrink-0">
                  {[45, 80, 60, 95, 30, 75, 100, 50, 85, 40, 90, 70, 65, 95, 45, 80, 55, 35].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        simPlaying ? 'bg-gradient-to-t from-pink-600 to-rose-400 anim-eq-bar' : 'bg-pink-500/30 h-1.5'
                      }`}
                      style={{
                        height: simPlaying ? undefined : '4px',
                        animationDelay: `${(i % 5) * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Real-Time Live Telemetry Metrics */}
              <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono pt-1">
                <div className="p-2 rounded-xl bg-[#1A1A1D]/90 border border-pink-500/15">
                  <span className="text-pink-300/60 block text-[9px]">CLOCK DRIFT</span>
                  <span className="text-emerald-400 font-bold">0.00 ms</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1A1A1D]/90 border border-pink-500/15">
                  <span className="text-pink-300/60 block text-[9px]">AUDIO PHASE</span>
                  <span className="text-pink-200 font-bold">100% Locked</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1A1A1D]/90 border border-pink-500/15">
                  <span className="text-pink-300/60 block text-[9px]">TRANSPORT</span>
                  <span className="text-pink-200 font-bold">WebRTC P2P</span>
                </div>
                <div className="p-2 rounded-xl bg-[#1A1A1D]/90 border border-pink-500/15">
                  <span className="text-pink-300/60 block text-[9px]">AUTO-HEAL</span>
                  <span className="text-emerald-400 font-bold">Active 24/7</span>
                </div>
              </div>
            </div>

            {/* DETAILED INFORMATIONAL DECK WITH 3 INTERACTIVE TABS */}
            <div className="rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_15px_40px_rgba(236,72,153,0.15)] space-y-4 text-left mt-4">
              {/* Tab Selector Header */}
              <div className="grid grid-cols-3 rounded-2xl bg-[#1A1A1D] p-1 border border-pink-500/20 gap-1">
                <button
                  type="button"
                  onClick={() => setInfoTab('security')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    infoTab === 'security'
                      ? 'btn-pink text-white shadow-md shadow-pink-500/30'
                      : 'text-pink-300/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Shield3D size={16} />
                  <span className="truncate">Privacy Vault</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInfoTab('media')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    infoTab === 'media'
                      ? 'btn-pink text-white shadow-md shadow-pink-500/30'
                      : 'text-pink-300/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Ticket3D size={16} />
                  <span className="truncate">Universal Media</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInfoTab('intimacy')}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    infoTab === 'intimacy'
                      ? 'btn-pink text-white shadow-md shadow-pink-500/30'
                      : 'text-pink-300/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Heart3D size={16} />
                  <span className="truncate">Couples Suite</span>
                </button>
              </div>

              {/* TAB 1 CONTENT: High Security & Privacy Vault */}
              {infoTab === 'security' && (
                <div className="space-y-3.5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 border-b border-pink-500/20 pb-3">
                    <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
                      <Shield3D size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-pink-100">
                          High-Security Privacy Guarantee
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/40 font-bold">
                          Zero-Leak
                        </span>
                      </div>
                      <p className="text-xs text-pink-300 font-semibold mt-0.5">
                        🛡️ Only You &amp; Your Invited Partner Can See &amp; Hear You
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-pink-400" />
                        <span>Direct Peer-to-Peer Encryption</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Camera and mic feeds stream point-to-point directly between your browsers via WebRTC DTLS/SRTP. No video or voice data is ever recorded or routed to external media servers.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        <span>Hardware Sensor Killswitch</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        When you switch Camera or Mic off, device hardware media tracks are fully terminated in your browser—the physical green/red indicator LED on your camera shuts off completely.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
                        <span>Zero Logins &amp; Ephemeral Keys</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        No email address, login accounts, or tracking cookies required. Every room is guarded by a bcrypt-hashed passcode known exclusively to you and your invited guest.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-pink-300" />
                        <span>10-Minute Inactivity Auto-Destruct</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Once all members leave or if the room remains idle for 10 minutes, the room code, chat memory, and sync session automatically self-destruct from active memory.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2 CONTENT: Universal Media Engine */}
              {infoTab === 'media' && (
                <div className="space-y-3.5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 border-b border-pink-500/20 pb-3">
                    <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
                      <Ticket3D size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-pink-100">
                          Universal Media Streaming Engine
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/40 font-bold">
                          Any Format
                        </span>
                      </div>
                      <p className="text-xs text-pink-300 font-semibold mt-0.5">
                        🎥 Stream YouTube, HLS, Direct MP4s, or Local Files with Zero Buffering
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Film className="h-3.5 w-3.5 text-pink-400" />
                        <span>YouTube Clean Playback</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Paste any YouTube video or livestream URL. SynCinema synchronizes playback states down to the exact frame across all phones, tablets, and PCs.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-rose-400" />
                        <span>Direct MP4 &amp; HLS (.m3u8)</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Paste direct video links or live IPTV streams. The integrated adaptive bitrate engine dynamically adjusts quality to eliminate buffering pauses.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Laptop className="h-3.5 w-3.5 text-fuchsia-400" />
                        <span>P2P Local File Player (0MB Upload)</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Pick any video stored on your hard drive. It streams peer-to-peer to your partner through encrypted browser data channels without uploading to any server.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-pink-300" />
                        <span>Auto-Healing Video Watchdog</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        If a network blip or browser decoder hiccup pauses the video, our background watchdog auto-restores playback in under 2 seconds without refreshing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3 CONTENT: Couples Intimacy Suite */}
              {infoTab === 'intimacy' && (
                <div className="space-y-3.5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 border-b border-pink-500/20 pb-3">
                    <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
                      <Heart3D size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-sm sm:text-base text-pink-100">
                          Couples Intimacy &amp; Ambiance Suite
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/40 font-bold">
                          Duo Vibes
                        </span>
                      </div>
                      <p className="text-xs text-pink-300 font-semibold mt-0.5">
                        💑 Feel Like You're Sitting On The Same Couch Even Miles Apart
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-pink-400" />
                        <span>Touch Hugs &amp; Screen Pulses</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Tap &ldquo;Send Hug&rdquo; to pulse your partner's cinema screen with warm romantic vibrations, glowing rose lighting, and floating heart physics.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-rose-400" />
                        <span>Live Polaroid Keepsakes</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Capture authentic vintage date polaroids blending the movie scene and your video call selfies into a downloadable high-resolution photo keepsake.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Volume2 className="h-3.5 w-3.5 text-fuchsia-400" />
                        <span>Rain &amp; Fireplace Soundscapes</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Layer cozy background ambiance behind the movie audio: soft rain on window glass, crackling warm fireplace, lofi vinyl hiss, and cosmic drones.
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                      <div className="font-bold text-pink-100 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-pink-300" />
                        <span>Cozy Sleep Timer</span>
                      </div>
                      <p className="text-[11px] text-pink-200/80 leading-relaxed">
                        Watching in bed? Set a 30m, 60m, or 90m sleep timer. SynCinema gently fades out volume and pauses the movie when you both drift off to sleep.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Create Room / Join Room Console Box (Clean Solid #222222, ZERO ANIMATIONS) */}
          <div className="lg:col-span-5 xl:col-span-5 order-2 lg:order-2 w-full max-w-lg mx-auto lg:mx-0">
            <div className="w-full rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-md p-5 sm:p-7 shadow-[0_20px_60px_rgba(236,72,153,0.15)] space-y-5 text-left">
              {/* Segmented Pill Selector (skiper.ui style) */}
              <div className="grid grid-cols-2 rounded-2xl bg-[#1A1A1D] p-1.5 border border-pink-500/20 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    activeTab === 'create'
                      ? 'btn-pink text-white shadow-lg shadow-pink-500/30'
                      : 'text-pink-300/70 hover:text-pink-100 hover:bg-white/5'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Create Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                    activeTab === 'join'
                      ? 'btn-pink text-white shadow-lg shadow-pink-500/30'
                      : 'text-pink-300/70 hover:text-pink-100 hover:bg-white/5'
                  }`}
                >
                  <Link2 className="h-4 w-4" />
                  <span>Join Room</span>
                </button>
              </div>

              {/* TAB 1: CREATE ROOM */}
              {activeTab === 'create' && (
                <form onSubmit={handleCreateRoom} className="space-y-4">
                  {/* Room Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-pink-200">Room Name</label>
                      <button
                        type="button"
                        onClick={getRandomRoomName}
                        className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold transition cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Random Name</span>
                      </button>
                    </div>
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(sanitizeInput(e.target.value))}
                      placeholder="e.g. Midnight-Cinema"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#1A1A1D] border border-pink-500/25 text-sm text-pink-100 placeholder-pink-300/40 outline-none focus:border-pink-500 transition shadow-inner font-sans"
                    />
                  </div>

                  {/* Room Password (Strictly Enforced) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-pink-200 flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-pink-400" />
                        <span>Room Password (Required)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyPassword(roomPass)}
                          className="text-pink-300/70 hover:text-pink-100 flex items-center gap-1 font-semibold transition cursor-pointer"
                          title="Copy Password"
                        >
                          {copiedPass ? <Check className="h-3 w-3 text-pink-400" /> : <Copy className="h-3 w-3" />}
                          <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={generatePasscode}
                          className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold transition cursor-pointer"
                        >
                          <KeyRound className="h-3 w-3" />
                          <span>Auto-Generate</span>
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        suppressHydrationWarning
                        type={showRoomPass ? 'text' : 'password'}
                        value={roomPass}
                        onChange={(e) => setRoomPass(e.target.value)}
                        placeholder="Enter room password (min 4 characters)"
                        minLength={4}
                        maxLength={64}
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-form-type="other"
                        required
                        className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-[#1A1A1D] border border-pink-500/25 text-sm text-pink-100 placeholder-pink-300/40 outline-none focus:border-pink-500 transition shadow-inner font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRoomPass(!showRoomPass)}
                        className="absolute right-3.5 top-3 text-pink-300/60 hover:text-pink-100 transition"
                        title={showRoomPass ? 'Hide Password' : 'Show Password'}
                      >
                        {showRoomPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-[11px] text-pink-300/80 flex items-center gap-1.5">
                      <Shield3D size={14} />
                      <span>No one can enter this room without this password.</span>
                    </div>
                  </div>

                  {/* Room Capacity */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-pink-200">Room Seats</span>
                      <span className="font-bold text-pink-300">{maxSeats} Members</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[
                        { s: 2, label: '2 Duo' },
                        { s: 4, label: '4 Friends' },
                        { s: 8, label: '8 Party' },
                        { s: 16, label: '16 Squad' },
                        { s: 30, label: '30 Mega' },
                      ].map((item) => (
                        <button
                          key={item.s}
                          type="button"
                          onClick={() => setMaxSeats(item.s)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer flex flex-col items-center justify-center ${
                            maxSeats === item.s
                              ? 'btn-pink text-white border-pink-400 shadow-md'
                              : 'bg-[#1A1A1D] border-pink-500/20 text-pink-200/70 hover:text-pink-100 hover:border-pink-400/50'
                          }`}
                        >
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {createError && (
                    <p className="text-xs text-pink-200 bg-pink-500/20 border border-pink-500/40 p-2.5 rounded-2xl font-medium">
                      {createError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="btn-pink w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-pink-500/30"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Create &amp; Enter Protected Room 🔒</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}

              {/* TAB 2: JOIN EXISTING ROOM */}
              {activeTab === 'join' && (
                <form onSubmit={handleJoinRoom} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-pink-200">Room Code or Invite Link</label>
                    <input
                      suppressHydrationWarning
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="e.g. Velvet-Couch-521 or paste link"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#1A1A1D] border border-pink-500/25 text-sm text-pink-100 placeholder-pink-300/40 outline-none focus:border-pink-500 transition shadow-inner font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-pink-200 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-pink-400" />
                      <span>Room Password (Required)</span>
                    </label>
                    <div className="relative">
                      <input
                        suppressHydrationWarning
                        type={showJoinPass ? 'text' : 'password'}
                        value={joinPass}
                        onChange={(e) => setJoinPass(e.target.value)}
                        placeholder="Enter password set by the host"
                        minLength={4}
                        maxLength={64}
                        autoComplete="current-password"
                        data-lpignore="true"
                        data-form-type="other"
                        required
                        className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-[#1A1A1D] border border-pink-500/25 text-sm text-pink-100 placeholder-pink-300/40 outline-none focus:border-pink-500 transition shadow-inner font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowJoinPass(!showJoinPass)}
                        className="absolute right-3.5 top-3 text-pink-300/70 hover:text-pink-100 transition"
                      >
                        {showJoinPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-[11px] text-pink-200/80 flex items-center gap-1.5">
                      <Shield3D size={14} />
                      <span>Password is required. No one can enter without it.</span>
                    </div>
                  </div>

                  {joinError && (
                    <p className="text-xs text-pink-200 bg-pink-500/20 border border-pink-500/40 p-2.5 rounded-2xl font-medium">
                      {joinError}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="btn-pink w-full py-3.5 rounded-2xl text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-pink-500/30"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Unlock &amp; Enter Room</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* LIVE SAAS PLATFORM METRICS & CRYPTOGRAPHIC TRUST RIBBON */}
      <CinemaPlatformMetrics />

      {/* SPOTLIGHT AD 1: QUANTUM SYNC ARC (4K VERTICAL REEL: ads.mp4) */}
      <CinematicReelSpotlight
        reelId="reel_sync_arc"
        src="/ads.mp4"
        badge="0.00ms Satellite Sync"
        badgeColor="bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
        headline="Quantum Sync Arc: Long Distance Lovers Connected"
        title="Dual Horizon P2P Playback"
        tagline="Zero latency across continents"
        description="Watch how SynCinema's quantum sync arc connects partners thousands of miles apart. In this real session, a young man on his sofa and his partner in bed watch the same 4K movie frame with continuous microsecond drift calibration and zero buffering delay."
        bullets={[
          'Real-Time Laser Clock Lock',
          '0.00ms Audio/Video Drift',
          'Automatic Jitter Compensation',
          'Private Encrypted P2P Bridge',
        ]}
        specs={['FPS: 60 LOCKED', 'SYNC DRIFT: 0.00ms', 'NETWORK: P2P DIRECT', 'CODEC: AV1 / H.264']}
        icon={SyncBolt3D}
        layout="left"
        glowColor="rgba(16,185,129,0.18)"
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* INTERACTIVE VISUAL ARCHITECTURE & LIVE FEATURE VISUALIZER */}
      <VisualFeatureVisualizer
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* STEP-BY-STEP DETAILED HOW IT WORKS GUIDE */}
      <HowItWorksGuide
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* SPOTLIGHT AD 2: SYNCINEMA PLATFORM TOUR & PRIVACY VAULT (4K VERTICAL REEL: ads(2).mp4) */}
      <CinematicReelSpotlight
        reelId="reel_platform_tour"
        src="/ads(2).mp4"
        badge="Zero-Log Privacy Vault"
        badgeColor="bg-pink-500/20 text-pink-100 border-pink-500/40"
        headline="SynCinema Platform Tour: The Zero-Log Cinema Vault"
        title="Sleek High-End Cinema UI"
        tagline="Full privacy & effortless media control"
        description="A detailed walkthrough of the SynCinema dashboard on a luxury workstation setup. Experience instant room spinning, real-time media queue management, custom theme switching, and client-side end-to-end encrypted rooms where nothing is stored on cloud servers."
        bullets={[
          'No Sign-Up or Accounts Required',
          '1-Click Custom Instant Rooms',
          'Zero Tracking or Log Storage',
          'Browser-Native Hardware Acceleration',
        ]}
        specs={['CIPHER: AES-GCM-256', 'STORAGE: ZERO-LOG RAM', 'LATENCY: < 15ms', 'RESOLUTION: UP TO 4K']}
        icon={Shield3D}
        layout="right"
        glowColor="rgba(236,72,153,0.22)"
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* COMPACT BENTO ADS SHOWCASE WITH REAL 3D ICONS */}
      <FeatureAdsShowcase
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* DYNAMIC HOLOGRAPHIC STREAM PORTAL & AUDIO SPECTRUM VISUALIZER */}
      <HolographicStreamPortal
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* SPOTLIGHT AD 3: LIVE DUO WEBCAMS & MOVIE DATE (4K VERTICAL REEL: ads(3).mp4) */}
      <CinematicReelSpotlight
        reelId="reel_video_call_date"
        src="/ads(3).mp4"
        badge="1080p Duo Webcams"
        badgeColor="bg-rose-500/20 text-rose-100 border-rose-500/40"
        headline="Live Duo Webcams & Romantic Movie Date Night"
        title="Side-by-Side Intimate Presence"
        tagline="Feel like you're on the same couch"
        description="Experience intimate date nights with high-definition side-by-side duo webcams. As the movie unfolds, share every laugh, gasp, and smile under cozy ambient lighting with live audio ducking that automatically softens film audio when you speak to each other."
        bullets={[
          'Adaptive Smart Audio Ducking',
          'Flicker-Free 1080p Webcams',
          'Floating Heart Reactions & Soundboard',
          'Zero Screen-Share Choppiness',
        ]}
        specs={['AUDIO DUCKING: 60% SMART', 'VIDEO CALL: 1080p 60fps', 'ECHO CANCEL: DUAL FILTER', 'PRIVACY: P2P WEBRTC']}
        icon={DuoCam3D}
        layout="left"
        glowColor="rgba(244,114,182,0.2)"
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* MULTI-MODE ACOUSTIC RADAR & FREQUENCY VISUALIZER SUITE */}
      <AudioVisualizerSuite
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* INTERACTIVE COMPARISON MATRIX (SynCinema vs Old Platforms) */}
      <FeatureComparison
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* FREQUENTLY ASKED QUESTIONS ACCORDION */}
      <CinemaFaq />

      {/* REAL LIVE VISITORS & COMMUNITY ACTIVITY COUNTER */}
      <VisitorCounter />

      {/* Mobile & Tablet App Install Banner */}
      <InstallPrompt variant="banner" />

      {/* Sleek Translucent Footer in Romantic Pink Palette */}
      <footer className="relative z-10 text-center text-xs text-pink-200/80 py-6 max-w-5xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-pink-500/20">
        <BrandLogo size="sm" href="/" />
        <div className="flex items-center gap-2 text-xs">
          <Heart3D size={18} />
          <span className="text-pink-100 font-medium">Different places... Same screen.</span>
        </div>
      </footer>
    </div>
  );
}
