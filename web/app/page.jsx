'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Lock, ArrowRight, Heart, Eye, EyeOff, ShieldCheck, Sparkles, KeyRound, LogOut, Film, Users, RefreshCw, Dice5, Zap, Video, Shield, CheckCircle2, Play } from 'lucide-react';
import Floaters from '@/components/Floaters';
import InstallPrompt from '@/components/InstallPrompt';
import { getKey, setKey, verify, loadHero, forgetEverything } from '@/lib/vault';
import { serverUrl, safeId } from '@/lib/socket';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const slug = (v) => {
  if (!v) return '';
  let str = String(v).trim();
  str = str.split('?')[0].split('#')[0];
  const last = str.split('/').filter(Boolean).pop() || '';
  return last.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
};
const IMG_W = 1710, IMG_H = 919;                                                    // the split between the two rooms is the centre line

/* ---------------- locked screen ---------------- */
function Gate({ onUnlock, notice }) {
  const [v, setV] = useState(''), [show, setShow] = useState(false), [msg, setMsg] = useState(notice || ''), [busy, setBusy] = useState(false);
  const card = useRef();
  useEffect(() => { if (!reduced()) gsap.from(card.current.children, { y: 24, opacity: 0, duration: 0.7, stagger: 0.09, ease: 'power3.out' }); }, []);
  const submit = async (e) => {
    e.preventDefault(); if (!v || busy) return;
    setBusy(true); setMsg('');
    const r = await verify(v);
    if (r === 'ok') { setKey(v); return onUnlock(v); }
    setBusy(false);
    setMsg({ denied: 'Wrong secret word. Try again.', locked: 'Too many wrong tries. Wait 15 minutes.', offline: 'Cannot reach the server. Is it running?' }[r]);
    if (r === 'denied') { card.current.classList.remove('shake'); void card.current.offsetWidth; card.current.classList.add('shake'); }
  };
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-black px-6 text-white">
      <form ref={card} onSubmit={submit} className="glass relative w-full max-w-sm space-y-4 p-8 text-center !bg-black border border-white/10">
        <div className="relative mx-auto h-20 w-20">
          <img src="/logo.png" alt="SyncCinema Logo" className="h-full w-full object-contain" />
        </div>
        <h1 className="font-display text-3xl font-semibold">Our private couch</h1>
        <p className="text-sm text-white/70">Only you two know the secret word. Type it to come in.</p>
        <div className="relative">
          <KeyRound className="absolute left-3 top-3 h-4 w-4 text-white/50" />
          <input autoFocus type={show ? 'text' : 'password'} value={v} onChange={(e) => setV(e.target.value)} placeholder="Secret word" autoComplete="current-password" className="field-d !pl-9 !pr-10" />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide word' : 'Show word'} className="absolute right-2 top-2 rounded-lg p-1 text-white/60 hover:text-white">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        {msg && <p role="alert" className="text-sm text-rose-300">{msg}</p>}
        <button className="btn w-full !py-3" disabled={busy}>{busy ? 'Checking…' : 'Unlock'}</button>
      </form>
    </main>
  );
}

/* ---------------- dashboard (after unlock) ---------------- */
function Dashboard({ hero, onLock }) {
  const router = useRouter();
  const root = useRef(), stage = useRef(), cta = useRef();
  const [seam, setSeam] = useState({ x: 0, y: 0 });
  const [tab, setTab] = useState('create');
  const [roomName, setRoomName] = useState('');
  const [maxUsers, setMaxUsers] = useState(2);
  const [pass, setPass] = useState(''), [showPass, setShowPass] = useState(false), [perr, setPerr] = useState('');
  const [code, setCode] = useState(''), [joinPass, setJoinPass] = useState(''), [showJoinPass, setShowJoinPass] = useState(false);
  const [last, setLast] = useState(''), [err, setErr] = useState(''), [loaded, setLoaded] = useState(false);
  const [activeRooms, setActiveRooms] = useState([]), [loadingRooms, setLoadingRooms] = useState(false);
  const passInputRef = useRef(null), joinPassInputRef = useRef(null);

  useEffect(() => setLast(localStorage.getItem('lastRoom') || ''), []);

  // Poll active rooms created by users
  const fetchRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetch(serverUrl() + '/api/rooms', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setActiveRooms(Array.isArray(data.rooms) ? data.rooms : []);
      }
    } catch {
      // offline / quiet
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, []);

  const generatePass = () => {
    const words = ['love', 'cozy', 'star', 'kiss', 'rose', 'cinema', 'date', 'heart'];
    const pick = words[Math.floor(Math.random() * words.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const gen = `${pick}${num}`;
    setPass(gen);
    setShowPass(true);
    setPerr('');
  };

  // keep the glowing seam + heart exactly on the picture's split line, on any screen shape
  useLayoutEffect(() => {
    const el = stage.current;
    const calc = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      const s = Math.max(w / IMG_W, h / IMG_H), iw = IMG_W * s, ih = IMG_H * s;
      setSeam({ x: (w - iw) / 2 + iw / 2, y: (h - ih) / 2 + ih / 2 });
    };
    calc(); const ro = new ResizeObserver(calc); ro.observe(el); return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.layer', { scale: 1.2, opacity: 0 }, { scale: 1.06, opacity: 1, duration: 2.2, ease: 'power3.out' });
      gsap.to('.layer', { scale: 1.13, duration: 20, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.2 });
      gsap.from('.nav', { y: -24, opacity: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' });
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.5 });
      tl.from('.word', { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.07 })
        .from('.sub', { opacity: 0, y: 14, duration: 0.6 }, '-=0.5')
        .from('.step', { opacity: 0, y: 12, scale: 0.9, duration: 0.5, stagger: 0.12 }, '-=0.3')
        .from('.panel', { opacity: 0, y: 40, duration: 0.8 }, 0.9)
        .from('.panel > *', { opacity: 0, y: 14, duration: 0.5, stagger: 0.09 }, 1.2);
      // gentle parallax: the picture follows the pointer
      if (matchMedia('(hover: hover)').matches) {
        const x = gsap.quickTo('.layer', 'x', { duration: 1.2, ease: 'power3' }), y = gsap.quickTo('.layer', 'y', { duration: 1.2, ease: 'power3' });
        const mv = (e) => { x((e.clientX / innerWidth - 0.5) * -22); y((e.clientY / innerHeight - 0.5) * -14); };
        addEventListener('pointermove', mv); return () => removeEventListener('pointermove', mv);
      }
    }, root);
    return () => ctx.revert();
  }, []);

  // magnetic main button
  const pull = (e) => {
    if (reduced() || !cta.current) return;
    const r = cta.current.getBoundingClientRect();
    gsap.to(cta.current, { x: (e.clientX - r.left - r.width / 2) * 0.08, y: (e.clientY - r.top - r.height / 2) * 0.2, duration: 0.3 });
  };
  const release = () => cta.current && gsap.to(cta.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,.5)' });

  const create = (e) => {
    e?.preventDefault?.();
    const p = pass.trim();
    if (!p || p.length < 4) {
      setPerr('A room password (at least 4 characters) is required to secure your room.');
      passInputRef.current?.focus();
      return;
    }
    let id = roomName.trim();
    if (id) {
      id = slug(id);
      if (id.length < 2 || id.length > 64) {
        return setPerr('Room name must be between 2 and 64 letters, numbers, or dashes.');
      }
    } else {
      id = safeId(12);
    }
    sessionStorage.setItem('rp_' + id, p);
    sessionStorage.setItem('is_create_' + id, '1');
    sessionStorage.setItem('max_users_' + id, String(maxUsers));
    try { localStorage.setItem('rp_' + id, p); } catch {}
    router.push(`/room/${id}#pass=${encodeURIComponent(p)}&create=1&max=${maxUsers}`);
  };

  const join = (e) => {
    e.preventDefault();
    const c = slug(code);
    if (!c || c.length < 2) return setErr('Please enter a valid room code or link.');
    const jp = joinPass.trim();
    if (!jp || jp.length < 4) {
      setErr('Room password is required to enter (at least 4 characters).');
      joinPassInputRef.current?.focus();
      return;
    }
    sessionStorage.setItem('rp_' + c, jp);
    try { localStorage.setItem('rp_' + c, jp); } catch {}
    router.push(`/room/${c}#pass=${encodeURIComponent(jp)}`);
  };

  const selectActiveRoom = (r) => {
    if (r.userCount >= (r.maxUsers || 2)) return;
    setCode(r.roomId);
    setTab('join');
    setErr('');
    setTimeout(() => {
      joinPassInputRef.current?.focus();
    }, 150);
  };

  return (
    <main ref={root} className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* picture: top banner on phones, full-screen background on desktop */}
      <div ref={stage} className="absolute inset-x-0 top-0 h-[56vh] md:inset-0 md:h-auto">
        <div className="layer absolute inset-0 will-change-transform">
          {hero && <img src={hero} alt="Two people in different rooms watching the same movie on laptops" onLoad={() => setLoaded(true)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`} />}
          <div className="seam" style={{ left: seam.x }}><i /></div>
          <div className="absolute z-[5]" style={{ left: seam.x, top: seam.y, transform: 'translate(-50%,-50%)' }}>
            <div className="relative grid h-11 w-11 place-items-center rounded-full bg-[#d9467a]">
              <Heart className="h-5 w-5 fill-white text-white" />
            </div>
            <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-2.5 py-0.5 text-[10px] uppercase tracking-widest border border-white/10">in sync</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <nav className="nav relative z-20 flex items-center justify-between px-5 py-4 sm:px-8 max-w-[1520px] mx-auto w-full">
        <span className="flex items-center gap-3 font-display text-lg sm:text-xl font-bold tracking-tight">
          <img src="/logo.png" alt="SyncCinema Logo" className="h-9 w-9 sm:h-10 sm:w-10 object-contain drop-shadow" />
          <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent">SyncCinema</span>
        </span>
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Sync Engine Active</span>
          </div>
          <InstallPrompt />
          <button onClick={onLock} className="glass-btn !py-2 !px-3 text-xs sm:text-sm text-white/70 hover:text-white" title="Clear saved room history">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear device data</span>
            <span className="sm:hidden">Clear</span>
          </button>
        </div>
      </nav>

      <section className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-col justify-center gap-10 px-5 pb-12 pt-[28vh] lg:flex-row lg:items-center lg:justify-between lg:px-8 xl:px-14 lg:py-10 max-w-[1520px] mx-auto w-full">
        {/* Left column: Attractive modern hero & social proof to attract users */}
        <div className="flex-1 max-w-2xl xl:max-w-3xl space-y-6 lg:space-y-7">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Ultra-Low Latency Virtual Cinema</span>
            <span className="text-white/30">•</span>
            <span className="text-white/80">No Account Required</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-6xl xl:text-7xl font-bold leading-[1.06] tracking-tight">
            {'Same movie. Different cities.'.split(' ').map((w, i) => (
              <span key={i} className="mr-3 inline-block overflow-hidden align-bottom">
                <span className="word inline-block">{w}</span>
              </span>
            ))}
            <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-rose-400 via-pink-400 to-[#ff6fa0] bg-clip-text text-transparent">
              <span className="word inline-block">One private couch.</span>
            </span>
          </h1>

          <p className="sub max-w-xl text-base text-white/80 sm:text-lg lg:text-xl font-normal leading-relaxed">
            Watch movies, YouTube, anime, series, and video files in synchronized harmony. Live 1080p video calls, floating PiP, synchronized playback, and private rooms built strictly for couples and close friends.
          </p>

          {/* 3 Modern Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md hover:border-rose-500/30 transition">
              <div className="flex items-center gap-2 text-rose-400 mb-1.5">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Zero Drift Sync</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">Sub-second clock synchronization keeps both devices playing at the exact same millisecond.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md hover:border-rose-500/30 transition">
              <div className="flex items-center gap-2 text-rose-400 mb-1.5">
                <Video className="h-4 w-4" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">In-Screen Video Call</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">Floating Picture-in-Picture webcam with corner switching so you never miss a reaction.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md hover:border-rose-500/30 transition">
              <div className="flex items-center gap-2 text-rose-400 mb-1.5">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">End-to-End Private</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">Every room is locked with host passwords and encrypted WebRTC peer-to-peer data.</p>
            </div>
          </div>

          {/* Steps guide */}
          <ol className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-white/70">
            {['Start a room', 'Set room pass', 'Press play together'].map((s, i) => (
              <li key={s} className="step glass-btn !rounded-full !px-3.5 !py-1.5 border border-white/10 bg-white/5 backdrop-blur-sm">
                <b className="grid h-4 w-4 place-items-center rounded-full bg-[#d9467a] text-[10px] text-white mr-1">{i + 1}</b>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Right column: Large, modern card on desktop & laptop */}
        <div className="panel glass w-full space-y-5 p-6 sm:p-7 xl:p-8 lg:w-[480px] xl:w-[540px] 2xl:w-[580px] shrink-0 border border-white/15 bg-[#060608]/95 backdrop-blur-2xl shadow-2xl shadow-rose-950/25 rounded-3xl">
          {/* Tab switcher */}
          <div className="flex rounded-2xl bg-white/5 p-1.5 border border-white/10 gap-1.5">
            <button
              type="button"
              onClick={() => { setTab('create'); setErr(''); setPerr(''); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 xl:py-3 text-xs sm:text-sm font-semibold transition ${
                tab === 'create'
                  ? 'bg-gradient-to-r from-[#e11d48] to-[#db2777] text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Create</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('join'); setErr(''); setPerr(''); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 xl:py-3 text-xs sm:text-sm font-semibold transition ${
                tab === 'join'
                  ? 'bg-gradient-to-r from-[#e11d48] to-[#db2777] text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Join</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('active'); setErr(''); setPerr(''); fetchRooms(); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 xl:py-3 text-xs sm:text-sm font-semibold transition relative ${
                tab === 'active'
                  ? 'bg-gradient-to-r from-[#e11d48] to-[#db2777] text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film className="h-4 w-4" />
              <span>Rooms ({activeRooms.length})</span>
              {activeRooms.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 ml-0.5" />
              )}
            </button>
          </div>

          {tab === 'create' && (
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium text-white/90">
                  Room Name / ID <span className="text-white/40 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Film className="absolute left-3.5 top-3.5 h-4 w-4 text-white/50" />
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => { setRoomName(e.target.value); setPerr(''); }}
                    placeholder="e.g. romantic-night (or leave empty for random)"
                    aria-label="Room name"
                    maxLength={64}
                    className="field-d !pl-10 !py-3 !text-sm sm:!text-base rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-medium text-white/90 flex items-center gap-1.5">
                    <Lock className="h-4 w-4 text-rose-400" />
                    <span>Room Password <b className="text-rose-400 font-bold">*Required</b></span>
                  </label>
                  <button
                    type="button"
                    onClick={generatePass}
                    className="text-xs text-[#ff8fb3] hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-rose-500/20 transition"
                    title="Generate a random password"
                  >
                    <Dice5 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-white/50" />
                  <input
                    ref={passInputRef}
                    type={showPass ? 'text' : 'password'}
                    value={pass}
                    onChange={(e) => { setPass(e.target.value); setPerr(''); }}
                    placeholder="Password (min 4 characters)"
                    aria-label="Room password"
                    minLength={4}
                    maxLength={64}
                    required
                    className="field-d !pl-10 !pr-11 !py-3 !text-sm sm:!text-base rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-white/60 hover:text-white"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className={`text-xs ${perr ? 'text-rose-300 font-medium' : 'text-white/50'}`}>
                  {perr || '🔒 Password is required: no one can enter without this password.'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-white/90">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-rose-400" />
                    <span>Room Capacity <b className="text-white/50 font-normal">(Members Allowed)</b></span>
                  </span>
                  <span className="text-xs font-bold text-[#ff8fb3] px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                    {maxUsers} Members Max
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { count: 2, label: '2 Seats', sub: 'Couples / Date' },
                    { count: 3, label: '3 Seats', sub: 'Trio / Friends' },
                    { count: 4, label: '4 Seats', sub: 'Double Date' },
                  ].map((opt) => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => setMaxUsers(opt.count)}
                      className={`rounded-2xl p-3 text-center border transition-all ${
                        maxUsers === opt.count
                          ? 'bg-[#d9467a]/25 border-[#d9467a] text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs sm:text-sm font-bold">{opt.label}</span>
                      <span className="block text-[10px] sm:text-xs text-white/50 mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                ref={cta}
                onPointerMove={pull}
                onPointerLeave={release}
                className="btn w-full !py-3.5 xl:!py-4 !text-base xl:!text-lg font-bold rounded-2xl bg-gradient-to-r from-[#e11d48] via-[#e62e6b] to-[#db2777] hover:from-[#f43f5e] hover:to-[#e11d48] shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                <span>Create Room</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          )}

          {tab === 'join' && (
            <form onSubmit={join} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium text-white/90">Room Code or Link</label>
                <div className="relative">
                  <Film className="absolute left-3.5 top-3.5 h-4 w-4 text-white/50" />
                  <input
                    autoFocus
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCode(val);
                      setErr('');
                      try {
                        if (val.includes('#') || val.includes('?')) {
                          const hashPart = val.includes('#') ? val.split('#')[1] : '';
                          const searchPart = val.includes('?') ? val.split('?')[1].split('#')[0] : '';
                          const sp = new URLSearchParams(hashPart || searchPart);
                          const embeddedPass = sp.get('pass');
                          if (embeddedPass) setJoinPass(embeddedPass);
                        }
                      } catch {}
                    }}
                    placeholder="Paste room code or invite link"
                    aria-label="Room code or link"
                    className="field-d !pl-10 !py-3 !text-sm sm:!text-base rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium text-white/90 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-rose-400" />
                  <span>Room Password <b className="text-rose-400 font-bold">*Required</b></span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-white/50" />
                  <input
                    ref={joinPassInputRef}
                    type={showJoinPass ? 'text' : 'password'}
                    value={joinPass}
                    onChange={(e) => { setJoinPass(e.target.value); setErr(''); }}
                    placeholder="Enter room password"
                    aria-label="Room password"
                    minLength={4}
                    maxLength={64}
                    required
                    className="field-d !pl-10 !pr-11 !py-3 !text-sm sm:!text-base rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPass(!showJoinPass)}
                    className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-white/60 hover:text-white"
                  >
                    {showJoinPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {err ? (
                  <p role="alert" className="text-xs text-rose-300 font-medium">{err}</p>
                ) : (
                  <p className="text-xs text-white/50">🔒 Protected room: password is required to enter.</p>
                )}
              </div>
              <button className="btn w-full !py-3.5 xl:!py-4 !text-base xl:!text-lg font-bold rounded-2xl bg-gradient-to-r from-[#e11d48] via-[#e62e6b] to-[#db2777] hover:from-[#f43f5e] hover:to-[#e11d48] shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5" />
                <span>Join Room</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          )}

          {tab === 'active' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs sm:text-sm font-medium text-white/90 flex items-center gap-1.5">
                  <Film className="h-4 w-4 text-[#ff6fa0]" />
                  <span>Active Rooms on Home Screen</span>
                </span>
                <button
                  type="button"
                  onClick={fetchRooms}
                  disabled={loadingRooms}
                  className="text-xs text-white/60 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
                  title="Refresh active rooms list"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingRooms ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center space-y-3">
                  <p className="text-xs sm:text-sm text-white/60">No active rooms right now.</p>
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className="btn !py-2 !px-4 text-xs sm:text-sm mx-auto"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Create First Room
                  </button>
                </div>
              ) : (
                <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                  {activeRooms.map((r) => {
                    const isFull = (r.userCount || 0) >= (r.maxUsers || 2);
                    return (
                      <div
                        key={r.roomId}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3.5 flex items-center justify-between gap-2.5 hover:border-[#ff6fa0]/40 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm truncate text-white">{r.roomId}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isFull
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {!isFull && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                              {r.userCount}/{r.maxUsers || 2} Seats {isFull ? '(Full)' : ''}
                            </span>
                            <span className="text-[10px] text-white/60 flex items-center gap-0.5">
                              <Lock className="h-2.5 w-2.5 text-amber-400" />
                              <span>Password req</span>
                            </span>
                          </div>
                        </div>

                        {isFull ? (
                          <span className="text-xs opacity-50 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
                            Full
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => selectActiveRoom(r)}
                            className="btn !py-1.5 !px-3.5 text-xs shrink-0"
                          >
                            <Lock className="h-3 w-3" />
                            Join
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Quick Active Rooms Preview underneath Create/Join forms */}
          {tab !== 'active' && activeRooms.length > 0 && (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="flex items-center gap-1.5 font-medium text-white/90">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Active Rooms ({activeRooms.length})
                </span>
                <button
                  type="button"
                  onClick={() => setTab('active')}
                  className="text-xs text-[#ff8fb3] hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                {activeRooms.map((r) => {
                  const isFull = (r.userCount || 0) >= (r.maxUsers || 2);
                  return (
                    <div
                      key={r.roomId}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-black/30 hover:bg-black/50 transition text-xs"
                    >
                      <span className="font-mono text-white/90 truncate max-w-[140px] sm:max-w-[180px]">{r.roomId}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isFull ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {r.userCount}/{r.maxUsers || 2}
                        </span>
                        {!isFull && (
                          <button
                            type="button"
                            onClick={() => selectActiveRoom(r)}
                            className="text-[11px] text-[#ff6fa0] hover:text-white px-2 py-0.5 rounded-lg bg-white/5 hover:bg-[#d9467a]/40 transition"
                          >
                            Join 🔒
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {last && (
            <button onClick={() => router.push(`/room/${last}`)} className="glass-btn w-full justify-between !py-2.5 rounded-xl">
              <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-[#ff6fa0]" />Back to our room</span>
              <span className="font-mono text-xs text-white/60">{last}</span>
            </button>
          )}

          <p className="flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/60">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>Private: {maxUsers} seats only, host controls room settings, and password required to enter.</span>
          </p>
        </div>
      </section>
    </main>
  );
}

/* ---------------- page ---------------- */
export default function Home() {
  const [hero, setHero] = useState(null);
  useEffect(() => {
    loadHero('').then(setHero).catch(() => {});
  }, []);
  const lock = () => {
    forgetEverything();
    if (hero) URL.revokeObjectURL(hero);
    setHero(null);
    window.location.reload();
  };

  return <Dashboard hero={hero} onLock={lock} />;
}
