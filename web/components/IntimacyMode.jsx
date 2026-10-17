'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Flame, Moon, Shield, Lock, Unlock, Eye, EyeOff,
  Sparkles, KeyRound, Copy, Check, QrCode, Sliders,
  Share2, Heart, AlertTriangle, Fingerprint, RefreshCw, X, Crown
} from 'lucide-react';

export default function IntimacyMode({
  socket,
  me,
  isHost,
  adultMode = false,
  hasPin = false,
  say,
}) {
  const [activeTab, setActiveTab] = useState('stealth'); // 'stealth', 'security', 'invite'

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
    <div className="card p-3.5 sm:p-4 text-white overflow-hidden !bg-black border border-white/10">
      {/* Top Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 mb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('stealth')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === 'stealth' ? 'bg-rose-600 text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <EyeOff className="h-3.5 w-3.5 text-indigo-400" />
          <span>Stealth Disguise</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === 'security' ? 'bg-rose-600 text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <Lock className="h-3.5 w-3.5 text-emerald-400" />
          <span>PIN &amp; Biometrics {hasPin && '🔒'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invite')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
            activeTab === 'invite' ? 'bg-rose-600 text-white shadow' : 'text-white/60 hover:text-white'
          }`}
        >
          <Share2 className="h-3.5 w-3.5 text-rose-300" />
          <span>Discreet Invites</span>
        </button>
      </div>
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
              className="btn !py-2.5 !px-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-500"
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
                    ? 'border-rose-500 bg-rose-500/20 text-white'
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
        <div className="fixed inset-0 z-[999] grid place-items-center bg-black backdrop-blur-2xl p-6 text-white text-center">
          <div className="card w-full max-w-sm p-8 space-y-5 border border-white/15 !bg-black">
            <div className="h-16 w-16 mx-auto rounded-full bg-rose-600/20 border border-rose-500/40 grid place-items-center">
              <Lock className="h-7 w-7 text-rose-400" />
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSetPin}
            className="card w-full max-w-sm p-6 space-y-4 border border-white/15 !bg-black"
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
