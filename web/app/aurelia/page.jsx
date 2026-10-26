'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Shield, ShieldAlert, ShieldCheck, Lock, Unlock, Users, Film, Pause, Play,
  Square, Ban, Trash2, RefreshCw, Eye, EyeOff, Search, AlertTriangle,
  CheckCircle, Video, Flame, Clock, Key, ArrowRight, ExternalLink, LogOut,
  Copy, Radio, Sparkles, X, MapPin, Globe, Compass, Navigation, Activity, Wifi,
  Volume2, VolumeX, Maximize2, Heart, Camera, Mic, MicOff, VideoOff, ChevronDown, ChevronUp,
  Smartphone, Monitor, Tablet, Laptop, Info, Cpu, HardDrive, SmartphoneNfc, Server,
  Calendar, TrendingUp, BarChart3, Zap, Bell
} from 'lucide-react';
import { serverUrl, getSocket } from '@/lib/socket';
import { ytId, vimeoId, toEmbed, toStreamProxyUrl, sanitizeDisplayTitle } from '@/lib/media';
import BrandLogo from '@/components/BrandLogo';
import CallErrorBoundary from '@/components/CallErrorBoundary';

const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

// Render appropriate hardware device icon
const renderDeviceIcon = (device = {}) => {
  if (device.isMobile) {
    return <Smartphone className="h-4 w-4 text-pink-400" />;
  }
  if (device.isTablet) {
    return <Tablet className="h-4 w-4 text-purple-400" />;
  }
  if (device.os === 'macOS' || (device.brand === 'Apple' && device.type === 'desktop')) {
    return <Laptop className="h-4 w-4 text-sky-400" />;
  }
  if (device.isDesktop) {
    return <Monitor className="h-4 w-4 text-cyan-400" />;
  }
  return <Smartphone className="h-4 w-4 text-slate-400" />;
};

// Formatter for relative timestamps
const fmtTimeAgo = (ts) => {
  if (!ts) return 'just now';
  const sec = Math.floor((Date.now() - Number(ts)) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
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

// Singleton Shared Web Audio Context to prevent browser limit exhaustion (Max 6 AudioContexts)
let _sharedAudioCtx = null;
const getSharedAudioContext = () => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!_sharedAudioCtx || _sharedAudioCtx.state === 'closed') {
      _sharedAudioCtx = new AudioCtx();
    }
    if (_sharedAudioCtx && _sharedAudioCtx.state === 'suspended') {
      _sharedAudioCtx.resume().catch(() => {});
    }
    return _sharedAudioCtx;
  } catch {
    return null;
  }
};

// Stealth Video & Voice Tile for Admin Monitor (Hearable Voice Call + Video) - High Performance & Low Latency
function StealthVideoTile({ stream, user, listenAudio, roomId, onToggleUserCamera, onSetUserCamera }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [individualMute, setIndividualMute] = useState(null); // null = inherit listenAudio, boolean = manual toggle
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const effectiveAudio = individualMute !== null ? !individualMute : Boolean(listenAudio);

  // Check track availability with event listeners (zero aggressive polling)
  useEffect(() => {
    if (!stream) {
      setHasVideo(false);
      setHasAudio(false);
      return;
    }

    const checkTracks = () => {
      try {
        const vTracks = typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : [];
        const aTracks = typeof stream.getAudioTracks === 'function' ? stream.getAudioTracks() : [];
        const liveV = vTracks.length > 0 && vTracks.some((t) => t.enabled !== false && t.readyState !== 'ended');
        const liveA = aTracks.length > 0 && aTracks.some((t) => t.enabled !== false && t.readyState !== 'ended');
        setHasVideo(liveV);
        setHasAudio(liveA);
      } catch {
        setHasVideo(false);
        setHasAudio(false);
      }
    };

    checkTracks();

    stream.addEventListener?.('addtrack', checkTracks);
    stream.addEventListener?.('removetrack', checkTracks);

    const vTracks = typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : [];
    vTracks.forEach((t) => {
      t.addEventListener?.('unmute', checkTracks);
      t.addEventListener?.('mute', checkTracks);
    });

    const aTracks = typeof stream.getAudioTracks === 'function' ? stream.getAudioTracks() : [];
    aTracks.forEach((t) => {
      t.addEventListener?.('unmute', checkTracks);
      t.addEventListener?.('mute', checkTracks);
    });

    return () => {
      stream.removeEventListener?.('addtrack', checkTracks);
      stream.removeEventListener?.('removetrack', checkTracks);
      vTracks.forEach((t) => {
        t.removeEventListener?.('unmute', checkTracks);
        t.removeEventListener?.('mute', checkTracks);
      });
      aTracks.forEach((t) => {
        t.removeEventListener?.('unmute', checkTracks);
        t.removeEventListener?.('mute', checkTracks);
      });
    };
  }, [stream]);

  // Video playback with hardware acceleration & zero-latency sync
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    try {
      if (stream && typeof stream.getVideoTracks === 'function') {
        if (el.srcObject !== stream) {
          el.srcObject = stream;
        }
        el.muted = true;
        el.play().then(() => {
          if (el.videoWidth > 0) setHasVideo(true);
        }).catch(() => {});
      } else {
        el.srcObject = null;
        setHasVideo(false);
      }
    } catch (e) {
      console.warn('StealthVideoTile video error:', e);
    }
  }, [stream]);

  // Voice Activity Detection (VAD) via Shared Web Audio API (Strictly scoped & cleanly disposed)
  useEffect(() => {
    if (!stream || typeof stream.getAudioTracks !== 'function') return;
    const audioTracks = stream.getAudioTracks().filter((t) => t && t.readyState === 'live');
    if (audioTracks.length === 0) return;

    let analyser = null, src = null, timer = null, dead = false;
    let holdTimer = null;

    try {
      const actx = getSharedAudioContext();
      if (actx) {
        analyser = actx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.2;
        src = actx.createMediaStreamSource(new MediaStream(audioTracks));
        src.connect(analyser);

        const buf = new Uint8Array(analyser.frequencyBinCount);
        const check = () => {
          if (dead) return;
          try {
            analyser.getByteFrequencyData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i];
            const avg = sum / buf.length;
            if (avg > 12) {
              clearTimeout(holdTimer);
              setIsSpeaking(true);
              holdTimer = setTimeout(() => setIsSpeaking(false), 600);
            }
          } catch {}
          timer = setTimeout(check, 250);
        };
        check();
      }
    } catch {}

    return () => {
      dead = true;
      clearTimeout(timer);
      clearTimeout(holdTimer);
      try { src?.disconnect(); } catch {}
    };
  }, [stream]);

  // Audio element playback & autoplay unlock
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;
    try {
      el.srcObject = stream;
      el.volume = 1.0;
      el.muted = !effectiveAudio;
      if (effectiveAudio) {
        el.play().then(() => setAutoplayBlocked(false)).catch((e) => {
          console.warn('Stealth audio autoplay blocked by browser:', e);
          setAutoplayBlocked(true);
        });
      }
    } catch (e) {
      console.warn('Stealth audio error:', e);
    }

    const unlock = () => {
      if (effectiveAudio && el) {
        el.play().then(() => setAutoplayBlocked(false)).catch(() => {});
      }
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
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
    <div className={`relative aspect-video rounded-xl bg-black/95 overflow-hidden shadow-2xl group transition-all duration-200 border ${isSpeaking ? 'border-emerald-500 shadow-emerald-950/40' : 'border-purple-500/30 hover:border-pink-500/60'}`}>
      {/* Hidden high-priority audio sink */}
      <audio ref={audioRef} autoPlay playsInline preload="auto" />

      {/* Video Stream Element (Hardware-accelerated, zero-stutter rendering) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        webkit-playsinline="true"
        muted
        preload="auto"
        disablePictureInPicture
        onLoadedMetadata={() => setHasVideo(true)}
        onPlaying={() => setHasVideo(true)}
        onPlay={() => setHasVideo(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 pointer-events-none ${hasVideo ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* If caller has NO video (Voice Call Mode or Camera Off) */}
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-[radial-gradient(ellipse_at_center,#1d102e_0%,#090514_100%)] z-10 select-none">
          <div className="relative">
            <div
              className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-base shadow-xl transition-transform ${
                isSpeaking
                  ? 'scale-110 ring-4 ring-emerald-400 bg-emerald-600 animate-pulse'
                  : 'bg-purple-600/80 border border-purple-400/40'
              }`}
            >
              {isSpeaking ? <Mic className="h-6 w-6 text-white" /> : <MicOff className="h-5 w-5 text-purple-300" />}
            </div>
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[170px] mt-2">{user?.name || 'Participant'}</span>
          <div className="flex items-center gap-1.5 mt-1">
            {hasAudio ? (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Voice Connected</span>
              </span>
            ) : (
              <span className="text-[10px] text-purple-300/50">Awaiting audio / video feed…</span>
            )}
          </div>
        </div>
      )}

      {/* Browser Autoplay Blocked Banner */}
      {autoplayBlocked && effectiveAudio && (
        <button
          type="button"
          onClick={() => audioRef.current?.play().then(() => setAutoplayBlocked(false))}
          className="absolute inset-x-2 top-10 z-30 py-1.5 px-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[10px] font-bold shadow-2xl flex items-center justify-center gap-1.5 animate-bounce cursor-pointer border border-white/20"
        >
          <Volume2 className="h-3.5 w-3.5 text-white" />
          <span>Click to Unmute Caller Voice</span>
        </button>
      )}

      {/* Clean User Tag: Minimal subtle pill in top-left, unobstructed face */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 shadow">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: user?.color || '#ec4899' }} />
          <span className="text-[10px] font-bold text-white truncate max-w-[90px]">{user?.name || 'User'}</span>
          {user?.isHost && (
            <span className="text-[8px] bg-amber-500/30 text-amber-300 px-1 rounded font-bold uppercase shrink-0">Host</span>
          )}
          {user?.cameraBlocked ? (
            <span className="text-[8px] bg-rose-500/40 border border-rose-500/60 text-rose-200 px-1 rounded font-bold uppercase shrink-0">
              🔒 Cam Cut
            </span>
          ) : (
            <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded font-bold uppercase shrink-0">
              Cam On
            </span>
          )}
          {isSpeaking && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
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
            className={`p-1 rounded transition cursor-pointer flex items-center gap-1 text-[9px] ${
              effectiveAudio
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400'
                : 'bg-black/80 hover:bg-black text-rose-300 hover:text-white border border-rose-500/40'
            }`}
            title={effectiveAudio ? 'Mute this participant' : 'Hear this participant voice'}
          >
            {effectiveAudio ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            <span className="hidden sm:inline">{effectiveAudio ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Admin Explicit Turn ON / Cut User Camera Controls */}
          {(onSetUserCamera || onToggleUserCamera) && (
            <div className="flex items-center gap-0.5 bg-black/80 p-0.5 rounded border border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (onSetUserCamera) {
                    onSetUserCamera(roomId, user?.cid || user?.id, true);
                  } else {
                    onToggleUserCamera(roomId, user?.cid || user?.id, true);
                  }
                }}
                className="px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-0.5 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                title="Force Turn ON this user camera"
              >
                <Camera className="h-2.5 w-2.5 text-emerald-200" />
                <span>ON</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSetUserCamera) {
                    onSetUserCamera(roomId, user?.cid || user?.id, false);
                  } else {
                    onToggleUserCamera(roomId, user?.cid || user?.id, false);
                  }
                }}
                className="px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-0.5 text-[9px] font-bold bg-rose-600/80 hover:bg-rose-600 text-white shadow-sm"
                title="Cut / Turn OFF this user camera"
              >
                <VideoOff className="h-2.5 w-2.5 text-rose-200" />
                <span>CUT</span>
              </button>
            </div>
          )}

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
            title="Fullscreen feed"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Stealth Call Monitor for Aurelia Admin Panel
function StealthCallMonitor({ roomId, users = [], externalListenAudio = true, onToggleUserCamera, onSetUserCamera }) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const [listenAudio, setListenAudio] = useState(externalListenAudio !== false);
  const [connecting, setConnecting] = useState(true);
  const peerRef = useRef(null);
  const activeCalls = useRef(new Map());

  // Sync with external master audio toggle if passed
  useEffect(() => {
    if (externalListenAudio !== undefined) {
      setListenAudio(Boolean(externalListenAudio));
    }
  }, [externalListenAudio]);

  // Helper to create blank video track AND silent audio track so WebRTC SDP negotiates BOTH media types smoothly!
  const createBlankStream = () => {
    if (typeof document === 'undefined') return null;
    const tracks = [];
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#070512';
        ctx.fillRect(0, 0, 160, 120);
      }
      // Fluid 24 FPS stream so SDP negotiation establishes normal video timing
      const stream = canvas.captureStream ? canvas.captureStream(24) : (canvas.webkitCaptureStream ? canvas.webkitCaptureStream(24) : null);
      if (stream && stream.getVideoTracks().length > 0) {
        tracks.push(stream.getVideoTracks()[0]);
      }
    } catch {}

    // Silent audio track: ensures WebRTC SDP offer contains m=audio so remote answers send microphone audio!
    try {
      const actx = getSharedAudioContext();
      if (actx) {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        gain.gain.value = 0; // completely silent ghost audio
        const dst = actx.createMediaStreamDestination();
        osc.connect(gain);
        gain.connect(dst);
        osc.start();
        const trk = dst.stream.getAudioTracks()[0];
        if (trk) {
          trk.enabled = true;
          tracks.push(trk);
        }
      }
    } catch {}

    return new MediaStream(tracks);
  };

  const callAttemptTimes = useRef({});

  useEffect(() => {
    let peer = null;
    let dead = false;
    const ghostCid = 'aurelia_ghost_' + Math.random().toString(36).slice(2, 9);
    const blankStream = createBlankStream() || new MediaStream();

    const callAllUsers = () => {
      if (!peerRef.current || dead) return;
      users.forEach((u) => {
        const targetId = u.id || u.cid;
        if (!targetId) return;

        // If we already have a stream for this user, do not disrupt
        if (remoteStreams[targetId] && activeCalls.current.has(targetId)) {
          const c = activeCalls.current.get(targetId);
          const state = c?.peerConnection?.connectionState || c?.peerConnection?.iceConnectionState;
          if (state === 'connected' || state === 'completed') return;
        }

        const existingCall = activeCalls.current.get(targetId);
        if (existingCall) {
          const elapsed = Date.now() - (callAttemptTimes.current[targetId] || 0);
          const state = existingCall.peerConnection?.connectionState || existingCall.peerConnection?.iceConnectionState;
          // While connecting or candidate gathering within 12s, let it finish connecting
          if (state === 'connected' || state === 'connecting' || state === 'checking' || state === 'new' || elapsed < 12000) {
            return;
          }
          try { existingCall.close(); } catch {}
          activeCalls.current.delete(targetId);
        }

        callAttemptTimes.current[targetId] = Date.now();
        try {
          const call = peerRef.current.call(targetId, blankStream, {
            metadata: { type: 'cam', isGhost: true }
          });
          if (!call) return;
          activeCalls.current.set(targetId, call);

          call.on('stream', (stream) => {
            if (dead) return;
            try {
              // Zero-delay playback hint for ultra-smooth real-time surveillance feed
              call.peerConnection?.getReceivers().forEach((r) => {
                if ('playoutDelayHint' in r) r.playoutDelayHint = 0;
                if ('jitterBufferTarget' in r) r.jitterBufferTarget = 0;
              });
            } catch {}
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
            try { call.close(); } catch {}
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
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:openrelay.metered.ca:80' },
          {
            urls: [
              'turn:openrelay.metered.ca:80',
              'turn:openrelay.metered.ca:443',
              'turn:openrelay.metered.ca:443?transport=tcp',
              'turns:openrelay.metered.ca:443?transport=tcp',
            ],
            username: 'openrelayproject',
            credential: 'openrelayproject',
          },
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

    const interval = setInterval(callAllUsers, 3500);

    return () => {
      dead = true;
      clearInterval(interval);
      activeCalls.current.forEach((c) => {
        try { c.close(); } catch {}
      });
      activeCalls.current.clear();
      try {
        blankStream.getTracks().forEach((t) => t.stop());
      } catch {}
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
              <span>Stealth Video &amp; Voice Call Monitor</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-semibold">
                100% Stealth &bull; Live Audio Hearable
              </span>
              {activeStreamCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>{activeStreamCount} Live Feed{activeStreamCount > 1 ? 's' : ''}</span>
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-400">Hear and watch room video &amp; voice calls in real time</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setListenAudio(!listenAudio)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
            listenAudio
              ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/30'
              : 'bg-white/10 hover:bg-white/15 border-white/20 text-white/70 hover:text-white'
          }`}
          title={listenAudio ? 'Mute room call audio' : 'Listen to room call voice audio'}
        >
          {listenAudio ? <Volume2 className="h-3.5 w-3.5 text-white animate-pulse" /> : <VolumeX className="h-3.5 w-3.5" />}
          <span>{listenAudio ? '🔊 Live Sound: ON' : '🔇 Live Sound: Muted'}</span>
        </button>
      </div>

      {/* Video & Voice Grid */}
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
                stream={stream}
                user={u}
                listenAudio={listenAudio}
                roomId={roomId}
                onToggleUserCamera={onToggleUserCamera}
                onSetUserCamera={onSetUserCamera}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Real-time Synchronized Cinema Movie Player for Aurelia Admin Surveillance (Default Muted)
function AdminRoomMoviePlayer({
  roomId,
  media,
  playing = false,
  currentTime = 0,
  masterMuted = true,
  onRemoteControl,
  onOpenOverride,
  onBlockUrl,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const [individualMuted, setIndividualMuted] = useState(null); // null = inherit masterMuted, boolean = manual toggle
  const [localTime, setLocalTime] = useState(currentTime || 0);
  const [duration, setDuration] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Default is strictly MUTED unless explicitly unmuted
  const effectiveMuted = individualMuted !== null ? individualMuted : Boolean(masterMuted);

  const src = media?.src || '';
  const type = media?.type || 'auto';
  const displayTitle = sanitizeDisplayTitle(media?.title || src || 'Room Stream');
  const isYoutube = type === 'youtube' || Boolean(ytId(src));
  const isVimeo = type === 'vimeo' || Boolean(vimeoId(src));
  const isEmbed = type === 'embed';
  const isHls = type === 'hls' || (typeof src === 'string' && src.split('?')[0].toLowerCase().endsWith('.m3u8'));
  const hasMedia = Boolean(src && type !== 'none');

  // Keep local time in sync with room.currentTime prop when not scrubbing
  useEffect(() => {
    if (!isScrubbing) {
      setLocalTime(currentTime || 0);
      if (videoRef.current && Math.abs(videoRef.current.currentTime - (currentTime || 0)) > 2.5) {
        try { videoRef.current.currentTime = currentTime || 0; } catch {}
      }
    }
  }, [currentTime, isScrubbing]);

  // Video element initialization for HLS & Direct video
  useEffect(() => {
    if (!hasMedia || isYoutube || isVimeo || isEmbed) return;
    const v = videoRef.current;
    if (!v) return;

    let destroyed = false;
    setIsBuffering(true);
    setLoadError('');

    if (isHls) {
      if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = src;
        v.muted = effectiveMuted;
        if (playing) v.play().catch(() => {});
      } else {
        import('hls.js').then(({ default: Hls }) => {
          if (destroyed || !v) return;
          if (Hls.isSupported()) {
            const h = new Hls({
              enableWorker: true,
              lowLatencyMode: false,
              backBufferLength: 30,
              maxBufferLength: 30,
            });
            hlsRef.current = h;
            h.loadSource(src);
            h.attachMedia(v);
            h.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsBuffering(false);
              v.muted = effectiveMuted;
              if (playing) v.play().catch(() => {});
            });
            h.on(Hls.Events.ERROR, () => {
              if (!v.src.includes('/api/stream') && src) {
                v.src = toStreamProxyUrl(src);
                v.load();
                if (playing) v.play().catch(() => {});
              }
            });
          } else {
            v.src = toStreamProxyUrl(src);
            v.load();
            if (playing) v.play().catch(() => {});
          }
        }).catch(() => {
          v.src = toStreamProxyUrl(src);
          v.load();
        });
      }
    } else {
      v.src = src;
      v.muted = effectiveMuted;
      if (playing) v.play().catch(() => {});
    }

    const onLoadedMetadata = () => {
      setIsBuffering(false);
      if (v.duration && Number.isFinite(v.duration)) setDuration(v.duration);
      if (currentTime) {
        try { v.currentTime = currentTime; } catch {}
      }
    };
    const onTimeUpdate = () => {
      if (!isScrubbing) setLocalTime(v.currentTime);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onError = () => {
      if (!v.src.includes('/api/stream') && src) {
        v.src = toStreamProxyUrl(src);
        v.load();
        if (playing) v.play().catch(() => {});
      } else {
        setLoadError('Direct playback restricted (CORS/DRM)');
        setIsBuffering(false);
      }
    };

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('error', onError);

    return () => {
      destroyed = true;
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('error', onError);
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch {}
        hlsRef.current = null;
      }
    };
  }, [src, isHls, isYoutube, isVimeo, isEmbed, hasMedia]);

  // Synchronize playing / pause state
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing]);

  // Synchronize mute audio state
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = effectiveMuted;
    }
  }, [effectiveMuted]);

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch {}
  };

  const handleSeekCommit = (e) => {
    const val = Number(e.target.value);
    setIsScrubbing(false);
    if (videoRef.current) {
      try { videoRef.current.currentTime = val; } catch {}
    }
    onRemoteControl?.(roomId, 'seek', { time: val });
  };

  const yt = ytId(src);
  const vm = vimeoId(src);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video rounded-xl bg-black border border-pink-500/30 overflow-hidden shadow-2xl group transition-all duration-200 hover:border-pink-500/60"
    >
      {/* Stream Playback Layer */}
      {hasMedia ? (
        <>
          {isYoutube && yt ? (
            <iframe
              key={`${yt}-${effectiveMuted}-${playing}`}
              src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=${playing ? 1 : 0}&mute=${effectiveMuted ? 1 : 0}&start=${Math.floor(currentTime || 0)}&controls=1&enablejsapi=1`}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              title={`Room ${roomId} - YouTube`}
            />
          ) : isVimeo && vm ? (
            <iframe
              key={`${vm}-${effectiveMuted}-${playing}`}
              src={`https://player.vimeo.com/video/${vm}?autoplay=${playing ? 1 : 0}&muted=${effectiveMuted ? 1 : 0}#t=${Math.floor(currentTime || 0)}s`}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              title={`Room ${roomId} - Vimeo`}
            />
          ) : isEmbed ? (
            <iframe
              src={toEmbed(src) || src}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              title={`Room ${roomId} - Embed`}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={effectiveMuted}
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* Buffering Spinner */}
          {isBuffering && !isYoutube && !isVimeo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="h-8 w-8 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin" />
            </div>
          )}

          {/* Load error warning */}
          {loadError && (
            <div className="absolute inset-x-2 top-11 bg-rose-950/80 border border-rose-500/40 text-[10px] text-rose-300 px-2 py-1 rounded backdrop-blur-md flex items-center justify-between">
              <span>{loadError}</span>
              {onOpenOverride && (
                <button
                  type="button"
                  onClick={() => onOpenOverride(roomId)}
                  className="underline hover:text-white"
                >
                  Override Stream
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-purple-950/30 to-black/90 space-y-1.5">
          <div className="h-9 w-9 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 animate-pulse">
            <Film className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold text-white">Cinema Standby • No Media</span>
          <span className="text-[10px] text-purple-300/70 max-w-[200px]">Waiting for occupants to load a movie</span>
          {onOpenOverride && (
            <button
              type="button"
              onClick={() => onOpenOverride(roomId)}
              className="mt-1 px-3 py-1 rounded-lg bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/40 text-[10px] font-semibold text-pink-200 transition cursor-pointer"
            >
              🎬 Force Play Stream
            </button>
          )}
        </div>
      )}

      {/* Top Overlay Badge */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 max-w-[70%]">
          <Film className="h-3 w-3 text-pink-400 shrink-0" />
          <span className="text-[10px] font-bold text-white truncate" title={displayTitle}>
            {displayTitle || 'Room Movie'}
          </span>
          <span className="text-[8px] font-mono text-purple-300 bg-purple-500/20 px-1 py-0.2 rounded border border-purple-500/30 shrink-0 uppercase">
            {type}
          </span>
        </div>

        <div className="flex items-center gap-1 pointer-events-auto">
          <span
            className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 ${
              !hasMedia
                ? 'bg-white/10 text-white/50 border border-white/10'
                : playing
                ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {playing && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
            <span>{!hasMedia ? 'IDLE' : playing ? 'PLAYING' : 'PAUSED'}</span>
          </span>
        </div>
      </div>

      {/* Bottom Overlay Controls & Scrubber */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-2 space-y-1.5 z-20">
        {/* Timeline Scrubber */}
        {hasMedia && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || Math.max(localTime, 100)}
              step={1}
              value={localTime}
              onMouseDown={() => setIsScrubbing(true)}
              onTouchStart={() => setIsScrubbing(true)}
              onChange={(e) => setLocalTime(Number(e.target.value))}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-pink-500 transition hover:h-1.5"
              title="Scrub room movie timeline"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-white">
          {/* Left action buttons */}
          <div className="flex items-center gap-1.5">
            {/* Remote Play/Pause */}
            {hasMedia && onRemoteControl && (
              <button
                type="button"
                onClick={() => onRemoteControl(roomId, playing ? 'pause' : 'play')}
                className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title={playing ? 'Remote Pause room' : 'Remote Play room'}
              >
                {playing ? <Pause className="h-3 w-3 text-amber-300" /> : <Play className="h-3 w-3 text-emerald-400" />}
              </button>
            )}

            {/* Mute/Unmute Audio Button (DEFAULT MUTED) */}
            <button
              type="button"
              onClick={() => setIndividualMuted(!effectiveMuted)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer ${
                effectiveMuted
                  ? 'bg-black/80 hover:bg-black text-white/80 border border-white/20'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/40 animate-pulse'
              }`}
              title={effectiveMuted ? 'Unmute movie audio' : 'Mute movie audio'}
            >
              {effectiveMuted ? <VolumeX className="h-3 w-3 text-slate-300" /> : <Volume2 className="h-3 w-3 text-white" />}
              <span>{effectiveMuted ? 'Muted 🔇' : 'Audio 🔊'}</span>
            </button>

            {/* Time Display */}
            {hasMedia && (
              <span className="font-mono text-[9px] text-white/80 bg-black/60 px-1 py-0.5 rounded border border-white/10">
                ⏱️ {fmt(localTime)}{duration ? ` / ${fmt(duration)}` : ''}
              </span>
            )}
          </div>

          {/* Right action buttons */}
          <div className="flex items-center gap-1">
            {hasMedia && onRemoteControl && (
              <button
                type="button"
                onClick={() => onRemoteControl(roomId, 'stop')}
                className="p-1 rounded bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 transition cursor-pointer"
                title="Stop movie in room"
              >
                <Square className="h-2.5 w-2.5" />
              </button>
            )}

            {hasMedia && onBlockUrl && src && (
              <button
                type="button"
                onClick={() => onBlockUrl(src)}
                className="p-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 transition cursor-pointer"
                title="Blacklist video URL"
              >
                <Ban className="h-2.5 w-2.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleFullscreen}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Fullscreen video feed"
            >
              <Maximize2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
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
  const [expandedMovieRooms, setExpandedMovieRooms] = useState({});
  const [globalListenAudio, setGlobalListenAudio] = useState(true); // DEFAULT UNMUTED HEARABLE CALL AUDIO
  const [globalMovieAudio, setGlobalMovieAudio] = useState(false); // DEFAULT MUTED VIDEO PLAY
  const [surveillanceMode, setSurveillanceMode] = useState('split'); // 'split' | 'movies' | 'cams'
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  // High-Security Single Active Admin Session Portal:
  // Strictly enforces ONE active administrator session worldwide.
  const [showDecoy404, setShowDecoy404] = useState(false);
  const [adminToken, setAdminToken] = useState(() => (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_token') || '' : ''));
  const [secretClicks, setSecretClicks] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  // Room Password reveal state
  const [revealedPasswords, setRevealedPasswords] = useState({});

  // Deep Room Surveillance Modal State
  const [deepInspectModal, setDeepInspectModal] = useState({ open: false, loading: false, roomId: '', data: null });
  // Audience Ledger Chart Time Range
  const [audienceChartRange, setAudienceChartRange] = useState('14d'); // '7d' | '14d' | '30d'

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

  // Live Visitors & Hardware Device Telemetry State
  const [visitorsData, setVisitorsData] = useState({
    summary: { totalAllTimeUsers: 0, totalRecorded: 0, totalUnique: 0, onlineNow: 0, mobileCount: 0, desktopCount: 0, tabletCount: 0 },
    online: [],
    recent: [],
    allTime: [],
    liveActivityWire: [],
    breakdown: { os: {}, browsers: {}, countries: {} },
  });
  const [visitorScopeFilter, setVisitorScopeFilter] = useState('all'); // 'all' (All-Time Users) | 'online' (Live Now) | 'today' (Today)
  const [visitorDeviceFilter, setVisitorDeviceFilter] = useState('all'); // 'all' | 'mobile' | 'desktop' | 'tablet'
  const [visitorSearch, setVisitorSearch] = useState('');
  const [selectedVisitorModal, setSelectedVisitorModal] = useState(null);

  const say = (msg, type = 'success') => {
    setToast({ msg, type, n: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const handleGhostJoin = (roomId) => {
    setGhostModal({ open: true, roomId, data: null });
    const sock = getSocket();
    if (!sock.connected) sock.connect();
    sock.emit('admin:ghost_join', { roomId, adminKey, adminToken }, (res) => {
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

  // Check URL parameters, keyboard shortcut cipher, and stored session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hasSecretParam = params.has('vault') || params.has('access') || params.has('adm') || params.has('key') || params.has('adminKey');
    const saved = sessionStorage.getItem('sc_admin_key');

    if (hasSecretParam || saved) {
      setShowDecoy404(false);
    }
    if (saved) {
      setAdminKey(saved);
      verifyKey(saved);
    }

    // Anti-Tamper DevTools Security Warning
    console.log(
      '%c🔒 RESTRICTED SURVEILLANCE CONSOLE',
      'color:#f43f5e;font-size:22px;font-weight:900;background:#000;padding:6px 14px;border-radius:6px;'
    );
    console.log(
      '%cUnauthorized access attempts, tampering, or automated probing will result in automatic IP blacklisting at the firewall.',
      'color:#fda4af;font-size:12px;'
    );

    // Stealth keyboard cipher: Ctrl + Shift + A (or Cmd + Shift + A on Mac)
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowDecoy404((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 15-Minute Inactivity Auto-Lockout
  useEffect(() => {
    if (!authed) return;
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        handleLogout();
        setShowDecoy404(true);
        say('Session auto-locked due to inactivity.', 'error');
      }, 15 * 60 * 1000);
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    resetTimer();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [authed]);

  const handleSecretClick = () => {
    setSecretClicks((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setShowDecoy404(false);
        say('Stealth biometric gateway unlocked');
        return 0;
      }
      return next;
    });
  };

  const adminHeaders = useCallback(() => {
    const tok = adminToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_token') || '' : '');
    const key = adminKey || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_key') || '' : '');
    return {
      'Content-Type': 'application/json',
      'x-admin-token': tok,
      'x-admin-key': key,
    };
  }, [adminToken, adminKey]);

  // Listen for single-session revocation (when another admin logs in)
  useEffect(() => {
    const sock = getSocket();
    const onRevoked = (data) => {
      alert(data?.message || 'Admin session terminated: Another administrator has logged in.');
      handleLogout();
    };
    sock.on('admin:session_revoked', onRevoked);
    return () => {
      sock.off('admin:session_revoked', onRevoked);
    };
  }, []);

  const verifyKey = async (k) => {
    if (Date.now() < lockedUntil) {
      setAuthError('SECURITY LOCKOUT: Gateway locked for protection. Try again shortly.');
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch(serverUrl() + '/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: k.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setAuthed(true);
        setShowDecoy404(false);
        setFailedAttempts(0);
        sessionStorage.setItem('sc_admin_token', data.token);
        sessionStorage.setItem('sc_admin_key', k.trim());
        setAdminToken(data.token);
        setAdminKey(k.trim());
        say('🔒 Single Administrator Session Established');
        fetchOverview(data.token, k.trim());
      } else {
        setAuthed(false);
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= 3) {
          setLockedUntil(Date.now() + 5 * 60_000);
          setAuthError('SECURITY LOCKOUT: Maximum attempts exceeded. Access locked for 5 minutes.');
        } else {
          setAuthError(data.message || `Invalid master security cipher (${3 - nextFails} attempt${3 - nextFails === 1 ? '' : 's'} remaining).`);
        }
      }
    } catch (e) {
      setAuthError('Connection error: Security gateway could not verify credentials.');
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
    const tok = adminToken || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_token') || '' : '');
    if (tok) {
      fetch(serverUrl() + '/api/admin/logout', {
        method: 'POST',
        headers: { 'x-admin-token': tok },
      }).catch(() => {});
    }
    sessionStorage.removeItem('sc_admin_token');
    sessionStorage.removeItem('sc_admin_key');
    setAuthed(false);
    setAdminToken('');
    setAdminKey('');
    setKeyInput('');
  };

  const fetchOverview = useCallback(async (token = adminToken, k = adminKey) => {
    const tok = token || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_token') : '') || '';
    const key = k || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('sc_admin_key') : '') || '';
    if (!tok && !key) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/overview', {
        headers: {
          'x-admin-token': tok,
          'x-admin-key': key,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        setData({
          stats: json.stats || {},
          rooms: Array.isArray(json.rooms) ? json.rooms : [],
          blocked: json.blocked || { users: [], ips: [], rooms: [], videos: [] },
        });
        if (json.visitors) {
          setVisitorsData(json.visitors);
        }
      } else if (res.status === 401) {
        const json = await res.json().catch(() => ({}));
        if (json.error === 'session_expired') {
          alert('Administrator Session Terminated:\n\nAnother administrator has logged in from another browser/device, or your single session timed out.');
        }
        handleLogout();
      }
    } catch (e) {
      // offline / quiet
    }
  }, [adminToken, adminKey]);

  // Export full visitor logs as JSON
  const handleExportVisitors = async () => {
    try {
      say('Preparing full visitor audit export…', 'info');
      const res = await fetch(serverUrl() + '/api/admin/visitors/export', {
        headers: adminHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `syncinema_visitors_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        say('Visitor audit export downloaded successfully! 📁');
      } else {
        say('Failed to export visitor audit log', 'error');
      }
    } catch {
      say('Export error occurred', 'error');
    }
  };

  // Admin ban visitor IP from Live Visitors telemetry
  const handleBlockVisitorIp = async (ip, reason = 'Blocked by administrator from Live Visitors panel') => {
    if (!ip) return;
    if (!confirm(`Are you sure you want to BLOCK IP "${ip}"?\n\nThis will terminate and sever all active connections from this IP address.`)) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/visitors/block', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ ip, reason }),
      });
      if (res.ok) {
        say(`IP ${ip} blocked and live sessions severed`);
        fetchOverview();
      } else {
        say('Failed to block IP', 'error');
      }
    } catch {
      say('Network error blocking IP', 'error');
    }
  };

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
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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

  // Set Camera Access for Room (Admin Explicit Action: true = Turn ON, false = Cut)
  const handleSetRoomCamera = async (roomId, enabled) => {
    const willEnable = Boolean(enabled);
    try {
      say(willEnable ? `Turning ON camera for room #${roomId}…` : `Cutting camera feed in #${roomId}…`, 'info');
      const res = await fetch(serverUrl() + '/api/admin/room/camera', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          roomId,
          enabled: willEnable,
          reason: willEnable ? 'Camera access activated by administrator' : 'Camera access disabled by administrator for security compliance',
        }),
      });
      if (res.ok) {
        say(willEnable ? `🟢 Camera turned ON for room #${roomId}` : `🔴 Camera cut & disabled for room #${roomId}`);
        fetchOverview();
      } else {
        say('Failed to update room camera policy', 'error');
      }
    } catch {
      say('Network error moderating room camera', 'error');
    }
  };

  const handleToggleRoomCamera = async (roomId, currentDisabled) => {
    return handleSetRoomCamera(roomId, Boolean(currentDisabled));
  };

  // Set Camera Access for Individual Participant (true = Turn ON, false = Cut)
  const handleSetUserCamera = async (roomId, cid, enabled) => {
    const willEnable = Boolean(enabled);
    try {
      say(willEnable ? `Turning ON participant camera…` : `Cutting participant camera feed…`, 'info');
      const res = await fetch(serverUrl() + '/api/admin/user/camera', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          roomId,
          cid,
          enabled: willEnable,
          reason: willEnable ? 'Your camera access has been activated by administrator' : 'Your camera access has been disabled by administrator for security',
        }),
      });
      if (res.ok) {
        say(willEnable ? `🟢 Participant camera activated` : `🔴 Participant camera cut & disabled`);
        fetchOverview();
      } else {
        say('Failed to moderate user camera', 'error');
      }
    } catch {
      say('Network error moderating user camera', 'error');
    }
  };

  const handleToggleUserCamera = async (roomId, cid, currentBlocked) => {
    return handleSetUserCamera(roomId, cid, Boolean(currentBlocked));
  };


  const handleInspectRoom = async (roomId) => {
    setDeepInspectModal({ open: true, loading: true, roomId, data: null });
    try {
      const res = await fetch(serverUrl() + `/api/admin/room/inspect/${encodeURIComponent(roomId)}`, {
        headers: adminHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setDeepInspectModal({ open: true, loading: false, roomId, data: json });
      } else {
        say('Failed to fetch room telemetry', 'error');
        setDeepInspectModal((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      say('Network error inspecting room', 'error');
      setDeepInspectModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSendRoomAlert = async (roomId) => {
    const msg = prompt(`Enter broadcast alert / system notice for Room "${roomId}":`);
    if (!msg || !msg.trim()) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/room/alert', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ roomId, message: msg.trim(), type: 'toast' }),
      });
      if (res.ok) {
        say(`Alert successfully transmitted to room "${roomId}"`);
      } else {
        say('Failed to send alert to room', 'error');
      }
    } catch {
      say('Network error transmitting alert', 'error');
    }
  };

  const handleBlockUser = async (user, roomId) => {
    const reason = prompt(`Reason for blocking "${user.name}" (CID: ${user.cid}):`, 'Violation of security policies');
    if (reason === null) return;
    try {
      const res = await fetch(serverUrl() + '/api/admin/user/block', {
        method: 'POST',
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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
        headers: adminHeaders(),
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

  // Filtered all-time & live website visitors
  const sourceVisitorsList = visitorsData?.allTime?.length > 0 ? visitorsData.allTime : (visitorsData?.recent || []);
  const filteredVisitors = sourceVisitorsList.filter((v) => {
    if (visitorScopeFilter === 'online' && !v.online) return false;
    if (visitorScopeFilter === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastActiveDate = v.lastSeen ? new Date(v.lastSeen).toISOString().slice(0, 10) : '';
      if (lastActiveDate !== todayStr) return false;
    }
    if (visitorDeviceFilter === 'mobile' && !v.device?.isMobile) return false;
    if (visitorDeviceFilter === 'desktop' && !v.device?.isDesktop) return false;
    if (visitorDeviceFilter === 'tablet' && !v.device?.isTablet) return false;
    if (!visitorSearch.trim()) return true;
    const q = visitorSearch.toLowerCase();
    return (
      (v.ip && v.ip.toLowerCase().includes(q)) ||
      (v.cid && v.cid.toLowerCase().includes(q)) ||
      (v.device?.model && v.device.model.toLowerCase().includes(q)) ||
      (v.device?.brand && v.device.brand.toLowerCase().includes(q)) ||
      (v.device?.os && v.device.os.toLowerCase().includes(q)) ||
      (v.device?.browser && v.device.browser.toLowerCase().includes(q)) ||
      (v.geo?.city && v.geo.city.toLowerCase().includes(q)) ||
      (v.geo?.country && v.geo.country.toLowerCase().includes(q)) ||
      (v.geo?.isp && v.geo.isp.toLowerCase().includes(q)) ||
      (v.nickname && v.nickname.toLowerCase().includes(q)) ||
      (v.currentRoom && v.currentRoom.toLowerCase().includes(q)) ||
      (v.currentPath && v.currentPath.toLowerCase().includes(q)) ||
      (v.lastAction?.description && v.lastAction.description.toLowerCase().includes(q)) ||
      (v.roomsVisited && v.roomsVisited.some((r) => r.toLowerCase().includes(q))) ||
      (v.mediaWatched && v.mediaWatched.some((m) => m.title && m.title.toLowerCase().includes(q)))
    );
  });



  // ------------------ 100% STEALTH CAMOUFLAGE 404 DECOY GATE ------------------
  // Anyone visiting /aurelia without authorization or the secret cipher sees an authentic 404 error
  if (!authed && showDecoy404) {
    return (
      <div className="min-h-screen bg-[#07050e] text-white flex flex-col items-center justify-center p-6 font-sans select-none">
        <div className="flex items-center gap-5 text-center">
          <h1
            onClick={handleSecretClick}
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white border-r border-white/20 pr-5 cursor-default hover:text-white/95 transition"
            title=""
          >
            404
          </h1>
          <div className="text-xs sm:text-sm text-white/70 font-normal text-left">
            This page could not be found.
          </div>
        </div>
        <div className="mt-8">
          <Link
            href="/"
            className="text-xs text-white/40 hover:text-white transition underline"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // ------------------ HARDENED SECURITY VAULT LOGIN ------------------
  if (!authed) {
    const isLockedOut = Date.now() < lockedUntil;
    return (
      <main className="relative min-h-screen grid place-items-center overflow-hidden bg-[radial-gradient(ellipse_100%_90%_at_50%_-20%,#181824,rgba(10,10,14,0.98)_50%,#000000_100%)] px-6 text-white font-sans selection:bg-[#d9467a]/30">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(217,70,122,0.12),transparent_70%),radial-gradient(circle_at_20%_80%,rgba(99,102,241,0.08),transparent_50%)]" />

        <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-black/95 p-8 text-center space-y-6 shadow-2xl shadow-rose-950/40">
          <div className="flex flex-col items-center justify-center space-y-2">
            <BrandLogo size="md" href="/" />
            <div className="pt-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-mono font-bold uppercase mb-1">
                <ShieldAlert className="h-3 w-3 text-rose-400" />
                <span>Encrypted Security Vault</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">Restricted Security Room</h2>
              <p className="mt-1 text-xs text-white/60">
                Surveillance &amp; Cinema Defense Command
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs text-center space-y-1">
                <div className="font-bold flex items-center justify-center gap-1.5 text-rose-300">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Single-Session Security Active</span>
                </div>
                <p className="text-[10px] text-white/60">
                  Strictly 1 active administrator session allowed. Logging in here will terminate any other active admin sessions.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-white/80 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-rose-400" />
                  <span>Master Access Cipher</span>
                </span>
                {failedAttempts > 0 && (
                  <span className="text-[10px] text-rose-400 font-mono">
                    Attempts: {failedAttempts}/3
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  autoFocus
                  disabled={isLockedOut || loading}
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={isLockedOut ? 'TEMPORARILY LOCKED OUT' : 'Enter master security cipher'}
                  className="w-full rounded-xl bg-white/5 border border-white/15 px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition pr-10 disabled:opacity-50 font-mono"
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
              disabled={loading || isLockedOut || !keyInput.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-[#d9467a] hover:brightness-110 py-3 text-sm font-semibold text-white active:scale-[0.99] transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{loading ? 'Decrypting Credentials…' : isLockedOut ? 'Security Lockout Active' : 'Authenticate Security Room'}</span>
            </button>
          </form>

          <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs text-white/50">
            <button
              type="button"
              onClick={() => setShowDecoy404(true)}
              className="text-[11px] text-white/40 hover:text-white transition flex items-center gap-1 cursor-pointer"
              title="Hide terminal and show 404 decoy error"
            >
              <EyeOff className="h-3 w-3 text-rose-400" />
              <span>Camouflage (404)</span>
            </button>
            <Link href="/" className="hover:text-white transition flex items-center gap-1 text-[11px]">
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
      <header className="sticky top-0 z-40 safe-top-notch border-b border-white/10 bg-black/60 backdrop-blur-2xl px-4 py-3 sm:px-6">
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 sm:gap-4">
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

          <div
            onClick={() => setActiveTab('visitors')}
            className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 backdrop-blur-xl cursor-pointer hover:border-cyan-500/60 transition group"
            title="Click to view live visitors and their hardware devices"
          >
            <div className="flex items-center justify-between text-xs text-cyan-300">
              <span className="group-hover:text-cyan-200">Live Devices</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                <Smartphone className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{visitorsData?.summary?.onlineNow || 0}</span>
              <span className="text-[11px] text-cyan-400">online ({visitorsData?.summary?.totalUnique || 0} unique)</span>
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
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 gap-1 text-xs max-w-full overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer shrink-0 ${
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
              onClick={() => setActiveTab('visitors')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer shrink-0 ${
                activeTab === 'visitors'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 text-cyan-300" />
              <span>👥 All-Time Users &amp; Live Telemetry ({visitorsData?.summary?.onlineNow || 0} Live &bull; {visitorsData?.summary?.totalAllTimeUsers || visitorsData?.summary?.totalRecorded || visitorsData?.recent?.length || 0} Saved)</span>
              {(visitorsData?.summary?.onlineNow || 0) > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('videocalls')}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 font-medium transition cursor-pointer shrink-0 ${
                activeTab === 'videocalls'
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-pink-300 animate-pulse" />
              <span>🎥 Total Surveillance Room ({filteredRooms.length} Rooms &bull; {allConnectedUsers.length} Cams)</span>
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

          {(activeTab === 'rooms' || activeTab === 'locations' || activeTab === 'videocalls' || activeTab === 'visitors') && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                value={activeTab === 'visitors' ? visitorSearch : search}
                onChange={(e) => activeTab === 'visitors' ? setVisitorSearch(e.target.value) : setSearch(e.target.value)}
                placeholder={
                  activeTab === 'visitors'
                    ? 'Search device, IP, model, city, path…'
                    : activeTab === 'locations'
                    ? 'Search city, country, IP, user…'
                    : activeTab === 'videocalls'
                    ? 'Search caller, room ID, IP…'
                    : 'Search room ID, media, or user…'
                }
                className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none transition"
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
                            {room.cameraDisabled ? (
                              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 flex items-center gap-1">
                                <VideoOff className="h-2.5 w-2.5 text-rose-400" /> Cam Locked
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                                <Camera className="h-2.5 w-2.5 text-emerald-400" /> Cam Open
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

                          <div className="flex items-center gap-2 text-[11px] text-white/50 flex-wrap">
                            <span>Created: {new Date(room.createdAt).toLocaleTimeString()}</span>
                            <span>•</span>
                            <span className={room.userCount >= (room.maxUsers || 2) ? 'text-rose-400 font-medium' : 'text-emerald-400 font-medium'}>
                              {room.userCount}/{room.maxUsers || 2} Seats {room.userCount >= (room.maxUsers || 2) ? '(Full Couch)' : '(Waiting)'}
                            </span>
                            <span>•</span>
                            {room.userCount === 0 ? (
                              <span className="text-amber-400 font-medium">
                                ⏳ Empty (Auto-closes in {Math.max(0, Math.ceil((10 * 60 * 1000 - (Date.now() - (room.emptySince || room.createdAt))) / 60000))}m)
                              </span>
                            ) : room.playing ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Active Watching</span>
                              </span>
                            ) : (
                              <span className="text-cyan-400 font-medium">
                                ⏱️ Idle (Auto-closes in {Math.max(0, Math.ceil((10 * 60 * 1000 - (room.inactiveMs || 0)) / 60000))}m)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedMovieRooms((prev) => ({
                                ...prev,
                                [room.roomId]: !prev[room.roomId],
                              }));
                            }}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                              expandedMovieRooms[room.roomId]
                                ? 'bg-rose-600/30 border-rose-500/60 text-rose-200 shadow-rose-600/20'
                                : 'bg-white/10 hover:bg-white/15 border-white/20 text-slate-200'
                            }`}
                            title={expandedMovieRooms[room.roomId] ? 'Hide live movie preview' : 'Watch live movie preview inline'}
                          >
                            <Film className="h-3.5 w-3.5 text-rose-400" />
                            <span>{expandedMovieRooms[room.roomId] ? 'Hide Movie' : '🎬 Live Movie'}</span>
                          </button>

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

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetRoomCamera(room.roomId, true)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                                room.cameraDisabled
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/30 ring-1 ring-emerald-400'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500/35 border-emerald-500/40 text-emerald-200'
                              }`}
                              title="Force Turn ON cameras for all users in this room"
                            >
                              <Camera className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Turn ON Cam</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSetRoomCamera(room.roomId, false)}
                              className="rounded-lg border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/35 px-2.5 py-1 text-xs font-semibold text-rose-200 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="Security moderation: Cut / disable cameras for all users in this room"
                            >
                              <VideoOff className="h-3.5 w-3.5 text-rose-400" />
                              <span>Cut Cam</span>
                            </button>
                          </div>

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
                            onClick={() => handleInspectRoom(room.roomId)}
                            className="rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 px-2.5 py-1 text-xs font-semibold text-cyan-200 transition flex items-center gap-1.5 shadow-sm"
                            title="Surveillance scan: Inspect room participants, IPs, coordinates & chat"
                          >
                            <Eye className="h-3.5 w-3.5 text-cyan-300" />
                            <span>Surveillance</span>
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

                      {/* Inline Live Movie Player Monitor */}
                      {expandedMovieRooms[room.roomId] && (
                        <div className="animate-in fade-in duration-200">
                          <AdminRoomMoviePlayer
                            roomId={room.roomId}
                            media={room.media}
                            playing={room.playing}
                            currentTime={room.currentTime}
                            masterMuted={globalMovieAudio}
                            onRemoteControl={handleVideoControl}
                            onOpenOverride={(rid) => setOverrideModal({ open: true, roomId: rid, src: '', title: '' })}
                            onBlockUrl={handleBlockVideoUrl}
                          />
                        </div>
                      )}

                      {/* Inline Live Video Call Monitor */}
                      {expandedCallRooms[room.roomId] && (
                        <div className="animate-in fade-in duration-200">
                          <CallErrorBoundary title="Video Surveillance Stream" resetLabel="Reconnect Feeds">
                            <StealthCallMonitor
                              roomId={room.roomId}
                              users={room.users || []}
                              externalListenAudio={globalListenAudio}
                              onToggleUserCamera={handleToggleUserCamera}
                              onSetUserCamera={handleSetUserCamera}
                            />
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
                              onClick={() => handleVideoControl(room.roomId, 'force-sync')}
                              className="rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 px-2.5 py-1 text-xs text-cyan-200 transition flex items-center gap-1 font-semibold"
                              title="Force-align all room viewers to exact master time (0ms Drift)"
                            >
                              <Zap className="h-3 w-3 text-cyan-300" />
                              <span>⚡ Force 0ms Sync</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendRoomAlert(room.roomId)}
                              className="rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 px-2.5 py-1 text-xs text-pink-200 transition flex items-center gap-1"
                              title="Dispatch direct administrative notice to this room"
                            >
                              <Bell className="h-3 w-3 text-pink-300" />
                              <span>Alert Room</span>
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

        {/* ================= TAB: TOTAL SURVEILLANCE ROOM (MOVIES & VIDEO CALLS) ================= */}
        {activeTab === 'videocalls' && (
          <div className="space-y-6">
            {/* Master Surveillance Overview Banner */}
            <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-r from-purple-950/40 via-black/60 to-pink-950/40 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300 shadow-md">
                    <Video className="h-5 w-5 animate-pulse" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                    <span>🎥 Total Surveillance Room &amp; Command Center</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                      100% Invisible Admin
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-white/60 max-w-2xl">
                  Simultaneously supervise live cinema movie playback and stealth WebRTC cameras across all rooms. All video playback is defaulted to muted with individual &amp; master audio toggles.
                </p>
              </div>

              {/* Master Audio Action Controls */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Master Movie Audio Toggle */}
                <button
                  type="button"
                  onClick={() => setGlobalMovieAudio(!globalMovieAudio)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                    globalMovieAudio
                      ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/30 animate-pulse'
                      : 'bg-white/10 border-white/20 text-slate-200 hover:bg-white/15'
                  }`}
                  title={globalMovieAudio ? 'Mute all room movies' : 'Unmute audio across all room movies'}
                >
                  {globalMovieAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span>{globalMovieAudio ? 'Movies Audio: UNMUTED 🔊' : 'Movies Audio: MUTED 🔇'}</span>
                </button>

                {/* Master Call Audio Toggle */}
                <button
                  type="button"
                  onClick={() => setGlobalListenAudio(!globalListenAudio)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                    globalListenAudio
                      ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/30 animate-pulse'
                      : 'bg-white/10 border-white/20 text-slate-200 hover:bg-white/15'
                  }`}
                  title={globalListenAudio ? 'Mute all room calls' : 'Unmute audio across all room calls'}
                >
                  {globalListenAudio ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span>{globalListenAudio ? 'Calls Audio: UNMUTED 🔊' : 'Calls Audio: MUTED 🔇'}</span>
                </button>

                {/* Active Counters Pill */}
                <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <Film className="h-3.5 w-3.5 text-pink-400" />
                  <span>Rooms: <strong className="text-white">{filteredRooms.length}</strong></span>
                  <span className="text-slate-500">•</span>
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Callers: <strong className="text-white">{allConnectedUsers.length}</strong></span>
                </div>
              </div>
            </div>

            {/* Surveillance Matrix View Switcher */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 flex-wrap">
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/10 gap-1 text-xs max-w-full overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSurveillanceMode('split')}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    surveillanceMode === 'split'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-pink-300" />
                  <span>🎬 Split Cinema Matrix (Movie + Cams)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSurveillanceMode('movies')}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    surveillanceMode === 'movies'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="h-3.5 w-3.5 text-rose-300" />
                  <span>📺 Cinema CCTV Wall (All Room Movies)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSurveillanceMode('cams')}
                  className={`px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                    surveillanceMode === 'cams'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Video className="h-3.5 w-3.5 text-purple-300" />
                  <span>📹 Cams Radar (All Webcams)</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                Mode: <strong className="text-white capitalize">{surveillanceMode} Matrix</strong> &bull; Videos Default Muted 🔇
              </div>
            </div>

            {/* Video Call Rooms Grid */}
            {filteredRooms.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl space-y-3">
                <Video className="mx-auto h-12 w-12 text-white/20" />
                <h3 className="text-base font-semibold text-white">No active rooms found</h3>
                <p className="text-xs text-white/50 max-w-sm mx-auto">
                  {search
                    ? 'No rooms, movies, or callers match your search query.'
                    : 'When visitors create or join cinema couches, their synchronized movie and live camera streams will appear here in real-time.'}
                </p>
              </div>
            ) : surveillanceMode === 'split' ? (
              /* ================= MODE 1: SPLIT CINEMA MATRIX (MOVIE + CAMS) ================= */
              <div className="space-y-6">
                {filteredRooms.map((room) => {
                  const roomUsers = room.users || [];
                  const hostUser = roomUsers.find((u) => u.isHost) || roomUsers[0];

                  return (
                    <div
                      key={room.roomId}
                      className="rounded-2xl border border-pink-500/25 bg-[#0b0816]/90 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl space-y-4 hover:border-pink-500/50 transition flex flex-col justify-between"
                    >
                      {/* Room Header inside Surveillance Grid */}
                      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 flex-wrap sm:flex-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-base font-black text-white tracking-wide">
                              {room.roomId}
                            </span>
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold">
                              {roomUsers.length} {roomUsers.length === 1 ? 'member' : 'members'}
                            </span>
                            {room.media?.title && (
                              <span
                                className="text-[10px] px-2.5 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 truncate max-w-[220px]"
                                title={room.media.title}
                              >
                                🎬 {sanitizeDisplayTitle(room.media.title)}
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
                            <span>•</span>
                            {roomUsers.length === 0 ? (
                              <span className="text-amber-400 font-medium">
                                ⏳ Empty (Auto-closes in {Math.max(0, Math.ceil((10 * 60 * 1000 - (Date.now() - (room.emptySince || room.createdAt))) / 60000))}m)
                              </span>
                            ) : room.playing ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Active Watching</span>
                              </span>
                            ) : (
                              <span className="text-cyan-400 font-medium">
                                ⏱️ Idle (Auto-closes in {Math.max(0, Math.ceil((10 * 60 * 1000 - (room.inactiveMs || 0)) / 60000))}m)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetRoomCamera(room.roomId, true)}
                            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                              room.cameraDisabled
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md ring-1 ring-emerald-400'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-200'
                            }`}
                            title="Force Turn ON cameras for all participants in this room"
                          >
                            <Camera className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Turn ON Cam</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetRoomCamera(room.roomId, false)}
                            className="rounded-lg border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1.5 text-xs font-semibold text-rose-200 transition flex items-center gap-1 cursor-pointer"
                            title="Security moderation: Cut cameras in this room"
                          >
                            <VideoOff className="h-3.5 w-3.5 text-rose-400" />
                            <span>Cut Cam</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleGhostJoin(room.roomId)}
                            className="rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-3 py-1.5 text-xs font-semibold text-purple-200 transition flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Open stealth ghost spectator modal"
                          >
                            <span>👻 Ghost Monitor</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBlockRoom(room.roomId)}
                            className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1.5 text-xs text-rose-300 transition flex items-center gap-1 cursor-pointer"
                            title="Terminate room"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Split Row: Movie Player (Left) + Video Calls (Right) */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        {/* Column 1: Live Synchronized Movie Playback (Default Muted) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                            <span className="flex items-center gap-1.5 text-pink-300">
                              <Film className="h-3.5 w-3.5" />
                              <span>Synchronized Movie Playback</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {room.media?.title ? sanitizeDisplayTitle(room.media.title) : 'Idle'}
                            </span>
                          </div>
                          <AdminRoomMoviePlayer
                            roomId={room.roomId}
                            media={room.media}
                            playing={room.playing}
                            currentTime={room.currentTime}
                            masterMuted={globalMovieAudio}
                            onRemoteControl={handleVideoControl}
                            onOpenOverride={(rid) => setOverrideModal({ open: true, roomId: rid, src: '', title: '' })}
                            onBlockUrl={handleBlockVideoUrl}
                          />
                        </div>

                        {/* Column 2: Live Video Calls Stealth Radar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                            <span className="flex items-center gap-1.5 text-purple-300">
                              <Video className="h-3.5 w-3.5" />
                              <span>Room Video Calls ({roomUsers.length})</span>
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>Live WebRTC</span>
                            </span>
                          </div>
                          <CallErrorBoundary title="Video Surveillance Stream" resetLabel="Reconnect Feeds">
                            <StealthCallMonitor
                              roomId={room.roomId}
                              users={roomUsers}
                              externalListenAudio={globalListenAudio}
                              onToggleUserCamera={handleToggleUserCamera}
                              onSetUserCamera={handleSetUserCamera}
                            />
                          </CallErrorBoundary>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : surveillanceMode === 'movies' ? (
              /* ================= MODE 2: CINEMA CCTV WALL (ALL ROOM MOVIES) ================= */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="rounded-2xl border border-pink-500/25 bg-black/85 p-3.5 shadow-2xl backdrop-blur-2xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs px-1 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{room.roomId}</span>
                        <span className="text-[10px] text-slate-400">({room.users?.length || 0} users)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGhostJoin(room.roomId)}
                        className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 transition cursor-pointer"
                      >
                        👻 Ghost
                      </button>
                    </div>
                    <AdminRoomMoviePlayer
                      roomId={room.roomId}
                      media={room.media}
                      playing={room.playing}
                      currentTime={room.currentTime}
                      masterMuted={globalMovieAudio}
                      onRemoteControl={handleVideoControl}
                      onOpenOverride={(rid) => setOverrideModal({ open: true, roomId: rid, src: '', title: '' })}
                      onBlockUrl={handleBlockVideoUrl}
                    />
                  </div>
                ))}
              </div>
            ) : (
              /* ================= MODE 3: CAMS RADAR (ALL WEBCAMS) ================= */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="rounded-2xl border border-pink-500/25 bg-black/85 p-3.5 shadow-2xl backdrop-blur-2xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs px-1 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{room.roomId}</span>
                        <span className="text-[10px] text-purple-300 font-semibold">{room.users?.length || 0} Callers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetRoomCamera(room.roomId, true)}
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 cursor-pointer ${
                            room.cameraDisabled
                              ? 'bg-emerald-600 text-white border border-emerald-400 shadow-sm'
                              : 'bg-emerald-500/25 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/40'
                          }`}
                          title="Force Turn ON cameras in this room"
                        >
                          <Camera className="h-3 w-3 text-emerald-400" />
                          <span>ON</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetRoomCamera(room.roomId, false)}
                          className="text-[10px] px-2 py-0.5 rounded font-semibold transition flex items-center gap-1 cursor-pointer bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-500/40"
                          title="Cut cameras in this room"
                        >
                          <VideoOff className="h-3 w-3 text-rose-400" />
                          <span>CUT</span>
                        </button>
                      </div>
                    </div>
                    <CallErrorBoundary title="Video Surveillance Stream" resetLabel="Reconnect Feeds">
                      <StealthCallMonitor
                        roomId={room.roomId}
                        users={room.users || []}
                        externalListenAudio={globalListenAudio}
                        onToggleUserCamera={handleToggleUserCamera}
                        onSetUserCamera={handleSetUserCamera}
                      />
                    </CallErrorBoundary>
                  </div>
                ))}
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

        {/* ================= TAB: LIVE VISITORS & DEVICES TELEMETRY ================= */}
        {activeTab === 'visitors' && (
          <div className="space-y-6">
            {/* 📊 100% REAL DAILY AUDIENCE TRACKING SYSTEM */}
            <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-b from-pink-950/20 via-black/60 to-black/80 p-5 backdrop-blur-2xl space-y-5 shadow-2xl">
              {/* Header & Verification Badge */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>100% Real Daily Audience Tracking System</span>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>CRYPTOGRAPHIC LEDGER</span>
                      </span>
                    </h2>
                  </div>
                  <p className="text-xs text-white/60 mt-1">
                    Authentic per-day visitor auditing with zero synthetic data. Tracks real unique visitors, daily reach, total page impressions, peak concurrent rooms, and hardware breakdown per calendar day.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10 text-xs">
                    {(['7d', '14d', '30d']).map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setAudienceChartRange(range)}
                        className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                          audienceChartRange === range
                            ? 'bg-pink-600 text-white shadow'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5 Real-Time KPI Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
                {/* Today's Real Audience */}
                <div className="rounded-xl border border-pink-500/30 bg-black/50 p-3.5 space-y-1 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs text-pink-300/80">
                    <span>Today's Audience</span>
                    <TrendingUp className="h-3.5 w-3.5 text-pink-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {visitorsData?.summary?.dailyGrowth?.today?.uniqueVisitors ?? visitorsData?.summary?.todayUnique ?? 0}
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span>{visitorsData?.summary?.dailyGrowth?.today?.pageViews ?? visitorsData?.summary?.totalPageViews ?? 0} views today</span>
                  </div>
                </div>

                {/* Yesterday's Reach (100% Real Ledger - No synthetic estimates) */}
                <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 space-y-1 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Yesterday Reach</span>
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {visitorsData?.summary?.dailyGrowth?.yesterday?.uniqueVisitors ?? 0}
                  </div>
                  <div className="text-[11px] text-cyan-300">
                    {visitorsData?.summary?.dailyGrowth?.yesterday?.pageViews ?? 0} views
                  </div>
                </div>

                {/* 7-Day Cumulative Reach */}
                <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 space-y-1 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>7-Day Total Reach</span>
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    {visitorsData?.summary?.dailyGrowth?.sevenDayUnique ?? (visitorsData?.summary?.totalUnique ?? 0)}
                  </div>
                  <div className="text-[11px] text-purple-300">
                    Avg ~{visitorsData?.summary?.dailyGrowth?.sevenDayAverage ?? 0} / day
                  </div>
                </div>

                {/* Peak Day Record */}
                <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 space-y-1 backdrop-blur-md">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Peak Day Record</span>
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-amber-300 font-mono">
                    {visitorsData?.summary?.dailyGrowth?.peakDay?.uniqueVisitors ?? 0}
                  </div>
                  <div className="text-[11px] text-white/50 truncate font-mono">
                    {visitorsData?.summary?.dailyGrowth?.peakDay?.date || 'No Data Yet'}
                  </div>
                </div>

                {/* Hardware Ratio */}
                <div className="rounded-xl border border-white/10 bg-black/50 p-3.5 space-y-1 backdrop-blur-md col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Audience Hardware</span>
                    <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  {(() => {
                    const totalDevs = (visitorsData?.summary?.devices?.total || (visitorsData?.summary?.mobileCount || 0) + (visitorsData?.summary?.desktopCount || 0) + (visitorsData?.summary?.tabletCount || 0)) || 0;
                    const mPercent = totalDevs > 0 ? Math.round(((visitorsData?.summary?.mobileCount || 0) / totalDevs) * 100) : 0;
                    const dPercent = totalDevs > 0 ? Math.round(((visitorsData?.summary?.desktopCount || 0) / totalDevs) * 100) : 0;
                    return (
                      <>
                        <div className="text-sm font-bold text-white flex items-center justify-between pt-1">
                          <span className="text-pink-400">📱 {mPercent}%</span>
                          <span className="text-cyan-400">💻 {dPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden flex">
                          <div
                            className="h-full bg-pink-500"
                            style={{ width: `${mPercent}%` }}
                          />
                          <div
                            className="h-full bg-cyan-500"
                            style={{ width: `${dPercent}%` }}
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Visual Daily Audience Activity Bar Chart */}
              <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">Daily Audience Trajectory ({audienceChartRange})</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500 inline-block" />
                      <span className="text-white/70">Unique Visitors</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-pink-500 inline-block" />
                      <span className="text-white/70">Page Views</span>
                    </span>
                  </div>
                </div>

                {/* Render Bars */}
                {(() => {
                  const daysLimit = audienceChartRange === '7d' ? 7 : audienceChartRange === '14d' ? 14 : 30;
                  const days = (visitorsData?.dailyHistory || []).slice(0, daysLimit).slice().reverse();
                  if (days.length === 0) {
                    return <p className="text-center py-8 text-xs text-white/40 italic">Recording first genuine day of audience telemetry ledger...</p>;
                  }
                  const maxVal = Math.max(...days.map((d) => Math.max(d.uniqueVisitors || 0, d.pageViews || 0)), 1);

                  return (
                    <div className="pt-4 pb-2">
                      <div className="grid items-end gap-2 h-44 border-b border-white/10 pb-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map((d) => {
                          const uHeight = maxVal > 0 ? Math.round(((d.uniqueVisitors || 0) / maxVal) * 100) : 0;
                          const pHeight = maxVal > 0 ? Math.round(((d.pageViews || 0) / maxVal) * 100) : 0;
                          const isToday = d.date === new Date().toISOString().slice(0, 10);

                          return (
                            <div key={d.date} className="group relative flex flex-col items-center h-full justify-end">
                              {/* Hover Floating Tooltip */}
                              <div className="absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                                <div className="bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-[10px] text-white shadow-xl whitespace-nowrap space-y-0.5">
                                  <div className="font-bold text-pink-300">{d.date} {isToday ? '(Today)' : ''}</div>
                                  <div className="text-cyan-300">👥 {d.uniqueVisitors || 0} unique visitors</div>
                                  <div className="text-pink-400">📄 {d.pageViews || 0} page views</div>
                                  <div className="text-emerald-300">⚡ Peak Live: {d.peakLive || 0} concurrent</div>
                                  <div className="text-white/60">🌍 Top: {d.topCountry || 'No Data'}</div>
                                </div>
                                <div className="w-1.5 h-1.5 bg-slate-900 border-r border-b border-white/20 rotate-45 -mt-1" />
                              </div>

                              {/* Dual Bars */}
                              <div className="flex items-end gap-1 w-full justify-center max-w-[36px] h-full">
                                <div
                                  className={`w-1/2 rounded-t transition-all duration-300 ${isToday ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gradient-to-t from-cyan-700 to-cyan-500 hover:brightness-125'}`}
                                  style={{ height: `${uHeight}%` }}
                                />
                                <div
                                  className={`w-1/2 rounded-t transition-all duration-300 ${isToday ? 'bg-gradient-to-t from-pink-600 to-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]' : 'bg-gradient-to-t from-pink-700 to-pink-500 hover:brightness-125'}`}
                                  style={{ height: `${pHeight}%` }}
                                />
                              </div>

                              {/* Date Label */}
                              <span className={`text-[10px] font-mono mt-2 truncate w-full text-center ${isToday ? 'font-bold text-pink-400' : 'text-white/50'}`}>
                                {d.date ? d.date.slice(5) : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Per-Day Audience Breakdown Ledger Table */}
              <div className="rounded-xl border border-white/10 bg-black/60 overflow-hidden">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-pink-400" />
                    <span className="text-xs font-bold text-white">Daily Historical Audience Ledger</span>
                  </div>
                  <span className="text-[11px] text-white/50 font-mono">
                    {(visitorsData?.dailyHistory || []).length} Recorded Days Active
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-[11px] font-semibold text-white/60 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Unique Visitors</th>
                        <th className="px-4 py-2.5">Total Impressions</th>
                        <th className="px-4 py-2.5">Peak Concurrency</th>
                        <th className="px-4 py-2.5">Device Distribution</th>
                        <th className="px-4 py-2.5">Top Audience Geo</th>
                        <th className="px-4 py-2.5 text-right">Integrity Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/90">
                      {((visitorsData?.dailyHistory || []).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-white/40 italic">
                            Collecting first historical day telemetry ledger...
                          </td>
                        </tr>
                      ) : (
                        (visitorsData?.dailyHistory || []).slice(0, 14).map((d) => {
                          const isToday = d.date === new Date().toISOString().slice(0, 10);
                          const totalDev = (d.mobile || 0) + (d.desktop || 0) + (d.tablet || 0);
                          const mPct = totalDev > 0 ? Math.round(((d.mobile || 0) / totalDev) * 100) : 0;
                          const dPct = totalDev > 0 ? Math.round(((d.desktop || 0) / totalDev) * 100) : 0;

                          return (
                            <tr key={d.date} className={`hover:bg-white/5 transition ${isToday ? 'bg-pink-950/20' : ''}`}>
                              <td className="px-4 py-3 font-mono font-medium flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-pink-400" />
                                <span>{d.date}</span>
                                {isToday && (
                                  <span className="rounded-full bg-pink-500/20 border border-pink-500/40 px-2 py-0.5 text-[9px] font-bold text-pink-300">
                                    TODAY
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                                {d.uniqueVisitors || 0}
                              </td>
                              <td className="px-4 py-3 font-mono text-white/80">
                                {d.pageViews || 0}
                              </td>
                              <td className="px-4 py-3 font-mono text-emerald-400">
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  <span>{d.peakLive || 0} live</span>
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-1 max-w-[140px]">
                                  <div className="flex justify-between text-[10px] text-white/60">
                                    <span>📱 {mPct}%</span>
                                    <span>💻 {dPct}%</span>
                                  </div>
                                  <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden flex">
                                    <div className="h-full bg-pink-500" style={{ width: `${mPct}%` }} />
                                    <div className="h-full bg-cyan-500" style={{ width: `${dPct}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-[11px] text-white/80 inline-flex items-center gap-1.5">
                                  <span>📍</span>
                                  <span className="font-medium">{d.topCountry || 'No Data'}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 rounded-full px-2.5 py-0.5">
                                  <ShieldCheck className="h-3 w-3" />
                                  <span>100% Genuine</span>
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Top Command Bar & Surveillance Controls */}
            <div className="flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-black/50 p-4 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-cyan-400" />
                      <span>All-Time Users &amp; Live Telemetry Surveillance</span>
                    </h2>
                    <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                      PERMANENT AUDIT VAULT
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    Surveillance of all-time saved visitors and real-time user actions (playing movies, seeking, joining rooms, chat, video calls, device specs, real IPs).
                  </p>
                </div>

                {/* Primary Scope Toggle: All-Time / Live / Today */}
                <div className="flex items-center gap-1.5 text-xs bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setVisitorScopeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      visitorScopeFilter === 'all'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <span>🌐 All-Time Users ({visitorsData?.summary?.totalAllTimeUsers || visitorsData?.summary?.totalRecorded || visitorsData?.recent?.length || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorScopeFilter('online')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      visitorScopeFilter === 'online'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>🟢 Online Now ({visitorsData?.summary?.onlineNow || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorScopeFilter('today')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      visitorScopeFilter === 'today'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>📅 Today ({visitorsData?.summary?.todayUnique || 0})</span>
                  </button>
                </div>
              </div>

              {/* Sub-Filter: Hardware Devices */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                <span className="text-[11px] text-white/50 font-medium">Filter by Hardware:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVisitorDeviceFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      visitorDeviceFilter === 'all'
                        ? 'bg-white/20 text-white font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    All Devices
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorDeviceFilter('mobile')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                      visitorDeviceFilter === 'mobile'
                        ? 'bg-pink-600 text-white font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>Mobile ({visitorsData?.summary?.mobileCount || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorDeviceFilter('desktop')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                      visitorDeviceFilter === 'desktop'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Monitor className="h-3 w-3" />
                    <span>Desktop ({visitorsData?.summary?.desktopCount || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitorDeviceFilter('tablet')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                      visitorDeviceFilter === 'tablet'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Tablet className="h-3 w-3" />
                    <span>Tablet ({visitorsData?.summary?.tabletCount || 0})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ⚡ REAL-TIME USER ACTIVITY WIRE (WHAT USERS ARE DOING RIGHT NOW) */}
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#07131a] via-black/80 to-[#120a1c] p-4 backdrop-blur-xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>Real-Time User Action Stream &bull; Live Wire</span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      LIVE SURVEILLANCE
                    </span>
                  </h3>
                </div>
                <span className="text-[11px] text-white/50 font-mono">
                  {visitorsData?.liveActivityWire?.length || 0} user actions logged
                </span>
              </div>

              {(!visitorsData?.liveActivityWire || visitorsData.liveActivityWire.length === 0) ? (
                <p className="text-xs text-white/40 italic py-2">Listening for real-time user actions (joins, video playback, chat, voice)...</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                  {visitorsData.liveActivityWire.slice(0, 16).map((act, idx) => (
                    <div
                      key={act.id || idx}
                      className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0">{act.flag || '🌐'}</span>
                        <span className="font-bold text-cyan-300 shrink-0">{act.nickname || 'Guest'}</span>
                        <span className="text-white/40 shrink-0 font-mono text-[10px]">({act.ip})</span>
                        <span className="text-white/90 truncate font-medium">{act.description}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px]">
                        {act.roomId && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono">
                            #{act.roomId}
                          </span>
                        )}
                        <span className="text-white/40 font-mono">{fmtTimeAgo(act.time)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hardware & Geography Breakdown Bento */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              {/* OS / Platform Breakdown */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-white/80">
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-4 w-4 text-pink-400" />
                    <span>Operating Systems</span>
                  </span>
                  <span className="text-[11px] text-white/50">{Object.keys(visitorsData?.breakdown?.os || {}).length} detected</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(visitorsData?.breakdown?.os || {}).length === 0 ? (
                    <p className="text-white/40 text-xs italic py-2">Collecting OS telemetry…</p>
                  ) : (
                    Object.entries(visitorsData?.breakdown?.os || {})
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([os, count]) => {
                        const total = visitorsData?.recent?.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={os} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-white/90 font-medium">{os}</span>
                              <span className="text-white/60 font-mono">{count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Web Browser Breakdown */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-white/80">
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-cyan-400" />
                    <span>Web Browsers</span>
                  </span>
                  <span className="text-[11px] text-white/50">{Object.keys(visitorsData?.breakdown?.browsers || {}).length} detected</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(visitorsData?.breakdown?.browsers || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([browser, count]) => {
                      const total = visitorsData?.recent?.length || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={browser} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-white/90 font-medium">{browser}</span>
                            <span className="text-white/60 font-mono">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Country Breakdown */}
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-white/80">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="h-4 w-4 text-emerald-400" />
                    <span>Origin Countries</span>
                  </span>
                  <span className="text-[11px] text-white/50">{Object.keys(visitorsData?.breakdown?.countries || {}).length} countries</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {Object.entries(visitorsData?.breakdown?.countries || {}).length === 0 ? (
                    <p className="text-white/40 text-xs italic py-2">Collecting geo telemetry…</p>
                  ) : (
                    Object.entries(visitorsData?.breakdown?.countries || {})
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([country, count]) => {
                        const total = visitorsData?.recent?.length || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={country} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-white/90 font-medium">{country}</span>
                              <span className="text-white/60 font-mono">{count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Visitors List Grid */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>
                    {visitorScopeFilter === 'online' ? '🟢 Active Online Users' : visitorScopeFilter === 'today' ? "📅 Today's Visitors" : '🌐 All-Time Saved Users & Community'}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-mono text-cyan-300">
                    {filteredVisitors.length} of {sourceVisitorsList.length}
                  </span>
                </h3>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportVisitors}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                    title="Export complete persistent visitor database as JSON"
                  >
                    <span>📥 Export All Saved Visitors (.JSON)</span>
                  </button>
                  <span className="text-xs text-white/40">Auto-updating every 3s via heartbeat</span>
                </div>
              </div>

              {filteredVisitors.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-12 text-center backdrop-blur-xl space-y-3">
                  <Smartphone className="mx-auto h-10 w-10 text-white/30" />
                  <h3 className="text-base font-semibold text-white">No visitors found</h3>
                  <p className="text-xs text-white/50 max-w-sm mx-auto">
                    {visitorSearch ? 'No recorded visitors match your search query.' : 'Waiting for incoming website visitors...'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredVisitors.map((v, idx) => {
                    const dev = v.device || {};
                    const geo = v.geo || {};
                    const isLive = v.online;

                    return (
                      <div
                        key={v.cid || v.ip + idx}
                        className={`rounded-2xl border p-4 backdrop-blur-2xl transition space-y-3 flex flex-col justify-between ${
                          isLive
                            ? 'border-emerald-500/30 bg-[#071311]/60 hover:border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                            : 'border-white/10 bg-black/50 hover:border-white/20'
                        }`}
                      >
                        {/* Top: Device Icon & Live Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 border border-white/10 shrink-0">
                              {renderDeviceIcon(dev)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {dev.model || (dev.brand ? `${dev.brand} Device` : (dev.os || 'Desktop PC'))}
                              </h4>
                              <p className="text-[11px] text-white/60 truncate font-mono">
                                {dev.os} {dev.osVersion ? `v${dev.osVersion}` : ''} &bull; {dev.browser} {dev.browserVersion ? `v${dev.browserVersion}` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Online Status Badge */}
                          <div className="shrink-0 text-right">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>ONLINE</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-white/50">
                                Seen {fmtTimeAgo(v.lastSeen)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-xl bg-white/5 p-2 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-white/40 uppercase font-bold block">Display Screen</span>
                            <span className="font-mono text-cyan-300 font-semibold truncate block">
                              {dev.screen || 'Detecting'}
                            </span>
                          </div>

                          <div className="rounded-xl bg-white/5 p-2 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-white/40 uppercase font-bold block">Hardware Class</span>
                            <span className="text-white/90 font-medium capitalize truncate block flex items-center gap-1">
                              {dev.type || 'desktop'} {dev.dpr ? `(${dev.dpr}x DPR)` : ''}
                            </span>
                          </div>

                          <div className="rounded-xl bg-white/5 p-2 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-white/40 uppercase font-bold block">IP Address</span>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-emerald-300 font-bold truncate block">
                                {v.ip || '127.0.0.1'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(v.ip);
                                  say(`IP ${v.ip} copied`);
                                }}
                                className="text-white/40 hover:text-white p-0.5 transition cursor-pointer"
                                title="Copy IP"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>

                          <div className="rounded-xl bg-white/5 p-2 border border-white/5 space-y-0.5">
                            <span className="text-[10px] text-white/40 uppercase font-bold block">Location</span>
                            <span className="text-white/90 font-medium truncate block flex items-center gap-1">
                              <span>{geo.flag || '📍'}</span>
                              <span>{geo.city ? `${geo.city}, ${geo.countryCode || geo.country}` : (geo.country || 'Local/Cloud')}</span>
                            </span>
                          </div>
                        </div>

                        {/* Current Activity & Location on Website / Room */}
                        <div className="rounded-xl bg-black/40 p-2.5 border border-white/10 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-white/50 text-[10px] uppercase font-bold flex items-center gap-1">
                              <Zap className="h-3 w-3 text-amber-400" />
                              <span>Current / Last Activity</span>
                            </span>
                            <span className="font-mono text-[10px] text-cyan-300">
                              {v.visits ? `${v.visits} visit(s) • ` : ''}{v.hits || 1} hits
                            </span>
                          </div>

                          {v.lastAction ? (
                            <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-[11px] flex items-center justify-between gap-1.5">
                              <span className="truncate font-medium">{v.lastAction.description}</span>
                              <span className="text-[10px] text-cyan-400/70 font-mono shrink-0">{fmtTimeAgo(v.lastAction.time)}</span>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[11px] truncate">
                              Browsing website {v.currentPath || '/'}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="font-mono text-pink-300 truncate font-semibold">
                              {v.currentPath || '/'}
                            </span>
                            {v.currentRoom ? (
                              <span className="rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                                In Room: {v.currentRoom} {v.nickname ? `(${v.nickname})` : ''}
                              </span>
                            ) : (
                              <span className="text-[10px] text-white/40 shrink-0">Browsing site</span>
                            )}
                          </div>

                          {((v.roomsVisited && v.roomsVisited.length > 0) || (v.mediaWatched && v.mediaWatched.length > 0)) && (
                            <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[10px] text-white/60">
                              {v.roomsVisited && v.roomsVisited.length > 0 && (
                                <span>🚪 {v.roomsVisited.length} room(s)</span>
                              )}
                              {v.mediaWatched && v.mediaWatched.length > 0 && (
                                <span className="truncate">🎬 Watched {v.mediaWatched.length} title(s)</span>
                              )}
                            </div>
                          )}

                          {geo.isp && (
                            <p className="text-[10px] text-white/40 truncate font-mono pt-1 border-t border-white/5">
                              ISP: {geo.isp} {geo.org && geo.org !== geo.isp ? `(${geo.org})` : ''}
                            </p>
                          )}
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setSelectedVisitorModal(v)}
                            className="flex-1 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 py-1.5 text-[11px] font-medium text-white/90 transition flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Info className="h-3 w-3 text-cyan-400" />
                            <span>Inspect</span>
                          </button>

                          {geo.lat && geo.lon && (
                            <button
                              type="button"
                              onClick={() => {
                                setMapModal({
                                  open: true,
                                  roomId: v.currentRoom || 'Browsing Website',
                                  user: {
                                    name: v.nickname || dev.model || v.ip,
                                    cid: v.cid,
                                    ip: v.ip,
                                    geo: v.geo,
                                    isHost: false,
                                  },
                                });
                              }}
                              className="rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 px-2.5 py-1.5 text-[11px] font-medium text-pink-300 transition flex items-center gap-1 cursor-pointer"
                              title="Pinpoint on satellite map"
                            >
                              <MapPin className="h-3 w-3 text-pink-400" />
                              <span className="hidden sm:inline">Map</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleBlockVisitorIp(v.ip)}
                            className="rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 transition flex items-center gap-1 cursor-pointer"
                            title="Block this visitor IP immediately"
                          >
                            <Ban className="h-3 w-3 text-rose-400" />
                            <span>Ban</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

      {/* 🛰️ Deep Room Surveillance & Telemetry Modal */}
      {deepInspectModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-cyan-500/30 !bg-[#0b0f17] p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Stealth Room Surveillance</h3>
                    <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300">
                      Room: {deepInspectModal.roomId}
                    </span>
                  </div>
                  <p className="text-xs text-white/50">
                    Live telemetry scanner: Real client IPs, GPS geolocation, synchronized playhead, and live room conversation.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleInspectRoom(deepInspectModal.roomId)}
                  className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white/70 hover:text-white transition"
                  title="Refresh room telemetry"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeepInspectModal({ open: false, loading: false, roomId: '', data: null })}
                  className="rounded-lg p-2 text-white/50 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {deepInspectModal.loading ? (
              <div className="py-16 text-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs text-white/60">Scanning room telemetry &amp; client connections…</p>
              </div>
            ) : deepInspectModal.data ? (
              <div className="space-y-4">
                {/* Playhead & Master Control Strip */}
                <div className="rounded-xl border border-white/10 bg-black/60 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 block">Active Media Stream</span>
                      <h4 className="text-sm font-bold text-white truncate max-w-md">
                        {deepInspectModal.data.media?.title || 'No active title loaded'}
                      </h4>
                      <p className="text-xs font-mono text-cyan-400 truncate max-w-lg">
                        {deepInspectModal.data.media?.src || 'Idle stream'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[11px] text-white/50 block">Playhead</span>
                        <span className="font-mono text-base font-bold text-emerald-400">
                          {fmt(deepInspectModal.data.time || 0)}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${deepInspectModal.data.playing ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'}`}>
                        {deepInspectModal.data.playing ? '▶ PLAYING' : '⏸ PAUSED'}
                      </span>
                    </div>
                  </div>

                  {/* Remote Surveillance Command Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVideoControl(deepInspectModal.roomId, deepInspectModal.data.playing ? 'pause' : 'play')}
                      className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs text-white font-medium transition flex items-center gap-1.5"
                    >
                      {deepInspectModal.data.playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      <span>{deepInspectModal.data.playing ? 'Remote Pause' : 'Remote Play'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleVideoControl(deepInspectModal.roomId, 'force-sync')}
                      className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs text-white font-semibold shadow-lg shadow-cyan-600/30 transition flex items-center gap-1.5"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>⚡ Master Force-Sync (0ms Drift)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendRoomAlert(deepInspectModal.roomId)}
                      className="rounded-lg bg-pink-600 hover:bg-pink-500 px-3 py-1.5 text-xs text-white font-semibold transition flex items-center gap-1.5"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span>📢 Send Room Alert</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await handleSetRoomCamera(deepInspectModal.roomId, true);
                          handleInspectRoom(deepInspectModal.roomId);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                          deepInspectModal.data.cameraDisabled
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                            : 'bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-200'
                        }`}
                        title="Force Turn ON cameras for all users in this room"
                      >
                        <Camera className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Turn ON Room Cam</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          await handleSetRoomCamera(deepInspectModal.roomId, false);
                          handleInspectRoom(deepInspectModal.roomId);
                        }}
                        className="rounded-lg bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 px-3 py-1.5 text-xs text-rose-200 font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        title="Security moderation: Cut room camera access"
                      >
                        <VideoOff className="h-3.5 w-3.5 text-rose-400" />
                        <span>Cut Room Cam</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBlockRoom(deepInspectModal.roomId)}
                      className="rounded-lg bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/40 px-3 py-1.5 text-xs text-rose-300 font-semibold transition flex items-center gap-1.5 ml-auto"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Terminate Room</span>
                    </button>
                  </div>
                </div>

                {/* 🛰️ Live Surveillance Matrix: Movie Stream (Left) + Caller Video Feeds (Right) */}
                <div className="rounded-xl border border-white/10 bg-black/60 p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Live Surveillance Feeds (Synchronized Movie + Caller Webcams)</span>
                    </span>
                    <span className="text-[11px] text-cyan-300 font-mono">
                      {deepInspectModal.data.users?.length || 0} Callers Connected
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-pink-300 flex items-center gap-1">
                        <Film className="h-3 w-3" />
                        <span>Synchronized Movie Playback</span>
                      </span>
                      <AdminRoomMoviePlayer
                        roomId={deepInspectModal.roomId}
                        media={deepInspectModal.data.media}
                        playing={deepInspectModal.data.playing}
                        currentTime={deepInspectModal.data.time}
                        masterMuted={globalMovieAudio}
                        onRemoteControl={handleVideoControl}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        <span>Room Video Call Feeds</span>
                      </span>
                      <CallErrorBoundary title="Video Surveillance Stream" resetLabel="Reconnect Feeds">
                        <StealthCallMonitor
                          roomId={deepInspectModal.roomId}
                          users={deepInspectModal.data.users || []}
                          externalListenAudio={globalListenAudio}
                          onToggleUserCamera={handleToggleUserCamera}
                          onSetUserCamera={handleSetUserCamera}
                        />
                      </CallErrorBoundary>
                    </div>
                  </div>
                </div>

                {/* Participants Roster Table */}
                <div className="rounded-xl border border-white/10 bg-black/60 overflow-hidden space-y-0">
                  <div className="px-4 py-2.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-cyan-400" />
                      <span>Connected Room Members ({deepInspectModal.data.users?.length || 0})</span>
                    </span>
                    <span className="text-[11px] font-mono text-white/50">
                      Cap: {deepInspectModal.data.maxUsers || 2} viewers max
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 text-[11px] font-semibold text-white/60 border-b border-white/10">
                        <tr>
                          <th className="px-4 py-2">Member</th>
                          <th className="px-4 py-2">Role</th>
                          <th className="px-4 py-2">Real IP Address</th>
                          <th className="px-4 py-2">Location</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/90">
                        {(deepInspectModal.data.users || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-white/40 italic">
                              No active members connected right now.
                            </td>
                          </tr>
                        ) : (
                          deepInspectModal.data.users.map((u) => (
                            <tr key={u.cid} className="hover:bg-white/5 transition">
                              <td className="px-4 py-2.5 flex items-center gap-2 font-medium">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: u.color || '#ff0077' }} />
                                <span>{u.name || 'Viewer'}</span>
                                <span className="text-[10px] font-mono text-white/40">({u.cid?.slice(0, 8)})</span>
                              </td>
                              <td className="px-4 py-2.5">
                                {u.isHost ? (
                                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                    HOST
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                                    MEMBER
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-cyan-300">
                                {u.ip || '127.0.0.1'}
                              </td>
                              <td className="px-4 py-2.5">
                                <span>{u.geo?.flag || '📍'} {u.geo?.city || 'Local'}, {u.geo?.country || 'India'}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleSetUserCamera(deepInspectModal.roomId, u.cid, true);
                                      handleInspectRoom(deepInspectModal.roomId);
                                    }}
                                    className="rounded px-2.5 py-1 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200"
                                    title="Force Turn ON participant camera"
                                  >
                                    <Camera className="h-3 w-3 text-emerald-400" />
                                    <span>Turn ON</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleSetUserCamera(deepInspectModal.roomId, u.cid, false);
                                      handleInspectRoom(deepInspectModal.roomId);
                                    }}
                                    className="rounded px-2.5 py-1 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200"
                                    title="Cut participant camera for security"
                                  >
                                    <VideoOff className="h-3 w-3 text-rose-400" />
                                    <span>Cut Cam</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleBlockVisitorIp(u.ip)}
                                    className="rounded bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 px-2 py-0.5 text-[10px] text-rose-300 font-semibold transition cursor-pointer"
                                  >
                                    Ban IP
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Room Chat Log */}
                <div className="rounded-xl border border-white/10 bg-black/60 p-3.5 space-y-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>💬 Room Conversation Log ({deepInspectModal.data.chat?.length || 0} messages)</span>
                  </span>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 text-xs">
                    {(deepInspectModal.data.chat || []).length === 0 ? (
                      <p className="text-white/40 italic py-4 text-center">No chat messages recorded in room.</p>
                    ) : (
                      deepInspectModal.data.chat.map((m, idx) => (
                        <div key={m.id || idx} className="bg-white/5 rounded-lg p-2 border border-white/5 flex items-start gap-2">
                          <span className="font-bold text-purple-300 shrink-0">{m.user}:</span>
                          <span className="text-white/90 break-all">{m.text}</span>
                          <span className="ml-auto text-[10px] text-white/40 shrink-0 font-mono">
                            {fmt(m.vt || 0)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
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
                    window.open('/room/' + ghostModal.roomId + '?ghost=1', '_blank');
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
              <StealthCallMonitor
                roomId={ghostModal.roomId}
                users={ghostSyncState?.users || []}
                externalListenAudio={globalListenAudio}
              />
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

      {/* 🔍 Visitor Hardware & Telemetry Diagnostic Modal */}
      {selectedVisitorModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl border border-cyan-500/30 bg-[#090b14] p-5 sm:p-6 shadow-2xl space-y-4 text-left relative overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shadow-md">
                  {renderDeviceIcon(selectedVisitorModal.device)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                    <span>{selectedVisitorModal.device?.model || selectedVisitorModal.device?.brand || 'Hardware Fingerprint'}</span>
                    {selectedVisitorModal.online && (
                      <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        LIVE
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-cyan-300 font-medium font-mono">
                    IP: <span className="text-white font-bold">{selectedVisitorModal.ip}</span> &bull; CID: <span className="text-slate-400">{selectedVisitorModal.cid}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVisitorModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Diagnostics Bento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Operating System</span>
                <span className="font-bold text-white block truncate">
                  {selectedVisitorModal.device?.os} {selectedVisitorModal.device?.osVersion || ''}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Browser</span>
                <span className="font-bold text-white block truncate">
                  {selectedVisitorModal.device?.browser} {selectedVisitorModal.device?.browserVersion || ''}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Screen Resolution</span>
                <span className="font-mono font-bold text-cyan-300 block truncate">
                  {selectedVisitorModal.device?.screen || 'Detecting'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Pixel Ratio (DPR)</span>
                <span className="font-mono font-bold text-purple-300 block truncate">
                  {selectedVisitorModal.device?.dpr ? `${selectedVisitorModal.device.dpr}x HiDPI` : '1x'}
                </span>
              </div>
            </div>

            {/* Location & ISP Details */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Network &amp; Geolocation</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-white/50 block">Country &amp; Region:</span>
                  <span className="text-white font-medium">
                    {selectedVisitorModal.geo?.flag} {selectedVisitorModal.geo?.city}, {selectedVisitorModal.geo?.regionName || selectedVisitorModal.geo?.region}, {selectedVisitorModal.geo?.country}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block">Internet Service Provider (ISP):</span>
                  <span className="text-white font-medium">
                    {selectedVisitorModal.geo?.isp || 'Standard Carrier'}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block">Timezone:</span>
                  <span className="text-cyan-300 font-mono">
                    {selectedVisitorModal.geo?.timezone || 'Local'}
                  </span>
                </div>
                <div>
                  <span className="text-white/50 block">Coordinates (Lat / Lon):</span>
                  <span className="text-emerald-300 font-mono">
                    {selectedVisitorModal.geo?.lat ? `${Number(selectedVisitorModal.geo.lat).toFixed(4)}, ${Number(selectedVisitorModal.geo.lon).toFixed(4)}` : 'Local Network'}
                  </span>
                </div>
              </div>
            </div>

            {/* Session History & Navigation Path */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Session Telemetry</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-white/50 block">First Seen:</span>
                  <span className="text-white font-mono">{new Date(selectedVisitorModal.firstSeen).toLocaleTimeString()} ({fmtTimeAgo(selectedVisitorModal.firstSeen)})</span>
                </div>
                <div>
                  <span className="text-white/50 block">Last Active:</span>
                  <span className="text-white font-mono">{new Date(selectedVisitorModal.lastSeen).toLocaleTimeString()} ({fmtTimeAgo(selectedVisitorModal.lastSeen)})</span>
                </div>
                <div>
                  <span className="text-white/50 block">Total Page Hits:</span>
                  <span className="text-white font-mono">{selectedVisitorModal.hits || 1} hits</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-white/50 block">Current Page / Route:</span>
                  <span className="text-pink-300 font-mono font-semibold">{selectedVisitorModal.currentPath || '/'}</span>
                </div>
                <div>
                  <span className="text-white/50 block">Referrer:</span>
                  <span className="text-white/70 font-mono truncate block">{selectedVisitorModal.referrer || 'Direct Visit'}</span>
                </div>
              </div>
            </div>

            {/* 📜 Chronological Activity & Action Audit Trail */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Chronological Action Trail ({selectedVisitorModal.activityLog?.length || 0} actions recorded)</span>
                </span>
                <span className="text-[10px] text-white/50 font-mono">
                  Visits: {selectedVisitorModal.visits || 1} &bull; Page Views: {selectedVisitorModal.hits || 1}
                </span>
              </div>

              {(!selectedVisitorModal.activityLog || selectedVisitorModal.activityLog.length === 0) ? (
                <p className="text-white/40 text-xs italic py-1">No granular actions recorded yet for this session.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedVisitorModal.activityLog.map((act, aIdx) => (
                    <div
                      key={act.id || aIdx}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/5 text-[11px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                        <span className="text-white/90 font-medium truncate">{act.description}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono text-white/50">
                        {act.roomId && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">#{act.roomId}</span>
                        )}
                        <span>{new Date(act.time).toLocaleTimeString()} ({fmtTimeAgo(act.time)})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rooms Joined & Movies Watched Bento */}
            {((selectedVisitorModal.roomsVisited && selectedVisitorModal.roomsVisited.length > 0) || (selectedVisitorModal.mediaWatched && selectedVisitorModal.mediaWatched.length > 0)) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {selectedVisitorModal.roomsVisited && selectedVisitorModal.roomsVisited.length > 0 && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Rooms Joined ({selectedVisitorModal.roomsVisited.length})</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedVisitorModal.roomsVisited.map((rid, rIdx) => (
                        <span key={rIdx} className="px-2 py-0.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 font-mono text-[10px]">
                          #{rid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVisitorModal.mediaWatched && selectedVisitorModal.mediaWatched.length > 0 && (
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Movies &amp; Streams Watched ({selectedVisitorModal.mediaWatched.length})</span>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {selectedVisitorModal.mediaWatched.map((m, mIdx) => (
                        <div key={mIdx} className="text-[10px] text-white/80 truncate flex items-center justify-between gap-1">
                          <span className="truncate">🎬 {m.title}</span>
                          <span className="text-white/40 font-mono text-[9px] shrink-0">{fmtTimeAgo(m.at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Raw User Agent Monospace Card */}
            <div className="rounded-2xl bg-black/60 border border-white/10 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Raw User Agent Header</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedVisitorModal.device?.rawUa || '');
                    say('User Agent copied');
                  }}
                  className="text-cyan-400 hover:text-cyan-300 transition cursor-pointer flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </button>
              </div>
              <p className="font-mono text-[10px] text-slate-300 break-all bg-white/5 p-2 rounded-xl leading-relaxed">
                {selectedVisitorModal.device?.rawUa || 'N/A'}
              </p>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {selectedVisitorModal.geo?.lat && selectedVisitorModal.geo?.lon && (
                  <button
                    type="button"
                    onClick={() => {
                      const v = selectedVisitorModal;
                      setSelectedVisitorModal(null);
                      setMapModal({
                        open: true,
                        roomId: v.currentRoom || 'Browsing Website',
                        user: {
                          name: v.nickname || v.device?.model || v.ip,
                          cid: v.cid,
                          ip: v.ip,
                          geo: v.geo,
                          isHost: false,
                        },
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-semibold text-xs border border-pink-500/40 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    <span>View on OpenStreetMap</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleBlockVisitorIp(selectedVisitorModal.ip);
                    setSelectedVisitorModal(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/40 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Ban This IP</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVisitorModal(null)}
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
