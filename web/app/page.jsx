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

      {/* Soft Ambient Romantic Pink Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-pink-500/20 rounded-full blur-[140px] pointer-events-none" />

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
          
          {/* LEFT SIDE: Text, 3D Art Badges & High-Security Information Highlights */}
          <div className="lg:col-span-7 xl:col-span-7 order-1 lg:order-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#222222]/90 border border-pink-500/40 text-pink-200 text-xs font-bold tracking-wider uppercase shadow-md backdrop-blur-md">
              <SparkleStar3D size={18} />
              <span>Virtual Cinema For Two or More</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-pink-100 tracking-tight leading-[1.1] drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)]">
              Same Movie.{' '}
              <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-pink-200 bg-clip-text text-transparent">
                Different Places.
              </span>
              <br />
              One Screen.
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-pink-200/90 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
              Stream YouTube, movies, or direct links in sub-second synchronization with real-time video calls. Every room is strictly password protected with zero-leak peer-to-peer privacy.
            </p>

            {/* Feature Badges with 3D Icons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1 text-xs">
              <div className="px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/25 text-pink-100 font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400/60 transition">
                <SyncBolt3D size={20} />
                <span>0ms Drift Clock Sync</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/25 text-pink-100 font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400/60 transition">
                <Shield3D size={20} />
                <span>100% Password Protected</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/25 text-pink-100 font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400/60 transition">
                <Clapper3D size={20} />
                <span>1080p &amp; 4K HD Playback</span>
              </div>
              <div className="px-3.5 py-2 rounded-2xl bg-[#222222]/90 border border-pink-500/25 text-pink-100 font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md hover:border-pink-400/60 transition">
                <DuoCam3D size={20} />
                <span>Duo Cam &amp; Voice Chat</span>
              </div>
            </div>

            {/* DETAILED HIGH-SECURITY & PRIVACY VAULT INFORMATION HIGHLIGHTS CARD */}
            <div className="rounded-3xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-md p-5 sm:p-6 shadow-[0_15px_40px_rgba(236,72,153,0.15)] space-y-4 text-left mt-4">
              <div className="flex items-center gap-3 border-b border-pink-500/20 pb-3.5">
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
                {/* Guarantee 1 */}
                <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                  <div className="font-bold text-pink-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-pink-400" />
                    <span>Direct Peer-to-Peer Encryption</span>
                  </div>
                  <p className="text-[11px] text-pink-200/80 leading-relaxed">
                    Camera and mic feeds stream point-to-point directly between your browsers via WebRTC DTLS/SRTP. No video or voice data is ever recorded or routed to external media servers.
                  </p>
                </div>

                {/* Guarantee 2 */}
                <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                  <div className="font-bold text-pink-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-400" />
                    <span>Hardware Sensor Killswitch</span>
                  </div>
                  <p className="text-[11px] text-pink-200/80 leading-relaxed">
                    When you switch Camera or Mic off, device hardware media tracks are fully terminated in your browser—the physical green/red indicator LED on your camera shuts off completely.
                  </p>
                </div>

                {/* Guarantee 3 */}
                <div className="p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/15 space-y-1">
                  <div className="font-bold text-pink-100 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
                    <span>Zero Logins &amp; Ephemeral Keys</span>
                  </div>
                  <p className="text-[11px] text-pink-200/80 leading-relaxed">
                    No email address, login accounts, or tracking cookies required. Every room is guarded by a bcrypt-hashed passcode known exclusively to you and your invited guest.
                  </p>
                </div>

                {/* Guarantee 4 */}
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
                    <p className="text-[11px] text-pink-300/80 flex items-center gap-1.5">
                      <Shield3D size={14} />
                      <span>No one can enter this room without this password.</span>
                    </p>
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
                    <p className="text-[11px] text-pink-200/80 flex items-center gap-1.5">
                      <Shield3D size={14} />
                      <span>Password is required. No one can enter without it.</span>
                    </p>
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
