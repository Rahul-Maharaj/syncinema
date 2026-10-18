'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import FeatureAdsShowcase from '@/components/FeatureAdsShowcase';
import HowItWorksGuide from '@/components/HowItWorksGuide';
import {
  Heart,
  PlusCircle,
  Link2,
  Settings,
  Bell,
  Play,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Film,
  Users,
  Sparkles,
  ArrowRight,
  X,
  KeyRound,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { safeId } from '@/lib/socket';

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

  // Active Tab: 'create' | 'stream' | 'join'
  const [activeTab, setActiveTab] = useState('create');

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
    router.push(`/room/${id}#pass=${encodeURIComponent(p)}&create=1&max=${maxSeats}`);
  };


  // Join Room with Code or Link (Strict password check)
  const handleJoinRoom = (e) => {
    e?.preventDefault?.();
    setJoinError('');
    const c = slug(joinCode);
    if (!c || c.length < 2) {
      setJoinError('Please enter a valid room code or link.');
      return;
    }
    const p = joinPass.trim();
    if (!p || p.length < 4) {
      setJoinError('Room password is required to enter. Please ask the room host for the password.');
      return;
    }

    try {
      sessionStorage.setItem('rp_' + c, p);
      localStorage.setItem('rp_' + c, p);
      localStorage.setItem('lastRoom', c);
    } catch {}

    router.push(`/room/${c}#pass=${encodeURIComponent(p)}`);
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-purple-600 selection:text-white flex flex-col antialiased relative overflow-x-hidden bg-[#050611]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-xs sm:text-sm shadow-2xl shadow-purple-950/70 flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-md">
          <Sparkles className="h-4 w-4 text-pink-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* High-Resolution Couple Cinema Background - Clear & Visible */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700"
        style={{ 
          backgroundImage: `url('/home-bg.jpg')`,
          backgroundPosition: 'center 40%',
        }}
      />

      {/* Luxury Cinematic Vignette Overlay - Keeps Couple & Glowing Infinity Ribbon Visible while text stays 100% readable */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-[#050611] via-black/35 to-black/60 pointer-events-none" />

      {/* Soft Ambient Cinema Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-pink-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Transparent Floating Header (No rectangular box) */}
      <header className="relative z-20 px-4 sm:px-8 py-4 sm:py-5 bg-transparent border-none flex items-center justify-between gap-4">
        {/* Brand */}
        <BrandLogo size="md" href="/" />

        {/* Status Pill & Privacy Security Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>0ms Drift Clock Sync Active</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-bold backdrop-blur-sm shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">Zero Logins</span>
            <span className="hidden sm:inline">•</span>
            <span>100% Protected</span>
          </div>
        </div>
      </header>

      {/* Main Hero & Glass Console (NO Bulky Boxes) */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8">
        {/* Floating Hero Typography - Seamlessly on top of background */}
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-pink-300 text-xs font-bold tracking-wider uppercase backdrop-blur-xl shadow-lg">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
            <span>Virtual Cinema For Two or More</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            Same Movie.{' '}
            <span className="bg-gradient-to-r from-pink-400 via-rose-300 to-purple-300 bg-clip-text text-transparent">
              Different Places.
            </span>
            <br />
            One Screen.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-slate-200/90 font-medium max-w-xl mx-auto leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            Stream YouTube, movies, or video links in sub-second synchronization with real-time video calls. Every room is strictly password protected.
          </p>
        </div>

        {/* Sleek Frosted Glass Cinema Console (No Heavy Opaque Boxes) */}
        <div className="w-full max-w-lg rounded-3xl border border-white/20 bg-black/45 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_20px_70px_rgba(0,0,0,0.75)] space-y-5 text-left">
          {/* Segmented Pill Selector */}
          {/* Segmented Pill Selector */}
          <div className="grid grid-cols-2 rounded-2xl bg-black/50 p-1 border border-white/10 gap-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
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
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white shadow-lg shadow-pink-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Link2 className="h-4 w-4" />
              <span>Join Room</span>
            </button>
          </div>

          {/* TAB 1: CREATE ROOM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-4 animate-in fade-in duration-200">
              {/* Room Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-200">Room Name</label>
                  <button
                    type="button"
                    onClick={getRandomRoomName}
                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Random Name</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(sanitizeInput(e.target.value))}
                  placeholder="e.g. Midnight-Cinema"
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/50 border border-white/15 text-sm text-white placeholder-slate-400 outline-none focus:border-pink-500 transition shadow-inner backdrop-blur-md"
                />
              </div>

              {/* Room Password (Strictly Enforced) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-pink-400" />
                    <span>Room Password (Required)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyPassword(roomPass)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition"
                      title="Copy Password"
                    >
                      {copiedPass ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={generatePasscode}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold transition"
                    >
                      <KeyRound className="h-3 w-3" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={showRoomPass ? 'text' : 'password'}
                    value={roomPass}
                    onChange={(e) => setRoomPass(e.target.value)}
                    placeholder="Enter room password (min 4 characters)"
                    minLength={4}
                    maxLength={64}
                    required
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-black/50 border border-white/15 text-sm text-white placeholder-slate-400 outline-none focus:border-pink-500 transition shadow-inner backdrop-blur-md font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRoomPass(!showRoomPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition"
                    title={showRoomPass ? 'Hide Password' : 'Show Password'}
                  >
                    {showRoomPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-pink-300/90 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-pink-400 shrink-0" />
                  <span>No one can enter this room without this password.</span>
                </p>
              </div>

              {/* Room Capacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-200">Room Seats</span>
                  <span className="font-bold text-pink-400">{maxSeats} Members</span>
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
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-pink-500 shadow-md'
                          : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <p className="text-xs text-rose-300 bg-rose-500/20 border border-rose-500/30 p-2.5 rounded-2xl">
                  {createError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:brightness-110 text-white font-extrabold text-sm shadow-xl shadow-pink-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create &amp; Enter Protected Room 🔒</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}



          {/* TAB 3: JOIN EXISTING ROOM */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinRoom} className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Room Code or Invite Link</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. Velvet-Couch-521 or paste link"
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/50 border border-white/15 text-sm text-white placeholder-slate-400 outline-none focus:border-pink-500 transition shadow-inner backdrop-blur-md"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-pink-400" />
                  <span>Room Password (Required)</span>
                </label>
                <div className="relative">
                  <input
                    type={showJoinPass ? 'text' : 'password'}
                    value={joinPass}
                    onChange={(e) => setJoinPass(e.target.value)}
                    placeholder="Enter password set by the host"
                    minLength={4}
                    maxLength={64}
                    required
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-black/50 border border-white/15 text-sm text-white placeholder-slate-400 outline-none focus:border-pink-500 transition shadow-inner backdrop-blur-md font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPass(!showJoinPass)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white transition"
                  >
                    {showJoinPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-pink-300/90 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-pink-400 shrink-0" />
                  <span>Password is required. No one can enter without it.</span>
                </p>
              </div>

              {joinError && (
                <p className="text-xs text-rose-300 bg-rose-500/20 border border-rose-500/30 p-2.5 rounded-2xl">
                  {joinError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>Unlock &amp; Enter Room</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        {/* Floating Minimalist Feature Pills (No bulky boxes!) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-2 text-xs">
          <div className="px-3.5 py-1.5 rounded-full bg-black/40 border border-white/15 text-pink-300 font-semibold backdrop-blur-xl flex items-center gap-1.5 shadow-lg">
            <Zap className="h-3.5 w-3.5 text-pink-400" />
            <span>0ms Drift Clock Sync</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-black/40 border border-white/15 text-emerald-300 font-semibold backdrop-blur-xl flex items-center gap-1.5 shadow-lg">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>100% Password Protected</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-black/40 border border-white/15 text-purple-300 font-semibold backdrop-blur-xl flex items-center gap-1.5 shadow-lg">
            <Film className="h-3.5 w-3.5 text-purple-400" />
            <span>1080p &amp; 4K HD Playback</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-black/40 border border-white/15 text-cyan-300 font-semibold backdrop-blur-xl flex items-center gap-1.5 shadow-lg">
            <Users className="h-3.5 w-3.5 text-cyan-400" />
            <span>Duo Cam &amp; Voice Chat</span>
          </div>
        </div>
      </main>

      {/* ================= STEP-BY-STEP DETAILED HOW IT WORKS GUIDE ================= */}
      <HowItWorksGuide
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* ================= COMPACT ANIMATED ADS SHOWCASE WITH REAL ROOM SCREENSHOTS ================= */}
      <FeatureAdsShowcase
        onStartRoom={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setActiveTab('create');
        }}
      />

      {/* Sleek Translucent Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-300/80 py-6 max-w-5xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
        <BrandLogo size="sm" href="/" />
        <div className="flex items-center gap-4 text-xs">
          <span className="text-pink-300 font-medium">Different places... Same screen. 💖</span>
        </div>
      </footer>
    </div>
  );
}
