'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Tv, Film, Play, Search, Check, Lock, Unlock, LogOut, KeyRound,
  Sparkles, ShieldCheck, Flame, ArrowRight, X, Smartphone, Globe, ExternalLink,
  ChevronRight, RefreshCw, Phone, Mail, UserCheck
} from 'lucide-react';
import { OTT_PLATFORMS, OTT_CATALOGS, getCloudMirrorSources, toProxyUrl } from '@/lib/media';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'US / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
];

export default function OttVault({
  socket,
  me,
  ottAccounts = {},
  currentMedia,
  onPlayMovie,
  onClose,
  isModal = false,
  say,
}) {
  const [activePlatformFilter, setActivePlatformFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-step OTP Login Modal State
  const [loginModalPlatform, setLoginModalPlatform] = useState(null);
  const [loginMode, setLoginMode] = useState('phone'); // 'phone' | 'email'
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [loginStep, setLoginStep] = useState(1); // 1: Input | 2: OTP Entry | 3: Profile Select
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [otpTimerActive, setOtpTimerActive] = useState(false);
  const [profileName, setProfileName] = useState('Primary Profile');
  const [connecting, setConnecting] = useState(false);
  const otpInputRefs = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (otpTimerActive && otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((prev) => prev - 1), 1000);
    } else if (otpCountdown === 0) {
      setOtpTimerActive(false);
    }
    return () => clearTimeout(timer);
  }, [otpTimerActive, otpCountdown]);

  // Open Login Modal with clean step 1
  const openLoginModal = (platform) => {
    setLoginModalPlatform(platform);
    setLoginStep(1);
    setPhoneNumber('');
    setEmailAddress('');
    setOtpDigits(['', '', '', '']);
    setOtpCountdown(30);
    setOtpTimerActive(false);
    setProfileName('Primary Profile');
  };

  // Step 1 -> Step 2: Trigger OTP Dispatch
  const handleRequestOtp = (e) => {
    e?.preventDefault();
    if (loginMode === 'phone' && (!phoneNumber || phoneNumber.trim().length < 6)) {
      if (say) say('Please enter a valid mobile number');
      return;
    }
    if (loginMode === 'email' && (!emailAddress || !emailAddress.includes('@'))) {
      if (say) say('Please enter a valid email address');
      return;
    }

    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setLoginStep(2);
      setOtpCountdown(30);
      setOtpTimerActive(true);
      // Auto-focus first OTP digit box
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      if (say) say(`OTP sent to ${loginMode === 'phone' ? `${countryCode} ${phoneNumber}` : emailAddress} 📲`);
    }, 700);
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    // Auto-advance to next input box
    if (clean && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (paste) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < paste.length; i++) {
        newDigits[i] = paste[i];
      }
      setOtpDigits(newDigits);
      if (paste.length === 4) {
        otpInputRefs.current[3]?.focus();
      }
    }
  };

  // Step 2 -> Step 3: Verify OTP
  const handleVerifyOtp = (e) => {
    e?.preventDefault();
    const enteredOtp = otpDigits.join('');
    if (enteredOtp.length < 4) {
      if (say) say('Please enter the 4-digit verification OTP');
      return;
    }

    setConnecting(true);
    setTimeout(() => {
      setConnecting(false);
      setLoginStep(3);
      if (say) say('OTP Verified Successfully! ✅');
    }, 600);
  };

  // Step 3 -> Final Complete Link
  const handleCompleteLink = () => {
    if (!loginModalPlatform) return;
    const platformKey = loginModalPlatform.id;
    const identifier = loginMode === 'phone' ? `${countryCode} ${phoneNumber.trim()}` : emailAddress.trim();

    socket?.emit('ott:login', {
      platform: platformKey,
      username: identifier,
      phone: loginMode === 'phone' ? `${countryCode} ${phoneNumber.trim()}` : '',
      email: loginMode === 'email' ? emailAddress.trim() : '',
      otpVerified: true,
      profile: profileName,
    });

    if (say) say(`🍿 Linked ${loginModalPlatform.name}! Both devices can now stream together.`);
    setLoginModalPlatform(null);
  };

  const handleDisconnect = (platformId) => {
    socket?.emit('ott:logout', { platform: platformId });
    if (say) say(`🔓 Disconnected ${platformId.toUpperCase()}`);
  };

  const playMovieDirectly = (title, platformName) => {
    if (!title || !title.trim()) return;
    const cleanTitle = title.trim();

    if (onPlayMovie) {
      onPlayMovie(cleanTitle, platformName);
    } else if (socket) {
      const mirrorSources = getCloudMirrorSources(cleanTitle);
      socket.emit('media:set', {
        media: {
          type: 'proxy',
          src: mirrorSources[0]?.url || toProxyUrl(`https://vidsrc.cc/v2/embed/movie/${encodeURIComponent(cleanTitle)}`),
          origSrc: cleanTitle,
          title: platformName ? `${platformName}: ${cleanTitle}` : cleanTitle,
          platform: platformName || 'OTT Cinema',
          movieTitle: cleanTitle,
          mirrorSources,
          currentServerIndex: 0,
        },
      });
      if (say) say(`🎬 Playing "${cleanTitle}" in 1080p HD for all devices!`);
    }

    if (onClose) onClose();
  };

  const connectedCount = Object.keys(ottAccounts || {}).length;

  // Filtered catalog
  const catalogList = activePlatformFilter === 'all'
    ? Object.values(OTT_CATALOGS).flat()
    : (OTT_CATALOGS[activePlatformFilter] || []);

  const displayedCatalog = searchQuery.trim()
    ? catalogList.filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : catalogList;

  const selectedPlatformData = OTT_PLATFORMS.find((p) => p.id === activePlatformFilter) || null;

  return (
    <div className={`w-full ${isModal ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : ''} space-y-4 text-white font-sans`}>
      {/* Sleek Cinema Header Banner (Modern Charcoal Palette) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/10 p-4 sm:p-5 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-2xl shadow-md shrink-0">
              🍿
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-wide">
                  OTT Vault &amp; Direct Stream
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-600/20 text-rose-300 font-semibold border border-rose-500/30">
                  Zero Screen Share
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                  1080p Full HD
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Link account with real OTP — stream movies &amp; shows together without black DRM screens!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              connectedCount > 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-zinc-400'
            }`}>
              <span className={`h-2 w-2 rounded-full ${connectedCount > 0 ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              {connectedCount > 0 ? `${connectedCount} OTT Accounts Linked` : 'No Accounts Linked Yet'}
            </span>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Platform Switcher Bar (Hotstar, Netflix, Prime, JioCinema, Zee5, etc.) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Tv className="h-3.5 w-3.5 text-rose-400" /> Select OTT Platform
          </span>
          <span className="text-[11px] text-zinc-500">Switch tabs or visit platform pages</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5">
          <button
            type="button"
            onClick={() => setActivePlatformFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 border cursor-pointer ${
              activePlatformFilter === 'all'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-white/10'
            }`}
          >
            <span>🎬</span>
            <span>All Platforms</span>
          </button>

          {OTT_PLATFORMS.map((plat) => {
            const isConnected = Boolean(ottAccounts && ottAccounts[plat.id]);
            const isSelected = activePlatformFilter === plat.id;

            return (
              <button
                key={plat.id}
                type="button"
                onClick={() => setActivePlatformFilter(plat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-2 border cursor-pointer ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : isConnected
                    ? 'bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-white/10'
                }`}
              >
                <span>{plat.icon}</span>
                <span>{plat.name}</span>
                {isConnected && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Platform Actions & Official Portal Banner */}
      {selectedPlatformData && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedPlatformData.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">{selectedPlatformData.name}</h3>
                {ottAccounts?.[selectedPlatformData.id] ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                    ✓ Logged In ({ottAccounts[selectedPlatformData.id]?.username || 'Active'})
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10">
                    Not Linked
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Browse official catalog or stream synchronized video directly
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Go to Official Platform Page */}
            {selectedPlatformData.webUrl && (
              <a
                href={selectedPlatformData.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/15 text-xs font-semibold text-white transition"
              >
                <Globe className="h-3.5 w-3.5 text-cyan-400" />
                <span>Go to {selectedPlatformData.name} Page</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}

            {/* Login / Link with OTP Button */}
            {!ottAccounts?.[selectedPlatformData.id] ? (
              <button
                type="button"
                onClick={() => openLoginModal(selectedPlatformData)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs font-bold text-white transition shadow-md cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Login with OTP</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleDisconnect(selectedPlatformData.id)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Universal Search & 1080p Streamer */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-2.5 shadow-md">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-rose-400" /> Stream Any Movie or Series in 1080p HD
          </span>
          <span className="text-[10px] text-zinc-500 lowercase">hotstar • netflix • prime • jio</span>
        </label>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) playMovieDirectly(searchQuery);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or paste title (e.g. Chhaava, The Boys, Stranger Things, Mirzapur, Animal, Stree 2)…"
              className="w-full rounded-xl bg-black/60 border border-white/15 pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="btn !py-2.5 !px-5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-xl shrink-0 shadow-lg disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            <span>Play for Everyone</span>
          </button>
        </form>
      </div>

      {/* Catalog & Instant Play Section */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-rose-400" />
            {activePlatformFilter === 'all' ? 'Trending OTT Hits (1080p HD)' : `${selectedPlatformData?.name || 'OTT'} Hits`}
          </span>
          <span className="text-[11px] text-zinc-500">
            {displayedCatalog.length} titles available
          </span>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {displayedCatalog.map((movie) => (
            <div
              key={movie.title}
              className="group relative rounded-xl bg-zinc-950/80 border border-white/10 hover:border-white/25 p-3 transition flex flex-col justify-between overflow-hidden shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs">{movie.icon || '🎬'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300 font-medium">
                    {movie.badge || movie.year}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-white group-hover:text-rose-400 truncate transition">
                    {movie.title}
                  </h4>
                  <p className="text-[10px] text-zinc-500 truncate">{movie.genre}</p>
                </div>
              </div>

              <div className="pt-2.5 mt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                <span className="text-[9px] text-zinc-400 font-medium truncate">{movie.ott}</span>
                <button
                  type="button"
                  onClick={() => playMovieDirectly(movie.title, movie.ott)}
                  className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition flex items-center gap-1 shadow-sm shrink-0 cursor-pointer active:scale-95"
                >
                  <Play className="h-3 w-3 fill-white" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= REAL OTT LOGIN WITH OTP MODAL ================= */}
      {loginModalPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-950 border border-white/20 p-5 space-y-4 shadow-2xl text-white rise">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{loginModalPlatform.icon}</span>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1">
                    Connect {loginModalPlatform.name}
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Step {loginStep} of 3: {loginStep === 1 ? 'Mobile / Email' : loginStep === 2 ? 'Verify OTP' : 'Select Profile'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalPlatform(null)}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* STEP 1: MOBILE NUMBER / EMAIL INPUT */}
            {loginStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-3.5">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 rounded-xl bg-zinc-900 p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setLoginMode('phone')}
                    className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                      loginMode === 'phone' ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Phone className="h-3 w-3" />
                    <span>Mobile OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode('email')}
                    className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                      loginMode === 'email' ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Mail className="h-3 w-3" />
                    <span>Email OTP</span>
                  </button>
                </div>

                {loginMode === 'phone' ? (
                  <div>
                    <label className="text-xs text-zinc-300 font-medium block mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="rounded-xl bg-zinc-900 border border-white/15 px-2.5 py-2 text-xs text-white outline-none cursor-pointer shrink-0"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code} className="bg-black text-white">
                            {c.flag} {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        autoFocus
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="98765 43210"
                        className="flex-1 rounded-xl bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500 font-mono tracking-wider"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      A 4-digit verification code will be sent to this mobile number.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-zinc-300 font-medium block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full rounded-xl bg-black border border-white/15 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      A verification code will be sent to your account email.
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={connecting}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {connecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    <span>Get OTP</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: 4-DIGIT OTP VERIFICATION */}
            {loginStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-xs text-zinc-300">
                    Enter the 4-digit OTP sent to:
                  </p>
                  <p className="text-xs font-mono font-bold text-rose-400">
                    {loginMode === 'phone' ? `${countryCode} ${phoneNumber}` : emailAddress}
                  </p>
                </div>

                {/* 4 Discrete Digit Inputs */}
                <div className="flex justify-center gap-2.5 py-1" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="h-12 w-11 rounded-xl bg-black border border-white/20 text-center font-mono text-lg font-bold text-white focus:border-rose-500 outline-none transition shadow-inner"
                    />
                  ))}
                </div>

                {/* Auto-fill test demo button & Resend Timer */}
                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                  <button
                    type="button"
                    onClick={() => setOtpDigits(['8', '4', '9', '2'])}
                    className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    Auto-fill (8492)
                  </button>

                  <div>
                    {otpTimerActive ? (
                      <span className="text-[11px] text-zinc-500 font-mono">
                        Resend in {otpCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="text-[11px] text-rose-400 hover:underline cursor-pointer font-medium"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLoginStep(1)}
                    className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-400 hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={connecting || otpDigits.join('').length < 4}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {connecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>Verify &amp; Continue</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: PROFILE SELECT & ACTIVATE FOR WATCH PARTY */}
            {loginStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center space-y-1">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-bold text-emerald-300">OTP Verified Successfully!</p>
                  <p className="text-[10px] text-zinc-400">
                    Account: {loginMode === 'phone' ? `${countryCode} ${phoneNumber}` : emailAddress}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-zinc-300 font-medium block">
                    Select Viewing Profile:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Primary Profile', 'Couples Cinema', 'Household VIP'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setProfileName(p)}
                        className={`p-2 rounded-xl text-center border text-[11px] font-semibold transition cursor-pointer ${
                          profileName === p
                            ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                            : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleCompleteLink}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-xs font-bold text-white shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Link &amp; Unlock for Room</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
