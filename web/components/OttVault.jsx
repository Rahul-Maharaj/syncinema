'use client';
import { useState, useMemo } from 'react';
import {
  Tv, Film, Play, Search, Sparkles, Globe, ExternalLink,
  ChevronRight, ArrowRight, Zap, CheckCircle2, Clapperboard, X
} from 'lucide-react';
import { OTT_PLATFORMS, OTT_CATALOGS, getCloudMirrorSources } from '@/lib/media';

export default function OttVault({
  socket,
  me,
  currentMedia,
  onPlayMovie,
  onClose,
  isModal = false,
  say,
}) {
  const [activePlatformFilter, setActivePlatformFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingTitle, setPlayingTitle] = useState('');

  // Flattened all movies across platforms
  const allMovies = useMemo(() => {
    const list = [];
    Object.entries(OTT_CATALOGS).forEach(([platformKey, items]) => {
      items.forEach((item) => {
        list.push({ ...item, platformKey });
      });
    });
    return list;
  }, []);

  // Filtered catalog
  const filteredCatalog = useMemo(() => {
    let list = activePlatformFilter === 'all'
      ? allMovies
      : allMovies.filter((m) => m.platformKey === activePlatformFilter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.ott.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMovies, activePlatformFilter, searchQuery]);

  const activePlatformObj = useMemo(() => {
    return OTT_PLATFORMS.find((p) => p.id === activePlatformFilter) || null;
  }, [activePlatformFilter]);

  // 1-Tap Play Movie in Room (Zero Login Required!)
  const handlePlayMovie = (movieTitle, platformName) => {
    if (!movieTitle || !movieTitle.trim()) return;
    const clean = movieTitle.trim();
    setPlayingTitle(clean);

    if (onPlayMovie) {
      onPlayMovie(clean, platformName);
    } else if (socket) {
      const mirrorSources = getCloudMirrorSources(clean);
      socket.emit('media:set', {
        media: {
          type: 'embed',
          src: mirrorSources[0]?.url,
          origSrc: clean,
          title: platformName ? `${platformName}: ${clean}` : clean,
          platform: platformName || 'OTT Cinema',
          movieTitle: clean,
          mirrorSources,
          currentServerIndex: 0,
        },
      });
    }

    if (say) say(`🎬 Now streaming "${clean}" in 1080p HD for everyone! 🍿`);
    setTimeout(() => setPlayingTitle(''), 2500);
    if (isModal && onClose) onClose();
  };

  const handleCustomSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handlePlayMovie(searchQuery.trim(), activePlatformObj?.name || 'Worldwide Cinema');
    setSearchQuery('');
  };

  return (
    <div className={`w-full text-white ${isModal ? 'max-w-4xl p-4 sm:p-6 bg-zinc-950/95 border border-zinc-800 rounded-3xl shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto' : 'space-y-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Tv className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-base sm:text-lg text-white tracking-tight">
                Universal OTT Cinema Hub
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                <span>Zero Logins Needed</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Stream any subscription movie or show worldwide in synchronized 1080p HD without accounts.
            </p>
          </div>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Instant Search Bar */}
      <form onSubmit={handleCustomSearchSubmit} className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search any movie, show, or paste video link (e.g. Stranger Things, Animal, Mirzapur, Panchayat)..."
          className="w-full rounded-2xl bg-zinc-900/90 border border-zinc-800 pl-10 pr-28 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition shadow-inner"
        />
        {searchQuery.trim() ? (
          <button
            type="submit"
            className="absolute right-2 top-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-md flex items-center gap-1 transition cursor-pointer"
          >
            <Play className="h-3 w-3 fill-white" />
            <span>Play Now</span>
          </button>
        ) : (
          <span className="absolute right-3.5 top-3.5 text-[10px] text-zinc-500 font-medium hidden sm:inline">
            1-Tap Auto-Play
          </span>
        )}
      </form>

      {/* Platform Switcher Ribbon */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setActivePlatformFilter('all')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
            activePlatformFilter === 'all'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md font-bold'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <span>🌟</span>
          <span>All Platforms</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300">
            {allMovies.length}
          </span>
        </button>

        {OTT_PLATFORMS.map((p) => {
          const isSelected = activePlatformFilter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePlatformFilter(p.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isSelected
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md font-bold'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.name}</span>
            </button>
          );
        })}
      </div>

      {/* Platform Info Banner with Web Link */}
      {activePlatformObj && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{activePlatformObj.icon}</span>
            <div className="min-w-0">
              <span className="font-semibold text-white truncate block">{activePlatformObj.name} Library</span>
              <span className="text-[11px] text-zinc-400 block truncate">
                Click any title below to stream together in 1080p Full HD with zero subscription required.
              </span>
            </div>
          </div>
          <a
            href={activePlatformObj.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-rose-300 hover:text-white text-xs font-medium transition"
            title={`Browse official ${activePlatformObj.name} catalog`}
          >
            <span>🌐 Open Site</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Movies Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredCatalog.map((movie) => {
          const isCurrentlyPlaying = currentMedia?.movieTitle === movie.title || playingTitle === movie.title;
          return (
            <div
              key={movie.title}
              className={`group relative rounded-2xl p-3.5 border transition-all flex flex-col justify-between ${
                isCurrentlyPlaying
                  ? 'bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-950/30'
                  : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1 truncate">
                    <span>{movie.icon}</span>
                    <span className="truncate">{movie.ott}</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    {movie.badge || '1080p HD'}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-white group-hover:text-rose-200 transition line-clamp-1">
                  {movie.title}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                  <span>{movie.year}</span>
                  <span>•</span>
                  <span className="truncate">{movie.genre}</span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-white/5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePlayMovie(movie.title, movie.ott)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition shadow-md cursor-pointer ${
                    isCurrentlyPlaying
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white'
                  }`}
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  <span>{isCurrentlyPlaying ? 'Playing in Sync 🍿' : 'Stream Now'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCatalog.length === 0 && (
        <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
          <Clapperboard className="h-10 w-10 mx-auto text-zinc-600 animate-pulse" />
          <p className="text-sm font-semibold text-white">No matching titles found in quick library</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            You can type &quot;{searchQuery}&quot; above and press <b>Play Now</b> to search and stream it worldwide in 1080p HD!
          </p>
          <button
            type="button"
            onClick={() => handlePlayMovie(searchQuery.trim(), 'Worldwide Stream')}
            className="btn !py-2 !px-4 text-xs mx-auto inline-flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Search &amp; Stream &quot;{searchQuery}&quot;</span>
          </button>
        </div>
      )}

      {/* Auto-Detection Help Footer */}
      <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center gap-2.5 text-xs text-zinc-400">
        <Zap className="h-4 w-4 text-amber-400 shrink-0" />
        <span>
          <b>Pro-Tip:</b> You can also paste any link directly into the room link bar — whether it&apos;s Disney+ Hotstar, Netflix, Prime Video, JioCinema, Zee5, YouTube, or direct MP4/M3U8. It automatically detects and plays in real time for everyone!
        </span>
      </div>
    </div>
  );
}
