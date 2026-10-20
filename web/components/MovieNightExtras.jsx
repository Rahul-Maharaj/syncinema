'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  Film, Popcorn, Timer, Star, CheckCircle2, Clock, 
  Play, Plus, Trash2, ArrowUpDown, ChevronUp, ChevronDown,
  Sparkles, MessageSquareHeart, Heart, Share2, AlertCircle,
  Eye, X, Coffee, Pizza, Wine, ThumbsUp, ThumbsDown, Download, Upload, Lock, Crown
} from 'lucide-react';
import gsap from 'gsap';
import { isAdultMedia, sanitizeDisplayTitle } from '@/lib/media';

// Romantic audio chime using Web Audio API
function playChime(freq = 587.33, type = 'sine') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

const VIBE_OPTIONS = [
  { id: 'cozy', label: 'Cozy & Sweet', icon: '🥰' },
  { id: 'romantic', label: 'Pure Romance', icon: '💋' },
  { id: 'cried', label: 'Cried Together', icon: '😭' },
  { id: 'funny', label: 'Laughed Out Loud', icon: '🤣' },
  { id: 'mindblown', label: 'Mindblown', icon: '🤯' },
  { id: 'thrilling', label: 'Edge of Seat', icon: '😱' },
];

export default function MovieNightExtras({
  socket,
  me,
  name,
  users,
  queue = [],
  watchlist = [],
  currentMedia,
  timer,
  readyCheck,
  reviews = [],
  isHost,
  say,
  onPlayMedia,
}) {
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'watchlist', 'timer', 'ready', 'reviews'
  
  // Watchlist modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPoster, setNewPoster] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSrc, setNewSrc] = useState('');
  const [newType, setNewType] = useState('embed');

  // Timer local state for countdown
  const [timeLeft, setTimeLeft] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(5);
  const [autoPauseMovie, setAutoPauseMovie] = useState(true);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewMoment, setReviewMoment] = useState('');
  const [reviewVibe, setReviewVibe] = useState('Cozy & Sweet');
  const [celebrationActive, setCelebrationActive] = useState(false);

  // Ready Check celebration ref
  const celebrationRef = useRef(null);

  // Timer interval calculation
  useEffect(() => {
    if (!timer || !timer.running || !timer.endsAt) {
      if (timer?.pausedRemaining) {
        setTimeLeft(Math.ceil(timer.pausedRemaining / 1000));
      } else {
        setTimeLeft(0);
      }
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        playChime(659.25); // E5
        say?.(`🍿 ${timer.label || 'Snack break'} is done! Time to cuddle up and watch 💕`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timer, say]);

  // Ready Check listener
  useEffect(() => {
    if (!socket) return;
    const onAllReady = (rc) => {
      setCelebrationActive(true);
      playChime(783.99); // G5
      say?.(`✨ Both are ready! Starting movie... 🍿`);
      
      // Floating hearts burst animation
      for (let i = 0; i < 20; i++) {
        const el = document.createElement('div');
        el.textContent = i % 3 === 0 ? '🍿' : i % 2 === 0 ? '💖' : '✨';
        el.className = 'fixed bottom-10 z-50 text-3xl pointer-events-none select-none';
        el.style.left = `${15 + Math.random() * 70}%`;
        document.body.append(el);
        gsap.to(el, {
          y: -(window.innerHeight * 0.7 + Math.random() * 150),
          x: (Math.random() - 0.5) * 120,
          rotation: (Math.random() - 0.5) * 90,
          opacity: 0,
          duration: 2.2 + Math.random() * 1.2,
          ease: 'power1.out',
          onComplete: () => el.remove(),
        });
      }

      setTimeout(() => setCelebrationActive(false), 4000);
    };

    socket.on('ready:all', onAllReady);
    return () => socket.off('ready:all', onAllReady);
  }, [socket, say]);

  // Handle Add to Watchlist
  const handleAddWatchlist = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    socket.emit('watchlist:add', {
      item: {
        title: newTitle.trim(),
        poster: newPoster.trim(),
        desc: newDesc.trim(),
        src: newSrc.trim(),
        type: newType,
      },
    });
    setNewTitle('');
    setNewPoster('');
    setNewDesc('');
    setNewSrc('');
    setShowAddModal(false);
    say?.('Added movie to our shared watchlist ✨');
  };

  // Start Timer (Host Only)
  const handleStartTimer = (secs, label) => {
    if (!isHost) {
      say?.('👑 Only the room host can start the snack timer');
      return;
    }
    if (autoPauseMovie) {
      socket.emit('player', { action: 'PAUSE', time: 0 });
    }
    socket.emit('timer:start', { duration: secs, label });
    say?.(`Started ${label} (${Math.round(secs / 60)} min)`);
  };

  // Submit Review
  const handleSubmitReview = (e) => {
    e.preventDefault();
    const movieTitle = currentMedia?.title || currentMedia?.name || 'Tonight’s Movie';
    socket.emit('review:submit', {
      movieTitle,
      stars: reviewStars,
      moment: reviewMoment.trim(),
      vibe: reviewVibe,
    });
    setShowReviewModal(false);
    setReviewMoment('');
    say?.(`Shared movie review for ${movieTitle} ⭐`);
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isMeReady = readyCheck?.readyUsers?.includes(me);
  const totalUsers = Math.max(1, users.length);
  const readyCount = readyCheck?.readyUsers?.length || 0;

  return (
    <div className="card p-3 sm:p-4 text-pink-100 overflow-hidden !bg-[#222222] border border-pink-500/20 rounded-2xl">
      {/* Top Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2.5 mb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
            activeTab === 'queue'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:border-white/20'
          }`}
        >
          <Film className="h-3.5 w-3.5" />
          <span>Queue</span>
          {queue.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {queue.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('watchlist')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
            activeTab === 'watchlist'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:border-white/20'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <span>Watchlist</span>
          {watchlist.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {watchlist.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
            activeTab === 'timer'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:border-white/20'
          }`}
        >
          <Timer className="h-3.5 w-3.5 text-emerald-400" />
          <span>Timer</span>
          {timer?.running && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/30 text-emerald-300 font-mono">
              {formatTime(timeLeft)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ready')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
            activeTab === 'ready'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:border-white/20'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-rose-300" />
          <span>Ready Check</span>
          {readyCheck?.active && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-200 font-mono">
              {readyCount}/{totalUsers}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
            activeTab === 'reviews'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-white/5 text-white/70 hover:text-white border-white/10 hover:border-white/20'
          }`}
        >
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span>Memories</span>
          {reviews.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 font-mono">
              {reviews.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MOVIE QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-3">
          {/* Currently Playing Card */}
          {currentMedia && currentMedia.type !== 'none' && (
            <div className="rounded-xl border border-pink-500/40 !bg-[#1a1a1d] p-3 flex gap-3 items-center">
              {currentMedia.poster ? (
                <img src={currentMedia.poster} alt="" className="h-14 w-10 rounded-md object-cover border border-white/20 shrink-0" />
              ) : (
                <div className="h-14 w-10 rounded-md bg-rose-600/30 border border-white/20 grid place-items-center shrink-0">
                  <Film className="h-5 w-5 text-rose-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">Now Playing</span>
                <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                  {isAdultMedia(currentMedia.src || currentMedia.title || currentMedia.name) && <Lock className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                  <span>{isAdultMedia(currentMedia.src || currentMedia.title || currentMedia.name) ? '🔒 Private Stream' : (currentMedia.title || currentMedia.name || 'Untitled Video')}</span>
                </p>
                {currentMedia.desc && !isAdultMedia(currentMedia.src) && <p className="text-xs text-white/60 line-clamp-1">{currentMedia.desc}</p>}
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="glass-btn !px-2.5 !py-1 text-xs shrink-0 flex items-center gap-1"
                title="Rate this movie"
              >
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <span>Rate</span>
              </button>
            </div>
          )}

          {/* Up Next List Header with Export, Import, and Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">Up Next in Queue</span>
            <div className="flex items-center gap-2 text-[11px]">
              {queue.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(queue, null, 2));
                      const dlAnchor = document.createElement('a');
                      dlAnchor.setAttribute('href', dataStr);
                      dlAnchor.setAttribute('download', `syncinema_playlist_${new Date().toISOString().slice(0, 10)}.json`);
                      dlAnchor.click();
                      dlAnchor.remove();
                      say?.('Playlist exported!');
                    }}
                    className="text-white/65 hover:text-white flex items-center gap-1"
                    title="Export queue as JSON playlist"
                  >
                    <Download className="h-3 w-3" />
                    <span>Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear the entire queue?')) socket.emit('queue:clear');
                    }}
                    className="text-rose-400/80 hover:text-rose-300 flex items-center gap-1"
                    title="Clear queue"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                </>
              )}
              <label className="text-rose-400 hover:underline cursor-pointer flex items-center gap-1" title="Import JSON playlist">
                <Upload className="h-3 w-3" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const items = JSON.parse(text);
                      if (Array.isArray(items)) {
                        socket.emit('queue:import', { items });
                        say?.(`Imported ${items.length} videos to queue!`);
                      }
                    } catch {
                      say?.('Invalid playlist file');
                    }
                    e.target.value = '';
                  }}
                  hidden
                />
              </label>
              <span className="text-xs text-white/40">({queue.length})</span>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-white/50">
              <Popcorn className="h-8 w-8 mx-auto mb-2 opacity-40 text-rose-400" />
              <p>Queue is empty. Select a movie from your <b>Watchlist</b> or paste a link to queue it up!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {queue.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-2.5 flex items-center gap-2.5 hover:border-white/25 transition"
                >
                  <span className="text-xs font-bold opacity-40 w-4 text-center">{index + 1}</span>
                  {item.poster ? (
                    <img src={item.poster} alt="" className="h-11 w-8 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-8 rounded bg-white/10 grid place-items-center shrink-0">
                      <Film className="h-4 w-4 opacity-50" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate flex items-center gap-1">
                      {isAdultMedia(item.src || item.title) && <Lock className="h-3 w-3 text-rose-400 shrink-0" />}
                      <span>{isAdultMedia(item.src || item.title) ? '🔒 Private Stream' : (item.title || item.src.replace(/^https?:\/\//, ''))}</span>
                    </p>
                    {item.desc && !isAdultMedia(item.src) && <p className="text-[10px] text-white/50 truncate">{item.desc}</p>}
                    <div className="flex items-center gap-2 text-[9px] text-rose-400/80">
                      {item.addedBy && <span>Queued by {item.addedBy}</span>}
                    </div>
                  </div>

                  {/* Voting Buttons */}
                  <div className="flex items-center gap-0.5 bg-[#1a1a1a]/60 rounded-lg px-1.5 py-0.5 border border-pink-500/20 shrink-0">
                    <button
                      type="button"
                      onClick={() => socket.emit('queue:vote', { id: item.id, dir: 'up' })}
                      className={`p-1 hover:text-rose-400 transition ${item.votes?.[me] === 1 ? 'text-rose-400' : 'text-white/40'}`}
                      title="Vote up"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-white/90 min-w-[12px] text-center">
                      {item.score || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => socket.emit('queue:vote', { id: item.id, dir: 'down' })}
                      className={`p-1 hover:text-rose-400 transition ${item.votes?.[me] === -1 ? 'text-rose-400' : 'text-white/40'}`}
                      title="Vote down"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {index > 0 && (
                      <button
                        onClick={() => socket.emit('queue:reorder', { fromIndex: index, toIndex: index - 1 })}
                        className="p-1 text-white/50 hover:text-white"
                        title="Move Up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {index < queue.length - 1 && (
                      <button
                        onClick={() => socket.emit('queue:reorder', { fromIndex: index, toIndex: index + 1 })}
                        className="p-1 text-white/50 hover:text-white"
                        title="Move Down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => socket.emit('queue:next', item.id)}
                      className="glass-btn !p-1.5 text-xs hover:border-rose-500"
                      title="Play Now"
                    >
                      <Play className="h-3.5 w-3.5 text-rose-400" />
                    </button>
                    <button
                      onClick={() => socket.emit('queue:remove', item.id)}
                      className="p-1.5 text-white/40 hover:text-rose-400"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SHARED WATCHLIST */}
      {activeTab === 'watchlist' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white/80">Couples Movie Wishlist</p>
              <p className="text-[11px] text-white/50">Movies you two want to watch together on future dates</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn !py-1 !px-2.5 text-xs flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Movie</span>
            </button>
          </div>

          {watchlist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-white/50">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-amber-300 opacity-60" />
              <p>Your wishlist is empty. Add romantic movies, series, or YouTube shows for future movie nights!</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-2.5 flex gap-2.5 items-start hover:border-rose-500/40 transition group"
                >
                  {item.poster ? (
                    <img src={item.poster} alt="" className="h-16 w-12 rounded object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="h-16 w-12 rounded bg-white/5 border border-white/10 grid place-items-center shrink-0">
                      <Film className="h-5 w-5 text-white/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs truncate group-hover:text-rose-400 transition">{item.title}</p>
                    {item.desc && <p className="text-[10px] text-white/60 line-clamp-2 mt-0.5">{item.desc}</p>}
                    <span className="text-[9px] text-white/40 mt-1 block">Added by {item.addedBy}</span>
                    
                    <div className="flex items-center gap-1.5 mt-2">
                      <button
                        onClick={() => socket.emit('watchlist:to_queue', item.id)}
                        className="glass-btn !px-2 !py-0.5 text-[10px] flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Queue
                      </button>
                      <button
                        onClick={() => socket.emit('watchlist:remove', item.id)}
                        className="text-white/40 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYNCHRONIZED SNACK & DATE TIMER */}
      {activeTab === 'timer' && (
        <div className="space-y-4">
          {!isHost && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Date night timer is controlled by the room host.</span>
            </div>
          )}
          <div className="text-center py-2">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              {timer?.label || 'Synchronized Snack Timer'}
            </span>
            <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight my-2 text-white">
              {formatTime(timeLeft)}
            </div>
            {timer?.startedBy && (
              <p className="text-xs text-white/60">Started by {timer.startedBy}</p>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              disabled={!isHost}
              onClick={() => handleStartTimer(3 * 60, 'Popcorn Refill 🍿')}
              className="glass-btn !py-2 text-xs flex flex-col items-center gap-1 hover:border-emerald-400 disabled:opacity-50"
            >
              <Popcorn className="h-4 w-4 text-amber-300" />
              <span>3m Popcorn</span>
            </button>
            <button
              disabled={!isHost}
              onClick={() => handleStartTimer(5 * 60, 'Snack Break 🍕')}
              className="glass-btn !py-2 text-xs flex flex-col items-center gap-1 hover:border-emerald-400 disabled:opacity-50"
            >
              <Pizza className="h-4 w-4 text-rose-400" />
              <span>5m Snacks</span>
            </button>
            <button
              disabled={!isHost}
              onClick={() => handleStartTimer(10 * 60, 'Coffee & Tea ☕')}
              className="glass-btn !py-2 text-xs flex flex-col items-center gap-1 hover:border-emerald-400 disabled:opacity-50"
            >
              <Coffee className="h-4 w-4 text-amber-400" />
              <span>10m Coffee</span>
            </button>
            <button
              disabled={!isHost}
              onClick={() => handleStartTimer(15 * 60, 'Intermission 🛋️')}
              className="glass-btn !py-2 text-xs flex flex-col items-center gap-1 hover:border-emerald-400 disabled:opacity-50"
            >
              <Wine className="h-4 w-4 text-purple-400" />
              <span>15m Intermission</span>
            </button>
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPauseMovie}
                onChange={(e) => setAutoPauseMovie(e.target.checked)}
                className="accent-rose-500"
              />
              <span>Auto-pause video when timer starts</span>
            </label>

            <div className="flex gap-2">
              {timer?.running ? (
                <button onClick={() => socket.emit('timer:pause')} className="glass-btn !px-3 text-xs">
                  Pause
                </button>
              ) : timer?.pausedRemaining ? (
                <button onClick={() => socket.emit('timer:resume')} className="btn !px-3 text-xs">
                  Resume
                </button>
              ) : null}
              {timer && (
                <button onClick={() => socket.emit('timer:reset')} className="glass-btn !px-2.5 text-xs text-rose-400 hover:border-rose-400">
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: "READY TO WATCH?" CONFIRMATION */}
      {activeTab === 'ready' && (
        <div className="space-y-4 py-2">
          <div className="text-center">
            <h3 className="font-display text-lg font-bold text-white mb-1">“Ready to Watch?” Check-In</h3>
            <p className="text-xs text-white/60">Both partners confirm they have snacks and are cozy before the movie starts!</p>
          </div>

          {/* Partner Status Display */}
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto my-3">
            {users.map((u) => {
              const ready = readyCheck?.readyUsers?.includes(u.id);
              return (
                <div
                  key={u.id}
                  className={`rounded-2xl border p-3.5 text-center transition ${
                    ready
                      ? 'border-emerald-400/60 bg-emerald-950/30'
                      : 'border-white/15 bg-white/5'
                  }`}
                >
                  <div
                    className="h-10 w-10 mx-auto rounded-full grid place-items-center text-sm font-bold text-white mb-2"
                    style={{ background: u.color }}
                  >
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold truncate">{u.name}</p>
                  <span className={`inline-block mt-1 text-[11px] font-medium ${ready ? 'text-emerald-400' : 'text-white/40'}`}>
                    {ready ? 'Ready! 🍿' : 'Waiting…'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Button */}
          <div className="text-center pt-2">
            {!readyCheck?.active ? (
              <button
                onClick={() => socket.emit('ready:start')}
                className="btn !py-2.5 !px-6 text-sm font-bold"
              >
                <Popcorn className="h-4 w-4" /> Start Ready Check
              </button>
            ) : (
              <div className="space-y-2">
                {!isMeReady ? (
                  <button
                    onClick={() => socket.emit('ready:confirm')}
                    className="btn !py-2.5 !px-8 text-sm font-bold bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-4 w-4" /> I’m Ready! Start Movie
                  </button>
                ) : (
                  <p className="text-xs text-emerald-400 font-medium">You’re ready! Waiting for partner to click ready…</p>
                )}
                <div>
                  <button onClick={() => socket.emit('ready:cancel')} className="text-xs text-white/50 hover:underline">
                    Cancel check
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: REVIEWS & MEMORIES */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-white/80">Date-Night Movie Log</p>
              <p className="text-[11px] text-white/50">Your ratings, favorite scenes, and memories together</p>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="btn !py-1 !px-2.5 text-xs flex items-center gap-1"
            >
              <Star className="h-3.5 w-3.5" />
              <span>Log Movie</span>
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-white/50">
              <Star className="h-8 w-8 mx-auto mb-2 text-amber-400 opacity-60" />
              <p>No movie memories logged yet. When you finish a movie, tap &ldquo;Log Movie&rdquo; to save your ratings and favorite moments!</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {reviews.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-rose-400 truncate">{entry.movieTitle}</h4>
                    <span className="text-[10px] text-white/40">
                      {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(entry.ratings || {}).map(([uid, r]) => (
                      <div key={uid} className="rounded-lg bg-[#1a1a1a]/60 p-2 text-xs border border-pink-500/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white/80">{r.name}</span>
                          <span className="text-amber-400">{'★'.repeat(r.stars)}</span>
                        </div>
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/70 mb-1">
                          {r.vibe}
                        </span>
                        {r.moment && (
                          <p className="text-[11px] text-white/60 italic">&ldquo;{r.moment}&rdquo;</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD TO WATCHLIST */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddWatchlist}
            className="card w-full max-w-md p-5 sm:p-6 space-y-4 border border-pink-500/25 !bg-[#222222] rounded-3xl shadow-2xl shadow-pink-500/10 text-pink-100"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-300" /> Add to Shared Watchlist
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">Movie / Show Title *</label>
              <input
                autoFocus
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. La La Land, Interstellar, Dune"
                className="field"
              />
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">Poster Image URL (optional)</label>
              <input
                value={newPoster}
                onChange={(e) => setNewPoster(e.target.value)}
                placeholder="https://... poster.jpg"
                className="field"
              />
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">Streaming Link or URL (optional)</label>
              <input
                value={newSrc}
                onChange={(e) => setNewSrc(e.target.value)}
                placeholder="https://... video or stream link"
                className="field"
              />
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">Short Description / Why you chose it</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="A romantic classic we have to watch together on our next date night..."
                rows={2}
                className="field"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)} className="ghost !py-2 text-xs">
                Cancel
              </button>
              <button type="submit" className="btn !py-2 text-xs">
                Add to Watchlist
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: MOVIE REVIEW / MOMENT LOG */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSubmitReview}
            className="card w-full max-w-md p-5 sm:p-6 space-y-4 border border-pink-500/25 !bg-[#222222] rounded-3xl shadow-2xl shadow-pink-500/10 text-pink-100"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Log Movie Memory
              </h3>
              <button type="button" onClick={() => setShowReviewModal(false)} className="text-white/60 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-white/60">Rating for:</p>
              <p className="font-bold text-sm text-rose-400 truncate">
                {currentMedia?.title || currentMedia?.name || 'Tonight’s Movie'}
              </p>
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">Your Couple Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewStars(star)}
                    className="p-1 text-2xl transition hover:scale-125"
                  >
                    <span className={star <= reviewStars ? 'text-amber-400' : 'text-white/20'}>★</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">Date-Night Vibe</label>
              <div className="grid grid-cols-3 gap-1.5">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setReviewVibe(v.label)}
                    className={`p-1.5 rounded-lg text-xs border text-center transition ${
                      reviewVibe === v.label
                        ? 'border-rose-500 bg-rose-500/20 text-white'
                        : 'border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <span className="mr-1">{v.icon}</span>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-white/70 font-medium block mb-1">What was your favorite moment?</label>
              <textarea
                value={reviewMoment}
                onChange={(e) => setReviewMoment(e.target.value)}
                placeholder="The scene where they danced under the rain, or when you laughed at..."
                rows={2}
                className="field"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowReviewModal(false)} className="ghost !py-2 text-xs">
                Cancel
              </button>
              <button type="submit" className="btn !py-2 text-xs">
                Save Memory 💕
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
