'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, ShieldAlert, ShieldCheck, Lock, Unlock, Users, Film, Pause, Play,
  Square, Ban, Trash2, RefreshCw, Eye, EyeOff, Search, AlertTriangle,
  CheckCircle, Video, Flame, Clock, Key, ArrowRight, ExternalLink, LogOut,
  Copy, Radio, Sparkles
} from 'lucide-react';
import { serverUrl } from '@/lib/socket';

const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    stats: {
      totalRooms: 0,
      totalConnectedUsers: 0,
      activePlayingCount: 0,
      blockedUsersCount: 0,
      blockedRoomsCount: 0,
      blockedVideosCount: 0,
    },
    rooms: [],
    blocked: { users: [], ips: [], rooms: [], videos: [] },
  });

  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'security' | 'broadcast'
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  // Override Video Modal
  const [overrideModal, setOverrideModal] = useState({ open: false, roomId: '', src: '', title: '' });
  // Broadcast message
  const [broadcastMsg, setBroadcastMsg] = useState('');
  // Manual block video URL input
  const [manualBlockUrl, setManualBlockUrl] = useState('');

  const say = (msg, type = 'success') => {
    setToast({ msg, type, n: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // Restore stored admin key on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('sc_admin_key');
    if (saved) {
      setAdminKey(saved);
      verifyKey(saved);
    }
  }, []);

  const verifyKey = async (k) => {
    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch(serverUrl() + '/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': k.trim(),
        },
      });
      if (res.ok) {
        setAuthed(true);
        sessionStorage.setItem('sc_admin_key', k.trim());
        setAdminKey(k.trim());
        fetchOverview(k.trim());
      } else {
        setAuthed(false);
        setAuthError('Invalid administrator credentials.');
      }
    } catch (e) {
      setAuthError('Could not connect to server. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    verifyKey(keyInput.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sc_admin_key');
    setAuthed(false);
    setAdminKey('');
    setKeyInput('');
  };

  const fetchOverview = useCallback(async (k = adminKey) => {
    if (!k) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/overview', {
        headers: { 'x-admin-key': k },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        setData({
          stats: json.stats || {},
          rooms: Array.isArray(json.rooms) ? json.rooms : [],
          blocked: json.blocked || { users: [], ips: [], rooms: [], videos: [] },
        });
      } else if (res.status === 401) {
        setAuthed(false);
        sessionStorage.removeItem('sc_admin_key');
      }
    } catch (e) {
      // offline / quiet
    }
  }, [adminKey]);

  // Auto-refresh interval
  useEffect(() => {
    if (!authed || !autoRefresh) return;
    fetchOverview();
    const interval = setInterval(() => fetchOverview(), 3000);
    return () => clearInterval(interval);
  }, [authed, autoRefresh, fetchOverview]);

  // Admin Control Actions
  const handleVideoControl = async (roomId, action, payload = {}) => {
    try {
      const res = await fetch(serverUrl() + '/api/admin/video/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ roomId, action, payload }),
      });
      if (res.ok) {
        say(`Video action "${action}" applied to room ${roomId}`);
        fetchOverview();
      } else {
        say('Failed to apply video control', 'error');
      }
    } catch {
      say('Network error applying video control', 'error');
    }
  };

  const handleBlockRoom = async (roomId) => {
    if (!confirm(`Are you sure you want to TERMINATE & BLOCK room "${roomId}"? All users will be disconnected.`)) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/room/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ roomId, reason: 'Closed by administrator for security' }),
      });
      if (res.ok) {
        say(`Room "${roomId}" blocked and terminated`);
        fetchOverview();
      }
    } catch {
      say('Failed to block room', 'error');
    }
  };

  const handleUnblockRoom = async (roomId) => {
    try {
      const res = await fetch(serverUrl() + '/api/admin/room/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        say(`Room "${roomId}" unblocked`);
        fetchOverview();
      }
    } catch {
      say('Failed to unblock room', 'error');
    }
  };

  const handleBlockUser = async (user, roomId) => {
    const reason = prompt(`Reason for blocking "${user.name}" (CID: ${user.cid}):`, 'Violation of security policies');
    if (reason === null) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/user/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ cid: user.cid, ip: user.ip, roomId, reason }),
      });
      if (res.ok) {
        say(`User "${user.name}" (${user.cid}) has been blocked and kicked`);
        fetchOverview();
      }
    } catch {
      say('Failed to block user', 'error');
    }
  };

  const handleUnblockUser = async (u) => {
    try {
      const res = await fetch(serverUrl() + '/api/admin/user/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ cid: u.cid, ip: u.ip }),
      });
      if (res.ok) {
        say(`User unblocked`);
        fetchOverview();
      }
    } catch {
      say('Failed to unblock user', 'error');
    }
  };

  const handleBlockVideoUrl = async (url) => {
    if (!url) return;
    if (!confirm(`Are you sure you want to BLACKLIST this video URL?\n\n${url}\n\nIt will immediately stop playing in all rooms and cannot be played again.`)) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/video/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ roomId: 'global', action: 'block', payload: { src: url } }),
      });
      if (res.ok) {
        say('Video URL has been blacklisted and stopped');
        setManualBlockUrl('');
        fetchOverview();
      }
    } catch {
      say('Failed to blacklist video', 'error');
    }
  };

  const handleUnblockVideo = async (src) => {
    try {
      const res = await fetch(serverUrl() + '/api/admin/video/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ src }),
      });
      if (res.ok) {
        say('Video URL unblocked');
        fetchOverview();
      }
    } catch {
      say('Failed to unblock video', 'error');
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideModal.roomId || !overrideModal.src) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/video/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          roomId: overrideModal.roomId,
          media: {
            type: 'auto',
            src: overrideModal.src.trim(),
            title: overrideModal.title.trim() || 'Broadcast Stream',
          },
        }),
      });
      if (res.ok) {
        say(`Video override sent to room ${overrideModal.roomId}`);
        setOverrideModal({ open: false, roomId: '', src: '', title: '' });
        fetchOverview();
      }
    } catch {
      say('Failed to override video', 'error');
    }
  };

  const handleClearQueue = async (roomId) => {
    if (!confirm(`Clear upcoming video queue for room "${roomId}"?`)) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/queue/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        say(`Queue cleared for room ${roomId}`);
        fetchOverview();
      }
    } catch {
      say('Failed to clear queue', 'error');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ message: broadcastMsg.trim() }),
      });
      if (res.ok) {
        say(`Broadcast message dispatched to all active couches`);
        setBroadcastMsg('');
      }
    } catch {
      say('Failed to send broadcast', 'error');
    }
  };

  // Filtered rooms
  const filteredRooms = data.rooms.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesId = r.roomId?.toLowerCase().includes(q);
    const matchesTitle = r.media?.title?.toLowerCase().includes(q) || r.media?.src?.toLowerCase().includes(q);
    const matchesUser = r.users?.some((u) => u.name?.toLowerCase().includes(q) || u.cid?.toLowerCase().includes(q) || u.ip?.includes(q));
    return matchesId || matchesTitle || matchesUser;
  });

  // ------------------ LOGIN SCREEN (SOFT BLACK GRADIENT) ------------------
  if (!authed) {
    return (
      <main className="relative min-h-screen grid place-items-center overflow-hidden bg-[radial-gradient(ellipse_100%_90%_at_50%_-20%,#181824,rgba(10,10,14,0.98)_50%,#000000_100%)] px-6 text-white font-sans selection:bg-[#d9467a]/30">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(217,70,122,0.12),transparent_70%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.08),transparent_50%)]" />

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6">
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-tr from-[#d9467a]/20 to-purple-500/20 border border-[#d9467a]/30 shadow-[0_0_35px_rgba(217,70,122,0.3)]">
            <Shield className="h-8 w-8 text-[#ff6fa0]" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Admin Command Center</h1>
            <p className="mt-1.5 text-xs text-white/60">
              Security Inspection &amp; Real-time Playback Supervisor
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-[#ff6fa0]" />
                <span>Administrator Secret Key</span>
              </label>
              <div className="relative">
                <input
                  autoFocus
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter administrator key"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#d9467a] focus:outline-none focus:ring-1 focus:ring-[#d9467a] transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-2.5 text-white/50 hover:text-white p-1 rounded-lg transition"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {authError && <p className="mt-2 text-xs text-rose-400 font-medium">{authError}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#d9467a] to-[#b3305d] py-3 text-sm font-semibold text-white shadow-lg shadow-[#d9467a]/25 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{loading ? 'Authenticating…' : 'Access Control Center'}</span>
            </button>
          </form>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs text-white/50">
            <span>Confidential System Console</span>
            <Link href="/" className="hover:text-white transition flex items-center gap-1">
              <span>Back to Cinema</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ------------------ MAIN ADMIN DASHBOARD ------------------
  const totalBlocked = (data.blocked.users?.length || 0) + (data.blocked.rooms?.length || 0) + (data.blocked.videos?.length || 0);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_100%_90%_at_50%_-20%,#181824,rgba(10,10,14,0.98)_50%,#000000_100%)] text-slate-100 flex flex-col font-sans selection:bg-[#d9467a]/30">
      {/* Background Soft Glow Ambience */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(217,70,122,0.06),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.05),transparent_40%)]" />

      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-2xl px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d9467a]/15 border border-[#d9467a]/30">
              <Shield className="h-5 w-5 text-[#ff6fa0]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">SyncCinema Security Console</h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Monitor
                </span>
              </div>
              <p className="text-[11px] text-white/50">Room supervision, content safety &amp; administrative control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
              title={autoRefresh ? 'Auto-refresh active (every 3s)' : 'Auto-refresh paused'}
            >
              <Radio className={`h-3 w-3 ${autoRefresh ? 'animate-pulse text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Auto 3s</span>
            </button>

            <button
              type="button"
              onClick={() => fetchOverview()}
              className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 p-2 text-white/70 hover:text-white transition"
              title="Refresh overview immediately"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 text-xs text-rose-300 transition flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 space-y-6">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Active Couches</span>
              <Film className="h-4 w-4 text-[#ff6fa0]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{data.stats.totalRooms || 0}</span>
              <span className="text-[11px] text-emerald-400">rooms active</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Connected Users</span>
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{data.stats.totalConnectedUsers || 0}</span>
              <span className="text-[11px] text-cyan-400">partners watching</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Streams Playing</span>
              <Play className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{data.stats.activePlayingCount || 0}</span>
              <span className="text-[11px] text-emerald-400">active playback</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Total Blocklist</span>
              <Ban className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{totalBlocked}</span>
              <span className="text-[11px] text-rose-400">banned items</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-3 flex-wrap">
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition ${
                activeTab === 'rooms'
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              <span>Live Rooms &amp; Media ({data.rooms.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition ${
                activeTab === 'security'
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Security Blocklists ({totalBlocked})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('broadcast')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition ${
                activeTab === 'broadcast'
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>System Broadcast</span>
            </button>
          </div>

          {activeTab === 'rooms' && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room ID, media, or user…"
                className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-[#d9467a] focus:outline-none transition"
              />
            </div>
          )}
        </div>

        {/* ================= TAB 1: LIVE ROOMS & MEDIA INSPECTION ================= */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            {filteredRooms.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl space-y-3">
                <Film className="mx-auto h-10 w-10 text-white/30" />
                <h3 className="text-base font-semibold text-white">No active rooms found</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  {search ? 'No rooms match your search query.' : 'There are currently no active couches running on the platform.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredRooms.map((room) => {
                  const media = room.media || {};
                  const hasMedia = media.src && media.type !== 'none';
                  const isPlaying = room.playing;

                  return (
                    <div
                      key={room.roomId}
                      className="rounded-2xl border border-white/10 bg-black/50 p-5 shadow-xl backdrop-blur-2xl space-y-4 hover:border-white/20 transition flex flex-col justify-between"
                    >
                      {/* Room Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-bold text-white tracking-wide">{room.roomId}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(room.roomId);
                                say('Room ID copied');
                              }}
                              className="text-white/50 hover:text-white p-0.5 rounded transition"
                              title="Copy Room ID"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            {room.adult && (
                              <span className="rounded bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                                18+ Adult
                              </span>
                            )}
                            {room.hasPass && (
                              <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" />
                                Protected
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/50">
                            <span>Created: {new Date(room.createdAt).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span className={room.userCount >= 2 ? 'text-rose-400 font-medium' : 'text-emerald-400 font-medium'}>
                              {room.userCount}/2 Seats {room.userCount >= 2 ? '(Full Couch)' : '(Waiting for partner)'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleBlockRoom(room.roomId)}
                          className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 transition flex items-center gap-1 shrink-0"
                          title="Terminate room and disconnect all users"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Close Room</span>
                        </button>
                      </div>

                      {/* Video Playback Details (Security Monitor) */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white/70">What Is Playing:</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 ${
                                !hasMedia
                                  ? 'bg-white/10 text-white/50'
                                  : isPlaying
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {isPlaying && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                              {!hasMedia ? 'IDLE / NO MEDIA' : isPlaying ? 'PLAYING' : 'PAUSED'}
                            </span>
                          </div>

                          {hasMedia && (
                            <span className="font-mono text-xs font-semibold text-white/80 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                              ⏱️ {fmt(room.currentTime)}
                            </span>
                          )}
                        </div>

                        {hasMedia ? (
                          <div className="space-y-1.5">
                            <div className="text-sm font-semibold text-white truncate" title={media.title}>
                              {media.title || 'Untitled Stream'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/50 break-all">
                              <span className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-white/10 uppercase">
                                {media.type}
                              </span>
                              <a
                                href={media.src}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate hover:text-[#ff6fa0] transition flex items-center gap-1"
                                title="Open stream link in new tab"
                              >
                                <span className="truncate">{media.src}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-white/40 italic">No video stream loaded in this room currently.</p>
                        )}

                        {/* Video Controls Toolbar */}
                        {hasMedia && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => handleVideoControl(room.roomId, isPlaying ? 'pause' : 'play')}
                              className="rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-xs text-white transition flex items-center gap-1"
                            >
                              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              <span>{isPlaying ? 'Pause' : 'Resume'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVideoControl(room.roomId, 'stop')}
                              className="rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-xs text-amber-300 transition flex items-center gap-1"
                              title="Stop playback immediately for both partners"
                            >
                              <Square className="h-3 w-3" />
                              <span>Stop Video</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleBlockVideoUrl(media.src)}
                              className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 transition flex items-center gap-1"
                              title="Blacklist this video URL so it can never be played again"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Block Video</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setOverrideModal({ open: true, roomId: room.roomId, src: '', title: '' })}
                              className="rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-1 text-xs text-cyan-300 transition flex items-center gap-1"
                              title="Force-play a different video stream in this room"
                            >
                              <Video className="h-3 w-3" />
                              <span>Override Stream</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Queue Overview */}
                      {room.queue && room.queue.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-white/70">
                            <span className="font-medium flex items-center gap-1">
                              <span>Upcoming Queue ({room.queue.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleClearQueue(room.roomId)}
                              className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Clear Queue</span>
                            </button>
                          </div>
                          <div className="max-h-24 space-y-1 overflow-y-auto pr-1">
                            {room.queue.map((item, idx) => (
                              <div key={item.id || idx} className="flex items-center justify-between gap-2 text-xs text-white/60 bg-black/20 p-1.5 rounded">
                                <span className="truncate">{item.title || item.src}</span>
                                <span className="text-[10px] text-white/40 shrink-0 font-mono">{item.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Connected Users */}
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-semibold text-white/70">Connected Viewers ({room.users?.length || 0}):</span>
                        {(!room.users || room.users.length === 0) ? (
                          <p className="text-xs text-white/40 italic">Waiting for users to enter…</p>
                        ) : (
                          <div className="space-y-1.5">
                            {room.users.map((u) => (
                              <div
                                key={u.cid}
                                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 p-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: u.color || '#d9467a' }} />
                                  <span className="font-semibold text-white truncate">{u.name}</span>
                                  {u.isHost && (
                                    <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] px-1 font-bold">
                                      Host
                                    </span>
                                  )}
                                  <span className="font-mono text-[10px] text-white/40 truncate">({u.cid})</span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono text-[10px] text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                    IP: {u.ip || '127.0.0.1'}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleBlockUser(u, room.roomId)}
                                    className="rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-2 py-0.5 text-[11px] text-rose-300 transition flex items-center gap-1"
                                    title={`Kick and permanently ban user "${u.name}"`}
                                  >
                                    <Ban className="h-3 w-3" />
                                    <span>Block</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: SECURITY BLOCKLISTS ================= */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Quick URL Blacklist Form */}
            <div className="rounded-2xl border border-white/10 bg-black/50 p-5 shadow-xl backdrop-blur-2xl space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Ban className="h-4 w-4 text-rose-400" />
                <span>Add Video URL or Domain to Blacklist</span>
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBlockUrl}
                  onChange={(e) => setManualBlockUrl(e.target.value)}
                  placeholder="Paste URL, domain, or keyword to ban (e.g. malicious-stream.com or https://...)"
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-white/40 focus:border-rose-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => handleBlockVideoUrl(manualBlockUrl.trim())}
                  disabled={!manualBlockUrl.trim()}
                  className="rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 px-4 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50 transition"
                >
                  Blacklist Video
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Blocked Users */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/80">Blocked Users ({data.blocked.users?.length || 0})</h4>
                  <Users className="h-4 w-4 text-rose-400" />
                </div>
                {(!data.blocked.users || data.blocked.users.length === 0) ? (
                  <p className="text-xs text-white/40 italic py-4 text-center">No blocked users.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {data.blocked.users.map((u) => (
                      <div key={u.cid} className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-rose-300 font-semibold">{u.cid}</span>
                          <button
                            type="button"
                            onClick={() => handleUnblockUser(u)}
                            className="text-[11px] text-emerald-400 hover:underline"
                          >
                            Unblock
                          </button>
                        </div>
                        <p className="text-[11px] text-white/60">Reason: {u.reason}</p>
                        {u.ip && <p className="text-[10px] font-mono text-white/40">IP: {u.ip}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocked Rooms */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/80">Blocked Rooms ({data.blocked.rooms?.length || 0})</h4>
                  <Film className="h-4 w-4 text-rose-400" />
                </div>
                {(!data.blocked.rooms || data.blocked.rooms.length === 0) ? (
                  <p className="text-xs text-white/40 italic py-4 text-center">No blocked rooms.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {data.blocked.rooms.map((r) => (
                      <div key={r.roomId} className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-rose-300 font-semibold">{r.roomId}</span>
                          <button
                            type="button"
                            onClick={() => handleUnblockRoom(r.roomId)}
                            className="text-[11px] text-emerald-400 hover:underline"
                          >
                            Unblock
                          </button>
                        </div>
                        <p className="text-[11px] text-white/60">Reason: {r.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Blocked Video URLs */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white/80">Blacklisted Videos ({data.blocked.videos?.length || 0})</h4>
                  <Video className="h-4 w-4 text-rose-400" />
                </div>
                {(!data.blocked.videos || data.blocked.videos.length === 0) ? (
                  <p className="text-xs text-white/40 italic py-4 text-center">No blacklisted URLs.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {data.blocked.videos.map((src) => (
                      <div key={src} className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-rose-300 text-[11px] truncate flex-1">{src}</span>
                          <button
                            type="button"
                            onClick={() => handleUnblockVideo(src)}
                            className="text-[11px] text-emerald-400 hover:underline shrink-0"
                          >
                            Unblock
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: SYSTEM BROADCAST ================= */}
        {activeTab === 'broadcast' && (
          <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-black/50 p-6 shadow-xl backdrop-blur-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Global System Broadcast</h3>
                <p className="text-xs text-white/50">Send an emergency or maintenance toast alert to all active watch parties.</p>
              </div>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1">Broadcast Message Text</label>
                <textarea
                  rows={3}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="e.g. Scheduled maintenance in 15 minutes, or platform alert…"
                  className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white placeholder-white/40 focus:border-[#d9467a] focus:outline-none transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!broadcastMsg.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-[#d9467a] py-2.5 text-xs font-semibold text-white shadow-lg disabled:opacity-50 hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <Radio className="h-4 w-4" />
                <span>Send Global Broadcast</span>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Override Stream Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0e0e14] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Video className="h-4 w-4 text-cyan-400" />
              <span>Override Stream for Room: {overrideModal.roomId}</span>
            </h3>

            <form onSubmit={handleOverrideSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/80 mb-1">New Video Stream URL</label>
                <input
                  type="text"
                  required
                  value={overrideModal.src}
                  onChange={(e) => setOverrideModal({ ...overrideModal, src: e.target.value })}
                  placeholder="https://... (mp4, m3u8, youtube, etc.)"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white focus:border-[#d9467a] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-1">Custom Title (Optional)</label>
                <input
                  type="text"
                  value={overrideModal.title}
                  onChange={(e) => setOverrideModal({ ...overrideModal, title: e.target.value })}
                  placeholder="e.g. Administrator Broadcast / Replacement Video"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white focus:border-[#d9467a] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModal({ open: false, roomId: '', src: '', title: '' })}
                  className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 py-2 font-medium text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#d9467a] hover:bg-[#b3305d] py-2 font-semibold text-white transition"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div
            className={`rounded-full px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur-xl border flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                : 'bg-black/90 text-white border-white/20'
            }`}
          >
            {toast.type === 'error' ? <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> : <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
