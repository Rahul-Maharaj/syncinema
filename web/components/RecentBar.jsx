'use client';
import { useState, useEffect } from 'react';
import {
  History, Play, Trash2, Copy, Check, ListPlus,
  Lock, Film, Sparkles, ExternalLink, Search, Flame
} from 'lucide-react';
import { isAdultMedia, sanitizeDisplayTitle } from '@/lib/media';

export default function RecentBar({
  onPlayUrl,
  onAddToQueue,
  adultMode = false,
  say,
  className = '',
}) {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [copiedUrl, setCopiedUrl] = useState('');

  const loadHistory = () => {
    try {
      const h = JSON.parse(localStorage.hist || '[]');
      setHistory(Array.isArray(h) ? h : []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadHistory();
    const handleStorage = () => loadHistory();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handlePlay = (url) => {
    if (isAdultMedia(url) && !adultMode) {
      say?.('🔞 18+ Mode is disabled. Please enable Adults-Only 18+ in the Intimacy tab to play.');
      return;
    }
    onPlayUrl?.(url);
    say?.(isAdultMedia(url) ? 'Playing Private Stream 🔒' : 'Playing from Recent Bar ▶️');
  };

  const handleQueue = (url) => {
    if (isAdultMedia(url) && !adultMode) {
      say?.('🔞 18+ Mode is disabled. Please enable Adults-Only 18+ in the Intimacy tab to queue.');
      return;
    }
    onAddToQueue?.({
      title: isAdultMedia(url) ? '🔒 Private Stream' : sanitizeDisplayTitle(url),
      src: url,
      type: 'auto',
    });
    say?.('Added to queue 🍿');
  };

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(''), 2000);
    say?.('Link copied to clipboard 📋');
  };

  const handleDelete = (urlToDelete) => {
    const updated = history.filter((item) => item !== urlToDelete);
    setHistory(updated);
    try {
      localStorage.hist = JSON.stringify(updated);
    } catch {}
    say?.('Removed from Recent Bar');
  };

  const handleClearAll = () => {
    if (confirm('Clear all items from your Recent Bar?')) {
      setHistory([]);
      try {
        localStorage.hist = '[]';
      } catch {}
      say?.('Recent Bar cleared');
    }
  };

  const filtered = history.filter((u) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    if (isAdultMedia(u)) {
      return 'private stream'.includes(term) || '18+'.includes(term);
    }
    return u.toLowerCase().includes(term);
  });

  return (
    <div className={`card rise p-3.5 sm:p-4 text-white overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <History className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm sm:text-base font-semibold text-white">
                Recent Plays Bar
              </h3>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30">
                {history.length}
              </span>
            </div>
            <p className="text-[11px] text-white/50">
              Quickly rewatch or queue videos played on this device
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition"
            title="Clear all recent history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Search Bar if > 3 items */}
      {history.length > 3 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recent videos…"
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>
      )}

      {/* List */}
      {history.length === 0 ? (
        <div className="py-10 text-center text-white/50 space-y-2">
          <History className="h-9 w-9 mx-auto opacity-30 text-cyan-400" />
          <p className="text-xs">Your Recent Bar is empty.</p>
          <p className="text-[11px] text-white/40">
            Videos and streams you play will appear here for 1-tap replaying.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-white/40 text-xs">
          No matches found for &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
          {filtered.map((item, idx) => {
            const isAdult = isAdultMedia(item);
            const title = isAdult ? '🔒 Private Stream' : sanitizeDisplayTitle(item);

            return (
              <div
                key={idx}
                className={`group flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition ${
                  isAdult
                    ? 'border-rose-500/25 bg-rose-950/20 hover:border-rose-500/40'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {/* Icon */}
                <div
                  className={`grid h-8 w-8 place-items-center rounded-lg shrink-0 ${
                    isAdult
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {isAdult ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Film className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-white truncate">
                      {title}
                    </p>
                    {isAdult && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40">
                        {adultMode ? '18+ 🔥' : '18+ Locked'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/45 truncate">
                    {isAdult
                      ? 'Discreet private stream • Zero-log privacy'
                      : item.replace(/^https?:\/\//, '')}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePlay(item)}
                    className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                      isAdult
                        ? 'bg-rose-500/30 hover:bg-rose-500/50 text-rose-200'
                        : 'bg-cyan-500/25 hover:bg-cyan-500/45 text-cyan-200'
                    }`}
                    title="Play now for everyone"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span className="hidden sm:inline text-[11px]">Play</span>
                  </button>

                  {onAddToQueue && (
                    <button
                      type="button"
                      onClick={() => handleQueue(item)}
                      className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                      title="Add to Up Next queue"
                    >
                      <ListPlus className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(item)}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                    title="Copy link"
                  >
                    {copiedUrl === item ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete from recent"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
