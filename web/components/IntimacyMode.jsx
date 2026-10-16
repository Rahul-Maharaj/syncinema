'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Flame, Moon, Shield, Lock, Unlock, Eye, EyeOff,
  Sparkles, KeyRound, Copy, Check, QrCode, Sliders,
  Share2, Heart, AlertTriangle, Fingerprint, RefreshCw, X, Crown
} from 'lucide-react';

const AMBIENT_PRESETS = [
  { id: 'love', name: 'Love Neon', color: '#d9467a', glow: 'rgba(217, 70, 122, 0.45)', bg: 'radial-gradient(circle at 50% 20%, rgba(217, 70, 122, 0.35), transparent 70%), #0c0612' },
  { id: 'candlelight', name: 'Candlelight', color: '#ff9e42', glow: 'rgba(255, 158, 66, 0.45)', bg: 'radial-gradient(circle at 50% 30%, rgba(255, 158, 66, 0.35), transparent 70%), #0d0806' },
  { id: 'midnight', name: 'Midnight Violet', color: '#8a2be2', glow: 'rgba(138, 43, 226, 0.45)', bg: 'radial-gradient(circle at 50% 20%, rgba(138, 43, 226, 0.35), transparent 70%), #08040f' },
  { id: 'ruby', name: 'Velvet Cinema Red', color: '#e50914', glow: 'rgba(229, 9, 20, 0.4)', bg: 'radial-gradient(circle at 50% 25%, rgba(229, 9, 20, 0.3), transparent 70%), #0d0507' },
  { id: 'sunset', name: 'Sunset Rose', color: '#ff6e7f', glow: 'rgba(255, 110, 127, 0.45)', bg: 'radial-gradient(circle at 50% 20%, rgba(255, 110, 127, 0.35), transparent 70%), #0f070a' },
  { id: 'noir', name: 'Deep Cinema Noir', color: '#334155', glow: 'rgba(30, 41, 59, 0.3)', bg: 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.25), transparent 70%), #050307' },
];


export default function IntimacyMode({
  socket,
  me,
  isHost,
  adultMode = false,
  ambient = { preset: 'love', intensity: 80, flicker: false },
  hasPin = false,
  say,
  onApplyAmbient,
}) {
  const [activeTab, setActiveTab] = useState('lighting'); // 'lighting', 'adult', 'stealth', 'security', 'invite'

  // Ambient lighting local state
  const [preset, setPreset] = useState(ambient?.preset || 'love');
  const [intensity, setIntensity] = useState(ambient?.intensity ?? 80);
  const [flicker, setFlicker] = useState(!!ambient?.flicker);

  // Stealth / Disguise mode
  const [stealthActive, setStealthActive] = useState(false);
  const origTitleRef = useRef('');

  // PIN & Biometric Lock
  const [pinDraft, setPinDraft] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState('');
  const [lockError, setLockError] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Private Room Invitation
  const [copied, setCopied] = useState(false);
  const [inviteStyle, setInviteStyle] = useState('romantic'); // 'romantic', 'discreet', 'short'

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      setBiometricSupported(true);
    }
  }, []);

  // Keyboard shortcut: Escape to activate Stealth Disguise
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !stealthActive) {
        enableStealth();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stealthActive]);

  // Handle ambient lighting broadcast and local apply (Host Only)
  const handleUpdateAmbient = (newP, newI, newF) => {
    if (!isHost) {
      say?.('👑 Only the room host can adjust ambient lighting settings');
      return;
    }
    setPreset(newP);
    setIntensity(newI);
    setFlicker(newF);
    const amb = { preset: newP, intensity: newI, flicker: newF };
    onApplyAmbient?.(amb);
    socket?.emit('ambient:set', amb);
  };

  // Stealth Disguise Mode
  const enableStealth = () => {
    origTitleRef.current = document.title;
    document.title = 'Quarterly Strategy & Notes - Document';
    setStealthActive(true);
    socket?.emit('player', { action: 'PAUSE', time: 0 });
  };

  const disableStealth = () => {
    if (origTitleRef.current) document.title = origTitleRef.current;
    setStealthActive(false);
  };

  // PIN setup
  const handleSetPin = (e) => {
    e.preventDefault();
    if (!pinDraft || pinDraft.length < 4) {
      setLockError('PIN must be at least 4 digits');
      return;
    }
    socket?.emit('pin:set', { pin: pinDraft }, (res) => {
      if (res?.ok) {
        setShowPinModal(false);
        setPinDraft('');
        setLockError('');
        say?.('Room PIN protection enabled 🔒');
      } else {
        setLockError('Failed to set PIN');
      }
    });
  };

  // Verify PIN Unlock
  const handleUnlockWithPin = (e) => {
    e.preventDefault();
    socket?.emit('pin:verify', { pin: unlockPin }, (res) => {
      if (res?.ok) {
        setIsLocked(false);
        setUnlockPin('');
        setLockError('');
      } else {
        setLockError('Incorrect PIN. Try again.');
      }
    });
  };

  // Biometric Unlock using WebAuthn
  const handleBiometricAuth = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'SyncCinema Date Room' },
          user: {
            id: new Uint8Array(16),
            name: 'Partner',
            displayName: 'Partner',
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      });
      if (credential) {
        setIsLocked(false);
        say?.('Unlocked with biometrics ✨');
      }
    } catch (err) {
      // User cancelled or fallback
      setLockError('Biometric authentication failed. Please use your PIN.');
    }
  };

  // Build Invite link
  const getInviteText = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    switch (inviteStyle) {
      case 'romantic':
        return `Hey love, our private couch is ready for date night 🍿💗 Tap to join me:\n${url}`;
      case 'discreet':
        return `Meeting link: ${url}`;
      default:
        return url;
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(getInviteText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    say?.('Private invite link copied to clipboard 📋');
  };

  return (
    <div className="card rise p-3.5 sm:p-4 text-white overflow-hidden">
      {/* Top Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 mb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('lighting')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'lighting' ? 'bg-[#d9467a] text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <Flame className="h-3.5 w-3.5 text-amber-400" />
          <span>Ambient Lighting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('adult')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'adult' ? 'bg-[#d9467a] text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <Heart className="h-3.5 w-3.5 text-rose-400" />
          <span>Adults-Only 18+ {adultMode && '🔥'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stealth')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'stealth' ? 'bg-[#d9467a] text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <EyeOff className="h-3.5 w-3.5 text-indigo-400" />
          <span>Stealth Disguise</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'security' ? 'bg-[#d9467a] text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          <span>PIN & Biometrics {hasPin && '🔒'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'invite' ? 'bg-[#d9467a] text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <Share2 className="h-3.5 w-3.5 text-pink-400" />
          <span>Discreet Invites</span>
        </button>
      </div>

      {/* TAB 1: AMBIENT LIGHTING */}
      {activeTab === 'lighting' && (
        <div className="space-y-4">
          {!isHost && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Room lighting is controlled by the host.</span>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-white/80">Romantic Ambient Presets</p>
            <p className="text-[11px] text-white/50">Changes the room glow and background lighting synchronously for both devices</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMBIENT_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleUpdateAmbient(p.id, intensity, flicker)}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                  preset === p.id
                    ? 'border-[#ff6fa0] bg-white/10 shadow-lg'
                    : 'border-white/10 hover:border-white/25 bg-black/20'
                }`}
              >
                <span
                  className="h-5 w-5 rounded-full shrink-0 shadow-md"
                  style={{ background: p.color, boxShadow: `0 0 10px ${p.glow}` }}
                />
                <span className="text-xs font-medium truncate">{p.name}</span>
              </button>
            ))}
          </div>

          {/* Glow Intensity Slider */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <div className="flex justify-between text-xs text-white/70">
              <span className="flex items-center gap-1"><Sliders className="h-3.5 w-3.5" /> Glow Intensity</span>
              <span className="font-bold">{intensity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              disabled={!isHost}
              value={intensity}
              onChange={(e) => handleUpdateAmbient(preset, +e.target.value, flicker)}
              className="w-full accent-[#d9467a] cursor-pointer disabled:opacity-50"
            />
          </div>

          {/* Candlelight Flicker Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs font-semibold text-white/80">Candlelight Flicker Effect</p>
              <p className="text-[10px] text-white/50">Simulates real candlelight breathing on both screens</p>
            </div>
            <button
              type="button"
              disabled={!isHost}
              onClick={() => handleUpdateAmbient(preset, intensity, !flicker)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition disabled:opacity-50 ${
                flicker ? 'bg-[#ff9e42] text-black' : 'bg-white/10 text-white/60'
              }`}
            >
              {flicker ? 'Active 🕯️' : 'Off'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ADULTS-ONLY 18+ MODE */}
      {activeTab === 'adult' && (
        <div className="space-y-3.5">
          {!isHost && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Adults-Only 18+ mode can only be enabled by the room host.</span>
            </div>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl border border-rose-500/30 bg-rose-950/20">
            <div>
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" /> Adults-Only Date Room (18+)
              </span>
              <p className="text-[11px] text-white/60 mt-0.5">
                Enables unblocked adult streaming, romantic gestures, and discreet zero-log privacy.
              </p>
            </div>
            {isHost ? (
              <button
                type="button"
                onClick={() => socket?.emit('room:toggle_adult', !adultMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                  adultMode
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                {adultMode ? 'Enabled 🔥' : 'Enable 18+'}
              </button>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/60 font-semibold">
                {adultMode ? '18+ Active 🔥' : 'Host Disabled'}
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-white/70 mb-2">Private Streaming Features:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-rose-400" /> Zero-Log Privacy</p>
                <p className="text-[10px] text-white/50 mt-1">Adult site names and links are hidden everywhere across the app</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-rose-400" /> High-Speed Streams</p>
                <p className="text-[10px] text-white/50 mt-1">Chunked range prefetching for smooth zero-buffering playback</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-rose-400" /> Proxy Unblocker</p>
                <p className="text-[10px] text-white/50 mt-1">Bypasses ISP bans, frame blocks and ad redirects automatically</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                <p className="font-semibold text-rose-300 flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-rose-400" /> Couch Talk Sync</p>
                <p className="text-[10px] text-white/50 mt-1">Automatic voice audio ducking and micro-rate sync</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-white/50 bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-1">
            <p className="font-medium text-white/80">🔒 End-to-End Private Couch</p>
            <p>Video links stream privately between you two with no logs, tracking, or indexing.</p>
          </div>
        </div>
      )}

      {/* TAB 3: STEALTH DISGUISE (PANIC BUTTON) */}
      {activeTab === 'stealth' && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl border border-indigo-400/30 bg-indigo-950/20">
            <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <EyeOff className="h-3.5 w-3.5" /> Instant Stealth Disguise (Panic Button)
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">
              If someone enters the room or looks at your screen, press <b>Esc</b> or click below to disguise the website as a boring document immediately!
            </p>
          </div>

          <div className="text-center py-2">
            <button
              type="button"
              onClick={enableStealth}
              className="btn !py-2.5 !px-6 text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-600/30"
            >
              <EyeOff className="h-4 w-4" /> Disguise Screen Now (Esc)
            </button>
          </div>

          <div className="space-y-1 text-xs text-white/60">
            <p className="font-semibold text-white/80">What happens in Stealth Mode:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Tab title changes to &ldquo;Quarterly Strategy &amp; Notes&rdquo;</li>
              <li>Video instantly pauses and all sound mutes</li>
              <li>Screen is covered with a realistic meeting notes document</li>
              <li>Nobody can tell you are watching a movie</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 4: PIN & BIOMETRIC APP LOCK */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
            <p className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Quick PIN &amp; Biometric Lock
            </p>
            <p className="text-[11px] text-white/60 mt-0.5">
              Lock the room whenever you step away so only you and your partner can unlock it with your PIN or fingerprint.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsLocked(true)}
              className="btn !py-2 !px-4 text-xs flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Lock Screen Now</span>
            </button>

            {isHost && (
              <button
                type="button"
                onClick={() => setShowPinModal(true)}
                className="glass-btn !py-2 !px-4 text-xs flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                <span>{hasPin ? 'Change PIN' : 'Set 4-Digit PIN'}</span>
              </button>
            )}

            {biometricSupported && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="glass-btn !py-2 !px-4 text-xs flex items-center gap-1.5"
              >
                <Fingerprint className="h-3.5 w-3.5 text-emerald-400" />
                <span>Test Biometrics</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DISCREET INVITATIONS */}
      {activeTab === 'invite' && (
        <div className="space-y-3.5">
          <div>
            <p className="text-xs font-bold text-white/80">Private Room Invitation</p>
            <p className="text-[11px] text-white/50">Send a romantic or discreet invitation to your partner</p>
          </div>

          {/* Style Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'romantic', label: 'Romantic 💕' },
              { id: 'discreet', label: 'Discreet 🤫' },
              { id: 'short', label: 'Just Link 🔗' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setInviteStyle(s.id)}
                className={`py-1.5 rounded-lg text-xs font-medium border text-center transition ${
                  inviteStyle === s.id
                    ? 'border-[#d9467a] bg-[#d9467a]/20 text-white'
                    : 'border-white/10 text-white/60 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Preview Box */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/80 whitespace-pre-line font-mono break-all">
            {getInviteText()}
          </div>

          <button
            type="button"
            onClick={handleCopyInvite}
            className="btn w-full !py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Invitation Message'}</span>
          </button>
        </div>
      )}

      {/* FULL-SCREEN STEALTH DISGUISE OVERLAY */}
      {stealthActive && (
        <div className="fixed inset-0 z-[9999] bg-[#f8f9fa] text-[#202124] p-6 sm:p-12 font-sans overflow-y-auto select-none">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded bg-[#1a73e8] grid place-items-center text-white font-bold">D</div>
                <div>
                  <h1 className="text-xl font-medium text-[#202124]">Q4 Project Strategy &amp; Documentation</h1>
                  <p className="text-xs text-[#5f6368]">Document ID: #STRAT-2026-94 • Last edited 2 minutes ago</p>
                </div>
              </div>
              <button
                onClick={disableStealth}
                className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-xs font-semibold hover:bg-[#1557b0] transition shadow"
              >
                Return to Date 💕
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#3c4043] leading-relaxed">
              <h2 className="text-base font-semibold text-[#202124]">1. Executive Summary &amp; Milestone Roadmap</h2>
              <p>
                The integration phase has successfully cleared synchronization benchmarks across distributed client interfaces.
                Cross-region latency protocols demonstrate steady packet timing beneath 120ms thresholds with active WebRTC media delivery.
              </p>
              <h2 className="text-base font-semibold text-[#202124]">2. Deliverable Verification</h2>
              <div className="border rounded-lg overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-[#f1f3f4] p-2.5 font-bold border-b">
                  <span>Component</span>
                  <span>Status</span>
                  <span>Latency</span>
                </div>
                <div className="grid grid-cols-3 p-2.5 border-b">
                  <span>WebRTC Signaling</span>
                  <span className="text-emerald-700 font-medium">Optimal</span>
                  <span>14ms</span>
                </div>
                <div className="grid grid-cols-3 p-2.5">
                  <span>Stream Buffer</span>
                  <span className="text-emerald-700 font-medium">100% Buffered</span>
                  <span>0ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LOCK OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-[999] grid place-items-center bg-[radial-gradient(ellipse_100%_80%_at_50%_-20%,rgba(35,30,48,0.45),rgba(12,10,16,0.98)_55%,#020204_100%)] backdrop-blur-2xl p-6 text-white text-center">
          <div className="card rise w-full max-w-sm p-8 space-y-5 border border-white/15 !bg-gradient-to-b from-[#14121a]/95 via-[#0d0b12]/98 to-[#060509]/98 shadow-2xl">
            <div className="h-16 w-16 mx-auto rounded-full bg-[#d9467a]/20 border border-[#d9467a]/40 grid place-items-center">
              <Lock className="h-7 w-7 text-[#ff8fb3]" />
            </div>

            <div>
              <h3 className="font-display text-xl font-bold">Room Locked</h3>
              <p className="text-xs text-white/60 mt-1">Type your 4-digit PIN or use biometrics to return to your movie date.</p>
            </div>

            <form onSubmit={handleUnlockWithPin} className="space-y-3">
              <input
                autoFocus
                type="password"
                maxLength={8}
                value={unlockPin}
                onChange={(e) => setUnlockPin(e.target.value)}
                placeholder="Enter PIN"
                className="field text-center font-mono text-2xl tracking-widest !py-2.5"
              />

              {lockError && <p className="text-xs text-rose-400">{lockError}</p>}

              <button type="submit" className="btn w-full !py-2.5 text-sm font-semibold">
                Unlock Room
              </button>
            </form>

            {biometricSupported && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="glass-btn w-full !py-2 text-xs flex items-center justify-center gap-2"
              >
                <Fingerprint className="h-4 w-4 text-emerald-400" />
                <span>Unlock with Touch ID / Face ID</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SET 4-DIGIT PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSetPin}
            className="card rise w-full max-w-sm p-6 space-y-4 border border-white/15 !bg-gradient-to-b from-[#14121a]/95 via-[#0d0b12]/98 to-[#060509]/98 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-300" /> Set Room PIN
              </h3>
              <button type="button" onClick={() => setShowPinModal(false)} className="text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">Enter 4 to 8 Digit PIN</label>
              <input
                autoFocus
                type="password"
                maxLength={8}
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value)}
                placeholder="4-digit PIN"
                className="field text-center font-mono text-xl tracking-widest"
              />
            </div>

            {lockError && <p className="text-xs text-rose-400">{lockError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowPinModal(false)} className="ghost !py-2 text-xs">
                Cancel
              </button>
              <button type="submit" className="btn !py-2 text-xs">
                Save PIN
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
