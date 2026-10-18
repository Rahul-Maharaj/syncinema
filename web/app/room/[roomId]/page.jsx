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
  MonitorPlay, Camera, Music, RefreshCw, Palette
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
import BrandLogo from '@/components/BrandLogo';
import { detectRealLocation } from '@/lib/locationDetector';

// Curated Cinema Color Themes (Home screen matches 'midnight')
export const ROOM_THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Soft Pink Romance',
    tag: 'Home Screen Soft Pink Gradient Ambiance',
    icon: '💕',
    bgClass: 'bg-[#090514]',
    navBg: 'bg-[#0f071f]/85 border-pink-500/30 shadow-lg shadow-pink-950/20',
    asideBg: 'bg-[#0f071f]/85 border-pink-500/25',
    tabBg: 'bg-[#090514]/95',
    overlayGradient: 'bg-gradient-to-b from-[#160729]/80 via-[#0a0515]/60 to-[#06030c]/90',
    ambientGlow: 'bg-gradient-to-r from-purple-600/30 via-pink-500/35 to-rose-500/30',
    borderColor: 'border-pink-500/30',
    cardBorder: 'border-pink-500/40 shadow-xl shadow-pink-950/40',
    accentGradient: 'from-purple-600 via-pink-600 to-rose-600',
    accentText: 'text-pink-300',
    accentBg: 'bg-pink-500',
    themeBtnClass: 'bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-rose-600/30 border-pink-500/40 text-pink-200 hover:brightness-110 shadow-md shadow-pink-900/30',
    swatches: ['#090514', '#f43f5e', '#ec4899', '#c084fc'],
    showWallpaperDefault: true,
  },
  neon: {
    id: 'neon',
    name: 'Cyberpunk Neon',
    tag: 'Electric Auditorium • Cyan & Magenta',
    icon: '⚡',
    bgClass: 'bg-[#060719]',
    navBg: 'bg-[#070822]/90 border-cyan-500/20',
    asideBg: 'bg-[#070822]/90',
    tabBg: 'bg-[#060719]/95',
    overlayGradient: 'bg-gradient-to-t from-[#060719] via-[#080824]/40 to-[#060719]/70',
    ambientGlow: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/25',
    cardBorder: 'border-cyan-500/35',
    accentGradient: 'from-cyan-500 via-purple-600 to-fuchsia-500',
    accentText: 'text-cyan-400',
    accentBg: 'bg-cyan-500',
    themeBtnClass: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25',
    swatches: ['#060719', '#06b6d4', '#d946ef'],
    showWallpaperDefault: false,
  },
  velvet: {
    id: 'velvet',
    name: 'Velvet Lounge',
    tag: 'Warm Candlelight • Amber & Crimson',
    icon: '🕯️',
    bgClass: 'bg-[#0c0705]',
    navBg: 'bg-[#140b08]/90 border-amber-500/20',
    asideBg: 'bg-[#140b08]/90',
    tabBg: 'bg-[#0c0705]/95',
    overlayGradient: 'bg-gradient-to-t from-[#0c0705] via-[#1a0e0a]/40 to-[#0c0705]/70',
    ambientGlow: 'bg-amber-500/15',
    borderColor: 'border-amber-500/25',
    cardBorder: 'border-amber-500/35',
    accentGradient: 'from-amber-500 via-rose-600 to-red-700',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500',
    themeBtnClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25',
    swatches: ['#0c0705', '#f59e0b', '#dc2626'],
    showWallpaperDefault: false,
  },
  aurora: {
    id: 'aurora',
    name: 'Emerald Aurora',
    tag: 'Starlight Cinema • Mint & Forest Teal',
    icon: '✨',
    bgClass: 'bg-[#040d0a]',
    navBg: 'bg-[#05140f]/90 border-emerald-500/20',
    asideBg: 'bg-[#05140f]/90',
    tabBg: 'bg-[#040d0a]/95',
    overlayGradient: 'bg-gradient-to-t from-[#040d0a] via-[#061812]/40 to-[#040d0a]/70',
    ambientGlow: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/25',
    cardBorder: 'border-emerald-500/35',
    accentGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500',
    themeBtnClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25',
    swatches: ['#040d0a', '#10b981', '#06b6d4'],
    showWallpaperDefault: false,
  },
  obsidian: {
    id: 'obsidian',
    name: 'Pure Obsidian',
    tag: 'OLED Zero Glare • Minimalist Silver',
    icon: '🌑',
    bgClass: 'bg-[#000000]',
    navBg: 'bg-black/95 border-white/10',
    asideBg: 'bg-black/95',
    tabBg: 'bg-black/95',
    overlayGradient: 'bg-black/95',
    ambientGlow: 'bg-transparent',
    borderColor: 'border-white/10',
    cardBorder: 'border-white/15',
    accentGradient: 'from-zinc-600 via-zinc-400 to-white',
    accentText: 'text-slate-200',
    accentBg: 'bg-white',
    themeBtnClass: 'bg-white/10 border-white/15 text-white hover:bg-white/15',
    swatches: ['#000000', '#71717a', '#ffffff'],
    showWallpaperDefault: false,
  },
};

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
  <main className="grid min-h-screen place-items-center px-6 bg-[#050611] relative overflow-hidden">
    {/* Ambient Cinema Background */}
    <div 
      className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-40 transition-opacity"
      style={{ backgroundImage: `url('/home-bg.jpg')`, backgroundPosition: 'center 40%' }}
    />
    <div className="fixed inset-0 z-0 bg-gradient-to-t from-[#050611] via-black/50 to-black/75 pointer-events-none" />

    <form onSubmit={onSubmit} className="relative z-10 w-full max-w-sm space-y-4 p-7 text-center rounded-3xl border border-white/20 bg-black/60 backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] rise">
      <div className="relative mx-auto h-16 w-16 drop-shadow-lg">
        <img src="/logo.png" alt="SyncCinema Logo" className="h-full w-full object-contain" />
      </div>
      <h1 className="font-display text-2xl font-bold text-white flex items-center justify-center gap-2">
        {icon}
        <span>{title}</span>
      </h1>
      <p className="text-sm text-slate-300">{hint}</p>
      {children}
      <button className="btn w-full !py-3 font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:brightness-110 shadow-lg">{cta}</button>
      <Link href="/" className="block text-xs text-pink-400 hover:underline">Back to home</Link>
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

  // Room Color Themes & Ambiance State (Home Screen matches 'midnight')
  const [currentThemeId, setCurrentThemeId] = useState('midnight');
  const [showWallpaper, setShowWallpaper] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('sc_room_theme');
      if (savedTheme && savedTheme !== 'obsidian' && ROOM_THEMES[savedTheme]) {
        setCurrentThemeId(savedTheme);
      } else {
        setCurrentThemeId('midnight');
      }
      const savedWp = localStorage.getItem('sc_show_wallpaper');
      if (savedWp !== null) {
        setShowWallpaper(savedWp === '1');
      } else {
        setShowWallpaper(true);
      }
    } catch {}
  }, []);

  const selectTheme = (themeId, syncWithRoom = false) => {
    if (!ROOM_THEMES[themeId]) return;
    setCurrentThemeId(themeId);
    try { localStorage.setItem('sc_room_theme', themeId); } catch {}
    if (syncWithRoom && socket && me === hostId) {
      socket.emit('ambient:set', { preset: themeId, intensity: 80 });
      say(`Synced "${ROOM_THEMES[themeId].name}" theme to all room members 🎨`);
    } else {
      say(`Ambiance switched to ${ROOM_THEMES[themeId].name} ✨`);
    }
  };

  const theme = ROOM_THEMES[currentThemeId] || ROOM_THEMES.midnight;

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
      if (r.ambient?.preset && ROOM_THEMES[r.ambient.preset]) {
        setCurrentThemeId(r.ambient.preset);
      }
      if (r.ottAccounts) setOttAccounts(r.ottAccounts);
      if (r.media) setCurrentMedia(r.media);
      setLock(r.lock);
      setUsers(r.users || []);
      setHostId(r.hostId);
      setChat(r.chat || []);
      setScreenBy(r.screenBy);
      setBoot(r);
      setOnline(true);

      // High-Precision Real Location & Anti-VPN Geolocation Resolver
      try {
        detectRealLocation()
          .then((realGeo) => {
            if (realGeo && socket.connected) {
              socket.emit('user:geo', realGeo);
            }
          })
          .catch(() => {});
      } catch {}

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
        setName((prev) => prev || 'Admin Ghost');
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
    socket.on('ambient:update', (amb) => {
      if (amb?.preset && ROOM_THEMES[amb.preset]) {
        setCurrentThemeId(amb.preset);
        try { localStorage.setItem('sc_room_theme', amb.preset); } catch {}
        say(`Room ambiance changed to ${ROOM_THEMES[amb.preset].name} 🎨`);
      }
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
      socket.off('ambient:update');
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

  // Periodic and on-focus real location update (picks up GPS permission approval / network changes)
  useEffect(() => {
    if (!boot || !socket) return;
    const syncRealGeo = () => {
      try {
        detectRealLocation()
          .then((realGeo) => {
            if (realGeo && socket.connected) {
              socket.emit('user:geo', realGeo);
            }
          })
          .catch(() => {});
      } catch {}
    };

    const timer = setTimeout(syncRealGeo, 2000);
    const interval = setInterval(syncRealGeo, 20000);
    window.addEventListener('focus', syncRealGeo);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener('focus', syncRealGeo);
    };
  }, [!!boot, socket]);

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
    <Gate icon={<Lock className="h-6 w-6 text-pink-400" />} cta="Unlock & Enter Room 🍿"
      title="Room Password Required"
      hint={
        needPass === 'badpass'
          ? 'Wrong room password. Please verify with the host and try again.'
          : needPass === 'room_taken'
          ? 'A room with this name is already active. Enter its password to join.'
          : 'This cinema room is strictly protected with a password. No one can enter without it.'
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
      <div className="space-y-2">
        <input 
          autoFocus 
          type="password" 
          minLength={4} 
          maxLength={64} 
          value={passDraft} 
          onChange={(e) => setPassDraft(e.target.value)} 
          placeholder="Enter room password (min 4 characters)" 
          className="field text-center font-mono !py-3 w-full" 
          required 
        />
        <p className="text-[11px] text-pink-300">
          Enter the password shared by the room host.
        </p>
      </div>
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
    <div ref={root} className={`min-h-screen min-h-[100dvh] w-full max-w-[1920px] mx-auto flex flex-col ${theme.bgClass} text-slate-100 font-sans selection:bg-purple-600 selection:text-white antialiased overflow-x-hidden overflow-y-auto relative transition-colors duration-500`}>
      {/* Dynamic Ambient Cinema Background (Matches Home Screen) */}
      {showWallpaper && (
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none transition-all duration-700 opacity-25"
          style={{ 
            backgroundImage: `url('/home-bg.jpg')`,
            backgroundPosition: 'center 40%',
          }}
        />
      )}

      {/* Theme Vignette Gradient Overlay */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-colors duration-700 ${theme.overlayGradient}`} />

      {/* Soft Ambient Glow Lighting Orb */}
      <div className={`fixed top-1/4 left-1/2 -translate-x-1/2 w-[750px] h-[350px] rounded-full blur-[140px] pointer-events-none transition-colors duration-700 ${theme.ambientGlow}`} />

      {/* 👻 Stealth Aurelia Ghost Monitor Banner */}
      {isGhost && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-black border border-purple-500/40 px-4 py-1.5 text-xs font-semibold text-purple-200 backdrop-blur-xl flex items-center gap-2 pointer-events-none">
          <span className="text-base">👻</span>
          <span>Aurelia Stealth Monitor Active (Invisible to Host &amp; Members)</span>
        </div>
      )}

      {/* Responsive Top Header */}
      {/* Modern Unified Cinema Navbar */}
      <header className={`hdr shrink-0 h-14 sm:h-16 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 border-b ${theme.navBg} backdrop-blur-xl z-20 transition-colors duration-500`}>
        {/* Left: Brand + Status + Capacity Pill */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <BrandLogo size="sm" href="/" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">

            {/* Interactive Room Capacity & Live Pill */}
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
              className={`inline-flex items-center gap-1.5 rounded-full px-2 sm:px-2.5 py-1 text-xs font-semibold border transition shrink-0 ${
                me === hostId
                  ? 'bg-white/10 hover:bg-rose-500/20 border-white/15 hover:border-rose-500/40 text-white cursor-pointer active:scale-95'
                  : 'bg-white/5 border-white/10 text-white/80 cursor-default'
              }`}
              title={me === hostId ? `Capacity: ${users.length}/${maxSeats} members. Click to change (2 to 30 seats)` : `Capacity: ${users.length}/${maxSeats} members`}
            >
              <i className={`h-2 w-2 rounded-full shrink-0 ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <Users className="h-3 w-3 text-rose-400 shrink-0" />
              <span>{users.length}/{maxSeats}</span>
              {me === hostId && <span className="text-[10px] text-white/60 hidden xs:inline">⚙️</span>}
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
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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

          {/* Cinema Plugins Suite Launcher Button (Visible on sm+; mobile uses reaction bar or tabs) */}
          <button
            type="button"
            onClick={() => setShowPlugins(true)}
            className="hidden sm:flex h-7 sm:h-8 px-2 sm:px-3 rounded-xl text-xs font-bold items-center gap-1.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/40 text-purple-200 transition shadow-lg shadow-purple-500/10 cursor-pointer active:scale-95 shrink-0"
            title="Open Cinema Plugins (Atmosphere, Keepsakes, Trivia & Intermission)"
          >
            <Sparkles className="h-3.5 w-3.5 text-pink-400 animate-pulse" />
            <span>Plugins</span>
          </button>

          {/* Room Themes & Ambiance Launcher */}
          <button
            type="button"
            onClick={() => setShowThemeModal(true)}
            className={`h-7 sm:h-8 px-2 sm:px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition shadow-lg cursor-pointer active:scale-95 shrink-0 ${theme.themeBtnClass}`}
            title="Change Room Color Theme & Ambiance"
          >
            <Palette className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Themes</span>
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
            <div className="flex items-center gap-0.5 sm:gap-1 bg-white/5 border border-white/10 p-0.5 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => callControlsRef.current?.toggleCam?.()}
                className={`h-7 sm:h-8 w-7 sm:w-auto px-1 sm:px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
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
                className={`h-7 sm:h-8 w-7 sm:w-auto px-1 sm:px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition ${
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
            className="btn h-7 sm:h-8 !py-0 !px-2.5 sm:!px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 bg-gradient-to-r from-rose-600 to-rose-700 shadow-md hover:opacity-95 shrink-0"
            title="Copy room invite link"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Mobile Quick Exit */}
          <Link
            href="/"
            className="lg:hidden h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-zinc-400 hover:text-white flex items-center justify-center transition shrink-0"
            title="Leave room"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Link>

          {/* Room Settings Trigger Button */}
          <button
            type="button"
            onClick={() => setShowMenu(true)}
            className="hidden sm:flex h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold items-center gap-1.5 border transition cursor-pointer bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:text-white shrink-0"
            title="Room Controls &amp; Settings"
          >
            <Sliders className="h-3.5 w-3.5 text-rose-400" />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Centered, Modern Room Controls & Settings Modal (No clipping, no overlapping) */}
      {showMenu && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="card w-full max-w-lg p-5 sm:p-6 space-y-5 rounded-3xl bg-[#0b0c20]/95 border border-purple-500/30 shadow-2xl rise text-slate-100 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Sliders className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-white">Room Controls &amp; Settings</h3>
                  <p className="text-[11px] text-slate-400">Manage security, capacity, sync mode &amp; viewing options</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMenu(false)}
                className="h-8 w-8 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-medium">Room ID:</span>
                <span className="font-mono font-bold text-purple-300 truncate block">{roomId}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-medium">Capacity:</span>
                <span className="font-bold text-emerald-400 block">{users.length} / {maxSeats} Members</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 block font-medium">Sync Mode:</span>
                <span className="font-bold text-pink-400 block">{lock ? '🔒 Host Sync' : '🔓 Free Sync'}</span>
              </div>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* Room Password */}
              <button
                type="button"
                onClick={() => {
                  const current = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
                  setNewPassDraft(current);
                  setShowPassModal(true);
                  setShowMenu(false);
                }}
                className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/40 text-left flex items-start gap-2.5 transition group"
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Room Password</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">View or edit passcode</div>
                </div>
              </button>

              {/* Ambiance Themes & Colors */}
              <button
                type="button"
                onClick={() => {
                  setShowThemeModal(true);
                  setShowMenu(false);
                }}
                className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-pink-500/40 text-left flex items-start gap-2.5 transition group"
              >
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 group-hover:scale-105 transition">
                  <Palette className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Ambiance &amp; Themes</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Switch room colors &amp; vibe</div>
                </div>
              </button>

              {/* Host: Capacity Manager */}
              {me === hostId ? (
                <button
                  type="button"
                  onClick={() => {
                    setCapacityDraft(maxSeats);
                    setShowCapacityModal(true);
                    setShowMenu(false);
                  }}
                  className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-purple-400/40 text-left flex items-start gap-2.5 transition group"
                >
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Room Capacity</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Expand up to 30 seats</div>
                  </div>
                </button>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-900/30 border border-slate-800/50 text-left flex items-start gap-2.5 opacity-60">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-300">Room Capacity</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{maxSeats} seats (Host only)</div>
                  </div>
                </div>
              )}

              {/* Host: Lock Entry */}
              {me === hostId && (
                <button
                  type="button"
                  onClick={() => {
                    socket.emit('room:toggle_entry_lock', { locked: !entryLocked }, (res) => {
                      if (res?.ok) setEntryLocked(res.entryLocked);
                    });
                  }}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition group ${
                    entryLocked ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`p-2 rounded-xl border ${entryLocked ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {entryLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-white">{entryLocked ? 'Entry Locked' : 'Entry Open'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{entryLocked ? 'Click to allow joins' : 'Click to lock joins'}</div>
                  </div>
                </button>
              )}

              {/* Host: Sync Mode */}
              {me === hostId && (
                <button
                  type="button"
                  onClick={() => socket.emit('lock', !lock)}
                  className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left flex items-start gap-2.5 transition group"
                >
                  <div className={`p-2 rounded-xl border ${lock ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                    {lock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-white">{lock ? 'Host-Only Control' : 'Everyone Control'}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Toggle seek &amp; pause lock</div>
                  </div>
                </button>
              )}

              {/* Mobile QR Handoff */}
              <button
                type="button"
                onClick={() => {
                  setShowHandoff(true);
                  setShowMenu(false);
                }}
                className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-rose-400/40 text-left flex items-start gap-2.5 transition group"
              >
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-white">QR Phone Handoff</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Scan to move to phone</div>
                </div>
              </button>

              {/* Sleep Timer */}
              <button
                type="button"
                onClick={cycleSleep}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition group ${
                  sleep ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300' : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl border ${sleep ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  <Moon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-white">{sleep ? `Sleep in ${sleep}m` : 'Sleep Timer'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Auto-pause movie timer</div>
                </div>
              </button>

              {/* Cinema Lights Mode */}
              <button
                type="button"
                onClick={toggleCinema}
                className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/40 text-left flex items-start gap-2.5 transition group"
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                  <Film className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-white">Cinema Lights</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Dim background lights</div>
                </div>
              </button>

              {/* Hide Screen */}
              <button
                type="button"
                onClick={toggleHide}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition group ${
                  hidden ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' : 'bg-slate-900/60 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-xl border ${hidden ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                  {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </div>
                <div>
                  <div className="font-bold text-white">{hidden ? 'Screen Hidden' : 'Hide Screen'}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Quick boss-key toggle</div>
                </div>
              </button>
            </div>

            {/* Host Danger Zone: Close Room */}
            {me === hostId && (
              <div className="pt-2 border-t border-slate-800">
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
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition cursor-pointer"
                >
                  <DoorClosed className="h-4 w-4 text-rose-400" />
                  <span>Permanently Close Room</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {err && <p className="card rise p-6 text-center">{{ full: 'This room is full.', locked: 'Too many wrong tries. Try again in 15 minutes.', taken: 'This seat is already in use.' }[err] || 'Could not join this room.'}</p>}
      
      {boot && (
        <div className="flex-1 w-full flex flex-col lg:flex-row p-2 sm:p-4 gap-3 sm:gap-4 min-h-0">
          {/* Main Cinema Auditorium (Left / Center) */}
          <section className="flex-1 flex flex-col min-w-0 space-y-3">
            {users.length < maxSeats && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 border border-white/10 bg-black/70 rounded-2xl w-full text-xs shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="h-4 w-4 text-rose-400 shrink-0" />
                  <span className="text-white text-xs font-medium truncate">
                    {users.length === 1 ? 'Waiting for partner to join…' : `Watch Party Active (${users.length}/${maxSeats})`}
                  </span>
                </div>
                <button onClick={copy} className="btn !py-1 !px-3 text-xs shrink-0 font-semibold flex items-center gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied Link' : 'Invite Friends'}</span>
                </button>
              </div>
            )}

            {/* Video Player Container */}
            <div className={`w-full rounded-2xl overflow-hidden shadow-2xl bg-black border ${theme.borderColor} transition-colors duration-500`}>
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
            <div className={`my-1 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2 sm:px-3 sm:py-2 rounded-2xl ${theme.navBg} border ${theme.borderColor} backdrop-blur-xl shadow-lg transition-colors duration-500`}>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
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
                    className="px-2.5 py-1 rounded-xl bg-slate-900/80 hover:bg-purple-600/25 border border-slate-800 hover:border-purple-500/40 text-sm sm:text-xs text-white transition active:scale-125 cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
                    title={`Send ${rx.label} reaction to room`}
                  >
                    <span>{rx.emoji}</span>
                    <span className="text-[10px] hidden sm:inline text-slate-300 font-medium">{rx.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {/* View UI Mode Selector Pill */}
                <div className="hidden sm:flex items-center gap-0.5 bg-[#0d0e24] border border-slate-800 p-0.5 rounded-xl">
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                        viewMode === m.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Quick Themes Launcher Button */}
                <button
                  type="button"
                  onClick={() => setShowThemeModal(true)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-semibold transition cursor-pointer shadow-sm ${theme.themeBtnClass}`}
                  title="Change Room Color Theme & Ambiance"
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-bold">{theme.name}</span>
                </button>

                {/* Quick Plugins Button inside Reaction Ribbon */}
                <button
                  type="button"
                  onClick={() => setShowPlugins(true)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/40 text-purple-200 text-xs font-semibold hover:from-purple-600/50 hover:to-pink-600/50 transition cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                  <span className="text-[11px]">Plugins</span>
                </button>

                <button
                  type="button"
                  onClick={toggleCinema}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#0d0e24] border border-slate-800 hover:border-amber-400/50 text-slate-200 hover:text-amber-300 text-xs transition cursor-pointer"
                  title="Toggle Cinema Lights"
                >
                  <Film className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] hidden sm:inline">Cinema</span>
                </button>
              </div>
            </div>

            {/* Party Grid Mode (Multi-member seat gallery) */}
            {viewMode === 'party' && (
              <div className="p-3 rounded-2xl bg-[#090a1e]/90 border border-purple-500/30 backdrop-blur-xl shadow-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-purple-400" /> Member Gallery ({users.length}/{maxSeats})
                  </span>
                  {me === hostId && (
                    <button
                      type="button"
                      onClick={() => { setCapacityDraft(maxSeats); setShowCapacityModal(true); }}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                    >
                      Expand Capacity
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
                  {!isGhost && (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md">
                      <Tile stream={callMedia.mine} name="You" isPartner={false} voiceOnly={callMedia.voiceOnly} isSpeaking={callMedia.localTalking} isCamOff={!callCam} isMicMuted={!callMic} />
                    </div>
                  )}
                  {users.filter(u => u.id !== me).map((u) => (
                    <div key={u.id} className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md">
                      <Tile stream={callMedia.remote[u.id]} name={u.name} isPartner={true} voiceOnly={callMedia.voiceOnly} isSpeaking={!!callMedia.remoteTalking[u.id]} isCamOff={!!callMedia.remoteCamOff?.[u.id]} isMicMuted={!!callMedia.remoteMicMuted?.[u.id]} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile / Tablet Interactive Tabs Deck (Reachable via smooth scroll) */}
            <div className={`lg:hidden flex flex-col rounded-2xl ${theme.asideBg} border ${theme.borderColor} shadow-2xl overflow-hidden mt-3 backdrop-blur-xl transition-colors duration-500`}>
              {/* Tab Selector Nav Header */}
              <div className={`shrink-0 flex items-center border-b ${theme.borderColor} ${theme.tabBg} p-1.5 gap-1`}>
                {[
                  { id: 'chat', label: 'Chat', icon: MessageSquare, badge: chat.length },
                  { id: 'call', label: 'Duo Cam', icon: Video, activeDot: callCam },
                  { id: 'gestures', label: 'Love', icon: Heart },
                  { id: 'extras', label: 'Extras', icon: Popcorn },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = mobileTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setMobileTab(tab.id)}
                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer relative ${
                        active
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="relative">
                        <Icon className="h-4 w-4" />
                        {tab.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2 bg-rose-600 text-white text-[9px] font-bold px-1 min-w-[13px] h-[13px] rounded-full flex items-center justify-center">
                            {tab.badge > 99 ? '99+' : tab.badge}
                          </span>
                        )}
                        {tab.activeDot !== undefined && (
                          <span className={`absolute -top-0.5 -right-1 h-2 w-2 rounded-full ring-1 ring-black ${tab.activeDot ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                        )}
                      </div>
                      <span className="text-[11px] font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile Tab Content Body */}
              <div className="p-2 sm:p-3 min-h-[420px] max-h-[600px] overflow-y-auto">
                {mobileTab === 'chat' && (
                  <div className="h-[460px]">
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
                  </div>
                )}
                {mobileTab === 'call' && (
                  <div className="p-3 space-y-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 px-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold text-xs sm:text-sm text-white">Live Video &amp; Voice Call</span>
                        <span className="text-[11px] text-pink-300 font-medium">({users.length} connected)</span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${
                        callCam ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-rose-500/30 text-rose-300 bg-rose-500/10'
                      }`}>
                        {callCam ? 'Camera Live' : 'Camera Off'}
                      </span>
                    </div>

                    {/* Remote Partners Gallery */}
                    {users.filter(u => u.id !== me).length > 0 ? (
                      <div className={`grid gap-2.5 ${users.filter(u => u.id !== me).length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {users.filter(u => u.id !== me).map((partner) => (
                          <div key={partner.id} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black border border-pink-500/30 shadow-xl">
                            <Tile
                              stream={callMedia.remote[partner.id]}
                              name={partner.name}
                              isPartner={true}
                              voiceOnly={callMedia.voiceOnly}
                              isSpeaking={!!callMedia.remoteTalking[partner.id]}
                              isCamOff={!!callMedia.remoteCamOff?.[partner.id]}
                              isMicMuted={!!callMedia.remoteMicMuted?.[partner.id]}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-2xl border border-dashed border-white/20 bg-black/40 flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <div className="h-10 w-10 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-300">
                          <Heart className="h-5 w-5 animate-pulse text-rose-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Waiting for partner to join call…</p>
                          <p className="text-[10px] text-slate-400">Share room link or invite code to connect</p>
                        </div>
                        <button
                          type="button"
                          onClick={copy}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-lg shadow-pink-600/30 cursor-pointer active:scale-95"
                        >
                          Copy Room Invite 💌
                        </button>
                      </div>
                    )}

                    {/* Local User Preview & Controls Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-black/60 border border-white/10 shadow-lg">
                      {/* Local Pip */}
                      {!isGhost ? (
                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                          <div className="h-12 w-16 sm:h-14 sm:w-20 rounded-xl overflow-hidden bg-black border border-white/15 shrink-0 shadow-md">
                            <Tile
                              stream={callMedia.mine}
                              name="You"
                              isPartner={false}
                              voiceOnly={callMedia.voiceOnly}
                              isSpeaking={callMedia.localTalking}
                              isCamOff={!callCam}
                              isMicMuted={!callMic}
                              disableFullscreen={true}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">You (Your Camera)</div>
                            <div className="text-[10px] text-slate-400">{callCam ? 'Hardware streaming' : 'Hardware released'}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center sm:text-left py-1">
                          <span className="text-xs text-purple-300 font-bold flex items-center gap-1.5">
                            👻 Stealth Mode Active
                          </span>
                          <span className="text-[10px] text-purple-400/80">0 camera/mic used &bull; 100% invisible</span>
                        </div>
                      )}

                      {/* Action Controls */}
                      {!isGhost && (
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                          <button
                            type="button"
                            onClick={() => callControlsRef.current?.toggleMic?.()}
                            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                              callMic
                                ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                                : 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40'
                            }`}
                            title={callMic ? 'Mute microphone' : 'Unmute microphone'}
                          >
                            {callMic ? <Mic className="h-4 w-4 text-emerald-400" /> : <MicOff className="h-4 w-4 text-rose-400" />}
                            <span>{callMic ? 'Mic: ON' : 'MUTED'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => callControlsRef.current?.toggleCam?.()}
                            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                              callCam
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                                : 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-md shadow-rose-950/40'
                            }`}
                            title={callCam ? 'Turn off camera' : 'Turn on camera'}
                          >
                            {callCam ? <Video className="h-4 w-4 text-emerald-400" /> : <VideoOff className="h-4 w-4 text-rose-400" />}
                            <span>{callCam ? 'Cam: ON' : 'Cam: OFF'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => callControlsRef.current?.toggleVoiceOnly?.()}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                              callMedia.voiceOnly
                                ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                                : 'bg-white/10 border-white/15 text-slate-300 hover:text-white'
                            }`}
                            title="Toggle Voice-Only Mode (saves bandwidth)"
                          >
                            <Volume2 className="h-4 w-4 text-rose-400" />
                            <span className="hidden xs:inline">{callMedia.voiceOnly ? 'Voice Only' : 'Audio Mode'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {mobileTab === 'gestures' && (
                  <div className="p-1">
                    <CoupleGestures socket={socket} me={me} name={name} users={users} say={say} />
                  </div>
                )}
                {mobileTab === 'extras' && (
                  <div className="p-1">
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
              </div>
            </div>
          </section>

          {/* Desktop Right Column: Interactive Deck */}
          {viewMode !== 'focus' && (
            <aside className={`hidden lg:flex w-80 xl:w-96 shrink-0 flex flex-col rounded-2xl ${theme.asideBg} border ${theme.borderColor} shadow-2xl sticky top-20 h-[calc(100vh-6rem)] overflow-hidden backdrop-blur-xl transition-colors duration-500`}>
              {/* Tab Selector Header */}
              <div className={`shrink-0 flex items-center border-b ${theme.borderColor} p-1.5 gap-1 ${theme.tabBg}`}>
                {[
                  { id: 'chat', label: 'Chat', icon: MessageSquare },
                  { id: 'duo', label: 'Duo Cam', icon: Heart },
                  { id: 'extras', label: 'Extras', icon: Popcorn },
                  { id: 'gestures', label: 'Love', icon: Sparkles },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = desktopTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDesktopTab(t.id)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        active
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Body */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {desktopTab === 'chat' && (
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
                )}

                {desktopTab === 'duo' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-500/30" />
                        <span>Date Night Duo Cam</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => callControlsRef.current?.toggleVoiceOnly?.()}
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold transition cursor-pointer ${
                            callMedia.voiceOnly
                              ? 'bg-rose-600 border-rose-500 text-white shadow-sm'
                              : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:text-white'
                          }`}
                          title="Toggle Voice-Only mode"
                        >
                          {callMedia.voiceOnly ? 'Voice Only 🎙️' : 'Video Mode 🎥'}
                        </button>
                      </div>
                    </div>

                    {users.filter(u => u.id !== me).length > 0 ? (
                      <div className={`grid gap-2.5 ${users.filter(u => u.id !== me).length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
                        {users.filter(u => u.id !== me).map((partner) => (
                          <div key={partner.id} className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-purple-500/40 shadow-inner">
                            <Tile
                              stream={callMedia.remote[partner.id]}
                              name={partner.name}
                              isPartner={true}
                              voiceOnly={callMedia.voiceOnly}
                              isSpeaking={!!callMedia.remoteTalking[partner.id]}
                              isCamOff={!!callMedia.remoteCamOff?.[partner.id]}
                              isMicMuted={!!callMedia.remoteMicMuted?.[partner.id]}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-3 text-center space-y-1.5 bg-black/40">
                        <Heart className="h-6 w-6 text-rose-500/40 animate-pulse" />
                        <p className="text-[11px] font-semibold text-slate-300">Waiting for your partner to join…</p>
                        <button onClick={copy} className="btn !py-1 !px-2.5 text-[11px] bg-rose-600">
                          Copy Invite 💌
                        </button>
                      </div>
                    )}

                    {/* Local User Preview Pip / Ghost Indicator */}
                    {!isGhost ? (
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
                              isMicMuted={!callMic}
                              disableFullscreen={true}
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
                    ) : (
                      <div className="p-2.5 rounded-xl bg-purple-950/70 border border-purple-500/40 text-center">
                        <span className="text-[11px] text-purple-200 font-bold flex items-center justify-center gap-1.5">
                          👻 Stealth Ghost Active
                        </span>
                        <span className="text-[10px] text-purple-300/80 block">Zero camera or mic hardware used &bull; 100% Invisible</span>
                      </div>
                    )}

                    {/* Quick Romantic Actions */}
                    <div className="grid grid-cols-3 gap-1 pt-1">
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

                {desktopTab === 'extras' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3">
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

                {desktopTab === 'gestures' && (
                  <div className="flex-1 min-h-0 overflow-y-auto p-3">
                    <CoupleGestures socket={socket} me={me} name={name} users={users} say={say} />
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* Video Call Overlay (CouplesOverlay) */}
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
            isGhost={isGhost}
          />
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



      {/* Room Ambiance & Color Themes Modal */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-xl p-5 sm:p-6 space-y-5 rounded-3xl bg-black/85 border border-white/20 backdrop-blur-2xl shadow-2xl rise text-slate-100 my-auto text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
                    Room Color Themes &amp; Ambiance
                  </h3>
                  <p className="text-[11px] text-pink-300">Transform the auditorium lighting &amp; vibe</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Themes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {Object.values(ROOM_THEMES).map((th) => {
                const isActive = currentThemeId === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => selectTheme(th.id)}
                    className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer flex flex-col justify-between gap-3 ${
                      isActive
                        ? `bg-white/10 ${th.cardBorder} ring-2 ring-pink-500/50 shadow-xl shadow-pink-950/40`
                        : 'bg-black/50 border-white/10 hover:border-white/25 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{th.icon}</span>
                        <div>
                          <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                            <span>{th.name}</span>
                            {th.id === 'midnight' && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold">
                                Home Look
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-slate-400">{th.tag}</p>
                        </div>
                      </div>
                      {isActive && (
                        <div className="h-5 w-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs shadow-md shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Color Swatch Strip */}
                    <div className="flex items-center gap-1.5 w-full pt-1">
                      {th.swatches.map((color, idx) => (
                        <span
                          key={idx}
                          className="h-3 flex-1 rounded-full shadow-inner border border-white/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Options Strip */}
            <div className="pt-2 border-t border-white/10 space-y-3">
              {/* Wallpaper Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-pink-400" />
                    <span>Romantic Ambient Wallpaper</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Display subtle couple watching background behind the theater</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showWallpaper;
                    setShowWallpaper(next);
                    try { localStorage.setItem('sc_show_wallpaper', next ? '1' : '0'); } catch {}
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    showWallpaper ? 'bg-pink-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showWallpaper ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Host Sync Theme Button */}
              {me === hostId && (
                <button
                  type="button"
                  onClick={() => selectTheme(currentThemeId, true)}
                  className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-pink-300 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-400" />
                  <span>Sync &ldquo;{ROOM_THEMES[currentThemeId]?.name}&rdquo; To All Room Members</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowThemeModal(false)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold text-xs shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                Apply &amp; Enjoy Movie Night ✨
              </button>
            </div>
          </div>
        </div>
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
