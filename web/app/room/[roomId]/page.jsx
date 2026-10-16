'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
import {
  Send, Copy, Check, Crown, Users, Lock, Unlock, Heart, Film, X, Play,
  Moon, Home as HomeIcon, Eye, EyeOff, Trash2, KeyRound, User,
  Video, VideoOff, MessageSquare, MoreHorizontal, ListPlus, Sparkles, Settings,
  Timer, Popcorn, Flame, Shield, Star, QrCode, Smartphone, History, DoorClosed, LogOut
} from 'lucide-react';
import { getSocket, getCid } from '@/lib/socket';
import { getKey, setKey } from '@/lib/vault';
import VideoPlayer from '@/components/VideoPlayer';
import CouplesOverlay from '@/components/CouplesOverlay';
import CoupleGestures from '@/components/CoupleGestures';
import MovieNightExtras from '@/components/MovieNightExtras';
import IntimacyMode from '@/components/IntimacyMode';
import AiWatchAssistant from '@/components/AiWatchAssistant';
import WatchHistoryModal from '@/components/WatchHistoryModal';
import RecentBar from '@/components/RecentBar';
import ThemeToggle from '@/components/ThemeToggle';
import InstallPrompt from '@/components/InstallPrompt';

const EMOJI = ['❤️', '😂', '😮', '😢', '🔥', '👏'];
const QUESTIONS = [
  'What is a memory of us you replay the most?',
  'What small thing did I do that made you smile this week?',
  'Where should our first trip together be?',
  'What song reminds you of me?',
  'What are you looking forward to this month?',
  'If we had a free day together tomorrow, what would we do?',
  'What is one thing you want us to try this year?',
  'What was the best part of your day?',
  'What is a dream you have never told me?',
  'Which movie should we watch next, and why?',
  'What do you miss most about being together?',
  'What is the first thing we do when we meet?',
];

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
  <main className="grid min-h-screen place-items-center px-6 bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(35,30,48,0.45),rgba(12,10,16,0.98)_55%,#020204_100%)]">
    <form onSubmit={onSubmit} className="glass rise w-full max-w-sm space-y-4 p-7 text-center">
      <div className="relative mx-auto h-16 w-16">
        <img src="/logo.png" alt="SyncCinema Logo" className="h-full w-full object-contain drop-shadow-[0_0_25px_rgba(217,70,122,0.7)]" />
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
  const [chat, setChat] = useState([]), [text, setText] = useState('');
  const [screenBy, setScreenBy] = useState(null), [screen, setScreen] = useState(null);
  const [queue, setQueue] = useState([]), [needKey, setNeedKey] = useState(false), [keyTick, setKeyTick] = useState(0), [keyDraft, setKeyDraft] = useState('');
  const [sleep, setSleep] = useState(0), seen = useRef(new Set());
  const [err, setErr] = useState(''), [lock, setLock] = useState(false), [needPass, setNeedPass] = useState(null), [passDraft, setPassDraft] = useState('');
  const [entryLocked, setEntryLocked] = useState(false), [isGhost, setIsGhost] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false), [newPassDraft, setNewPassDraft] = useState(''), [passVisible, setPassVisible] = useState(false);
  const [online, setOnline] = useState(true), [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false), [toast, setToast] = useState(null), toastT = useRef();
  
  // Mobile enhancements & Video Call control
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'gestures' | 'extras' | 'intimacy' | 'ai'
  const [desktopTab, setDesktopTab] = useState('gestures'); // 'gestures' | 'extras' | 'intimacy' | 'ai'
  const [showMenu, setShowMenu] = useState(false);
  const [showCall, setShowCall] = useState(true);
  const [showHandoff, setShowHandoff] = useState(false);

  // Movie-Night Extras & Intimacy State
  const [watchlist, setWatchlist] = useState([]);
  const [timer, setTimer] = useState(null);
  const [readyCheck, setReadyCheck] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ambient, setAmbient] = useState({ preset: 'love', intensity: 80, flicker: false });
  const [adultMode, setAdultMode] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [currentMedia, setCurrentMedia] = useState(null);
  const [voiceActive, setVoiceActive] = useState(false);

  const peerRef = useRef(null), playerRef = useRef(null), listRef = useRef(), root = useRef();
  const socket = typeof window !== 'undefined' ? getSocket() : null;
  const me = typeof window !== 'undefined' ? getCid() : null;

  const say = (m) => { setToast({ m, n: Date.now() }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2400); };

  const applyAmbientLighting = (amb) => {
    if (!amb || typeof document === 'undefined') return;
    const presets = {
      love: 'radial-gradient(circle at 50% 20%, rgba(217, 70, 122, 0.2), transparent 70%), radial-gradient(circle at 50% 80%, rgba(20, 16, 26, 0.5), transparent 70%), #060408',
      candlelight: 'radial-gradient(circle at 50% 30%, rgba(255, 158, 66, 0.2), transparent 70%), radial-gradient(circle at 50% 80%, rgba(22, 16, 12, 0.5), transparent 70%), #060403',
      midnight: 'radial-gradient(circle at 50% 20%, rgba(138, 43, 226, 0.18), transparent 70%), radial-gradient(circle at 50% 80%, rgba(18, 12, 28, 0.5), transparent 70%), #040306',
      ruby: 'radial-gradient(circle at 50% 25%, rgba(229, 9, 20, 0.16), transparent 70%), radial-gradient(circle at 50% 80%, rgba(22, 10, 14, 0.5), transparent 70%), #060305',
      sunset: 'radial-gradient(circle at 50% 20%, rgba(255, 110, 127, 0.18), transparent 70%), radial-gradient(circle at 50% 80%, rgba(22, 14, 20, 0.5), transparent 70%), #050305',
      noir: 'radial-gradient(circle at 50% 50%, rgba(35, 40, 55, 0.2), transparent 70%), radial-gradient(circle at 50% 90%, rgba(16, 16, 22, 0.5), transparent 70%), #020204',
    };
    const bg = presets[amb.preset] || presets.love;
    const opacity = (amb.intensity ?? 80) / 100;
    const ambientEl = document.querySelector('.ambient');
    if (ambientEl) {
      ambientEl.style.background = bg;
      ambientEl.style.opacity = opacity;
      if (amb.flicker) {
        ambientEl.classList.add('candle-flicker');
      } else {
        ambientEl.classList.remove('candle-flicker');
      }
    }
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
      setAmbient(r.ambient || { preset: 'love', intensity: 80, flicker: false });
      setAdultMode(!!r.adult);
      setHasPin(!!r.hasPin);
      if (r.media) setCurrentMedia(r.media);
      applyAmbientLighting(r.ambient);
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
    socket.on('ambient:update', (amb) => {
      setAmbient(amb);
      applyAmbientLighting(amb);
    });
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

  useEffect(() => {
    const last = listRef.current?.lastElementChild;
    if (last) {
      gsap.from(last, { x: 24, opacity: 0, duration: 0.35 });
      listRef.current.scrollTop = 1e9;
    }
  }, [chat.length, mobileTab]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit('chat', { text, vt: playerRef.current?.time?.() || 0 });
    setText('');
  };
  const ask = () => socket.emit('chat', { text: '💬 ' + QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)], vt: playerRef.current?.time?.() || 0 });
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
  const clearChat = () => { if (confirm('Delete the chat history for both of you? This cannot be undone.')) socket.emit('chat:clear'); };
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

  if (needKey) return (
    <Gate icon={<KeyRound className="h-6 w-6" />} title="Our secret word" hint="This room is private. Type the word only you two know." cta="Unlock"
      onSubmit={(e) => { e.preventDefault(); setKey(keyDraft); setNeedKey(false); doJoin(undefined, keyDraft); }}>
      <input autoFocus type="password" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} placeholder="Secret word" className="field text-center" />
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

  // Chat panel component shared between mobile tab and desktop aside
  const ChatPanel = ({ isMobile = false }) => (
    <div className={`card vault flex flex-col p-3.5 sm:p-4 ${isMobile ? 'h-[50vh] sm:h-[55vh]' : 'h-full'}`}>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs opacity-60"><Users className="h-3.5 w-3.5" />{users.length} here</span>
        {users.map((u) => (
          <span key={u.id} className="flex items-center gap-1 rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-xs">
            <i className="h-2 w-2 rounded-full" style={{ background: u.color }} />
            {u.name}
            {u.id === hostId && <Crown className="h-3 w-3 text-amber-500" title="Room Host" />}
            {me === hostId && u.id !== me && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Pass host controls to ${u.name}?`)) {
                    socket.emit('host:handover', { targetId: u.id });
                    say?.(`Handed host controls to ${u.name}`);
                  }
                }}
                className="opacity-40 hover:opacity-100 hover:text-amber-400 p-0.5 ml-0.5 transition"
                title={`Transfer host controls to ${u.name}`}
              >
                <Crown className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        {chat.length > 0 && (
          <button onClick={clearChat} title="Delete chat history" aria-label="Delete chat history" className="ml-auto rounded-lg p-1 opacity-50 transition hover:opacity-100">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto pr-1">
        {chat.length === 0 && <p className="mt-8 text-center text-sm opacity-50">No messages yet.<br />Say hi 👋 or tap 💬 for a conversation starter.</p>}
        {chat.map((m) => {
          const mine = m.user === name;
          return (
            <div key={m.id} className={`flex flex-col text-sm leading-snug ${mine ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 text-xs">
                <b style={{ color: m.color }}>{mine ? 'You' : m.user}</b>
                <button onClick={() => playerRef.current?.seek(m.vt)} title="Jump to this moment" className="rounded bg-[#d9467a]/15 px-1 text-[11px] text-[#d9467a] hover:bg-[#d9467a]/25">{fmt(m.vt)}</button>
              </div>
              <p className={`mt-0.5 max-w-[85%] break-words rounded-2xl px-3 py-1.5 ${mine ? 'rounded-tr-sm bg-[#d9467a] text-white' : 'rounded-tl-sm bg-black/5 dark:bg-white/10'}`}>{m.text}</p>
            </div>
          );
        })}
      </div>
      <div className="my-2 flex items-center justify-between">
        <div className="flex gap-1">
          {EMOJI.map((e) => (
            <button
              key={e}
              onClick={() => {
                socket.emit('reaction', e);
                socket.emit('reaction:timed', { emoji: e, vt: playerRef.current?.time?.() || 0 });
              }}
              aria-label={`React ${e}`}
              className="rounded-lg p-1 text-xl transition hover:-translate-y-1 hover:scale-125 active:scale-90"
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const cur = playerRef.current?.time?.() || 0;
              setText((prev) => `[${fmt(cur)}] ` + prev);
            }}
            title="Attach current video timestamp"
            className="rounded-lg text-[11px] text-[#ff6fa0] bg-white/5 hover:bg-white/10 border border-[#ff6fa0]/30 px-2 py-1 font-mono transition"
          >
            ⏱️ {fmt(playerRef.current?.time?.() || 0)}
          </button>
          <button onClick={ask} aria-label="Conversation starter" title="Conversation starter" className="rounded-lg p-1 text-xl transition hover:-translate-y-1 hover:scale-125 active:scale-90">💬</button>
        </div>
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Say something sweet…" className="field" />
        <button className="btn !px-3" aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );

  return (
    <div ref={root} className="mx-auto max-w-7xl px-3 sm:px-4 py-3 sm:py-4">
      {/* 👻 Stealth Admin Ghost Monitor Banner */}
      {isGhost && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded-full bg-purple-950/95 border border-purple-400/60 px-4 py-1.5 text-xs font-semibold text-purple-200 shadow-2xl backdrop-blur-xl flex items-center gap-2 pointer-events-none">
          <span className="text-base animate-pulse">👻</span>
          <span>Admin Stealth Monitor Active (Invisible to Host &amp; Members)</span>
        </div>
      )}

      {/* Responsive Top Header */}
      <header className="hdr mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/" className="ghost !p-1.5 sm:!p-2 flex items-center" aria-label="Back to home" title="Back to home">
            <img src="/logo.png" alt="SyncCinema Logo" className="h-6 w-6 sm:h-7 sm:w-7 object-contain drop-shadow-[0_0_8px_rgba(217,70,122,0.6)]" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-base sm:text-xl font-semibold">SyncCinema</h1>
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:text-xs ${online ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-500'}`}>
              <i className={`h-1.5 w-1.5 rounded-full ${online ? 'animate-pulse bg-emerald-400' : 'bg-rose-500'}`} />{online ? 'Live' : 'Reconnecting'}
            </span>
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:text-xs bg-white/5 border border-white/10 text-white/80" title={`Room capacity: ${users.length} of ${maxSeats} members`}>
              <Users className="h-3 w-3 text-[#ff8fb3]" />
              <span>{users.length}/{maxSeats}</span>
            </span>
            {entryLocked && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold" title="Host locked this room from new entries">
                <Lock className="h-3 w-3" />
                <span className="hidden sm:inline">Locked</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Active Snack Timer Indicator */}
          {timer?.running && (
            <button
              type="button"
              onClick={() => { setMobileTab('extras'); setDesktopTab('extras'); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono animate-pulse hover:bg-emerald-500/30"
              title="Synchronized snack break in progress"
            >
              <Timer className="h-3 w-3" />
              <span>🍿 {Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) / 60)}:{(Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) % 60) + '').padStart(2, '0')}</span>
            </button>
          )}

          {/* Active Ready Check Indicator */}
          {readyCheck?.active && (
            <button
              type="button"
              onClick={() => { setMobileTab('extras'); setDesktopTab('extras'); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d9467a]/25 border border-[#d9467a]/50 text-[#ff8fb3] text-xs font-semibold animate-bounce hover:bg-[#d9467a]/40"
              title="Ready to watch check-in active"
            >
              <Popcorn className="h-3 w-3" />
              <span className="hidden sm:inline">Ready Check</span>
            </button>
          )}

          {/* Adult Mode Indicator */}
          {adultMode && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-bold" title="Adults-Only 18+ Private Couch">
              18+ 🔥
            </span>
          )}

          {/* Prominent Video Call Hide/Show Button */}
          {!isGhost && (
            <button
              type="button"
              onClick={() => setShowCall(!showCall)}
              className={`ghost !px-2.5 !py-1.5 flex items-center gap-1.5 text-xs font-medium transition ${
                showCall
                  ? 'text-emerald-500 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                  : 'text-white/60 hover:text-white border-white/10'
              }`}
              title={showCall ? 'Hide video call to save space and battery' : 'Show video call'}
            >
              {showCall ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-rose-400" />}
              <span>{showCall ? 'Hide Call' : 'Show Call'}</span>
            </button>
          )}

          {/* Quick Handoff Button */}
          <button
            type="button"
            onClick={() => setShowHandoff(true)}
            className="ghost !py-1.5 !px-2.5 text-xs flex items-center gap-1.5 border-white/10 hover:border-[#ff6fa0]/40 transition"
            title="Scan QR Code to open on mobile phone or view history"
          >
            <QrCode className="h-3.5 w-3.5 text-[#ff6fa0]" />
            <span className="hidden sm:inline">Handoff</span>
          </button>

          {/* Quick Recent Bar Button */}
          <button
            type="button"
            onClick={() => {
              setDesktopTab('recent');
              setMobileTab('recent');
              say('Opened Recent Plays Bar 🕒');
            }}
            className="ghost !py-1.5 !px-2.5 text-xs flex items-center gap-1.5 border-white/10 hover:border-cyan-400/40 text-cyan-300 transition"
            title="Open Recent Plays Bar"
          >
            <History className="h-3.5 w-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Recent</span>
          </button>

          {/* Room Password Button */}
          <button
            type="button"
            onClick={() => {
              const current = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
              setNewPassDraft(current);
              setShowPassModal(true);
            }}
            className="ghost !py-1.5 !px-2.5 text-xs flex items-center gap-1.5 border-white/10 hover:border-amber-400/40 text-amber-300 transition"
            title="View or change room password"
          >
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Password</span>
          </button>

          {/* Host Lock / Unlock Room Control */}
          {me === hostId && (
            <button
              type="button"
              onClick={() => {
                socket.emit('room:toggle_entry_lock', { locked: !entryLocked }, (res) => {
                  if (res?.ok) setEntryLocked(res.entryLocked);
                });
              }}
              className={`ghost !py-1.5 !px-2.5 text-xs flex items-center gap-1.5 border transition ${
                entryLocked
                  ? 'border-amber-500/50 text-amber-300 bg-amber-500/15 hover:bg-amber-500/25'
                  : 'border-white/10 hover:border-amber-400/40 text-white/70 hover:text-white'
              }`}
              title={entryLocked ? 'Room is locked! No new members can enter. Click to unlock.' : 'Lock room so no one else can enter.'}
            >
              {entryLocked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Unlock className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{entryLocked ? 'Locked' : 'Lock Room'}</span>
            </button>
          )}

          {/* Quick Invite Button */}
          <button onClick={copy} className="btn !py-1.5 !px-3 text-xs" title="Copy the invite link">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Invite'}</span>
          </button>

          {/* Host Close Room Button */}
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
              className="ghost !py-1.5 !px-2.5 text-xs flex items-center gap-1.5 border-rose-500/30 hover:border-rose-500/60 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition"
              title="Close room and disconnect all members"
            >
              <DoorClosed className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Close Room</span>
            </button>
          )}

          {/* Desktop Toolbar Icons (Hidden on Mobile) */}
          <div className="hidden lg:flex items-center gap-2">
            {me === hostId && <Tool onClick={() => socket.emit('lock', !lock)} title={lock ? 'Only you control playback' : 'Everyone controls playback'} icon={lock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} label={lock ? 'Host controls' : 'Everyone controls'} />}
            <Tool onClick={() => socket.emit('nudge')} title="Send hearts to your partner" icon={<Heart className="beat h-4 w-4 text-[#d9467a]" />} label="Miss you" />
            <Tool onClick={toggleCinema} title="Cinema mode: dim lights" icon={<Film className="h-4 w-4" />} label="Cinema" />
            <Tool onClick={cycleSleep} title="Sleep timer" icon={<Moon className="h-4 w-4" />} label={sleep ? `${sleep}m` : 'Sleep'} />
            <Tool onClick={toggleHide} title={hidden ? 'Show screen' : 'Hide screen (blur)'} icon={hidden ? <EyeOff className="h-4 w-4 text-[#d9467a]" /> : <Eye className="h-4 w-4" />} label={hidden ? 'Hidden' : 'Hide'} />
            <InstallPrompt />
            <ThemeToggle />
          </div>

          {/* Mobile Options Button (Triggers Mobile Sheet) */}
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            className="lg:hidden ghost !p-2"
            title="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Options Slide-down / Dropdown */}
      {showMenu && (
        <div className="lg:hidden card rise mb-3 p-3.5 space-y-3 bg-[#181120]/95 backdrop-blur-xl border border-white/20">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Room Options</span>
            <button onClick={() => setShowMenu(false)} className="opacity-60 hover:opacity-100 p-1"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => { setShowHandoff(true); setShowMenu(false); }}
              className="ghost !justify-start !py-2.5 !px-3"
            >
              <Smartphone className="h-4 w-4 text-[#ff6fa0]" />
              <span>Mobile Handoff</span>
            </button>
            <button
              onClick={() => { setMobileTab('recent'); setShowMenu(false); }}
              className="ghost !justify-start !py-2.5 !px-3 text-cyan-300"
            >
              <History className="h-4 w-4 text-cyan-400" />
              <span>Recent Bar</span>
            </button>
            <button
              onClick={() => {
                const current = sessionStorage.getItem('rp_' + roomId) || (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') || '';
                setNewPassDraft(current);
                setShowPassModal(true);
                setShowMenu(false);
              }}
              className="ghost !justify-start !py-2.5 !px-3 text-amber-300"
            >
              <Lock className="h-4 w-4 text-amber-400" />
              <span>Room Password</span>
            </button>
            {me === hostId && (
              <button
                onClick={() => {
                  socket.emit('room:toggle_entry_lock', { locked: !entryLocked }, (res) => {
                    if (res?.ok) setEntryLocked(res.entryLocked);
                  });
                  setShowMenu(false);
                }}
                className={`ghost !justify-start !py-2.5 !px-3 ${entryLocked ? 'text-amber-300 bg-amber-500/15 border border-amber-500/40' : 'text-white/80'}`}
              >
                {entryLocked ? <Lock className="h-4 w-4 text-amber-400" /> : <Unlock className="h-4 w-4" />}
                <span>{entryLocked ? 'Unlock Room' : 'Lock Room'}</span>
              </button>
            )}
            {me === hostId && (
              <button
                onClick={() => {
                  setShowMenu(false);
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
                className="ghost !justify-start !py-2.5 !px-3 text-rose-400 bg-rose-500/10 border border-rose-500/30"
              >
                <DoorClosed className="h-4 w-4 text-rose-400" />
                <span>Close Room</span>
              </button>
            )}
            <button
              onClick={() => { socket.emit('nudge'); setShowMenu(false); }}
              className="ghost !justify-start !py-2.5 !px-3"
            >
              <Heart className="h-4 w-4 text-[#ff6fa0]" />
              <span>Miss You (Nudge)</span>
            </button>
            <button
              onClick={() => { toggleCinema(); setShowMenu(false); }}
              className="ghost !justify-start !py-2.5 !px-3"
            >
              <Film className="h-4 w-4 text-amber-400" />
              <span>Cinema Mode</span>
            </button>
            <button
              onClick={() => { cycleSleep(); setShowMenu(false); }}
              className="ghost !justify-start !py-2.5 !px-3"
            >
              <Moon className="h-4 w-4 text-indigo-400" />
              <span>{sleep ? `Sleep: ${sleep}m` : 'Sleep Timer'}</span>
            </button>
            <button
              onClick={() => { toggleHide(); setShowMenu(false); }}
              className="ghost !justify-start !py-2.5 !px-3"
            >
              {hidden ? <EyeOff className="h-4 w-4 text-[#d9467a]" /> : <Eye className="h-4 w-4" />}
              <span>{hidden ? 'Show Screen' : 'Hide Screen'}</span>
            </button>
            {me === hostId && (
              <button
                onClick={() => { socket.emit('lock', !lock); setShowMenu(false); }}
                className="ghost !justify-start !py-2.5 !px-3"
              >
                {lock ? <Lock className="h-4 w-4 text-emerald-400" /> : <Unlock className="h-4 w-4" />}
                <span>{lock ? 'Host Locked' : 'Unlock Controls'}</span>
              </button>
            )}
            <div className="ghost !justify-start !py-2 !px-3">
              <ThemeToggle />
              <span className="ml-1">Theme</span>
            </div>
          </div>
          <div className="pt-1">
            <InstallPrompt className="w-full justify-center !py-2" />
          </div>
        </div>
      )}

      {err && <p className="card rise p-6 text-center">{{ full: 'This room is full.', locked: 'Too many wrong tries. Try again in 15 minutes.', taken: 'This seat is already in use.' }[err] || 'Could not join this room.'}</p>}
      
      {boot && (
        <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1fr_340px]">
          {/* Main Content Area */}
          <section className="panel flex flex-col">
            {users.length < 2 && (
              <div className="card rise mb-3 flex items-center gap-3 p-3 sm:p-4 border border-white/10 !bg-gradient-to-r from-[#14121a]/90 via-[#0d0b12]/92 to-[#060509]/96 backdrop-blur">
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d9467a]/15"><i className="ring" /><img src="/logo.png" alt="SyncCinema" className="h-6 w-6 object-contain drop-shadow-[0_0_8px_rgba(217,70,122,0.8)]" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium">Waiting for your partner…</p>
                  <p className="text-xs sm:text-sm opacity-65 truncate">Send them the invite link to join.</p>
                </div>
                <button onClick={copy} className="btn shrink-0 !py-1.5 !px-3 text-xs"><Copy className="h-3.5 w-3.5" />Copy link</button>
              </div>
            )}

            {/* Video Player (Pinned at the top of the mobile screen) */}
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
              onOpenRecent={() => { setMobileTab('recent'); setDesktopTab('recent'); }}
            />

            {/* MOBILE ONLY: App-like Segmented Tab Bar */}
            <div className="lg:hidden flex rounded-xl bg-black/40 p-1 border border-white/10 gap-1 my-2.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setMobileTab('chat')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  mobileTab === 'chat'
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Chat</span>
                {chat.length > 0 && <span className="text-[10px] bg-white/20 px-1.5 rounded-full">{chat.length}</span>}
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('gestures')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  mobileTab === 'gestures'
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Heart className="h-3.5 w-3.5 text-[#ff6fa0]" />
                <span>Gestures</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('extras')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  mobileTab === 'extras'
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Popcorn className="h-3.5 w-3.5 text-amber-300" />
                <span>Date Extras</span>
                {(queue.length > 0 || timer?.running || readyCheck?.active) && (
                  <span className="text-[10px] bg-amber-400/30 text-amber-200 px-1.5 rounded-full">
                    {timer?.running ? '⏱️' : readyCheck?.active ? '🍿' : queue.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('recent')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  mobileTab === 'recent'
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <History className="h-3.5 w-3.5 text-cyan-400" />
                <span>Recent</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('intimacy')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  mobileTab === 'intimacy'
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-rose-400" />
                <span>Intimacy {adultMode && '🔥'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('ai')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  mobileTab === 'ai'
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                <span>AI Copilot ✨</span>
              </button>
            </div>

            {/* MOBILE TAB CONTENT */}
            <div className="lg:hidden">
              {mobileTab === 'chat' && <ChatPanel isMobile={true} />}
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
              {mobileTab === 'recent' && (
                <div className="rise">
                  <RecentBar
                    onPlayUrl={(u) => socket.emit('media:set', { media: { type: 'auto', src: u } })}
                    onAddToQueue={(item) => socket.emit('queue:add', { media: item })}
                    adultMode={adultMode}
                    say={say}
                  />
                </div>
              )}
              {mobileTab === 'intimacy' && (
                <div className="rise">
                  <IntimacyMode
                    socket={socket}
                    me={me}
                    isHost={me === hostId}
                    adultMode={adultMode}
                    ambient={ambient}
                    hasPin={hasPin}
                    say={say}
                    onApplyAmbient={applyAmbientLighting}
                  />
                </div>
              )}
              {mobileTab === 'ai' && (
                <div className="rise">
                  <AiWatchAssistant
                    socket={socket}
                    currentMedia={currentMedia}
                    onAddToQueue={(item) => socket.emit('queue:add', { media: { type: 'auto', src: item.title, title: item.title, desc: item.why } })}
                    onAddToWatchlist={(item) => socket.emit('watchlist:add', { item: { type: 'embed', src: '', title: item.title, desc: item.why } })}
                    say={say}
                  />
                </div>
              )}
            </div>

            {/* DESKTOP ONLY: Lower Tab Switcher and Content */}
            <div className="hidden lg:block space-y-3 mt-3">
              {/* Segmented Desktop Switcher */}
              <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDesktopTab('gestures')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    desktopTab === 'gestures'
                      ? 'bg-[#d9467a] text-white shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Heart className="h-4 w-4 text-[#ff6fa0]" />
                  <span>Romantic Gestures 💕</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopTab('extras')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    desktopTab === 'extras'
                      ? 'bg-[#d9467a] text-white shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Popcorn className="h-4 w-4 text-amber-300" />
                  <span>Movie-Night Extras 🍿</span>
                  {(queue.length > 0 || timer?.running || readyCheck?.active) && (
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
                      {timer?.running ? '⏱️' : readyCheck?.active ? 'Ready?' : queue.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopTab('recent')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    desktopTab === 'recent'
                      ? 'bg-[#d9467a] text-white shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <History className="h-4 w-4 text-cyan-400" />
                  <span>Recent Bar 🕒</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopTab('intimacy')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    desktopTab === 'intimacy'
                      ? 'bg-[#d9467a] text-white shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Flame className="h-4 w-4 text-rose-400" />
                  <span>Intimacy &amp; Lighting 🕯️</span>
                  {adultMode && <span className="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 rounded-full">18+</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopTab('ai')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    desktopTab === 'ai'
                      ? 'bg-[#d9467a] text-white shadow-md'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-purple-300" />
                  <span>AI Copilot ✨</span>
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
                    ambient={ambient}
                    hasPin={hasPin}
                    say={say}
                    onApplyAmbient={applyAmbientLighting}
                  />
                </div>
              )}

              {desktopTab === 'ai' && (
                <div className="rise">
                  <AiWatchAssistant
                    socket={socket}
                    currentMedia={currentMedia}
                    onAddToQueue={(item) => socket.emit('queue:add', { media: { type: 'auto', src: item.title, title: item.title, desc: item.why } })}
                    onAddToWatchlist={(item) => socket.emit('watchlist:add', { item: { type: 'embed', src: '', title: item.title, desc: item.why } })}
                    say={say}
                  />
                </div>
              )}
            </div>
          </section>

          {/* DESKTOP ONLY: Right Side Chat Panel */}
          <aside className="panel hidden lg:flex h-[calc(100vh-5.5rem)]">
            <ChatPanel isMobile={false} />
          </aside>
        </div>
      )}

      {/* Video Call Overlay with External Hide Control */}
      {boot && (
        <CouplesOverlay
          me={me}
          users={users}
          peerRef={peerRef}
          onScreen={setScreen}
          showCall={showCall}
          setShowCall={setShowCall}
          socket={socket}
          onVoiceActivity={setVoiceActive}
        />
      )}

      {/* Cross-Device Handoff & Watch History Modal */}
      <WatchHistoryModal
        isOpen={showHandoff}
        onClose={() => setShowHandoff(false)}
        roomId={roomId}
        onPlayUrl={(u) => socket.emit('media:set', { media: { type: 'auto', src: u } })}
        say={say}
      />

      {/* Room Password Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4">
          <div className="card rise w-full max-w-sm p-6 space-y-4 border border-white/15 !bg-gradient-to-b from-[#14121a]/95 via-[#0d0b12]/98 to-[#060509]/98 shadow-2xl">
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

      {/* Toast notifications */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && <div key={toast.n} className="toast rounded-full bg-black/85 px-4 py-2 text-xs sm:text-sm text-white shadow-2xl backdrop-blur-md border border-white/10">{toast.m}</div>}
      </div>
    </div>
  );
}
