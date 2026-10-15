'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Lock, ArrowRight, Heart, Eye, EyeOff, ShieldCheck, Sparkles, KeyRound, LogOut, Film } from 'lucide-react';
import Floaters from '@/components/Floaters';
import InstallPrompt from '@/components/InstallPrompt';
import { getKey, setKey, verify, loadHero, forgetEverything } from '@/lib/vault';

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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0c0612] px-6 text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(235,70,130,0.35),transparent_70%),radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(255,185,115,0.18),transparent_60%),radial-gradient(circle_at_15%_35%,rgba(165,25,85,0.25),transparent_50%),radial-gradient(circle_at_85%_75%,rgba(95,25,125,0.28),transparent_55%)]" />
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
  useEffect(() => setLast(localStorage.getItem('lastRoom') || ''), []);

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
    if (p.length > 0 && p.length < 4) return setPerr('Room password needs at least 4 characters (or leave empty).');
    let id = roomName.trim();
    if (id) {
      id = slug(id);
      if (!/^[\w-]{2,64}$/.test(id)) return setPerr('Room name must be 2-64 letters, numbers or dashes.');
    } else {
      id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    }
    if (p) sessionStorage.setItem('rp_' + id, p);
    router.push(`/room/${id}${p ? '#pass=' + encodeURIComponent(p) : ''}`);
  };
  const join = (e) => {
    e.preventDefault();
    const c = slug(code);
    if (!/^[\w-]{2,64}$/.test(c)) return setErr('Please enter a valid room code or link.');
    const jp = joinPass.trim();
    if (jp) sessionStorage.setItem('rp_' + c, jp);
    router.push(`/room/${c}${jp ? '#pass=' + encodeURIComponent(jp) : ''}`);
  };

  return (
    <main ref={root} className="relative min-h-screen overflow-hidden bg-[#0c0612] text-white">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0612] via-[#0c0612]/60 to-transparent md:via-[#0c0612]/45" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(8,4,12,.75)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-10%,rgba(235,70,130,0.28),transparent_70%),radial-gradient(ellipse_70%_35%_at_50%_0%,rgba(255,185,115,0.14),transparent_60%)]" />
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
          <p className="sub mt-5 max-w-md text-base text-white/80 sm:text-lg">Your own private room. Watch in sync with video, voice and chat — no sign-up.</p>
          <ol className="mt-5 flex flex-wrap gap-2 text-sm">
            {['Start a room', 'Send the link', 'Press play together'].map((s, i) => (
              <li key={s} className="step glass-btn !rounded-full !px-3 !py-1.5"><b className="grid h-5 w-5 place-items-center rounded-full bg-[#d9467a] text-xs">{i + 1}</b>{s}</li>
            ))}
          </ol>
        </div>

        <div className="panel glass w-full space-y-4 p-6 md:max-w-md">
          {/* Tab switcher */}
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
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
              Create Room
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
              Join Room
            </button>
          </div>

          {tab === 'create' ? (
            <form onSubmit={create} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">Room Name / ID (optional)</label>
                <div className="relative">
                  <Film className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => { setRoomName(e.target.value); setPerr(''); }}
                    placeholder="e.g. movie-couch (or leave empty for random)"
                    aria-label="Room name"
                    maxLength={64}
                    className="field-d !pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/80">Room Password (optional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={pass}
                    onChange={(e) => { setPass(e.target.value); setPerr(''); }}
                    placeholder="Room password (optional)"
                    aria-label="Room password"
                    maxLength={64}
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
                <p className={`mt-1 text-xs ${perr ? 'text-rose-300' : 'text-white/50'}`}>
                  {perr || 'Leave blank for an open room, or set a password.'}
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
          ) : (
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
                <label className="mb-1 block text-xs font-medium text-white/80">Room Password (if protected)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                  <input
                    type={showJoinPass ? 'text' : 'password'}
                    value={joinPass}
                    onChange={(e) => { setJoinPass(e.target.value); setErr(''); }}
                    placeholder="Room password (optional)"
                    aria-label="Room password"
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
                {err && <p role="alert" className="mt-1 text-xs text-rose-300">{err}</p>}
              </div>
              <button className="btn w-full !py-3.5 !text-base">
                <KeyRound className="h-4 w-4" />
                Join Room
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {last && (
            <button onClick={() => router.push(`/room/${last}`)} className="glass-btn w-full justify-between">
              <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-[#ff6fa0]" />Back to our room</span>
              <span className="font-mono text-xs text-white/60">{last}</span>
            </button>
          )}
          <p className="flex items-center gap-1.5 border-t border-white/10 pt-3 text-xs text-white/60"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />Private: secret word to enter, and video &amp; voice go straight between you two.</p>
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

  if (phase === 'checking') return <main className="grid min-h-screen place-items-center bg-[#120b1a]"><Heart className="beat h-10 w-10 fill-[#d9467a] text-[#d9467a]" aria-label="Loading" /></main>;
  if (phase === 'locked') return <Gate onUnlock={enter} notice={notice} />;
  return <Dashboard hero={hero} onLock={lock} />;
}
