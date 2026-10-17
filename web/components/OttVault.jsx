'use client';
import { useState } from 'react';
import {
  Tv, Film, Play, Search, Check, Lock, Unlock, LogOut, KeyRound,
  Sparkles, ShieldCheck, Flame, ArrowRight, X, Smartphone, Globe, ExternalLink
} from 'lucide-react';
import { OTT_PLATFORMS, OTT_CATALOGS, getCloudMirrorSources, toProxyUrl } from '@/lib/media';

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
  const [loginModalPlatform, setLoginModalPlatform] = useState(null);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginProfile, setLoginProfile] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Filtered catalog
  const catalogList = activePlatformFilter === 'all'
    ? Object.values(OTT_CATALOGS).flat()
    : (OTT_CATALOGS[activePlatformFilter] || []);

  const displayedCatalog = searchQuery.trim()
    ? catalogList.filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : catalogList;

  const handleConnectSubmit = (e) => {
    e?.preventDefault();
    if (!loginModalPlatform) return;
    setConnecting(true);

    const platformKey = loginModalPlatform.id;
    const identifier = loginIdentifier.trim() || `${loginModalPlatform.name} Subscriber`;

    socket?.emit('ott:login', {
      platform: platformKey,
      username: identifier,
      email: identifier.includes('@') ? identifier : '',
      phone: !identifier.includes('@') ? identifier : '',
    });

    if (say) say(`🍿 Linked ${loginModalPlatform.name}! Unlocked for both devices.`);
    setConnecting(false);
    setLoginModalPlatform(null);
    setLoginIdentifier('');
    setLoginProfile('');
    setLoginPin('');
  };

  const handleQuickConnect = (platform) => {
    socket?.emit('ott:login', {
      platform: platform.id,
      username: 'VIP Household Member',
    });
    if (say) say(`🍿 Instant-linked ${platform.name} for both devices!`);
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
          src: mirrorSources[0]?.url || toProxyUrl(`https://vidsrc.to/embed/movie/${encodeURIComponent(cleanTitle)}`),
          origSrc: cleanTitle,
          title: platformName ? `${platformName}: ${cleanTitle}` : cleanTitle,
          platform: platformName || 'OTT Cinema',
          movieTitle: cleanTitle,
          mirrorSources,
          currentServerIndex: 0,
        },
      });
      if (say) say(`🎬 Playing "${cleanTitle}" for all devices in room without screen share!`);
    }

    if (onClose) onClose();
  };

  const connectedCount = Object.keys(ottAccounts || {}).length;

  return (
    <div className={`w-full ${isModal ? 'max-w-3xl max-h-[90vh] overflow-y-auto' : ''} space-y-4 text-white`}>
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1c0f1f] via-[#120a16] to-[#0a070c] border border-[#ff6fa0]/25 p-4 sm:p-5 shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#d9467a]/25 border border-[#ff6fa0]/40 flex items-center justify-center text-2xl shadow-lg shrink-0">
              🍿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-white tracking-wide">
                  OTT Vault &amp; Dual Stream
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d9467a] text-white font-bold uppercase tracking-wider">
                  Zero Screen Share
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">
                One partner connects account — both phones &amp; devices stream movies together without DRM black screens!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              connectedCount > 0
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-white/60'
            }`}>
              <span className={`h-2 w-2 rounded-full ${connectedCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
              {connectedCount > 0 ? `${connectedCount} OTT Accounts Active` : 'No Accounts Linked Yet'}
            </span>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Universal Search & Play Bar */}
      <div className="card p-3 sm:p-4 rounded-2xl bg-black/90 border border-white/15 space-y-2.5 shadow-lg">
        <label className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-[#ff6fa0]" /> Stream Any Movie or Show Together
          </span>
          <span className="text-[10px] font-normal text-white/50 lowercase">all otts supported</span>
        </label>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) playMovieDirectly(searchQuery);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movie title or show (e.g. Chhaava, The Boys, Stranger Things, Mirzapur, Animal)…"
              className="field !pl-9 !py-2.5 text-xs sm:text-sm rounded-xl"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim()}
            className="btn !py-2.5 !px-5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-xl shrink-0 shadow-lg disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            <span>Play Together</span>
          </button>
        </form>
      </div>

      {/* OTT Platform Accounts Manager Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
            <Tv className="h-3.5 w-3.5 text-[#ff6fa0]" /> Linked OTT Subscriptions
          </span>
          <span className="text-[11px] text-white/50">One person logs in for room</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5">
          {OTT_PLATFORMS.map((platform) => {
            const isConnected = Boolean(ottAccounts && ottAccounts[platform.id]);
            const accInfo = isConnected ? ottAccounts[platform.id] : null;

            return (
              <div
                key={platform.id}
                className={`relative rounded-xl p-3 border transition flex flex-col justify-between ${
                  isConnected
                    ? 'bg-gradient-to-br from-white/10 to-white/5 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-black/60 hover:bg-black/80 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{platform.icon}</span>
                    {isConnected ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                        Locked
                      </span>
                    )}
                  </div>

                  <p className="font-semibold text-xs text-white truncate">{platform.name}</p>
                  <p className="text-[10px] text-white/50 truncate mt-0.5">
                    {isConnected ? `By ${accInfo?.connectedBy || 'Partner'}` : 'Click to connect'}
                  </p>
                </div>

                <div className="pt-2.5 mt-2 border-t border-white/10 flex items-center gap-1.5">
                  {isConnected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePlatformFilter(platform.id);
                          setSearchQuery('');
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[10px] font-semibold transition text-center truncate"
                      >
                        Catalog 🍿
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDisconnect(platform.id)}
                        className="p-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 border border-white/10 transition"
                        title="Disconnect this account"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLoginModalPlatform(platform)}
                      className="w-full py-1.5 px-2 rounded-lg bg-white/10 hover:bg-[#d9467a]/25 border border-white/15 hover:border-[#ff6fa0]/50 text-white text-[10px] font-semibold transition flex items-center justify-center gap-1 group cursor-pointer"
                    >
                      <KeyRound className="h-3 w-3 text-[#ff6fa0]" />
                      <span>Connect / Login</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Catalog & Instant Play Section */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <span className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
            <Film className="h-3.5 w-3.5 text-[#ff6fa0]" /> Trending OTT Hits (Direct Cloud Stream)
          </span>

          {/* Platform Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1 text-[10px]">
            {[
              { id: 'all', label: 'All Hits' },
              { id: 'hotstar', label: 'Disney+ Hotstar' },
              { id: 'netflix', label: 'Netflix' },
              { id: 'prime', label: 'Prime Video' },
              { id: 'jiocinema', label: 'JioCinema' },
              { id: 'zee5', label: 'Zee5' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setActivePlatformFilter(f.id);
                  setSearchQuery('');
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  activePlatformFilter === f.id
                    ? 'bg-[#d9467a] text-white font-bold shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {displayedCatalog.map((movie) => (
            <div
              key={movie.title}
              className="group relative rounded-xl bg-black/80 border border-white/10 hover:border-[#ff6fa0]/50 p-2.5 transition flex flex-col justify-between overflow-hidden shadow-md"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs">{movie.icon || '🎬'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-medium">
                    {movie.badge || movie.year}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-xs text-white group-hover:text-[#ff8fb3] truncate transition">
                    {movie.title}
                  </h4>
                  <p className="text-[10px] text-white/50 truncate">{movie.genre}</p>
                </div>
              </div>

              <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between gap-1.5">
                <span className="text-[9px] text-[#ff6fa0] font-medium truncate">{movie.ott}</span>
                <button
                  type="button"
                  onClick={() => playMovieDirectly(movie.title, movie.ott)}
                  className="py-1 px-2.5 rounded-lg bg-[#d9467a] hover:bg-[#ff6fa0] text-white text-[10px] font-bold transition flex items-center gap-1 shadow-sm shrink-0 active:scale-95"
                >
                  <Play className="h-3 w-3 fill-white" />
                  <span>Play</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Login Modal Dialog */}
      {loginModalPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-black border border-white/20 p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{loginModalPlatform.icon}</span>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1">
                    Connect {loginModalPlatform.name}
                  </h3>
                  <p className="text-[10px] text-white/60">Both partners will be able to stream this service together</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalPlatform(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-white/80 font-medium block mb-1">
                  Mobile Number / Email / Account ID
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. +91 9876543210 or user@netflix.com"
                  className="field !py-2 text-xs w-full"
                />
              </div>

              <div>
                <label className="text-xs text-white/80 font-medium block mb-1">
                  Profile Name (Optional)
                </label>
                <input
                  type="text"
                  value={loginProfile}
                  onChange={(e) => setLoginProfile(e.target.value)}
                  placeholder="e.g. Main Profile"
                  className="field !py-2 text-xs w-full"
                />
              </div>

              <div>
                <label className="text-xs text-white/80 font-medium block mb-1">
                  Account PIN or Access Key (Optional)
                </label>
                <input
                  type="password"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="Optional profile PIN"
                  className="field !py-2 text-xs w-full"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={connecting}
                  className="btn !py-2.5 text-xs font-semibold w-full flex items-center justify-center gap-2 shadow-lg"
                >
                  <Check className="h-4 w-4" />
                  <span>Connect &amp; Unlock for Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleQuickConnect(loginModalPlatform);
                    setLoginModalPlatform(null);
                  }}
                  className="ghost !py-2 text-xs text-white/70 hover:text-white text-center border border-white/10"
                >
                  ⚡ 1-Click Fast Connect (No Credentials)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
