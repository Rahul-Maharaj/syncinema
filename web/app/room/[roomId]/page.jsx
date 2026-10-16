'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import gsap from 'gsap';
import {
  Send, Copy, Check, Crown, Users, Lock, Unlock, Heart, Film, X, Play,
  Moon, Home as HomeIcon, Eye, EyeOff, Trash2, KeyRound, User,
  Video, VideoOff, MessageSquare, MoreHorizontal, ListPlus, Sparkles, Settings
} from 'lucide-react';
import { getSocket, getCid } from '@/lib/socket';
import { getKey, setKey } from '@/lib/vault';
import VideoPlayer from '@/components/VideoPlayer';
import CouplesOverlay from '@/components/CouplesOverlay';
import CoupleGestures from '@/components/CoupleGestures';
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
  <main className="grid min-h-screen place-items-center px-6">
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
  const [name, setName] = useState(null), [draft, setDraft] = useState('');
  const [boot, setBoot] = useState(null), [users, setUsers] = useState([]), [hostId, setHostId] = useState(null);
  const [chat, setChat] = useState([]), [text, setText] = useState('');
  const [screenBy, setScreenBy] = useState(null), [screen, setScreen] = useState(null);
  const [queue, setQueue] = useState([]), [needKey, setNeedKey] = useState(false), [keyTick, setKeyTick] = useState(0), [keyDraft, setKeyDraft] = useState('');
  const [sleep, setSleep] = useState(0), seen = useRef(new Set());
  const [err, setErr] = useState(''), [lock, setLock] = useState(false), [needPass, setNeedPass] = useState(null), [passDraft, setPassDraft] = useState('');
  const [online, setOnline] = useState(true), [copied, setCopied] = useState(false);
  const [hidden, setHidden] = useState(false), [toast, setToast] = useState(null), toastT = useRef();
  
  // Mobile enhancements & Video Call control
  const [mobileTab, setMobileTab] = useState('chat'); // 'chat' | 'gestures' | 'queue'
  const [showMenu, setShowMenu] = useState(false);
  const [showCall, setShowCall] = useState(true);

  const peerRef = useRef(null), playerRef = useRef(null), listRef = useRef(), root = useRef();
  const socket = typeof window !== 'undefined' ? getSocket() : null;
  const me = typeof window !== 'undefined' ? getCid() : null;

  const say = (m) => { setToast({ m, n: Date.now() }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2400); };

  const doJoin = (overridePass, overrideKey) => {
    if (!socket || !name) return;
    const p = overridePass !== undefined ? overridePass : (sessionStorage.getItem('rp_' + roomId) || '');
    const k = overrideKey !== undefined ? overrideKey : getKey();
    socket.emit('join', {
      roomId,
      cid: me,
      name,
      key: k,
      pass: p,
      token: sessionStorage.tok || '',
    }, (r) => {
      if (!r) return;
      if (r.error === 'denied') return setNeedKey(true);
      if (['needpass', 'badpass'].includes(r.error)) {
        sessionStorage.removeItem('rp_' + roomId);
        return setNeedPass(r.error);
      }
      if (r.error) return setErr(r.error);
      setNeedKey(false);
      setNeedPass(null);
      setErr('');
      sessionStorage.tok = r.token;
      if (p) sessionStorage.setItem('rp_' + roomId, p);
      setQueue(r.queue);
      setLock(r.lock);
      setUsers(r.users);
      setHostId(r.hostId);
      setChat(r.chat);
      setScreenBy(r.screenBy);
      setBoot(r);
      setOnline(true);
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
      if (p) sessionStorage.setItem('rp_' + roomId, p);
      if (k) setKey(k);
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
    });
    socket.on('chat', (m) => setChat((c) => [...c.slice(-99), m]));
    socket.on('chat:cleared', () => setChat([]));
    socket.on('screen', (by) => { setScreenBy(by); if (!by) setScreen(null); });
    socket.on('reaction', (e) => {
      const el = Object.assign(document.createElement('div'), { textContent: e });
      el.className = 'absolute bottom-4 text-4xl';
      el.style.left = 8 + Math.random() * 80 + '%';
      document.getElementById('reaction-layer')?.append(el);
      gsap.to(el, { y: -260, x: gsap.utils.random(-30, 30), opacity: 0, duration: 2.2, ease: 'power1.out', onComplete: () => el.remove() });
    });
    if (window.Notification?.permission === 'default') Notification.requestPermission();
    socket.on('queue', setQueue);
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
    const rp = sessionStorage.getItem('rp_' + roomId);
    const sk = getKey();
    const parts = [];
    if (rp) parts.push(`pass=${encodeURIComponent(rp)}`);
    if (sk) parts.push(`key=${encodeURIComponent(sk)}`);
    const hash = parts.length ? `#${parts.join('&')}` : '';
    const inviteUrl = `${location.origin}/room/${roomId}${hash}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    say('Invite link copied — send it to your partner 💗');
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
      title="Room passkey"
      hint={needPass === 'badpass' ? 'Wrong passkey. Try again.' : 'This room is locked with a passkey. Type it to enter.'}
      onSubmit={(e) => { e.preventDefault(); const v = passDraft.trim(); if (!v) return; sessionStorage.setItem('rp_' + roomId, v); setNeedPass(null); setPassDraft(''); doJoin(v); }}>
      <input autoFocus type="password" minLength={4} maxLength={64} value={passDraft} onChange={(e) => setPassDraft(e.target.value)} placeholder="Room passkey" className="field text-center" />
    </Gate>
  );

  // Chat panel component shared between mobile tab and desktop aside
  const ChatPanel = ({ isMobile = false }) => (
    <div className={`card vault flex flex-col p-3.5 sm:p-4 ${isMobile ? 'h-[50vh] sm:h-[55vh]' : 'h-full'}`}>
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs opacity-60"><Users className="h-3.5 w-3.5" />{users.length} here</span>
        {users.map((u) => (
          <span key={u.id} className="flex items-center gap-1 rounded-full border border-black/10 dark:border-white/10 px-2 py-0.5 text-xs">
            <i className="h-2 w-2 rounded-full" style={{ background: u.color }} />{u.name}{u.id === hostId && <Crown className="h-3 w-3 text-amber-500" />}
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
      <div className="my-2 flex justify-between">
        {EMOJI.map((e) => <button key={e} onClick={() => socket.emit('reaction', e)} aria-label={`React ${e}`} className="rounded-lg p-1 text-xl transition hover:-translate-y-1 hover:scale-125 active:scale-90">{e}</button>)}
        <button onClick={ask} aria-label="Conversation starter" title="Conversation starter" className="rounded-lg p-1 text-xl transition hover:-translate-y-1 hover:scale-125 active:scale-90">💬</button>
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Say something sweet…" className="field" />
        <button className="btn !px-3" aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );

  return (
    <div ref={root} className="mx-auto max-w-7xl px-3 sm:px-4 py-3 sm:py-4">
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
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Prominent Video Call Hide/Show Button */}
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

          {/* Quick Invite Button */}
          <button onClick={copy} className="btn !py-1.5 !px-3 text-xs" title="Copy the invite link">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Invite'}</span>
          </button>

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
              <div className="card rise mb-3 flex items-center gap-3 p-3 sm:p-4 border border-[#d9467a]/20 !bg-[#160d1f]/70 backdrop-blur">
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
            />

            {/* MOBILE ONLY: App-like Segmented Tab Bar */}
            <div className="lg:hidden flex rounded-xl bg-black/40 p-1 border border-white/10 gap-1 my-2.5">
              <button
                type="button"
                onClick={() => setMobileTab('chat')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
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
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
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
                onClick={() => setMobileTab('queue')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  mobileTab === 'queue'
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <ListPlus className="h-3.5 w-3.5" />
                <span>Queue</span>
                {queue.length > 0 && <span className="text-[10px] bg-white/20 px-1.5 rounded-full">{queue.length}</span>}
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
              {mobileTab === 'queue' && (
                <div className="rise card p-3.5">
                  <p className="mb-2.5 text-xs font-medium uppercase tracking-wide opacity-60">Up next ({queue.length})</p>
                  {queue.length === 0 ? (
                    <p className="text-xs text-white/50 text-center py-4">No movies in queue. Paste a link above and tap &ldquo;Add to queue&rdquo;.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {queue.map((q) => (
                        <li key={q.id} className="flex items-center gap-2 text-sm rounded-lg bg-white/5 p-2">
                          <button onClick={() => socket.emit('queue:next', q.id)} aria-label="Play now" className="ghost !p-1.5"><Play className="h-3.5 w-3.5 text-[#ff6fa0]" /></button>
                          <span className="min-w-0 flex-1 truncate text-xs">{q.src.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <button onClick={() => socket.emit('queue:remove', q.id)} aria-label="Remove" className="opacity-50 hover:opacity-100 p-1"><X className="h-4 w-4" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* DESKTOP ONLY: Always Show Gestures and Queue under Video */}
            <div className="hidden lg:block space-y-3 mt-3">
              <CoupleGestures socket={socket} me={me} name={name} users={users} say={say} />
              {queue.length > 0 && (
                <div className="card p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">Up next</p>
                  <ul className="space-y-1">
                    {queue.map((q) => (
                      <li key={q.id} className="flex items-center gap-2 text-sm">
                        <button onClick={() => socket.emit('queue:next', q.id)} aria-label="Play now" className="ghost !p-1.5"><Play className="h-3.5 w-3.5" /></button>
                        <span className="min-w-0 flex-1 truncate">{q.src.replace(/^https?:\/\/(www\.)?/, '')}</span>
                        <button onClick={() => socket.emit('queue:remove', q.id)} aria-label="Remove" className="opacity-50 hover:opacity-100"><X className="h-4 w-4" /></button>
                      </li>
                    ))}
                  </ul>
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
        />
      )}

      {/* Toast notifications */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        {toast && <div key={toast.n} className="toast rounded-full bg-black/85 px-4 py-2 text-xs sm:text-sm text-white shadow-2xl backdrop-blur-md border border-white/10">{toast.m}</div>}
      </div>
    </div>
  );
}
