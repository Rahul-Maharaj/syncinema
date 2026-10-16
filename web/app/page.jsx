'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Lock, ArrowRight, Heart, Eye, EyeOff, ShieldCheck, Sparkles, KeyRound, LogOut, Film, Users, RefreshCw, Dice5 } from 'lucide-react';
import Floaters from '@/components/Floaters';
import InstallPrompt from '@/components/InstallPrompt';
import { getKey, setKey, verify, loadHero, forgetEverything } from '@/lib/vault';
import { serverUrl } from '@/lib/socket';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const slug = (v) => v.trim().split('?')[0].split('/').filter(Boolean).pop() || '';   // accepts a code or a whole pasted link
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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(35,30,48,0.45),rgba(12,10,16,0.98)_55%,#020204_100%)] px-6 text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,70,122,0.06),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.05),transparent_40%)]" />
      <Floaters n={16} />
      <form ref={card} onSubmit={submit} className="glass relative w-full max-w-sm space-y-4 p-8 text-center">
        <div className="relative mx-auto h-20 w-20">
          <img src="/logo.png" alt="SyncCinema Logo" className="h-full w-full object-contain drop-shadow-[0_0_30px_rgba(217,70,122,0.8)]" />
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
      if (!/^[\w-]{2,64}$/.test(id)) return setPerr('Room name must be 2-64 letters, numbers or dashes.');
    } else {
      id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    }
    sessionStorage.setItem('rp_' + id, p);
    router.push(`/room/${id}#pass=${encodeURIComponent(p)}`);
  };

  const join = (e) => {
    e.preventDefault();
    const c = slug(code);
    if (!/^[\w-]{2,64}$/.test(c)) return setErr('Please enter a valid room code or link.');
    const jp = joinPass.trim();
    if (!jp || jp.length < 4) {
      setErr('Room password is required to enter (at least 4 characters).');
      joinPassInputRef.current?.focus();
      return;
    }
    sessionStorage.setItem('rp_' + c, jp);
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
    <main ref={root} className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(35,30,48,0.45),rgba(12,10,16,0.98)_55%,#020204_100%)] text-white">
      {/* picture: top banner on phones, full-screen background on desktop */}
      <div ref={stage} className="absolute inset-x-0 top-0 h-[56vh] md:inset-0 md:h-auto">
        <div className="layer absolute inset-0 will-change-transform">
          {hero && <img src={hero} alt="Two people in different rooms watching the same movie on laptops" onLoad={() => setLoaded(true)} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`} />}
          <div className="seam" style={{ left: seam.x }}><i /></div>
          <div className="absolute z-[5]" style={{ left: seam.x, top: seam.y, transform: 'translate(-50%,-50%)' }}>
            <div className="relative grid h-11 w-11 place-items-center rounded-full bg-[#d9467a] shadow-[0_0_40px_#d9467a]">
              <i className="ring" /><i className="ring" style={{ animationDelay: '1.3s' }} />
              <Heart className="beat h-5 w-5 fill-white text-white" />
            </div>
            <span className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] uppercase tracking-widest backdrop-blur">in sync</span>
          </div>
        </div>
        <Floaters n={18} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050407] via-[#050407]/70 to-transparent md:via-[#050407]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,2,4,.85)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-10%,rgba(60,40,75,0.2),transparent_70%),radial-gradient(ellipse_70%_35%_at_50%_0%,rgba(35,25,45,0.15),transparent_60%)]" />
      </div>

      <nav className="nav relative z-20 flex items-center justify-between px-5 py-4 md:px-8">
        <span className="flex items-center gap-2.5 font-display text-lg font-semibold">
          <img src="/logo.png" alt="SyncCinema Logo" className="h-9 w-9 object-contain drop-shadow-[0_0_15px_rgba(217,70,122,0.6)]" />
          <span>SyncCinema</span>
        </span>
        <div className="flex items-center gap-2">
          <InstallPrompt />
          <button onClick={onLock} className="glass-btn" title="Lock and forget this device"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Lock &amp; forget this device</span><span className="sm:hidden">Lock</span></button>
        </div>
      </nav>

      <section className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col justify-end gap-8 px-5 pb-8 pt-[34vh] md:flex-row md:items-end md:justify-between md:px-10 md:pb-12 md:pt-0">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
            {'Same movie. Different cities. One couch.'.split(' ').map((w, i) => (
              <span key={i} className="mr-3 inline-block overflow-hidden align-bottom"><span className="word inline-block">{w}</span></span>
            ))}
          </h1>
          <p className="sub mt-5 max-w-md text-base text-white/80 sm:text-lg">Your own private room. Watch in sync with video, voice and chat — strictly for two lovers.</p>
          <ol className="mt-5 flex flex-wrap gap-2 text-sm">
            {['Start a room', 'Set room pass', 'Press play together'].map((s, i) => (
              <li key={s} className="step glass-btn !rounded-full !px-3 !py-1.5"><b className="grid h-5 w-5 place-items-center rounded-full bg-[#d9467a] text-xs">{i + 1}</b>{s}</li>
            ))}
          </ol>
        </div>

        <div className="panel glass w-full space-y-4 p-6 md:max-w-md">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 gap-1">
            <button
              type="button"
              onClick={() => { setTab('create'); setErr(''); setPerr(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                tab === 'create'
                  ? 'bg-[#d9467a] text-white shadow-lg shadow-[#d9467a]/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Create</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('join'); setErr(''); setPerr(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                tab === 'join'
                  ? 'bg-[#d9467a] text-white shadow-lg shadow-[#d9467a]/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Join</span>
            </button>
            <button
              type="button"
              onClick={() => { setTab('active'); setErr(''); setPerr(''); fetchRooms(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition relative ${
                tab === 'active'
                  ? 'bg-[#d9467a] text-white shadow-lg shadow-[#d9467a]/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              <span>Rooms ({activeRooms.length})</span>
              {activeRooms.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          {tab === 'create' && (
            <form onSubmit={create} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">Room Name / ID (optional)</label>
                <div className="relative">
                  <Film className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => { setRoomName(e.target.value); setPerr(''); }}
                    placeholder="e.g. romantic-night (or leave empty for random)"
                    aria-label="Room name"
                    maxLength={64}
                    className="field-d !pl-9"
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-xs font-medium text-white/90 flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5 text-rose-400" />
                    <span>Room Password <b className="text-rose-400">*Required</b></span>
                  </label>
                  <button
                    type="button"
                    onClick={generatePass}
                    className="text-[11px] text-[#ff8fb3] hover:underline flex items-center gap-1"
                    title="Generate a random password"
                  >
                    <Dice5 className="h-3 w-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
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
                    className="field-d !pl-9 !pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2 top-2 rounded-lg p-1 text-white/60 hover:text-white"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className={`mt-1 text-xs ${perr ? 'text-rose-300 font-medium' : 'text-white/50'}`}>
                  {perr || '🔒 Password is required: no one can enter without this password.'}
                </p>
              </div>
              <button
                ref={cta}
                onPointerMove={pull}
                onPointerLeave={release}
                className="btn w-full !py-3.5 !text-base"
              >
                <Sparkles className="h-4 w-4" />
                Create Room
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {tab === 'join' && (
            <form onSubmit={join} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">Room Code or Link</label>
                <div className="relative">
                  <Film className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <input
                    autoFocus
                    value={code}
                    onChange={(e) => { setCode(e.target.value); setErr(''); }}
                    placeholder="Paste room code or invite link"
                    aria-label="Room code or link"
                    className="field-d !pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/90 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-rose-400" />
                  <span>Room Password <b className="text-rose-400">*Required</b></span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
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
                    className="field-d !pl-9 !pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPass(!showJoinPass)}
                    className="absolute right-2 top-2 rounded-lg p-1 text-white/60 hover:text-white"
                  >
                    {showJoinPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {err ? (
                  <p role="alert" className="mt-1 text-xs text-rose-300 font-medium">{err}</p>
                ) : (
                  <p className="mt-1 text-xs text-white/50">🔒 Protected room: password is required to enter.</p>
                )}
              </div>
              <button className="btn w-full !py-3.5 !text-base">
                <KeyRound className="h-4 w-4" />
                Join Room
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {tab === 'active' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-medium text-white/80 flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 text-[#ff6fa0]" />
                  <span>Active Rooms on Home Screen</span>
                </span>
                <button
                  type="button"
                  onClick={fetchRooms}
                  disabled={loadingRooms}
                  className="text-xs text-white/60 hover:text-white flex items-center gap-1 transition"
                  title="Refresh active rooms list"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingRooms ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center space-y-2">
                  <p className="text-xs text-white/60">No active rooms right now.</p>
                  <button
                    type="button"
                    onClick={() => setTab('create')}
                    className="btn !py-1.5 !px-3 text-xs mx-auto"
                  >
                    <Sparkles className="h-3 w-3" />
                    Create First Room
                  </button>
                </div>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {activeRooms.map((r) => {
                    const isFull = (r.userCount || 0) >= (r.maxUsers || 2);
                    return (
                      <div
                        key={r.roomId}
                        className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-2 hover:border-[#ff6fa0]/40 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm truncate text-white">{r.roomId}</span>
                            {r.adult && <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1 rounded">18+</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              isFull
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {!isFull && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                              {r.userCount}/{r.maxUsers || 2} Seats {isFull ? '(Full)' : ''}
                            </span>
                            <span className="text-[10px] text-white/60 flex items-center gap-0.5">
                              <Lock className="h-2.5 w-2.5 text-amber-400" />
                              <span>Password req</span>
                            </span>
                          </div>
                        </div>

                        {isFull ? (
                          <span className="text-xs opacity-50 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                            Full
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => selectActiveRoom(r)}
                            className="btn !py-1.5 !px-3 text-xs shrink-0"
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
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="flex items-center gap-1.5 font-medium text-white/90">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active Rooms ({activeRooms.length})
                </span>
                <button
                  type="button"
                  onClick={() => setTab('active')}
                  className="text-[11px] text-[#ff8fb3] hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-0.5">
                {activeRooms.map((r) => {
                  const isFull = (r.userCount || 0) >= (r.maxUsers || 2);
                  return (
                    <div
                      key={r.roomId}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/20 hover:bg-black/40 transition text-xs"
                    >
                      <span className="font-mono text-white/90 truncate max-w-[120px] sm:max-w-[150px]">{r.roomId}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isFull ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {r.userCount}/{r.maxUsers || 2}
                        </span>
                        {!isFull && (
                          <button
                            type="button"
                            onClick={() => selectActiveRoom(r)}
                            className="text-[11px] text-[#ff6fa0] hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-[#d9467a]/40 transition"
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
            <button onClick={() => router.push(`/room/${last}`)} className="glass-btn w-full justify-between">
              <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-[#ff6fa0]" />Back to our room</span>
              <span className="font-mono text-xs text-white/60">{last}</span>
            </button>
          )}
          <p className="flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-white/60"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />Private: 2 seats only, host controls room settings, and password required to enter.</p>
        </div>
      </section>
    </main>
  );
}

/* ---------------- page ---------------- */
export default function Home() {
  const [phase, setPhase] = useState('checking');     // checking | locked | open
  const [hero, setHero] = useState(null), [notice, setNotice] = useState('');
  const enter = (k) => { loadHero(k).then(setHero).catch(() => {}); setPhase('open'); };
  useEffect(() => {
    (async () => {
      const r = await verify(getKey());               // no secret word set on the server → opens straight away
      if (r === 'ok') return enter(getKey());
      if (r === 'offline') setNotice('Cannot reach the server. Is it running?');
      setPhase('locked');
    })();
  }, []);
  const lock = () => { forgetEverything(); if (hero) URL.revokeObjectURL(hero); setHero(null); setPhase('locked'); };

  if (phase === 'checking') return <main className="grid min-h-screen place-items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#14121a] via-[#09080d] to-[#020204]"><Heart className="beat h-10 w-10 fill-[#d9467a] text-[#d9467a]" aria-label="Loading" /></main>;
  if (phase === 'locked') return <Gate onUnlock={enter} notice={notice} />;
  return <Dashboard hero={hero} onLock={lock} />;
}
