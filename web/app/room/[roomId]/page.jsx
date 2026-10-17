'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  Send, Copy, Check, Crown, Users, Lock, Unlock, Heart, Film, X, Play,
  Moon, Home as HomeIcon, Eye, EyeOff, Trash2, KeyRound, User,
  Video, VideoOff, Mic, MicOff, Sliders, MessageSquare, MoreHorizontal, ListPlus, Sparkles, Settings,
  Timer, Popcorn, Flame, Shield, Star, QrCode, Smartphone, History, DoorClosed, LogOut, Tv,
  MonitorPlay, Camera, Music, RefreshCw
} from 'lucide-react';
import { getSocket, getCid } from '@/lib/socket';
import { getKey, setKey } from '@/lib/vault';
import VideoPlayer from '@/components/VideoPlayer';
import CouplesOverlay, { Tile } from '@/components/CouplesOverlay';
import CinemaPlugins from '@/components/CinemaPlugins';
import CoupleGestures from '@/components/CoupleGestures';
import MovieNightExtras from '@/components/MovieNightExtras';
import IntimacyMode from '@/components/IntimacyMode';
import WatchHistoryModal from '@/components/WatchHistoryModal';
import RecentBar from '@/components/RecentBar';
import ThemeToggle from '@/components/ThemeToggle';
import InstallPrompt from '@/components/InstallPrompt';
import ChatPanel from '@/components/ChatPanel';



const hello = (n) => {
  try {
    const c = new AudioContext(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 660;
    g.gain.setValueAtTime(0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
    o.start(); o.stop(c.currentTime + 0.6);
  } catch {}
  if (document.hidden && window.Notification?.permission === 'granted') new Notification(`${n} is here 💗`);
};

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const Gate = ({ icon, title, hint, onSubmit, cta, children }) => (
  <main className="grid min-h-screen place-items-center px-6 bg-black">
    <form onSubmit={onSubmit} className="glass rise w-full max-w-sm space-y-4 p-7 text-center">
      <div className="relative mx-auto h-16 w-16">
        <img src="/logo.png" alt="SyncCinema Logo" className="h-full w-full object-contain" />
      </div>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="text-sm opacity-70">{hint}</p>
      {children}
      <button className="btn w-full !py-2.5">{cta}</button>
      <Link href="/" className="block text-xs underline opacity-60 hover:opacity-100">Back to home</Link>
    </form>
  </main>
);

const Tool = ({ icon, label, title, onClick, className = '', labelClass = 'hidden lg:inline' }) => (
  <button onClick={onClick} title={title} aria-label={title} className={`ghost ${className}`}>{icon}{label && <span className={labelClass}>{label}</span>}</button>
);

export default function Room() {
  const { roomId } = useParams();
  const router = useRouter();
  const [name, setName] = useState(null), [draft, setDraft] = useState('');
  const [boot, setBoot] = useState(null), [users, setUsers] = useState([]), [hostId, setHostId] = useState(null);
  const [maxSeats, setMaxSeats] = useState(2);
  const [chat, setChat] = useState([]);
  const [screenBy, setScreenBy] = useState(null), [screen, setScreen] = useState(null);
  const [queue, setQueue] = useState([]), [needKey, setNeedKey] = useState(false), [keyTick, setKeyTick] = useState(0), [keyDraft, setKeyDraft] = useState('');
  const [sleep, setSleep] = useState(0), seen = useRef(new Set());
  const [err, setErr] = useState(''), [lock, setLock] = useState(false), [needPass, setNeedPass] = useState(null), [passDraft, setPassDraft] = useState('');
  const [entryLocked, setEntryLocked] = useState(false), [isGhost, setIsGhost] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false), [newPassDraft, setNewPassDraft] = useState(''), [passVisible, setPassVisible] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false), [capacityDraft, setCapacityDraft] = useState(2);
  const [online, setOnline] = useState(true), [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false), [toast, setToast] = useState(null), toastT = useRef();
  
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'call' | 'gestures' | 'extras' | 'tools'
  const [toolsSubTab, setToolsSubTab] = useState('extras'); // 'extras' | 'intimacy'
  const [desktopTab, setDesktopTab] = useState('extras'); // 'extras' | 'gestures' | 'recent' | 'intimacy'
  const [showMenu, setShowMenu] = useState(false);
  const [showCall, setShowCall] = useState(true);
  const [showHandoff, setShowHandoff] = useState(false);
  const callControlsRef = useRef(null);
  const [callCam, setCallCam] = useState(true);
  const [callMic, setCallMic] = useState(true);
  const [callMedia, setCallMedia] = useState({
    mine: null,
    remote: {},
    cam: true,
    mic: true,
    voiceOnly: false,
    localTalking: false,
    remoteTalking: {},
  });

  // Movie-Night Extras & Intimacy State
  const [watchlist, setWatchlist] = useState([]);
  const [timer, setTimer] = useState(null);
  const [readyCheck, setReadyCheck] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [adultMode, setAdultMode] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [ottAccounts, setOttAccounts] = useState({});

  // View Modes & Cinema Plugins State
  const [viewMode, setViewMode] = useState('theater'); // 'theater' | 'duo' | 'party' | 'focus'
  const [showPlugins, setShowPlugins] = useState(false);
  const [pluginsTab, setPluginsTab] = useState('soundscapes');
  const [duoRightTab, setDuoRightTab] = useState('cam'); // 'cam' | 'chat'

  const peerRef = useRef(null), playerRef = useRef(null), root = useRef();
  const socket = typeof window !== 'undefined' ? getSocket() : null;
  const me = typeof window !== 'undefined' ? getCid() : null;

  const say = (m) => { setToast({ m, n: Date.now() }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2400); };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sc_view_mode');
      if (saved && ['theater', 'duo', 'party', 'focus'].includes(saved)) {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const changeViewMode = (mode) => {
    setViewMode(mode);
    try { localStorage.setItem('sc_view_mode', mode); } catch {}
    const labels = {
      theater: '🎭 Theater Auditorium Mode',
      duo: '💑 Duo Date Night Mode (Side-by-Side)',
      party: '👥 Watch Party Grid Mode',
      focus: '⚡ Minimalist Focus Mode',
    };
    say(labels[mode] || mode);
  };

  const triggerReaction = (emoji) => {
    if (!socket) return;
    const vt = playerRef.current?.getCurrentTime?.() || 0;
    socket.emit('reaction:timed', { emoji, vt });
    const el = Object.assign(document.createElement('div'), { textContent: emoji });
    el.className = 'absolute bottom-4 text-4xl pointer-events-none select-none z-30';
    el.style.left = 10 + Math.random() * 80 + '%';
    document.getElementById('reaction-layer')?.append(el);
    gsap.to(el, { y: -260, x: gsap.utils.random(-30, 30), opacity: 0, duration: 2.2, ease: 'power1.out', onComplete: () => el.remove() });
  };

  const doJoin = (overridePass, overrideKey) => {
    if (!socket || !name) return;
    const p = overridePass !== undefined
      ? overridePass
      : (sessionStorage.getItem('rp_' + roomId) || localStorage.getItem('rp_' + roomId) || '');
    const isCreate = sessionStorage.getItem('is_create_' + roomId) === '1' || (typeof window !== 'undefined' && window.location.hash.includes('create=1'));
    const k = overrideKey !== undefined ? overrideKey : getKey();
    const maxU = Number(sessionStorage.getItem('max_users_' + roomId) || 2);
    
    // Ghost Mode check (Admin only)
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? (window.location.search || window.location.hash.replace(/^#/, '?')) : '');
    const ghostFlag = isGhost || searchParams.get('ghost') === '1';
    const admKey = searchParams.get('adminKey') || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_key') : '') || '';

    socket.emit('join', {
      roomId,
      cid: me,
      name: ghostFlag ? 'Admin Ghost' : name,
      key: k,
      pass: p,
      isCreate,
      maxUsers: maxU,
      isGhost: ghostFlag,
      adminKey: admKey,
      token: sessionStorage.tok || '',
    }, (r) => {
      if (!r) return;
      if (r.error === 'denied') return setNeedKey(true);
      if (['needpass', 'badpass'].includes(r.error)) {
        sessionStorage.removeItem('rp_' + roomId);
        try { localStorage.removeItem('rp_' + roomId); } catch {}
        return setNeedPass(r.error);
      }
      if (r.error === 'room_taken') {
        sessionStorage.removeItem('is_create_' + roomId);
        return setNeedPass('room_taken');
      }
      if (r.error === 'room_locked') {
        return setErr('room_locked');
      }
      if (r.error === 'full') {
        return setErr('full');
      }
      if (r.error) return setErr(r.error);

      if (r.isGhost) {
        setIsGhost(true);
        setShowCall(false); // Disable camera/mic completely in ghost mode
      }

      sessionStorage.removeItem('is_create_' + roomId);
      setNeedKey(false);
      setNeedPass(null);
      setErr('');
      sessionStorage.tok = r.token;
      if (p) {
        sessionStorage.setItem('rp_' + roomId, p);
        try { localStorage.setItem('rp_' + roomId, p); } catch {}
      }
      if (r.maxUsers) setMaxSeats(r.maxUsers);
      if (r.entryLocked !== undefined) setEntryLocked(!!r.entryLocked);
      setQueue(r.queue || []);
      setWatchlist(r.watchlist || []);
      setTimer(r.timer || null);
      setReadyCheck(r.readyCheck || null);
      setReviews(r.reviews || []);
      setAdultMode(!!r.adult);
      setHasPin(!!r.hasPin);
      if (r.ottAccounts) setOttAccounts(r.ottAccounts);
      if (r.media) setCurrentMedia(r.media);
      setLock(r.lock);
      setUsers(r.users || []);
      setHostId(r.hostId);
      setChat(r.chat || []);
      setScreenBy(r.screenBy);
      setBoot(r);
      setOnline(true);
      const initVid = sessionStorage.getItem('init_video_' + roomId);
      if (initVid && (!r.media || r.media.type === 'none')) {
        sessionStorage.removeItem('init_video_' + roomId);
        socket.emit('media:set', { media: { type: 'auto', src: initVid } });
      }
    });
  };

  useEffect(() => {
    localStorage.lastRoom = roomId;
    setName(localStorage.getItem('name') || '');
    try {
      const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
      const params = new URLSearchParams(hash || (typeof window !== 'undefined' ? window.location.search : ''));
      const p = params.get('pass');
      const k = params.get('key');
      const v = params.get('video');
      const createFlag = params.get('create');
      const maxParam = params.get('max');
      const ghostParam = params.get('ghost');
      const admKey = params.get('adminKey');
      if (ghostParam === '1') {
        setIsGhost(true);
        setShowCall(false);
      }
      if (admKey) {
        sessionStorage.setItem('sc_admin_key', admKey);
      }
      if (p) {
        sessionStorage.setItem('rp_' + roomId, p);
        try { localStorage.setItem('rp_' + roomId, p); } catch {}
      }
      if (createFlag === '1') {
        sessionStorage.setItem('is_create_' + roomId, '1');
      }
      if (maxParam && ['2', '3', '4'].includes(maxParam)) {
        sessionStorage.setItem('max_users_' + roomId, maxParam);
        setMaxSeats(Number(maxParam));
      }
      if (k) setKey(k);
      if (v) sessionStorage.setItem('init_video_' + roomId, v);
    } catch {}
  }, [roomId]);

  useEffect(() => () => document.body.classList.remove('cinema', 'hide-screen'), []);
  useEffect(() => { document.body.classList.toggle('hide-screen', hidden); }, [hidden]);

  useEffect(() => {
    if (!name || !socket) return;
    const joinHandler = () => doJoin();
    socket.on('connect', joinHandler);
    socket.on('disconnect', () => setOnline(false));
    socket.on('presence', (p) => {
      p.users.forEach((u) => { if (u.id !== me && !seen.current.has(u.sid)) { seen.current.add(u.sid); hello(u.name); } });
      setUsers(p.users); setHostId(p.hostId); setLock(p.lock);
      if (p.adult !== undefined) setAdultMode(!!p.adult);
      if (p.entryLocked !== undefined) setEntryLocked(!!p.entryLocked);
      if (p.maxUsers) setMaxSeats(p.maxUsers);
    });
    socket.on('room:entry_locked', ({ locked }) => {
      setEntryLocked(!!locked);
    });
    socket.on('chat', (m) => setChat((c) => [...c.slice(-99), m]));
    socket.on('chat:cleared', () => setChat([]));
    socket.on('screen', (by) => { setScreenBy(by); if (!by) setScreen(null); });
    socket.on('reaction', (e) => {
      const el = Object.assign(document.createElement('div'), { textContent: e });
      el.className = 'absolute bottom-4 text-4xl pointer-events-none select-none z-30';
      el.style.left = 8 + Math.random() * 80 + '%';
      document.getElementById('reaction-layer')?.append(el);
      gsap.to(el, { y: -260, x: gsap.utils.random(-30, 30), opacity: 0, duration: 2.2, ease: 'power1.out', onComplete: () => el.remove() });
    });
    socket.on('reaction:timed', (data) => {
      const el = Object.assign(document.createElement('div'), { textContent: data.emoji });
      el.className = 'absolute bottom-4 text-4xl pointer-events-none select-none z-30';
      el.style.left = 8 + Math.random() * 80 + '%';
      document.getElementById('reaction-layer')?.append(el);
      gsap.to(el, { y: -260, x: gsap.utils.random(-30, 30), opacity: 0, duration: 2.2, ease: 'power1.out', onComplete: () => el.remove() });
    });
    if (window.Notification?.permission === 'default') Notification.requestPermission();
    socket.on('queue', setQueue);
    socket.on('watchlist', setWatchlist);
    socket.on('timer:sync', setTimer);
    socket.on('ready:update', setReadyCheck);
    socket.on('ready:all', setReadyCheck);
    socket.on('reviews:update', setReviews);
    socket.on('room:adult_updated', setAdultMode);
    socket.on('room:pass_updated', () => say('Room password was updated 🔒'));
    socket.on('room:closed', (info) => {
      try {
        sessionStorage.removeItem('rp_' + roomId);
        localStorage.removeItem('rp_' + roomId);
      } catch {}
      say(info?.message || 'The host has closed this room.');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    });
    socket.on('pin:status', (s) => setHasPin(!!s?.hasPin));
    socket.on('state', (st) => {
      if (st?.media) setCurrentMedia(st.media);
    });
    socket.on('ott:sync', (accounts) => setOttAccounts(accounts || {}));
    socket.on('voice:active', ({ active } = {}) => {
      setVoiceActive(!!active);
    });
    socket.on('nudge', () => {
      navigator.vibrate?.([200, 100, 200]);
      for (let i = 0; i < 14; i++) {
        const el = Object.assign(document.createElement('div'), { textContent: '💗' });
        el.className = 'fixed bottom-10 z-50 text-5xl pointer-events-none'; el.style.left = 10 + Math.random() * 80 + '%';
        document.body.append(el);
        gsap.to(el, { y: -window.innerHeight * 0.8, opacity: 0, scale: 1.6, duration: 2 + Math.random(), delay: i * 0.08, ease: 'power1.out', onComplete: () => el.remove() });
      }
    });

    if (socket.connected) {
      doJoin();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', joinHandler);
      socket.off('voice:active');
      socket.off('ott:sync');
    };
  }, [name, socket]);

  useEffect(() => {
    if (!boot) return;
    let lock; const get = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch {} };
    const vis = () => document.visibilityState === 'visible' && get();
    get(); document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release?.(); };
  }, [!!boot]);

  useEffect(() => {
    if (!sleep) return;
    const t = setTimeout(() => { playerRef.current?.pause?.(); setSleep(0); say('Sleep timer done — movie paused. Sweet dreams 🌙'); }, sleep * 60000);
    return () => clearTimeout(t);
  }, [sleep]);

  useEffect(() => {
    if (!boot) return;
    const ctx = gsap.context(() => {
      gsap.from('.hdr > *', { opacity: 0, y: -16, duration: 0.6, stagger: 0.1, ease: 'power3.out' });
      gsap.from('.panel', { opacity: 0, y: 28, duration: 0.8, stagger: 0.15, ease: 'power3.out' });
    }, root);
    return () => ctx.revert();
  }, [!!boot]);

  const copy = () => {
    const rp = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
    const sk = getKey();
    const parts = [];
    if (rp) parts.push(`pass=${encodeURIComponent(rp)}`);
    if (sk) parts.push(`key=${encodeURIComponent(sk)}`);
    const hash = parts.length ? `#${parts.join('&')}` : '';
    const inviteUrl = `${location.origin}/room/${roomId}${hash}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    say('Invite link with password copied — send it to your partner 💗');
  };
  const cycleSleep = () => { const n = { 0: 15, 15: 30, 30: 60, 60: 0 }[sleep]; setSleep(n); say(n ? `Movie will pause in ${n} min 🌙` : 'Sleep timer off'); };
  const toggleCinema = () => { const on = document.body.classList.toggle('cinema'); say(on ? 'Cinema mode: dimming background lights' : 'Cinema mode off'); };
  const toggleHide = () => { setHidden((h) => { say(!h ? 'Screen hidden — hover or tap to peek' : 'Screen visible'); return !h; }); };

  if (name === null) return null;
  if (!name) return (
    <Gate icon={<User className="h-6 w-6" />} title="What should we call you?" hint="Your partner will see this name." cta="Join the couch"
      onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { localStorage.setItem('name', draft.trim()); setName(draft.trim()); } }}>
      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your name" className="field text-center" />
    </Gate>
  );


  if (needPass) return (
    <Gate icon={<Lock className="h-6 w-6" />} cta="Enter room"
      title="Room password"
      hint={
        needPass === 'badpass'
          ? 'Wrong room password. Please try again.'
          : needPass === 'room_taken'
          ? 'A room with this name is already active. Enter its password to join.'
          : 'This room is protected with a password. Type it to enter.'
      }
      onSubmit={(e) => {
        e.preventDefault();
        const v = passDraft.trim();
        if (!v || v.length < 4) return;
        sessionStorage.setItem('rp_' + roomId, v);
        try { localStorage.setItem('rp_' + roomId, v); } catch {}
        setNeedPass(null);
        setPassDraft('');
        doJoin(v);
      }}
    >
      <input autoFocus type="password" minLength={4} maxLength={64} value={passDraft} onChange={(e) => setPassDraft(e.target.value)} placeholder="Room password (min 4 characters)" className="field text-center" />
    </Gate>
  );

  if (err) return (
    <Gate
      icon={<Lock className="h-6 w-6 text-rose-400" />}
      cta="Back to Home"
      title={err === 'room_locked' ? 'Room Locked by Host' : err === 'full' ? 'Room is Full' : 'Cannot Enter Room'}
      hint={
        err === 'room_locked'
          ? 'The host has locked this room. No new members are currently allowed to enter.'
          : err === 'full'
          ? `This room has reached its maximum capacity (${maxSeats} members).`
          : String(err)
      }
      onSubmit={(e) => {
        e.preventDefault();
        window.location.href = '/';
      }}
    >
      <div className="text-center py-2 text-xs text-white/50">
        {err === 'room_locked' ? 'Only existing members can rejoin.' : 'Please wait for a seat to free up or join another room.'}
      </div>
    </Gate>
  );



  return (
    <div ref={root} className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2.5 sm:py-4 overflow-x-hidden">
      {/* 👻 Stealth Admin Ghost Monitor Banner */}
      {isGhost && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black border border-purple-500/40 px-4 py-1.5 text-xs font-semibold text-purple-200 backdrop-blur-xl flex items-center gap-2 pointer-events-none">
          <span className="text-base">👻</span>
          <span>Admin Stealth Monitor Active (Invisible to Host &amp; Members)</span>
        </div>
      )}

      {/* Responsive Top Header */}
      {/* Modern Unified Cinema Navbar */}
      <header className="hdr mb-3 flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-[#090a1e]/90 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
        {/* Left: Brand + Status + Dynamic Capacity Pill */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="ghost !p-1.5 flex items-center shrink-0 hover:scale-105 transition" aria-label="Back to home" title="Back to home">
            <img src="/logo.png" alt="SyncCinema Logo" className="h-6 w-6 sm:h-7 sm:w-7 object-contain" />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="font-display text-sm sm:text-base font-bold text-white tracking-wide truncate hidden xs:inline sm:inline">SyncCinema</h1>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
              online ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              <i className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="hidden sm:inline">{online ? 'Live' : 'Reconnecting'}</span>
            </span>

            {/* Interactive Room Capacity Pill (Clickable for Host) */}
            <button
              type="button"
              onClick={() => {
                if (me === hostId) {
                  setCapacityDraft(maxSeats);
                  setShowCapacityModal(true);
                } else {
                  say(`Room Capacity: ${users.length} of ${maxSeats} members (Host can increase up to 30)`);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold border transition ${
                me === hostId
                  ? 'bg-white/10 hover:bg-rose-500/20 border-white/15 hover:border-rose-500/40 text-white cursor-pointer active:scale-95'
                  : 'bg-white/5 border-white/10 text-white/80 cursor-default'
              }`}
              title={me === hostId ? `Capacity: ${users.length}/${maxSeats} members. Click to change (2 to 30 seats)` : `Capacity: ${users.length}/${maxSeats} members`}
            >
              <Users className="h-3 w-3 text-rose-400" />
              <span>{users.length}/{maxSeats}</span>
              {me === hostId && <span className="text-[10px] text-white/60">⚙️</span>}
            </button>

            {entryLocked && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold" title="Host locked this room from new entries">
                <Lock className="h-3 w-3" />
                <span className="hidden md:inline">Locked</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Consolidated Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* View Modes Switcher (Theater, Duo Date, Party Grid, Focus) */}
          <div className="hidden xl:flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 p-0.5 rounded-xl">
            {[
              { id: 'theater', label: 'Theater', icon: <MonitorPlay className="h-3 w-3" /> },
              { id: 'duo', label: 'Duo Date', icon: <Heart className="h-3 w-3" /> },
              { id: 'party', label: 'Party Grid', icon: <Users className="h-3 w-3" /> },
              { id: 'focus', label: 'Focus', icon: <Eye className="h-3 w-3" /> },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => changeViewMode(m.id)}
                className={`h-7 px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                  viewMode === m.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={`Switch to ${m.label} Mode`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Cinema Plugins Suite Launcher Button */}
          <button
            type="button"
            onClick={() => setShowPlugins(true)}
            className="h-7 sm:h-8 px-2 sm:px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/40 text-purple-200 transition shadow-lg shadow-purple-500/10 cursor-pointer active:scale-95 shrink-0"
            title="Open Cinema Plugins (Atmosphere, Keepsakes, Trivia & Intermission)"
          >
            <Sparkles className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
            <span className="hidden xs:inline sm:inline">Plugins</span>
          </button>

          {/* Active Snack Timer Indicator */}
          {timer?.running && (
            <button
              type="button"
              onClick={() => { setShowPlugins(true); setPluginsTab('intermission'); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono hover:bg-emerald-500/30 shrink-0"
              title="Synchronized snack break in progress (Click to view)"
            >
              <Timer className="h-3 w-3" />
              <span>🍿 {Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) / 60)}:{(Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) % 60) + '').padStart(2, '0')}</span>
            </button>
          )}

          {/* Quick AV Cluster: Uniform h-8 Cam & Mic Toggles */}
          {!isGhost && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => callControlsRef.current?.toggleCam?.()}
                className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  callCam
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
                title={callCam ? 'Camera is ON (Click to turn OFF)' : 'Camera is OFF (Click to turn ON)'}
              >
                {callCam ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-rose-400" />}
                <span className="hidden sm:inline">{callCam ? 'Cam On' : 'Cam Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => callControlsRef.current?.toggleMic?.()}
                className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                  callMic
                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
                title={callMic ? 'Mic Live (Click to Mute)' : 'Mic Muted (Click to Unmute)'}
              >
                {callMic ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-amber-400" />}
                <span className="hidden sm:inline">{callMic ? 'Mic' : 'Muted'}</span>
              </button>
            </div>
          )}

          {/* Video Call Window Visibility (Desktop Only) */}
          {!isGhost && (
            <button
              type="button"
              onClick={() => setShowCall(!showCall)}
              className={`hidden lg:flex h-8 px-2.5 rounded-xl text-xs font-medium items-center gap-1.5 border transition ${
                showCall
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title={showCall ? 'Hide video call window' : 'Show video call window'}
            >
              {showCall ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-rose-400" />}
              <span>{showCall ? 'Call Active' : 'Call Hidden'}</span>
            </button>
          )}

          {/* Primary Quick Invite Button */}
          <button
            onClick={copy}
            className="btn h-8 !py-0 !px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-rose-600 to-rose-700 shadow-md hover:opacity-95 shrink-0"
            title="Copy room invite link"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Mobile Quick Exit */}
          <Link
            href="/"
            className="lg:hidden h-8 w-8 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-zinc-400 hover:text-white flex items-center justify-center transition shrink-0"
            title="Leave room"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Link>

          {/* Unified Room Controls Popover Menu (Desktop only - mobile uses dedicated ribbon) */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className={`h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition cursor-pointer ${
                showMenu
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                  : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:text-white'
              }`}
              title="Room Controls &amp; Settings"
            >
              <Sliders className="h-3.5 w-3.5 text-rose-400" />
              <span>Controls</span>
            </button>

            {/* Dropdown Menu (Uniform across Desktop and Mobile) */}
            {showMenu && (
              <div className="absolute right-0 top-10 z-50 w-72 sm:w-80 rounded-2xl bg-zinc-950/95 border border-zinc-800 p-3.5 space-y-3 shadow-2xl backdrop-blur-2xl rise">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-wide uppercase">
                    <Sliders className="h-3.5 w-3.5 text-rose-400" />
                    <span>Room Controls</span>
                  </div>
                  <button onClick={() => setShowMenu(false)} className="text-white/60 hover:text-white p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Host: Capacity Manager */}
                  {me === hostId && (
                    <button
                      type="button"
                      onClick={() => {
                        setCapacityDraft(maxSeats);
                        setShowCapacityModal(true);
                        setShowMenu(false);
                      }}
                      className="ghost !justify-start !py-2.5 !px-3 text-white/90 hover:text-white border border-white/10 hover:border-rose-500/40"
                    >
                      <Users className="h-4 w-4 text-rose-400" />
                      <span>Capacity ({maxSeats}p)</span>
                    </button>
                  )}

                  {/* Room Password */}
                  <button
                    type="button"
                    onClick={() => {
                      const current = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
                      setNewPassDraft(current);
                      setShowPassModal(true);
                      setShowMenu(false);
                    }}
                    className="ghost !justify-start !py-2.5 !px-3 text-amber-300 border border-white/10 hover:border-amber-400/40"
                  >
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span>Password</span>
                  </button>

                  {/* Host: Lock Room Entry */}
                  {me === hostId && (
                    <button
                      type="button"
                      onClick={() => {
                        socket.emit('room:toggle_entry_lock', { locked: !entryLocked }, (res) => {
                          if (res?.ok) setEntryLocked(res.entryLocked);
                        });
                        setShowMenu(false);
                      }}
                      className={`ghost !justify-start !py-2.5 !px-3 border ${
                        entryLocked ? 'text-amber-300 border-amber-500/50 bg-amber-500/15' : 'text-white/80 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      {entryLocked ? <Lock className="h-4 w-4 text-amber-400" /> : <Unlock className="h-4 w-4" />}
                      <span>{entryLocked ? 'Unlock Entry' : 'Lock Entry'}</span>
                    </button>
                  )}

                  {/* Host: Control Mode */}
                  {me === hostId && (
                    <button
                      type="button"
                      onClick={() => {
                        socket.emit('lock', !lock);
                        setShowMenu(false);
                      }}
                      className="ghost !justify-start !py-2.5 !px-3 border border-white/10"
                    >
                      {lock ? <Lock className="h-4 w-4 text-emerald-400" /> : <Unlock className="h-4 w-4" />}
                      <span>{lock ? 'Host Control' : 'Everyone'}</span>
                    </button>
                  )}

                  {/* Mobile Handoff */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowHandoff(true);
                      setShowMenu(false);
                    }}
                    className="ghost !justify-start !py-2.5 !px-3 border border-white/10 hover:border-rose-500/40 text-rose-300"
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>QR Handoff</span>
                  </button>

                  {/* Recent Bar */}
                  <button
                    type="button"
                    onClick={() => {
                      setDesktopTab('recent');
                      setMobileTab('recent');
                      say('Opened Recent Plays Bar 🕒');
                      setShowMenu(false);
                    }}
                    className="ghost !justify-start !py-2.5 !px-3 text-cyan-300 border border-white/10 hover:border-cyan-400/40"
                  >
                    <History className="h-4 w-4 text-cyan-400" />
                    <span>Recent Plays</span>
                  </button>

                  {/* Cinema Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleCinema();
                      setShowMenu(false);
                    }}
                    className="ghost !justify-start !py-2.5 !px-3 border border-white/10 hover:border-amber-400/40"
                  >
                    <Film className="h-4 w-4 text-amber-400" />
                    <span>Cinema Mode</span>
                  </button>

                  {/* Sleep Timer */}
                  <button
                    type="button"
                    onClick={() => {
                      cycleSleep();
                      setShowMenu(false);
                    }}
                    className="ghost !justify-start !py-2.5 !px-3 border border-white/10"
                  >
                    <Moon className="h-4 w-4 text-indigo-400" />
                    <span>{sleep ? `Sleep: ${sleep}m` : 'Sleep Timer'}</span>
                  </button>

                  {/* Hide Screen */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleHide();
                      setShowMenu(false);
                    }}
                    className="ghost !justify-start !py-2.5 !px-3 border border-white/10"
                  >
                    {hidden ? <EyeOff className="h-4 w-4 text-rose-400" /> : <Eye className="h-4 w-4" />}
                    <span>{hidden ? 'Show Screen' : 'Hide Screen'}</span>
                  </button>

                  {/* Miss you Hearts */}
                  <button
                    type="button"
                    onClick={() => {
                      socket.emit('nudge');
                      setShowMenu(false);
                    }}
                    className="ghost !justify-start !py-2.5 !px-3 border border-white/10 text-rose-300"
                  >
                    <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
                    <span>Miss You 💕</span>
                  </button>
                </div>

                {/* Host: Close Room */}
                {me === hostId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to CLOSE this room? All members will be disconnected and this room will be permanently closed.')) {
                        socket.emit('room:close', {}, (res) => {
                          if (res?.ok) {
                            say('Room closed 🚪');
                            try {
                              sessionStorage.removeItem('rp_' + roomId);
                              localStorage.removeItem('rp_' + roomId);
                            } catch {}
                            router.push('/');
                          } else {
                            say(res?.message || 'Failed to close room');
                          }
                        });
                      }
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <DoorClosed className="h-4 w-4 text-rose-400" />
                    <span>Close Room (Permanent)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {err && <p className="card rise p-6 text-center">{{ full: 'This room is full.', locked: 'Too many wrong tries. Try again in 15 minutes.', taken: 'This seat is already in use.' }[err] || 'Could not join this room.'}</p>}
      
      {boot && (
        <div className={`w-full mx-auto transition-all ${
          viewMode === 'focus'
            ? 'max-w-5xl flex flex-col gap-3'
            : viewMode === 'duo'
            ? 'max-w-2xl sm:max-w-3xl lg:max-w-none grid gap-3 sm:gap-4 lg:grid-cols-[1fr_360px]'
            : 'max-w-2xl sm:max-w-3xl lg:max-w-none grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px]'
        }`}>
          {/* Main Content Area */}
          <section className="panel flex flex-col w-full mx-auto">
            {users.length < maxSeats && (
              <div className="card mb-3 flex items-center justify-between gap-3 p-3.5 sm:p-4 border border-white/10 !bg-black/80 rounded-2xl w-full mx-auto shadow-md backdrop-blur-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/5 border border-white/10">
                    <img src="/logo.png" alt="SyncCinema" className="h-6 w-6 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-white">
                      {users.length === 1 ? 'Waiting for members to join…' : `Watch Party Active (${users.length} of ${maxSeats} joined)`}
                    </p>
                    <p className="text-xs sm:text-sm opacity-65 truncate">
                      Share the invite link so your friends or partner can stream together.
                    </p>
                  </div>
                </div>
                <button onClick={copy} className="btn shrink-0 !py-1.5 !px-3 text-xs flex items-center gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Invite'}</span>
                </button>
              </div>
            )}

            {/* Video Player (Pinned at the top of the mobile screen) */}
            <div className="w-full mx-auto">
              <VideoPlayer
                socket={socket}
                me={me}
                hostId={hostId}
                users={users}
                peerRef={peerRef}
                initial={boot}
                screenBy={screenBy}
                screenStream={screen}
                playerRef={playerRef}
                voiceActive={voiceActive}
                adultMode={adultMode}
                callMedia={callMedia}
                callControlsRef={callControlsRef}
                onOpenRecent={() => { setMobileTab('recent'); setDesktopTab('recent'); }}
                ottAccounts={ottAccounts}
              />
            </div>

            {/* Quick Synchronized Floating Reaction Bar */}
            <div className="w-full mx-auto my-2 flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-2xl bg-[#090a1e]/90 border border-slate-800/80 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden xs:inline shrink-0 mr-1">
                  Reactions:
                </span>
                {[
                  { emoji: '❤️', label: 'Love' },
                  { emoji: '🍿', label: 'Popcorn' },
                  { emoji: '😂', label: 'Laugh' },
                  { emoji: '🔥', label: 'Hype' },
                  { emoji: '👏', label: 'Applause' },
                  { emoji: '🥂', label: 'Cheers' },
                  { emoji: '😭', label: 'Tears' },
                  { emoji: '🚀', label: 'Mindblown' },
                ].map((rx) => (
                  <button
                    key={rx.emoji}
                    type="button"
                    onClick={() => triggerReaction(rx.emoji)}
                    className="px-2 py-1 rounded-xl bg-slate-900/60 hover:bg-purple-600/25 border border-slate-800 hover:border-purple-500/40 text-sm sm:text-xs text-white transition active:scale-125 cursor-pointer shrink-0 flex items-center gap-1"
                    title={`Send ${rx.label} reaction to room`}
                  >
                    <span>{rx.emoji}</span>
                    <span className="text-[10px] hidden sm:inline text-slate-300 font-medium">{rx.label}</span>
                  </button>
                ))}
              </div>

              {/* Quick Plugins Button inside Reaction Ribbon */}
              <button
                type="button"
                onClick={() => setShowPlugins(true)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/40 text-purple-200 text-xs font-semibold hover:from-purple-600/50 hover:to-pink-600/50 transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                <span className="text-[11px]">Plugins</span>
              </button>
            </div>

            {/* Party Grid Mode: Multi-Seat Participant Gallery (up to 30 members) */}
            {viewMode === 'party' && (
              <div className="w-full mx-auto my-2 p-3 sm:p-4 rounded-2xl bg-[#090a1e]/90 border border-purple-500/30 backdrop-blur-xl shadow-xl space-y-3 rise">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="font-bold text-xs sm:text-sm text-white">Watch Party Member Gallery</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {users.length} of {maxSeats} Members Joined
                    </span>
                  </div>
                  {me === hostId && (
                    <button
                      type="button"
                      onClick={() => { setCapacityDraft(maxSeats); setShowCapacityModal(true); }}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <span>Expand Seats</span>
                      <Users className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Webcam / Tile Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {/* Local User Tile */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md">
                    <Tile
                      stream={callMedia.mine}
                      name="You"
                      isPartner={false}
                      voiceOnly={callMedia.voiceOnly}
                      isSpeaking={callMedia.localTalking}
                      isCamOff={!callCam}
                    />
                    <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-white/90 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      You {me === hostId ? '👑' : ''}
                    </span>
                  </div>

                  {/* Remote Users */}
                  {users.filter(u => u.id !== me).map((u) => (
                    <div key={u.id} className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md">
                      <Tile
                        stream={callMedia.remote[u.id]}
                        name={u.name}
                        isPartner={true}
                        voiceOnly={callMedia.voiceOnly}
                        isSpeaking={!!callMedia.remoteTalking[u.id]}
                        isCamOff={false}
                      />
                      <span className="absolute bottom-1.5 left-2 text-[10px] font-semibold text-white/90 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm truncate max-w-[85%]">
                        {u.name} {u.id === hostId ? '👑' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Always-Visible Cinema Quick Control Deck */}
            <div className="w-full mx-auto my-2 p-2.5 sm:p-3 rounded-2xl bg-[#090a1e]/90 border border-slate-800/80 backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-2 px-1">
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-purple-400" />
                  Cinema Quick Controls
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  ⚡ Auto-Sync Active
                </span>
              </div>

              {/* Action Buttons Ribbon (Horizontal Scrollable Deck) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                {/* View UI Mode Selector Pill */}
                <div className="shrink-0 flex items-center gap-1 bg-[#0d0e24] border border-slate-800 p-0.5 rounded-xl">
                  <span className="text-[10px] text-slate-400 px-1 font-semibold">UI:</span>
                  {[
                    { id: 'theater', label: 'Theater' },
                    { id: 'duo', label: 'Duo' },
                    { id: 'party', label: 'Party' },
                    { id: 'focus', label: 'Focus' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => changeViewMode(m.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                        viewMode === m.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Cinema Plugins Button */}
                <button
                  type="button"
                  onClick={() => setShowPlugins(true)}
                  className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/40 hover:border-purple-400 text-purple-200 transition cursor-pointer"
                  title="Open Cinema Plugins"
                >
                  <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                  <span>Plugins</span>
                </button>

                {/* Cinema Mode */}
                <button
                  type="button"
                  onClick={toggleCinema}
                  className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#0d0e24] border border-slate-800 hover:border-amber-400/50 hover:bg-slate-800/60 text-slate-200 hover:text-amber-300 transition cursor-pointer"
                  title="Toggle Theatre Cinema Lights"
                >
                  <Film className="h-3.5 w-3.5 text-amber-400" />
                  <span>Cinema</span>
                </button>

                {/* Room Password */}
                <button
                  type="button"
                  onClick={() => {
                    const current = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
                    setNewPassDraft(current);
                    setShowPassModal(true);
                  }}
                  className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#0d0e24] border border-slate-800 hover:border-amber-400/50 hover:bg-slate-800/60 text-slate-200 hover:text-amber-300 transition cursor-pointer"
                  title="View or Change Room Password"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Password</span>
                </button>

                {/* Host: Lock Entry */}
                {me === hostId && (
                  <button
                    type="button"
                    onClick={() => {
                      socket.emit('room:toggle_entry_lock', { locked: !entryLocked }, (res) => {
                        if (res?.ok) setEntryLocked(res.entryLocked);
                      });
                    }}
                    className={`shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl border transition cursor-pointer ${
                      entryLocked
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                    title={entryLocked ? 'Unlock Room Entry for New Members' : 'Lock Room Entry from New Members'}
                  >
                    {entryLocked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Unlock className="h-3.5 w-3.5 text-zinc-400" />}
                    <span>{entryLocked ? 'Room Locked' : 'Room Open'}</span>
                  </button>
                )}

                {/* Host: Control Mode */}
                {me === hostId && (
                  <button
                    type="button"
                    onClick={() => socket.emit('lock', !lock)}
                    className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                    title={lock ? 'Only Host Can Seek/Pause' : 'Everyone Can Seek/Pause'}
                  >
                    {lock ? <Lock className="h-3.5 w-3.5 text-rose-400" /> : <Unlock className="h-3.5 w-3.5 text-emerald-400" />}
                    <span>{lock ? 'Host Sync' : 'Free Sync'}</span>
                  </button>
                )}

                {/* Sleep Timer */}
                <button
                  type="button"
                  onClick={cycleSleep}
                  className={`shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl border transition cursor-pointer ${
                    sleep 
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="Cycle Sleep Timer"
                >
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{sleep ? `Sleep ${sleep}m` : 'Sleep'}</span>
                </button>

                {/* Recent Plays */}
                <button
                  type="button"
                  onClick={() => {
                    setDesktopTab('recent');
                    setMobileTab('tools');
                    setToolsSubTab('controls');
                    say('Opened Recent Plays Bar 🕒');
                  }}
                  className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 hover:bg-zinc-800/80 text-zinc-200 hover:text-cyan-300 transition cursor-pointer"
                  title="Show Recently Played Media"
                >
                  <History className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Recent</span>
                </button>

                {/* QR Mobile Handoff */}
                <button
                  type="button"
                  onClick={() => setShowHandoff(true)}
                  className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 hover:bg-zinc-800/80 text-zinc-200 hover:text-rose-300 transition cursor-pointer"
                  title="Scan QR to Move to Phone"
                >
                  <Smartphone className="h-3.5 w-3.5 text-rose-400" />
                  <span>QR Handoff</span>
                </button>

                {/* Hide Screen */}
                <button
                  type="button"
                  onClick={toggleHide}
                  className={`shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl border transition cursor-pointer ${
                    hidden
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="Boss Key / Hide Video Display"
                >
                  {hidden ? <EyeOff className="h-3.5 w-3.5 text-rose-400" /> : <Eye className="h-3.5 w-3.5 text-zinc-400" />}
                  <span>{hidden ? 'Show' : 'Hide'}</span>
                </button>

                {/* Miss You */}
                <button
                  type="button"
                  onClick={() => socket.emit('nudge')}
                  className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/25 text-rose-300 hover:text-white transition cursor-pointer"
                  title="Send Heart Particles to Partner"
                >
                  <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-500/30" />
                  <span>Miss You 💕</span>
                </button>

                {/* Host: Close Room */}
                {me === hostId && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Are you sure you want to CLOSE this room? All members will be disconnected and this room will be permanently closed.')) {
                        socket.emit('room:close', {}, (res) => {
                          if (res?.ok) {
                            say('Room closed 🚪');
                            try {
                              sessionStorage.removeItem('rp_' + roomId);
                              localStorage.removeItem('rp_' + roomId);
                            } catch {}
                            router.push('/');
                          } else {
                            say(res?.message || 'Failed to close room');
                          }
                        });
                      }
                    }}
                    className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-400 hover:bg-rose-900/50 hover:text-rose-200 transition cursor-pointer"
                    title="Permanently Close Room"
                  >
                    <DoorClosed className="h-3.5 w-3.5 text-rose-400" />
                    <span>Close Room</span>
                  </button>
                )}
              </div>
            </div>

            {/* MOBILE & TABLET TAB CONTENT (Centered with max-w-2xl for phone and tab) */}
            <div className="lg:hidden w-full max-w-xl sm:max-w-2xl mx-auto pb-24 mt-2">
              {mobileTab === 'chat' && (
                <ChatPanel
                  socket={socket}
                  me={me}
                  name={name}
                  users={users}
                  hostId={hostId}
                  chat={chat}
                  playerRef={playerRef}
                  say={say}
                  isMobile={true}
                />
              )}
              {mobileTab === 'call' && (
                <div className="rise">
                  {/* CouplesOverlay renders the dedicated Mobile Call Hub directly below */}
                </div>
              )}
              {mobileTab === 'gestures' && (
                <div className="rise">
                  <CoupleGestures socket={socket} me={me} name={name} users={users} say={say} />
                </div>
              )}
              {mobileTab === 'extras' && (
                <div className="rise">
                  <MovieNightExtras
                    socket={socket}
                    me={me}
                    name={name}
                    users={users}
                    queue={queue}
                    watchlist={watchlist}
                    currentMedia={currentMedia}
                    timer={timer}
                    readyCheck={readyCheck}
                    reviews={reviews}
                    isHost={me === hostId}
                    say={say}
                  />
                </div>
              )}
              {mobileTab === 'tools' && (
                <div className="rise space-y-3.5">
                  {/* Segmented Sub-navigation inside Tools (Dedicated features, no duplicate controls) */}
                  <div className="grid grid-cols-3 rounded-2xl bg-zinc-950 border border-zinc-800 p-1 gap-1 shadow-md">
                    <button
                      type="button"
                      onClick={() => setToolsSubTab('extras')}
                      className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                        toolsSubTab === 'extras' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Popcorn className="h-3 w-3 text-amber-300" />
                      <span>Extras</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToolsSubTab('intimacy')}
                      className={`py-2 px-1 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                        toolsSubTab === 'intimacy' ? 'bg-rose-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Lock className="h-3 w-3 text-rose-400" />
                      <span>Privacy &amp; Intimacy</span>
                    </button>
                  </div>

                  {toolsSubTab === 'extras' && (
                    <MovieNightExtras
                      socket={socket}
                      me={me}
                      name={name}
                      users={users}
                      queue={queue}
                      watchlist={watchlist}
                      currentMedia={currentMedia}
                      timer={timer}
                      readyCheck={readyCheck}
                      reviews={reviews}
                      isHost={me === hostId}
                      say={say}
                    />
                  )}

                  {toolsSubTab === 'intimacy' && (
                    <IntimacyMode
                      socket={socket}
                      me={me}
                      isHost={me === hostId}
                      adultMode={adultMode}
                      hasPin={hasPin}
                      say={say}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Video Call Overlay (CouplesOverlay) - Always mounted for continuous WebRTC audio & seamless tab switching */}
            <CouplesOverlay
              me={me}
              users={users}
              peerRef={peerRef}
              onScreen={setScreen}
              showCall={showCall && viewMode !== 'duo' && viewMode !== 'party'}
              setShowCall={setShowCall}
              socket={socket}
              onVoiceActivity={setVoiceActive}
              callControlsRef={callControlsRef}
              onCamChange={setCallCam}
              onMicChange={setCallMic}
              onStreamsChange={setCallMedia}
              isMobileCallActive={mobileTab === 'call'}
              onSwitchToCallTab={() => setMobileTab('call')}
            />

            {/* DESKTOP ONLY: Lower Tab Switcher and Content */}
            <div className="hidden lg:block space-y-3 mt-3">
              {/* Segmented Desktop Switcher */}
              <div className="flex rounded-2xl bg-[#090a1e]/90 p-1.5 border border-slate-800/80 gap-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={() => setDesktopTab('extras')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    desktopTab === 'extras'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Popcorn className="h-4 w-4 text-amber-300" />
                  <span>Movie-Night Extras 🍿</span>
                  {(queue.length > 0 || timer?.running || readyCheck?.active) && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                      {timer?.running ? '⏱️' : readyCheck?.active ? 'Ready?' : queue.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopTab('gestures')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    desktopTab === 'gestures'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Heart className="h-4 w-4 text-rose-400" />
                  <span>Romantic Gestures 💕</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopTab('recent')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    desktopTab === 'recent'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <History className="h-4 w-4 text-cyan-400" />
                  <span>Recent Plays 🕒</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopTab('intimacy')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    desktopTab === 'intimacy'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Lock className="h-4 w-4 text-rose-400" />
                  <span>Couples Privacy 🔒</span>
                </button>
              </div>

              {desktopTab === 'gestures' && (
                <div className="rise">
                  <CoupleGestures socket={socket} me={me} name={name} users={users} say={say} />
                </div>
              )}

              {desktopTab === 'extras' && (
                <div className="rise">
                  <MovieNightExtras
                    socket={socket}
                    me={me}
                    name={name}
                    users={users}
                    queue={queue}
                    watchlist={watchlist}
                    currentMedia={currentMedia}
                    timer={timer}
                    readyCheck={readyCheck}
                    reviews={reviews}
                    isHost={me === hostId}
                    say={say}
                  />
                </div>
              )}

              {desktopTab === 'recent' && (
                <div className="rise">
                  <RecentBar
                    onPlayUrl={(u) => socket.emit('media:set', { media: { type: 'auto', src: u } })}
                    onAddToQueue={(item) => socket.emit('queue:add', { media: item })}
                    adultMode={adultMode}
                    say={say}
                  />
                </div>
              )}

              {desktopTab === 'intimacy' && (
                <div className="rise">
                  <IntimacyMode
                    socket={socket}
                    me={me}
                    isHost={me === hostId}
                    adultMode={adultMode}
                    hasPin={hasPin}
                    say={say}
                  />
                </div>
              )}
            </div>
          </section>

          {/* DESKTOP ONLY: Right Column (Switches cleanly between standard Chat and Duo Date Cam) */}
          {viewMode !== 'focus' && (
            <aside className="panel hidden lg:flex flex-col h-[calc(100vh-5.5rem)] gap-2.5">
              {viewMode === 'duo' && (
                <div className="card p-3 rounded-2xl bg-[#090a1e]/90 border border-purple-500/30 backdrop-blur-xl shadow-xl space-y-2.5 shrink-0 rise">
                  {/* Duo Header */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-500/30" />
                      <span>Date Night Duo Cam</span>
                    </span>
                    <span className="text-[10px] text-purple-300 font-semibold px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30">
                      💑 Intimate Stream
                    </span>
                  </div>

                  {/* Partner Video Tile */}
                  {users.filter(u => u.id !== me).length > 0 ? (
                    users.filter(u => u.id !== me).slice(0, 1).map(partner => (
                      <div key={partner.id} className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-purple-500/40 shadow-inner">
                        <Tile
                          stream={callMedia.remote[partner.id]}
                          name={partner.name}
                          isPartner={true}
                          voiceOnly={callMedia.voiceOnly}
                          isSpeaking={!!callMedia.remoteTalking[partner.id]}
                          isCamOff={false}
                        />
                        {callMedia.remoteTalking[partner.id] && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold shadow-lg animate-pulse">
                            <span>Speaking</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="aspect-video rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-3 text-center space-y-1.5 bg-black/40">
                      <Heart className="h-6 w-6 text-rose-500/40 animate-pulse" />
                      <p className="text-[11px] font-semibold text-slate-300">Waiting for your partner to join…</p>
                      <button onClick={copy} className="btn !py-1 !px-2.5 text-[11px] bg-rose-600">
                        Copy Invite 💌
                      </button>
                    </div>
                  )}

                  {/* Local User Preview Pip */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-12 rounded-lg overflow-hidden bg-black border border-white/10 shrink-0">
                        <Tile
                          stream={callMedia.mine}
                          name="You"
                          isPartner={false}
                          voiceOnly={callMedia.voiceOnly}
                          isSpeaking={callMedia.localTalking}
                          isCamOff={!callCam}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white truncate">You</div>
                        <div className="text-[9px] text-slate-400">{callCam ? 'Camera Live' : 'Camera Off'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => callControlsRef.current?.toggleCam?.()}
                        className={`p-1.5 rounded-lg border ${callCam ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}
                        title="Toggle Cam"
                      >
                        {callCam ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => callControlsRef.current?.toggleMic?.()}
                        className={`p-1.5 rounded-lg border ${callMic ? 'bg-slate-800 text-white border-slate-700' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}
                        title="Toggle Mic"
                      >
                        {callMic ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-amber-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Quick Love Actions */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => socket?.emit('nudge')}
                      className="p-1.5 rounded-lg bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600/25 text-rose-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                    >
                      <Heart className="h-3 w-3 text-rose-400 fill-rose-500/30" />
                      <span>Miss You</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerReaction('❤️')}
                      className="p-1.5 rounded-lg bg-purple-600/15 border border-purple-500/30 hover:bg-purple-600/25 text-purple-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                    >
                      <span>Kiss 💋</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowPlugins(true); setPluginsTab('keepsake'); }}
                      className="p-1.5 rounded-lg bg-pink-600/15 border border-pink-500/30 hover:bg-pink-600/25 text-pink-300 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                    >
                      <Camera className="h-3 w-3 text-pink-400" />
                      <span>Polaroid</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Panel */}
              <div className="flex-1 min-h-0">
                <ChatPanel
                  socket={socket}
                  me={me}
                  name={name}
                  users={users}
                  hostId={hostId}
                  chat={chat}
                  playerRef={playerRef}
                  say={say}
                  isMobile={false}
                />
              </div>
            </aside>
          )}
        </div>
      )}



      {/* Cross-Device Handoff & Watch History Modal */}
      <WatchHistoryModal
        isOpen={showHandoff}
        onClose={() => setShowHandoff(false)}
        roomId={roomId}
        onPlayUrl={(u) => socket.emit('media:set', { media: { type: 'auto', src: u } })}
        say={say}
      />

      {/* Host Room Capacity Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-4">
          <div className="card w-full max-w-md p-6 space-y-4 border border-white/15 !bg-black rounded-2xl shadow-2xl rise">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-rose-400" />
                <span>Room Capacity Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCapacityModal(false)}
                className="text-white/60 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-white/70">
              Select maximum members allowed in this room (Host can expand anytime up to 30 members).
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { count: 2, label: '2 Seats', sub: 'Couples' },
                { count: 3, label: '3 Seats', sub: 'Trio' },
                { count: 4, label: '4 Seats', sub: 'Double Date' },
                { count: 6, label: '6 Seats', sub: 'Friends' },
                { count: 8, label: '8 Seats', sub: 'Party' },
                { count: 10, label: '10 Seats', sub: 'Squad' },
                { count: 15, label: '15 Seats', sub: 'Club' },
                { count: 20, label: '20 Seats', sub: 'Mega' },
                { count: 25, label: '25 Seats', sub: 'Ultra' },
                { count: 30, label: '30 Seats', sub: 'Max 30' },
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setCapacityDraft(opt.count)}
                  className={`rounded-xl p-2 text-center border transition-all ${
                    capacityDraft === opt.count
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg font-bold'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="block text-xs font-bold">{opt.label}</span>
                  <span className="block text-[10px] text-white/50">{opt.sub}</span>
                </button>
              ))}
            </div>

            {/* Stepper / Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-white/70">
                <span>Custom Member Limit:</span>
                <span className="font-bold font-mono text-rose-400">{capacityDraft} Members</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                value={capacityDraft}
                onChange={(e) => setCapacityDraft(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 h-2 bg-white/10 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  socket.emit('room:set_max_users', { maxUsers: capacityDraft }, (res) => {
                    if (res?.ok) {
                      setMaxSeats(res.maxUsers);
                      say(`👥 Room capacity updated to ${res.maxUsers} members!`);
                      setShowCapacityModal(false);
                    } else {
                      say(res?.message || 'Failed to update capacity');
                    }
                  });
                }}
                className="btn flex-1 !py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-600 to-rose-700"
              >
                Apply Capacity ({capacityDraft} Members)
              </button>
              <button
                type="button"
                onClick={() => setShowCapacityModal(false)}
                className="ghost !py-2.5 px-4 text-xs rounded-xl border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="card w-full max-w-sm p-6 space-y-4 border border-white/15 !bg-black">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-400" /> Room Password
              </h3>
              <button type="button" onClick={() => setShowPassModal(false)} className="text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/70 font-medium block mb-1">
                  {me === hostId ? 'Room Password (Host Control)' : 'Room Password'}
                </label>
                <div className="relative">
                  <input
                    type={passVisible ? 'text' : 'password'}
                    value={newPassDraft}
                    onChange={(e) => setNewPassDraft(e.target.value)}
                    readOnly={me !== hostId}
                    placeholder="Room password"
                    minLength={4}
                    maxLength={64}
                    className="field !pr-20 text-center font-mono text-base"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPassVisible(!passVisible)}
                      className="p-1 text-white/60 hover:text-white"
                      title={passVisible ? 'Hide' : 'Show'}
                    >
                      {passVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (newPassDraft) {
                          navigator.clipboard.writeText(newPassDraft);
                          say('Room password copied 📋');
                        }
                      }}
                      className="p-1 text-white/60 hover:text-white"
                      title="Copy password"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-white/50 mt-1">
                  {me === hostId
                    ? 'As the room host, you can edit this password at any time.'
                    : 'Share this password only with your partner.'}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPassModal(false)} className="ghost !py-2 text-xs">
                  Close
                </button>
                {me === hostId && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = newPassDraft.trim();
                      if (!p || p.length < 4) {
                        say('Password must be at least 4 characters');
                        return;
                      }
                      socket.emit('room:update_pass', { pass: p }, (res) => {
                        if (res?.ok) {
                          sessionStorage.setItem('rp_' + roomId, p);
                          try { localStorage.setItem('rp_' + roomId, p); } catch {}
                          setShowPassModal(false);
                          say('Room password updated successfully 🔒');
                        } else {
                          say(res?.message || 'Failed to update password');
                        }
                      });
                    }}
                    className="btn !py-2 text-xs"
                  >
                    Save New Password
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONAL MOBILE & TABLET NATIVE BOTTOM NAVIGATION DOCK */}
      {boot && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur-md border-t border-white/15 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.9)]">
          <div className="w-full max-w-md sm:max-w-xl mx-auto grid grid-cols-4 h-14 items-center px-2">
            {/* 1. Chat Tab */}
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={`relative flex flex-col items-center justify-center h-full transition ${
                mobileTab === 'chat' ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <div className="relative">
                <MessageSquare className={`h-5 w-5 ${mobileTab === 'chat' ? 'text-rose-400' : ''}`} />
                {chat.length > 0 && (
                  <span className="absolute -top-1 -right-2.5 bg-rose-600 text-white text-[9px] font-bold px-1 min-w-[15px] h-[15px] rounded-full flex items-center justify-center">
                    {chat.length > 99 ? '99+' : chat.length}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 ${mobileTab === 'chat' ? 'font-bold text-white' : 'font-medium'}`}>Chat</span>
              {mobileTab === 'chat' && <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-rose-500" />}
            </button>

            {/* 2. Call Tab */}
            <button
              type="button"
              onClick={() => setMobileTab('call')}
              className={`relative flex flex-col items-center justify-center h-full transition ${
                mobileTab === 'call' ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <div className="relative">
                {callCam ? (
                  <Video className={`h-5 w-5 ${mobileTab === 'call' ? 'text-emerald-400' : 'text-emerald-400/80'}`} />
                ) : (
                  <VideoOff className={`h-5 w-5 ${mobileTab === 'call' ? 'text-rose-400' : 'text-rose-400/80'}`} />
                )}
                <span className={`absolute -top-0.5 -right-1 h-2 w-2 rounded-full ring-1 ring-black ${callCam ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              </div>
              <span className={`text-[10px] mt-0.5 ${mobileTab === 'call' ? 'font-bold text-white' : 'font-medium'}`}>
                {callCam ? 'Call' : 'Cam Off'}
              </span>
              {mobileTab === 'call' && <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-emerald-400" />}
            </button>

            {/* 3. Love / Gestures Tab */}
            <button
              type="button"
              onClick={() => setMobileTab('gestures')}
              className={`relative flex flex-col items-center justify-center h-full transition ${
                mobileTab === 'gestures' ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Heart className={`h-5 w-5 ${mobileTab === 'gestures' ? 'text-rose-400 fill-rose-500/20' : 'text-white/50'}`} />
              <span className={`text-[10px] mt-0.5 ${mobileTab === 'gestures' ? 'font-bold text-white' : 'font-medium'}`}>Love</span>
              {mobileTab === 'gestures' && <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-rose-500" />}
            </button>

            {/* 4. Tools / Room Settings Tab */}
            <button
              type="button"
              onClick={() => setMobileTab('tools')}
              className={`relative flex flex-col items-center justify-center h-full transition ${
                mobileTab === 'tools' ? 'text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <div className="relative">
                <Sliders className={`h-5 w-5 ${mobileTab === 'tools' ? 'text-cyan-400' : ''}`} />
                {(queue.length > 0 || timer?.running || readyCheck?.active) && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-black text-[9px] font-extrabold px-1 rounded-full">
                    {timer?.running ? '⏱' : readyCheck?.active ? '!' : queue.length}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 ${mobileTab === 'tools' ? 'font-bold text-white' : 'font-medium'}`}>Tools</span>
              {mobileTab === 'tools' && <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-cyan-400" />}
            </button>
          </div>
        </nav>
      )}

      {/* Modular Cinema Plugins Suite Modal */}
      <CinemaPlugins
        isOpen={showPlugins}
        onClose={() => setShowPlugins(false)}
        socket={socket}
        me={me}
        hostId={hostId}
        users={users}
        currentMedia={currentMedia}
        timer={timer}
        say={say}
        defaultTab={pluginsTab}
        onTriggerReaction={triggerReaction}
      />

      {/* Toast notifications */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-16 sm:bottom-6 z-50 flex justify-center px-4">
        {toast && <div key={toast.n} className="toast rounded-full bg-black/85 px-4 py-2 text-xs sm:text-sm text-white shadow-2xl backdrop-blur-md border border-white/10">{toast.m}</div>}
      </div>
    </div>
  );
}
