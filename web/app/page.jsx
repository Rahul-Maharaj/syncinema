'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import FeatureAdsShowcase from '@/components/FeatureAdsShowcase';
import HowItWorksGuide from '@/components/HowItWorksGuide';
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
    router.push(`/room/${id}`);
  };

  // Join Room with Code or Link (Strict password check)
  const handleJoinRoom = (e) => {
    e?.preventDefault?.();
    setJoinError('');
    let c = slug(joinCode);
    let p = joinPass.trim();

    // Check if user pasted a hybrid invite link (?inv=...)
    try {
      const raw = joinCode.trim();
      if (raw.includes('inv=')) {
        const urlObj = new URL(raw.startsWith('http') ? raw : 'https://' + raw);
        const invTicket = urlObj.searchParams.get('inv');
        const roomSlug = slug(urlObj.pathname);
        if (invTicket && roomSlug) {
          c = roomSlug;
          const parsed = parseHybridInvite(invTicket, roomSlug);
          if (parsed?.pass && !p) {
            p = parsed.pass;
          }
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
    <div className="min-h-screen text-[#FAF3E1] font-sans selection:bg-[#FF6D1F] selection:text-white flex flex-col antialiased relative overflow-x-hidden bg-[#0D0D10]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#222222] via-[#2A1C16] to-[#1C1C1F] text-[#FAF3E1] font-semibold text-xs sm:text-sm shadow-2xl shadow-black/80 flex items-center gap-2.5 border border-[#FF6D1F]/50 animate-in fade-in slide-in-from-top-4 duration-200 backdrop-blur-md">
          <SparkleStar3D size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* High-Resolution Couple Cinema Background - Clear & Visible */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700 opacity-35"
        style={{ 
          backgroundImage: `url('/home-bg.jpg')`,
          backgroundPosition: 'center 40%',
        }}
      />

      {/* Cinematic Vignette Overlay in Black Hole (#0D0D10 & #222222) */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-[#0D0D10] via-[#0D0D10]/80 to-[#222222]/60 pointer-events-none" />

      {/* Soft Ambient Electric Tangerine Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[380px] bg-[#FF6D1F]/15 rounded-full blur-[150px] pointer-events-none" />

      {/* Transparent Floating Header */}
      <header className="relative z-20 px-4 sm:px-8 py-4 sm:py-5 bg-transparent border-none flex items-center justify-between gap-4">
        {/* Brand */}
        <BrandLogo size="md" href="/" />

        {/* Status Pill & Privacy Security Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <InstallPrompt variant="button" />

          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#222222]/80 border border-[#FF6D1F]/30 text-[#FAF3E1] text-xs font-semibold backdrop-blur-md shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#FF6D1F] animate-pulse" />
            <span>0ms Drift Clock Sync Active</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#222222]/80 border border-[#FAF3E1]/20 text-[#FAF3E1] text-xs font-bold backdrop-blur-md shadow-sm">
            <Shield3D size={18} />
            <span className="hidden sm:inline">Zero Logins</span>
            <span className="hidden sm:inline">•</span>
            <span>100% Protected</span>
          </div>
        </div>
      </header>

      {/* Main Hero & Border-Beam Console (Magic UI / Aceternity UI / skiper.ui inspired) */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center text-center space-y-6 sm:space-y-8">
        {/* Floating Hero Typography */}
        <div className="space-y-3.5 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#222222]/85 border border-[#FF6D1F]/40 text-[#FAF3E1] text-xs font-bold tracking-wider uppercase backdrop-blur-xl shadow-lg">
            <SparkleStar3D size={18} />
            <span>Virtual Cinema For Two or More</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#FAF3E1] tracking-tight leading-[1.1] drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
            Same Movie.{' '}
            <span className="bg-gradient-to-r from-[#FF6D1F] via-[#FF8E42] to-[#F5E7C6] bg-clip-text text-transparent">
              Different Places.
            </span>
            <br />
            One Screen.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#F5E7C6]/90 font-medium max-w-xl mx-auto leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
            Stream YouTube, movies, or direct links in sub-second synchronization with real-time video calls. Every room is strictly password protected.
          </p>
        </div>

        {/* Sleek Frosted Glass Cinema Console with Border-Beam Effect */}
        <div className="border-beam-card w-full max-w-lg rounded-3xl border border-white/10 bg-[#161619]/90 backdrop-blur-2xl p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.85)] space-y-5 text-left relative overflow-hidden">
          {/* Subtle Ambient Radial Highlight */}
          <div className="absolute -top-24 -left-24 w-52 h-52 bg-[#FF6D1F]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Segmented Pill Selector (skiper.ui style) */}
          <div className="grid grid-cols-2 rounded-2xl bg-[#0D0D10]/80 p-1.5 border border-white/10 gap-1.5 backdrop-blur-md relative z-10">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                activeTab === 'create'
                  ? 'btn-tangerine text-[#FAF3E1] shadow-lg shadow-[#FF6D1F]/30'
                  : 'text-[#F5E7C6]/70 hover:text-[#FAF3E1] hover:bg-white/5'
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
                  ? 'btn-tangerine text-[#FAF3E1] shadow-lg shadow-[#FF6D1F]/30'
                  : 'text-[#F5E7C6]/70 hover:text-[#FAF3E1] hover:bg-white/5'
              }`}
            >
              <Link2 className="h-4 w-4" />
              <span>Join Room</span>
            </button>
          </div>

          {/* TAB 1: CREATE ROOM */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateRoom} className="space-y-4 animate-in fade-in duration-200 relative z-10">
              {/* Room Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[#FAF3E1]">Room Name</label>
                  <button
                    type="button"
                    onClick={getRandomRoomName}
                    className="text-[#FF6D1F] hover:text-[#FFA066] flex items-center gap-1 font-semibold transition"
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
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0D0D10]/70 border border-white/10 text-sm text-[#FAF3E1] placeholder-[#F5E7C6]/40 outline-none focus:border-[#FF6D1F] transition shadow-inner backdrop-blur-md"
                />
              </div>

              {/* Room Password (Strictly Enforced) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-[#FAF3E1] flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#FF6D1F]" />
                    <span>Room Password (Required)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyPassword(roomPass)}
                      className="text-[#F5E7C6]/70 hover:text-[#FAF3E1] flex items-center gap-1 font-semibold transition"
                      title="Copy Password"
                    >
                      {copiedPass ? <Check className="h-3 w-3 text-[#FF6D1F]" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={generatePasscode}
                      className="text-[#FF6D1F] hover:text-[#FFA066] flex items-center gap-1 font-semibold transition"
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
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-[#0D0D10]/70 border border-white/10 text-sm text-[#FAF3E1] placeholder-[#F5E7C6]/40 outline-none focus:border-[#FF6D1F] transition shadow-inner backdrop-blur-md font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRoomPass(!showRoomPass)}
                    className="absolute right-3.5 top-3 text-[#F5E7C6]/60 hover:text-[#FAF3E1] transition"
                    title={showRoomPass ? 'Hide Password' : 'Show Password'}
                  >
                    {showRoomPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#F5E7C6]/80 flex items-center gap-1.5">
                  <Shield3D size={14} />
                  <span>No one can enter this room without this password.</span>
                </p>
              </div>

              {/* Room Capacity */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-[#FAF3E1]">Room Seats</span>
                  <span className="font-bold text-[#FF6D1F]">{maxSeats} Members</span>
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
                          ? 'btn-tangerine text-[#FAF3E1] border-[#FF6D1F] shadow-md'
                          : 'bg-[#0D0D10]/60 border-white/10 text-[#F5E7C6]/70 hover:text-[#FAF3E1] hover:border-white/20'
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
                className="btn-tangerine w-full py-3.5 rounded-2xl text-[#FAF3E1] font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create &amp; Enter Protected Room 🔒</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* TAB 2: JOIN EXISTING ROOM */}
          {activeTab === 'join' && (
            <form onSubmit={handleJoinRoom} className="space-y-4 animate-in fade-in duration-200 relative z-10">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#FAF3E1]">Room Code or Invite Link</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. Velvet-Couch-521 or paste link"
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#0D0D10]/70 border border-white/10 text-sm text-[#FAF3E1] placeholder-[#F5E7C6]/40 outline-none focus:border-[#FF6D1F] transition shadow-inner backdrop-blur-md"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#FAF3E1] flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-[#FF6D1F]" />
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
                    className="w-full px-4 py-2.5 pr-10 rounded-2xl bg-[#0D0D10]/70 border border-white/10 text-sm text-[#FAF3E1] placeholder-[#F5E7C6]/40 outline-none focus:border-[#FF6D1F] transition shadow-inner backdrop-blur-md font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPass(!showJoinPass)}
                    className="absolute right-3.5 top-3 text-[#F5E7C6]/60 hover:text-[#FAF3E1] transition"
                  >
                    {showJoinPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#F5E7C6]/80 flex items-center gap-1.5">
                  <Shield3D size={14} />
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
                className="btn-tangerine w-full py-3.5 rounded-2xl text-[#FAF3E1] font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>Unlock &amp; Enter Room</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        {/* Floating Minimalist Feature Badges with 3D Icons (21st.dev / Aceternity style) */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-2 text-xs">
          <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1F]/90 border border-white/10 text-[#FAF3E1] font-semibold backdrop-blur-xl flex items-center gap-2 shadow-lg hover:border-[#FF6D1F]/50 transition">
            <SyncBolt3D size={20} />
            <span>0ms Drift Clock Sync</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1F]/90 border border-white/10 text-[#FAF3E1] font-semibold backdrop-blur-xl flex items-center gap-2 shadow-lg hover:border-[#FF6D1F]/50 transition">
            <Shield3D size={20} />
            <span>100% Password Protected</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1F]/90 border border-white/10 text-[#FAF3E1] font-semibold backdrop-blur-xl flex items-center gap-2 shadow-lg hover:border-[#FF6D1F]/50 transition">
            <Clapper3D size={20} />
            <span>1080p &amp; 4K HD Playback</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[#1C1C1F]/90 border border-white/10 text-[#FAF3E1] font-semibold backdrop-blur-xl flex items-center gap-2 shadow-lg hover:border-[#FF6D1F]/50 transition">
            <DuoCam3D size={20} />
            <span>Duo Cam &amp; Voice Chat</span>
          </div>
        </div>
      </main>

      {/* STEP-BY-STEP DETAILED HOW IT WORKS GUIDE */}
      <HowItWorksGuide
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

      {/* REAL LIVE VISITORS & COMMUNITY ACTIVITY COUNTER */}
      <VisitorCounter />

      {/* Mobile & Tablet App Install Banner */}
      <InstallPrompt variant="banner" />

      {/* Sleek Translucent Footer in Sustainable Linen & Tangerine */}
      <footer className="relative z-10 text-center text-xs text-[#F5E7C6]/80 py-6 max-w-5xl mx-auto w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
        <BrandLogo size="sm" href="/" />
        <div className="flex items-center gap-2 text-xs">
          <Heart3D size={18} />
          <span className="text-[#FAF3E1] font-medium">Different places... Same screen.</span>
        </div>
      </footer>
    </div>
  );
}
