'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Radio,
  Tv,
  Check,
} from 'lucide-react';
import { serverUrl, safeId } from '@/lib/socket';

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

// Fun, romantic room name generator
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

  // Active Creation Tab: 'create' | 'stream' | 'join'
  const [activeTab, setActiveTab] = useState('create');

  // Create Room State (NO LOGINS REQUIRED)
  const [roomName, setRoomName] = useState('');
  const [roomPass, setRoomPass] = useState('');
  const [showRoomPass, setShowRoomPass] = useState(false);
  const [maxSeats, setMaxSeats] = useState(2);
  const [createError, setCreateError] = useState('');

  // Quick Stream Bar State
  const [streamUrl, setStreamUrl] = useState('');

  // Join Room State
  const [joinCode, setJoinCode] = useState('');
  const [joinPass, setJoinPass] = useState('');
  const [showJoinPass, setShowJoinPass] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Modals & User Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // User Profile (Stored locally, NO login required)
  const [userName, setUserName] = useState('Rahul');
  const [partnerName, setPartnerName] = useState('Anushka');

  // Initialize storage
  useEffect(() => {
    try {
      const u = localStorage.getItem('sc_user_name');
      if (u) setUserName(u);
      const p = localStorage.getItem('sc_partner_name');
      if (p) setPartnerName(p);
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

  // Launch / Create Room (Zero login requirement)
  const handleCreateRoom = (e) => {
    e?.preventDefault?.();
    setCreateError('');
    const p = roomPass.trim() || 'cinema';
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

    notify(`🎬 Launching cinema room "${id}"...`);
    router.push(`/room/${id}#pass=${encodeURIComponent(p)}&create=1&max=${maxSeats}`);
  };

  // Join Room with Code or Link
  const handleJoinRoom = (e) => {
    e?.preventDefault?.();
    setJoinError('');
    const c = slug(joinCode);
    if (!c || c.length < 2) {
      setJoinError('Please enter a valid room code or link.');
      return;
    }
    const p = joinPass.trim();

    try {
      if (p) {
        sessionStorage.setItem('rp_' + c, p);
        localStorage.setItem('rp_' + c, p);
      }
      localStorage.setItem('lastRoom', c);
    } catch {}

    router.push(`/room/${c}${p ? `#pass=${encodeURIComponent(p)}` : ''}`);
  };

  // 1-Click Instant Watch Party for pasted video URL or movie title
  const handleInstantStream = (e) => {
    e?.preventDefault?.();
    const query = streamUrl.trim();
    if (!query) return;

    const roomId = safeId(10);
    const pass = Math.random().toString(36).substring(2, 8);

    try {
      sessionStorage.setItem('rp_' + roomId, pass);
      sessionStorage.setItem('is_create_' + roomId, '1');
      sessionStorage.setItem('max_users_' + roomId, '2');
      sessionStorage.setItem('init_video_' + roomId, query);
      localStorage.setItem('rp_' + roomId, pass);
      localStorage.setItem('lastRoom', roomId);
    } catch {}

    notify(`🚀 Starting instant 1080p watch party!`);
    router.push(`/room/${roomId}#pass=${encodeURIComponent(pass)}&create=1&max=2`);
  };

  return (
    <div className="min-h-screen bg-[#060713] text-slate-100 font-sans selection:bg-purple-600 selection:text-white flex flex-col antialiased relative overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-xs sm:text-sm shadow-2xl shadow-purple-950/70 flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="h-4 w-4 text-pink-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ambient Cinema Lighting Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-purple-600/15 via-pink-600/10 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Modern Top Cinema Header */}
      <header className="relative z-20 px-5 sm:px-8 py-4 border-b border-slate-800/80 bg-[#070817]/90 backdrop-blur-xl flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 p-0.5 shadow-xl shadow-purple-600/30 flex items-center justify-center">
            <div className="h-full w-full rounded-[14px] bg-[#070817] flex items-center justify-center">
              <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-white tracking-tight flex items-center gap-1.5">
              <span>SynCinema</span>
            </h1>
            <p className="text-[11px] text-pink-400 font-semibold tracking-wider uppercase">
              Watch Together • Real-Time Sync
            </p>
          </div>
        </div>

        {/* Header Live Status & User Profile (NO LOGIN REQUIRED) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>0ms Drift Clock Sync Active</span>
          </div>

          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-2xl bg-[#0e0f2b] border border-slate-800/90 hover:border-slate-700 text-slate-300 hover:text-white transition cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#070817]" />
          </button>

          {showNotifications && (
            <div className="absolute right-5 top-16 w-80 rounded-2xl border border-slate-800 bg-[#0c0d24] p-4 shadow-2xl z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                  SynCinema Notice
                </span>
                <button type="button" onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200">
                  <p className="font-semibold text-white">🎬 Zero Logins Required</p>
                  <p className="text-[11px] text-purple-300/80 mt-0.5">Anyone can create or join cinema rooms instantly with direct video links.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                  <p className="font-semibold text-white">⚡ Sub-Second Drift Sync</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Precision clock synchronization keeps both screens aligned at 0ms latency.</p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Profile / Settings Pill (Click to change display name) */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0e0f2b] border border-slate-800/90 hover:border-slate-700 cursor-pointer transition text-left"
            title="Configure profile and settings"
          >
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-white hidden sm:inline">{userName}</span>
            <Settings className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        {/* ======================================================== */}
        {/* 1. CINEMA HERO BANNER (Luxury Visuals & Ambiance)        */}
        {/* ======================================================== */}
        <div className="relative rounded-3xl overflow-hidden border border-indigo-900/40 bg-gradient-to-br from-[#0c0d28] via-[#111238] to-[#07081a] p-6 sm:p-10 xl:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Visual Background Glow & Image */}
          <div className="absolute right-0 top-0 bottom-0 w-full lg:w-3/5 opacity-35 sm:opacity-60 pointer-events-none overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&h=800&q=80"
              alt="SynCinema Couple Watching Together"
              className="h-full w-full object-cover object-center mix-blend-screen scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d28] via-[#0c0d28]/85 to-transparent" />
          </div>

          {/* Left Hero Narrative */}
          <div className="relative z-10 max-w-xl space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-500/15 to-pink-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wider uppercase backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span>THE PRIVATE CINEMA FOR YOU &amp; YOUR FAVORITE PEOPLE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl xl:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Same Movie.{' '}
              <span className="bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
                Different Places.
              </span>
              <br />
              One Screen.
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-lg mx-auto lg:mx-0">
              Stream movies, YouTube, anime, series, and video links in millisecond synchronization. In-room WebRTC video calls, floating reactions, and zero logins required.
            </p>

            {/* 4 Feature Pills */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-left">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium flex items-center gap-1.5 backdrop-blur-sm">
                <Zap className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <span className="truncate">0ms Drift Sync</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1.5 backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">100% Encrypted</span>
              </div>
              <div className="p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 font-medium flex items-center gap-1.5 backdrop-blur-sm">
                <Film className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <span className="truncate">1080p &amp; 4K HD</span>
              </div>
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-medium flex items-center gap-1.5 backdrop-blur-sm">
                <Users className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Up to 30 Seats</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Card */}
          <div className="relative z-10 w-full lg:w-auto shrink-0 max-w-md hidden sm:block">
            <div className="p-4 rounded-3xl bg-[#090a20]/90 border border-purple-500/30 backdrop-blur-2xl shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 text-purple-400" />
                  <span>SynCinema Auditorium Suite</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Instant Connect
                </span>
              </div>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800">
                <img
                  src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&h=350&q=80"
                  alt="Cinema Auditorium"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex items-end p-3">
                  <div className="text-left space-y-0.5">
                    <p className="text-xs font-bold text-white">Zero Setup. Instant Watch.</p>
                    <p className="text-[10px] text-pink-300">No login, password, or account needed to stream.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DEDICATED ROOM CREATION & STREAMING SUITE             */}
        {/* ======================================================== */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="rounded-3xl border border-purple-500/30 bg-[#0b0c24]/95 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
            {/* Segmented Mode Selector */}
            <div className="grid grid-cols-3 rounded-2xl bg-[#060714] p-1.5 border border-slate-800 gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Create Room</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('stream')}
                className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'stream'
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>Instant Stream</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('join')}
                className={`py-3 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <Link2 className="h-4 w-4" />
                <span>Join Room</span>
              </button>
            </div>

            {/* TAB 1: CREATE ROOM FORM */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreateRoom} className="space-y-5 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Room Name */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-300">Room Name (Optional)</label>
                      <button
                        type="button"
                        onClick={getRandomRoomName}
                        className="text-pink-400 hover:underline flex items-center gap-1 font-semibold"
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
                      className="w-full px-4 py-3 rounded-2xl bg-[#060714] border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500 transition shadow-inner"
                    />
                  </div>

                  {/* Room Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-300">Room Password (Optional)</label>
                      <button
                        type="button"
                        onClick={generatePasscode}
                        className="text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <KeyRound className="h-3 w-3" />
                        <span>Auto-Generate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showRoomPass ? 'text' : 'password'}
                        value={roomPass}
                        onChange={(e) => setRoomPass(e.target.value)}
                        placeholder="Leave blank or auto-generate"
                        className="w-full px-4 py-3 pr-10 rounded-2xl bg-[#060714] border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500 transition shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRoomPass(!showRoomPass)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                      >
                        {showRoomPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Capacity Selector (2 up to 30 seats) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Room Capacity (Members)</span>
                    <span className="font-bold text-pink-400">{maxSeats} Seats Selected</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { s: 2, label: '2 Date Night' },
                      { s: 4, label: '4 Friends' },
                      { s: 8, label: '8 Party' },
                      { s: 16, label: '16 Squad' },
                      { s: 30, label: '30 Mega Cinema' },
                    ].map((item) => (
                      <button
                        key={item.s}
                        type="button"
                        onClick={() => setMaxSeats(item.s)}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          maxSeats === item.s
                            ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-900/40'
                            : 'bg-[#060714] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {createError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
                    {createError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:brightness-110 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-purple-600/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>Create &amp; Enter Cinema Room</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {/* TAB 2: INSTANT STREAM (PASTE & PLAY) */}
            {activeTab === 'stream' && (
              <form onSubmit={handleInstantStream} className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Paste Any Video Link or Movie Title
                  </label>
                  <div className="relative flex items-center">
                    <Link2 className="absolute left-4 h-5 w-5 text-purple-400 pointer-events-none" />
                    <input
                      type="text"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      placeholder="Paste YouTube, direct MP4, M3U8, WebM, or movie title..."
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#060714] border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500 transition shadow-inner"
                      autoFocus
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    💡 Directly creates a 1080p synchronized room and starts streaming instantly with zero delay!
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!streamUrl.trim()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-purple-600/40 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Play className="h-5 w-5 fill-white" />
                  <span>Start Instant Watch Party ⚡</span>
                </button>
              </form>
            )}

            {/* TAB 3: JOIN EXISTING ROOM */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoinRoom} className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Room Code or Invite Link</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Paste room code or full URL"
                      className="w-full px-4 py-3 rounded-2xl bg-[#060714] border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500 transition shadow-inner"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Room Password (If Required)</label>
                    <div className="relative">
                      <input
                        type={showJoinPass ? 'text' : 'password'}
                        value={joinPass}
                        onChange={(e) => setJoinPass(e.target.value)}
                        placeholder="Enter password given by host"
                        className="w-full px-4 py-3 pr-10 rounded-2xl bg-[#060714] border border-slate-800 text-sm text-white placeholder-slate-500 outline-none focus:border-purple-500 transition shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowJoinPass(!showJoinPass)}
                        className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                      >
                        {showJoinPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {joinError && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl">
                    {joinError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Link2 className="h-5 w-5" />
                  <span>Join Room</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. SYNCINEMA ADS, IMAGES & VISUAL SHOWCASE               */}
        {/* ======================================================== */}
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <h3 className="font-extrabold text-xl sm:text-2xl text-white">
              Why Couples &amp; Friends Choose SynCinema
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Modern cinema experience crafted for long-distance connection
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Ad Visual 1 */}
            <div className="group relative rounded-3xl overflow-hidden bg-[#0a0b22] border border-slate-800/80 hover:border-pink-500/50 transition duration-300 shadow-xl flex flex-col">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <img
                  src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=600&h=380&q=80"
                  alt="Date Night Cinema"
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b22] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-pink-300 text-[10px] font-bold">
                  💑 Duo Date Night
                </span>
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white">Zero Drift Sync</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Clock synchronization keeps both screens aligned to the exact millisecond. No countdowns needed.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-pink-400 font-semibold">
                  <Zap className="h-3.5 w-3.5" />
                  <span>Sub-second real-time playback</span>
                </div>
              </div>
            </div>

            {/* Ad Visual 2 */}
            <div className="group relative rounded-3xl overflow-hidden bg-[#0a0b22] border border-slate-800/80 hover:border-purple-500/50 transition duration-300 shadow-xl flex flex-col">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <img
                  src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&h=380&q=80"
                  alt="Cinema Auditorium"
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b22] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-purple-300 text-[10px] font-bold">
                  👥 Up to 30 Friends
                </span>
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white">Watch Party Auditorium</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Expand from an intimate couple couch to a 30-person watch party gallery with WebRTC calling.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
                  <Users className="h-3.5 w-3.5" />
                  <span>Party Gallery &amp; Reactions</span>
                </div>
              </div>
            </div>

            {/* Ad Visual 3 */}
            <div className="group relative rounded-3xl overflow-hidden bg-[#0a0b22] border border-slate-800/80 hover:border-fuchsia-500/50 transition duration-300 shadow-xl flex flex-col">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <img
                  src="https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=600&h=380&q=80"
                  alt="Universal Stream"
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b22] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-fuchsia-300 text-[10px] font-bold">
                  ⚡ Any Video Link
                </span>
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white">Universal Video Playback</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Paste YouTube, direct MP4, M3U8 HLS, WebM, or local device files. Zero logins required.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-fuchsia-400 font-semibold">
                  <Film className="h-3.5 w-3.5" />
                  <span>1080p &amp; 4K HD Playback</span>
                </div>
              </div>
            </div>

            {/* Ad Visual 4 */}
            <div className="group relative rounded-3xl overflow-hidden bg-[#0a0b22] border border-slate-800/80 hover:border-emerald-500/50 transition duration-300 shadow-xl flex flex-col">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <img
                  src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&h=380&q=80"
                  alt="Encryption & Security"
                  className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b22] via-transparent to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-emerald-300 text-[10px] font-bold">
                  🔒 Bank-Grade Security
                </span>
              </div>
              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white">100% Encrypted &amp; Private</h4>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    Host room password protection, scrypt salted hashing, and encrypted peer-to-peer data transport.
                  </p>
                </div>
                <div className="pt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Host Access Control</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Simple, Elegant Cinema Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 py-6 max-w-7xl mx-auto w-full border-t border-slate-800/60 px-5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
          <span className="font-semibold text-slate-400">SynCinema Virtual Auditorium</span>
        </div>
        <span className="text-pink-400/90 font-medium">Different places... Same screen. 💖</span>
      </footer>

      {/* Profile & Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#0d0e24] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-purple-400" />
                <span>Profile &amp; Cinema Preferences</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Your Display Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    const clean = sanitizeInput(e.target.value);
                    setUserName(clean);
                    try { localStorage.setItem('sc_user_name', clean); } catch {}
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060714] border border-slate-800 text-xs sm:text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Partner&apos;s Display Name</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => {
                    const clean = sanitizeInput(e.target.value);
                    setPartnerName(clean);
                    try { localStorage.setItem('sc_partner_name', clean); } catch {}
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060714] border border-slate-800 text-xs sm:text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Zero Accounts • High Security
                </p>
                <p className="text-[11px] text-purple-300/80">
                  SynCinema requires zero logins or accounts. Rooms are created on-the-fly and secured with host passcodes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs cursor-pointer shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
