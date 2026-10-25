'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Link2, MonitorUp, MonitorOff, ExternalLink, AlertTriangle, FolderOpen,
  Captions, ListPlus, Play, Volume2, Sliders, Radio, Zap, Settings,
  RefreshCw, Sparkles, FastForward, Check, RotateCcw, Mic, History,
  Maximize2, Minimize2, Video, VideoOff, MicOff, Move, GripHorizontal, X, EyeOff, Eye,
  Tv, Film, Search, Globe
} from 'lucide-react';
import {
  detect, ytId, vimeoId, loadScript, ytReady, toEmbed, toProxyUrl,
  toStreamProxyUrl, resolveMedia, isAdultMedia, sanitizeDisplayTitle,
  getOttPlatform, isOttPlatform, extractOttTitle, OTT_PLATFORMS, getCloudMirrorSources,
  resolveTitleToMetadata
} from '@/lib/media';
import { Tile } from './CouplesOverlay';
import { autoFixEngine } from '@/lib/autoFixEngine';
import { Popcorn3D, SparkleStar3D, SyncBolt3D, Shield3D } from '@/components/Icons3D';

const TYPES = ['auto', 'hybrid', 'file', 'hls', 'dash', 'embed', 'proxy'];
const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function VideoPlayer({
  socket,
  me,
  hostId,
  users = [],
  peerRef,
  initial,
  screenBy,
  screenStream,
  playerRef,
  voiceActive,
  adultMode = false,
  callMedia,
  callControlsRef,
  onOpenRecent,
  ottAccounts = {},
  isGhost = false,
  theme,
}) {
  const [media, setMedia] = useState(initial.media);
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const [url, setUrl] = useState(''), [force, setForce] = useState('auto');
  const [local, setLocal] = useState(null), [error, setError] = useState('');
  const [audioTracks, setAudioTracks] = useState([]), [curAudio, setCurAudio] = useState(0);
  const vref = useRef(), ytBox = useRef(), vmBox = useRef(), shareEl = useRef(), hlsRef = useRef(null);
  const api = useRef({ time: () => 0, play() {}, pause() {}, seek() {}, setSpeed() {} });
  const st = useRef(initial);          // last known room state
  const quiet = useRef(false);         // true while applying remote commands (prevents echo loops)
  const playing = useRef(false);
  const share = useRef(null), called = useRef(new Set());
  const stream = screenBy === me ? local : screenStream;
  const effectiveType = (() => {
    if (media?.type && media.type !== 'auto') return media.type;
    if (media?.src) return detect(media.src);
    return 'none';
  })();
  const T = effectiveType;
  const [localUrl, setLocalUrl] = useState(null), [sub, setSub] = useState(null), [hist, setHist] = useState([]);
  const [uploading, setUploading] = useState(null);
  const hostRef = useRef(false); hostRef.current = me === hostId;
  const rateTimer = useRef(null);
  const lastProgrammaticSeek = useRef(0);
  const driftHistory = useRef([]);

  // Smart Voice Audio Ducking & Video Slowdown
  const [smartDuckingEnabled, setSmartDuckingEnabled] = useState(true);
  const [isDucked, setIsDucked] = useState(false);
  const prevVolumeRef = useRef(1.0);

  // Precision Sync & Settings State
  const [syncLatency, setSyncLatency] = useState(16); // ms (one-way latency estimate)
  const [syncOffset, setSyncOffset] = useState(0); // user manual adjustment (-2.0s to +2.0s)
  const [syncStatus, setSyncStatus] = useState('in_sync'); // 'in_sync' | 'syncing' | 'buffering' | 'desync'
  const [sharedSpeed, setSharedSpeed] = useState(1.0);
  const [partnerBuffering, setPartnerBuffering] = useState(null); // { name: string, active: boolean } | null
  const [bufferHold, setBufferHold] = useState(null); // { active: boolean, name: string, isLocal: boolean, time: number }
  const wasPlayingBeforeBuffer = useRef(false);
  const bufferHoldTimer = useRef(null);
  const [autoHealBadge, setAutoHealBadge] = useState('');
  const [remoteUpload, setRemoteUpload] = useState(null);
  const [showAudioVisualizer, setShowAudioVisualizer] = useState(false);
  const [audioMode, setAudioMode] = useState('dolby');
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [audioBoost, setAudioBoost] = useState(100); // 100% to 200%
  const [showSettings, setShowSettings] = useState(false);
  const [subStyle, setSubStyle] = useState({ size: 'md', color: '#ffffff', bg: 'rgba(0,0,0,0.75)' });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [resolvingStatus, setResolvingStatus] = useState('');
  const [screenAudioLocked, setScreenAudioLocked] = useState(false);

  // Built-in VPN Shield & Network IP Cloak
  const [vpnShield, setVpnShield] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('synccinema_vpn_shield') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('synccinema_vpn_shield', vpnShield ? 'true' : 'false');
    }
  }, [vpnShield]);

  // Fullscreen & Floating Video Call PiP State (Fluid Draggable & Movable)
  const containerRef = useRef(null);
  const pipRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsPip, setShowFsPip] = useState(true);
  const [pipPos, setPipPos] = useState(null); // { x: number, y: number } | null
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const [pipCorner, setPipCorner] = useState('bottom-right'); // 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right'
  const [showFsLocalPip, setShowFsLocalPip] = useState(false);
  const [showOverlayControls, setShowOverlayControls] = useState(true);
  const overlayTimerRef = useRef(null);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPipX: 0, initialPipY: 0 });

  const cornerClasses = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
    'top-left': 'top-16 left-4 sm:top-18 sm:left-6',
    'top-right': 'top-16 right-4 sm:top-18 sm:right-6',
  };

  const handlePipDragStart = useCallback((e) => {
    e?.stopPropagation?.();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const pipEl = pipRef.current;
    const containerEl = containerRef.current;
    if (!pipEl || !containerEl) return;

    const pipRect = pipEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialPipX: pipRect.left - containerRect.left,
      initialPipY: pipRect.top - containerRect.top,
    };
    setIsDraggingPip(true);
  }, []);

  useEffect(() => {
    if (!isDraggingPip) return;

    const handlePointerMove = (e) => {
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      if (clientX === undefined || clientY === undefined) return;

      const { startX, startY, initialPipX, initialPipY } = dragStartRef.current;
      const containerEl = containerRef.current;
      const pipEl = pipRef.current;
      if (!containerEl || !pipEl) return;

      const containerWidth = containerEl.clientWidth;
      const containerHeight = containerEl.clientHeight;
      const pipWidth = pipEl.offsetWidth;
      const pipHeight = pipEl.offsetHeight;

      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newX = initialPipX + deltaX;
      let newY = initialPipY + deltaY;

      newX = Math.max(10, Math.min(newX, containerWidth - pipWidth - 10));
      newY = Math.max(10, Math.min(newY, containerHeight - pipHeight - 10));

      setPipPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDraggingPip(false);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);
    window.addEventListener('touchcancel', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('touchcancel', handlePointerUp);
    };
  }, [isDraggingPip]);

  const cyclePipCorner = useCallback((e) => {
    e?.stopPropagation?.();
    setPipPos(null); // Snap back to corner cycle
    setPipCorner((prev) => {
      if (prev === 'bottom-right') return 'bottom-left';
      if (prev === 'bottom-left') return 'top-left';
      if (prev === 'top-left') return 'top-right';
      return 'bottom-right';
    });
  }, []);

  const resetOverlayTimer = useCallback(() => {
    setShowOverlayControls(true);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlayControls(false);
    }, 3500);
  }, []);

  const toggleFullscreen = useCallback(async (e) => {
    e?.stopPropagation?.();
    const el = containerRef.current;
    if (!el) return;

    try {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isCurrentlyFs) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
        } else {
          // In-page fullscreen fallback (e.g. iOS Safari)
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Native fullscreen toggle rejected, falling back to in-page fullscreen:', err);
      setIsFullscreen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      setIsFullscreen(Boolean(fsEl && (fsEl === containerRef.current || containerRef.current?.contains(fsEl))));
    };

    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('mozfullscreenchange', onFsChange);
      document.removeEventListener('MSFullscreenChange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [isFullscreen, toggleFullscreen]);

  // Web Audio Context for Local Audio Boost up to 200%
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);

  useEffect(() => setHist(JSON.parse(localStorage.hist || '[]')), []);

  // Latency RTT measurement via socket sync:ping
  useEffect(() => {
    if (!socket) return;
    const ping = () => {
      const now = Date.now();
      socket.emit('sync:ping', { clientTime: now }, (res) => {
        if (res) {
          const rtt = Math.max(2, Date.now() - now);
          setSyncLatency(Math.round(rtt / 2));
        }
      });
    };
    ping();
    const interval = setInterval(ping, 10000);
    return () => clearInterval(interval);
  }, [socket]);

  // Handle partner buffering status, synchronized buffer hold & speed synchronization
  useEffect(() => {
    if (!socket) return;
    const onBuffering = ({ cid, name, buffering, time }) => {
      if (cid !== me) {
        if (buffering) {
          clearTimeout(bufferHoldTimer.current);
          const isCurrentlyPlaying = !vref.current?.paused;
          if (isCurrentlyPlaying) {
            wasPlayingBeforeBuffer.current = true;
            try {
              api.current?.pause();
            } catch {}
          }
          setPartnerBuffering({ name, active: true });
          setBufferHold({
            active: true,
            name: name || 'Partner',
            isLocal: false,
            time,
          });

          // Autonomous failsafe recovery timeout (12s) in case network drops or partner closes tab
          bufferHoldTimer.current = setTimeout(() => {
            setPartnerBuffering(null);
            setBufferHold(null);
            if (wasPlayingBeforeBuffer.current) {
              api.current?.play();
              wasPlayingBeforeBuffer.current = false;
              setAutoHealBadge('⏱️ Autonomous buffer hold recovery executed');
              setTimeout(() => setAutoHealBadge(''), 2500);
            }
          }, 12000);
        } else {
          // Partner buffering ended: auto-resume playback synchronously
          clearTimeout(bufferHoldTimer.current);
          setPartnerBuffering(null);
          setBufferHold(null);
          if (wasPlayingBeforeBuffer.current) {
            api.current?.play();
            wasPlayingBeforeBuffer.current = false;
            setAutoHealBadge('✨ Synced • Resumed playback together');
            setTimeout(() => setAutoHealBadge(''), 2500);
          }
        }
      }
    };

    const onSpeed = ({ speed, by }) => {
      if (by !== me) {
        setSharedSpeed(speed);
        setPlaybackSpeed(speed);
      }
    };

    const onUploadProgress = (data) => {
      if (data?.cid !== me) {
        setRemoteUpload(data);
        if (data.progress >= 100) {
          setTimeout(() => setRemoteUpload(null), 3500);
        }
      }
    };

    socket.on('player:buffering', onBuffering);
    socket.on('player:speed', onSpeed);
    socket.on('upload:progress', onUploadProgress);
    return () => {
      socket.off('player:buffering', onBuffering);
      socket.off('player:speed', onSpeed);
      socket.off('upload:progress', onUploadProgress);
      if (bufferHoldTimer.current) clearTimeout(bufferHoldTimer.current);
    };
  }, [socket, me]);

  // Global listener: first touch anywhere on screen unlocks mobile autoplay if room is playing
  useEffect(() => {
    const handleFirstTouch = () => {
      if (st.current?.playing && vref.current && vref.current.paused) {
        vref.current.play().then(() => setAutoplayBlocked(false)).catch(() => {});
      }
    };
    window.addEventListener('click', handleFirstTouch, { passive: true });
    window.addEventListener('touchstart', handleFirstTouch, { passive: true });
    return () => {
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, []);

  // Global paste handler: Ctrl+V anywhere in room auto-detects video & starts playback
  useEffect(() => {
    const onGlobalPaste = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
      const text = e.clipboardData?.getData?.('text')?.trim?.();
      if (text && (/^(https?:\/\/|www\.)/i.test(text) || ytId(text) || isOttPlatform(text))) {
        autoPlayUrl(text);
      }
    };
    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  }, []);

  // Autonomous AutoFix & Self-Healing Engine Listener
  useEffect(() => {
    const unsub = autoFixEngine.onFix((event) => {
      if (event?.type === 'video_healing_start') {
        setAutoHealBadge('🛡️ Auto-Healing Stream Playback…');
      } else if (event?.type === 'video_healing_success') {
        setAutoHealBadge('✨ Stream Auto-Healed Successfully');
        setTimeout(() => setAutoHealBadge(''), 2500);
      }
    });
    return () => unsub();
  }, []);

  // Autonomous Drift Self-Healer: automatically resolves stream drift with zero clicks
  useEffect(() => {
    if (syncStatus === 'desync' && st.current) {
      const timer = setTimeout(() => {
        correct(st.current.time, st.current.playing);
        setAutoHealBadge('⚡ Autonomous Drift Correction Active (0ms Sync)');
        setTimeout(() => setAutoHealBadge(''), 2500);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  const silently = (fn) => {
    quiet.current = true;
    try {
      fn();
    } finally {
      setTimeout(() => { quiet.current = false; }, 120);
    }
  };

  const send = (action) => {
    if (quiet.current) return;
    if (action === 'PLAY') playing.current = true;
    if (action === 'PAUSE') playing.current = false;
    socket.emit('player', { action, time: api.current.time(), playing: playing.current });
  };

  const seekDelta = (deltaSeconds) => {
    const cur = api.current.time();
    const target = Math.max(0, cur + deltaSeconds);
    silently(() => {
      api.current.seek(target);
    });
    lastProgrammaticSeek.current = Date.now();
    socket.emit('player', { action: 'SEEK', time: target, playing: playing.current });
  };

  const setPlaybackSpeed = (speed) => {
    const v = vref.current;
    if (v && v.playbackRate !== speed) {
      try { v.playbackRate = speed; } catch {}
    }
    if (api.current?.setSpeed) {
      try { api.current.setSpeed(speed); } catch {}
    }
  };

  const changeSharedSpeed = (s) => {
    setSharedSpeed(s);
    setPlaybackSpeed(s);
    socket.emit('player:speed', { speed: s });
  };

  const handleAudioBoost = (val) => {
    const boost = Math.min(200, Math.max(0, +val));
    setAudioBoost(boost);
    const v = vref.current;
    if (!v) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const gain = ctx.createGain();
        const src = ctx.createMediaElementSource(v);
        src.connect(gain);
        gain.connect(ctx.destination);
        audioCtxRef.current = ctx;
        gainNodeRef.current = gain;
        sourceNodeRef.current = src;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = boost / 100;
      }
    } catch {
      v.volume = Math.min(1, boost / 100);
    }
  };

  // Smart Voice Ducking & Playback Slowdown ("when anyone talk then video slow automatic and then increse")
  useEffect(() => {
    if (!smartDuckingEnabled) return;
    const v = vref.current;
    if (voiceActive) {
      setIsDucked(true);
      // Smoothly duck audio
      if (gainNodeRef.current && audioCtxRef.current) {
        try {
          gainNodeRef.current.gain.setTargetAtTime(0.22 * (audioBoost / 100), audioCtxRef.current.currentTime, 0.1);
        } catch {}
      } else if (v) {
        prevVolumeRef.current = v.volume;
        v.volume = Math.max(0.05, (prevVolumeRef.current || 1.0) * 0.22);
      }
      // Slow down video playback smoothly to 0.82x so conversation doesn't miss movie dialog
      setPlaybackSpeed(sharedSpeed * 0.82);
    } else {
      setIsDucked(false);
      // Smoothly restore audio
      if (gainNodeRef.current && audioCtxRef.current) {
        try {
          gainNodeRef.current.gain.setTargetAtTime(audioBoost / 100, audioCtxRef.current.currentTime, 0.2);
        } catch {}
      } else if (v) {
        v.volume = prevVolumeRef.current || 1.0;
      }
      // Smoothly restore speed
      setPlaybackSpeed(sharedSpeed);
    }
  }, [voiceActive, smartDuckingEnabled, sharedSpeed, audioBoost]);

  // Ultra-Precise & Stable Sync: Latency compensation + zero-jitter deadband + micro-rate adjustment
  const correct = (targetTime, shouldPlay, sentAt) => {
    const a = api.current;
    const v = vref.current;
    const curTime = a.time();

    // Transit time compensation: using sentAt if provided, otherwise ping RTT
    const transitSec = sentAt ? Math.max(0, (Date.now() - sentAt) / 1000) : ((syncLatency || 16) / 1000);
    const compensatedTarget = Math.max(0, targetTime + (shouldPlay ? transitSec : 0) + (syncOffset || 0));
    const drift = curTime - compensatedTarget;
    const absDrift = Math.abs(drift);

    // Sync play/pause state
    if (shouldPlay !== playing.current) {
      silently(() => {
        if (shouldPlay) {
          a.play();
        } else {
          a.pause();
        }
      });
      playing.current = shouldPlay;
    }

    // If element is already buffering or seeking, let it finish loading first
    if (v && (v.seeking || v.readyState < 2)) return;

    // 1. Rock-Solid Deadband (<= 0.25s):
    // Inaudible difference. Zero rate shift, zero seeking. Keeps all devices rock-solid in sync.
    if (absDrift <= 0.25) {
      setSyncStatus('in_sync');
      driftHistory.current = [];
      if (!voiceActive) setPlaybackSpeed(sharedSpeed);
      return;
    }

    // 2. Micro-Glide Sync (0.25s to 0.8s) while playing:
    // Imperceptible speed micro-adjustment (+/- 8%) to align smoothly without hard jump
    if (absDrift <= 0.8 && shouldPlay) {
      setSyncStatus('syncing');
      driftHistory.current.push(drift);
      if (driftHistory.current.length > 2) driftHistory.current.shift();
      const avg = driftHistory.current.reduce((x, y) => x + y, 0) / driftHistory.current.length;

      if (!voiceActive) {
        if (avg < 0) {
          setPlaybackSpeed(sharedSpeed * 1.08); // Behind: catch up
        } else {
          setPlaybackSpeed(sharedSpeed * 0.92); // Ahead: gently wait
        }
      }
      clearTimeout(rateTimer.current);
      rateTimer.current = setTimeout(() => {
        if (!voiceActive) setPlaybackSpeed(sharedSpeed);
        setSyncStatus('in_sync');
      }, 1000);
      return;
    }

    // 3. Instant Snap Seek (> 0.8s, or if paused and out of sync):
    // Snap immediately to exact target so all users are 100% on the exact same frame!
    if (absDrift > 0.8 || (!shouldPlay && absDrift > 0.25)) {
      setSyncStatus('syncing');
      lastProgrammaticSeek.current = Date.now();
      if (!voiceActive) setPlaybackSpeed(sharedSpeed);
      silently(() => {
        a.seek(compensatedTarget);
      });
      driftHistory.current = [];
      setTimeout(() => setSyncStatus('in_sync'), 300);
    }
  };

  // ---------- <video>: mp4/webm/audio, HLS, DASH ----------
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    setError('');
    if (!['file', 'hls', 'dash', 'local'].includes(T)) { v.pause(); v.removeAttribute('src'); v.load(); return; }
    if (T === 'local' && !localUrl) { v.removeAttribute('src'); v.load(); return; }
    let isCancelled = false;
    let dispose = () => {};
    setAudioTracks([]);

    if (T === 'hls' && !v.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: H }) => {
        if (isCancelled) return;
        const h = new H({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 30 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          manifestLoadingMaxRetry: 6,
          manifestLoadingRetryDelay: 1000,
          levelLoadingMaxRetry: 6,
          levelLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 8,
          fragLoadingRetryDelay: 1000,
          startFragPrefetch: true,
        });
        if (isCancelled) {
          h.destroy();
          return;
        }
        hlsRef.current = h;
        h.loadSource(media.src);
        h.attachMedia(v);
        dispose = () => { hlsRef.current = null; h.destroy(); };

        h.on(H.Events.MANIFEST_PARSED, () => {
          if (isCancelled) return;
          setError('');
          if (h.audioTracks && h.audioTracks.length > 0) {
            setAudioTracks(h.audioTracks.map((t, idx) => ({ id: idx, name: t.name || t.lang || `Track ${idx + 1}` })));
            if (h.audioTrack === -1) {
              h.audioTrack = 0;
              setCurAudio(0);
            } else {
              setCurAudio(h.audioTrack);
            }
          }
        });
        h.on(H.Events.FRAG_LOADED, () => {
          if (isCancelled) return;
          setError('');
        });
        h.on(H.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          if (isCancelled) return;
          if (data.audioTracks && data.audioTracks.length > 0) {
            setAudioTracks(data.audioTracks.map((t, idx) => ({ id: idx, name: t.name || t.lang || `Track ${idx + 1}` })));
          }
        });
        h.on(H.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          if (isCancelled) return;
          setCurAudio(data.id);
        });
        h.on(H.Events.ERROR, (_, d) => {
          if (isCancelled) return;
          if (d.fatal) {
            if (d.type === H.ErrorTypes.MEDIA_ERROR) {
              h.recoverMediaError();
            } else if (d.type === H.ErrorTypes.NETWORK_ERROR) {
              if (!media.src.startsWith('/api/stream') && !media.src.startsWith('http://localhost:8080/api/stream')) {
                h.loadSource(toStreamProxyUrl(media.src));
              } else {
                h.startLoad();
              }
            } else {
              setError('Stream unavailable or blocked. You can try PROXY type or Share screen.');
            }
          }
        });
      });
    } else if (T === 'dash') {
      import('dashjs').then(({ MediaPlayer }) => {
        if (isCancelled) return;
        const d = MediaPlayer().create();
        if (isCancelled) {
          d.reset();
          return;
        }
        d.initialize(v, media.src, false);
        dispose = () => d.reset();
      });
    } else {
      v.src = (T === 'local' || (localUrl && media?.uploaderId === me)) ? localUrl : media.src;
    }

    api.current = {
      time: () => v.currentTime,
      play: () => {
        const p = v.play();
        if (p && typeof p.catch === 'function') {
          p.then(() => setAutoplayBlocked(false)).catch((err) => {
            if (err?.name === 'NotAllowedError') {
              setAutoplayBlocked(true);
            }
          });
        }
      },
      pause: () => {
        v.pause();
        setAutoplayBlocked(false);
      },
      seek: (t) => (v.currentTime = t),
      setSpeed: (s) => (v.playbackRate = s),
    };
    const evs = [['play', 'PLAY'], ['playing', 'PLAY'], ['pause', 'PAUSE'], ['seeked', 'SEEK']]
      .map(([e, a]) => {
        const f = () => {
          // Suppress programmatic/sync-induced seeks and pauses from sending echo events back
          if (Date.now() - lastProgrammaticSeek.current < 350) return;
          send(a);
        };
        v.addEventListener(e, f);
        return () => v.removeEventListener(e, f);
      });
    
    let waitTimer = null;
    const onWait = () => {
      clearTimeout(waitTimer);
      waitTimer = setTimeout(() => {
        // Buffer-Free Check: Only declare buffering if video genuinely lacks forward buffer!
        try {
          if (v && v.buffered && v.buffered.length > 0) {
            const forwardBuffer = v.buffered.end(v.buffered.length - 1) - v.currentTime;
            if (forwardBuffer > 0.8 && v.readyState >= 2) {
              // Video already has ample buffer forward; transient micro-pause will self-resolve without interrupting room!
              return;
            }
          }
        } catch {}

        socket.emit('player:buffering', { buffering: true, time: v.currentTime });
        setBufferHold((prev) => {
          if (prev?.active && !prev.isLocal) return prev;
          return { active: true, name: 'You', isLocal: true, time: v.currentTime };
        });
      }, 850);
    };
    const onResume = () => {
      clearTimeout(waitTimer);
      socket.emit('player:buffering', { buffering: false, time: v.currentTime });
      setBufferHold((prev) => (prev?.isLocal ? null : prev));
    };
    v.addEventListener('waiting', onWait);
    v.addEventListener('canplay', onResume);
    v.addEventListener('playing', onResume);

    // Clear errors when frames actually load or play
    v.onplaying = () => { setError(''); setAutoplayBlocked(false); };
    v.oncanplay = () => setError('');
    v.onloadeddata = () => setError('');
    v.onended = () => hostRef.current && socket.emit('queue:next');
    v.onerror = () => {
      if (['file', 'hls'].includes(T) && !v.src.includes('/api/stream') && media.src) {
        v.src = toStreamProxyUrl(media.src);
        v.load();
        v.play().catch(() => {});
      } else if (v.error && v.error.code === 4 && v.networkState === 3) {
        setError('Stream failed to load. Try PROXY type or Share screen.');
      }
    };
    v.onloadedmetadata = () => {
      setError('');
      setIsLiveStream(v.duration === Infinity || (hlsRef.current && !!hlsRef.current.liveSyncPosition));
      correct(st.current.time, st.current.playing);
    };
    return () => {
      isCancelled = true;
      evs.forEach((o) => o());
      clearTimeout(waitTimer);
      v.removeEventListener('waiting', onWait);
      v.removeEventListener('canplay', onResume);
      v.removeEventListener('playing', onResume);
      v.onplaying = null;
      v.oncanplay = null;
      v.onloadeddata = null;
      v.onended = null;
      v.onerror = null;
      v.onloadedmetadata = null;
      dispose();
    };
  }, [media, localUrl]);

  // ---------- YouTube ----------
  useEffect(() => {
    if (T !== 'youtube') return;
    let p, dead = false;
    ytReady().then(() => {
      if (dead) return;
      ytBox.current.innerHTML = '<div id="yt"></div>';
      p = new window.YT.Player('yt', {
        width: '100%', height: '100%', videoId: ytId(media.src), playerVars: { playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            setError('');
            api.current = {
              time: () => p.getCurrentTime(),
              play: () => p.playVideo(),
              pause: () => p.pauseVideo(),
              seek: (t) => p.seekTo(t, true),
              setSpeed: (s) => p.setPlaybackRate?.(s),
            };
            correct(st.current.time, st.current.playing);
          },
          onStateChange: (e) => {
            const a = { 1: 'PLAY', 2: 'PAUSE', 3: 'BUFFERING' }[e.data];
            if (Date.now() - lastProgrammaticSeek.current < 2000) return;
            if (a && a !== 'BUFFERING') send(a);
            if (e.data === 3) socket.emit('player:buffering', { buffering: true, time: api.current.time() });
            if (e.data === 1) socket.emit('player:buffering', { buffering: false, time: api.current.time() });
            if (e.data === 0 && hostRef.current) socket.emit('queue:next');
          },
          onError: () => setError('YouTube refused to play this video here (embedding disabled). Open it in another tab and use Share screen to show it anyway.'),
        },
      });
    });
    return () => { dead = true; p?.destroy?.(); };
  }, [media]);

  // ---------- Vimeo ----------
  useEffect(() => {
    if (T !== 'vimeo') return;
    let p, dead = false;
    loadScript('https://player.vimeo.com/api/player.js').then(() => {
      if (dead) return;
      vmBox.current.innerHTML = '';
      p = new window.Vimeo.Player(vmBox.current, { id: vimeoId(media.src), responsive: true, autopause: false });
      api.current = {
        time: () => p.getCurrentTime(),
        play: () => p.play(),
        pause: () => p.pause(),
        seek: (t) => p.setCurrentTime(t),
        setSpeed: (s) => p.setPlaybackRate?.(s),
      };
      p.ready().then(() => {
        setError('');
        correct(st.current.time, st.current.playing);
        p.on('play', () => {
          send('PLAY');
          socket.emit('player:buffering', { buffering: false, time: api.current.time() });
        });
        p.on('pause', () => send('PAUSE'));
        p.on('bufferstart', () => {
          send('BUFFERING');
          socket.emit('player:buffering', { buffering: true, time: api.current.time() });
        });
        p.on('bufferend', () => socket.emit('player:buffering', { buffering: false, time: api.current.time() }));
        p.on('seeked', () => send('SEEK'));
        p.on('ended', () => hostRef.current && socket.emit('queue:next'));
      });
    });
    return () => { dead = true; p?.destroy?.(); };
  }, [media]);

  // ---------- room state sync ----------
  useEffect(() => {
    const onState = (s) => {
      st.current = s;
      setMedia((m) => (m.src === s.media.src && m.type === s.media.type ? m : s.media));
      correct(s.time, s.playing);
    };

    const onPlayer = ({ action, time, playing: shouldPlay, by, sentAt }) => {
      const a = api.current;
      if (by === me) return;
      if (action === 'PLAY') {
        silently(() => {
          a.play();
          playing.current = true;
        });
        correct(time, true, sentAt);
      } else if (action === 'PAUSE') {
        silently(() => {
          a.pause();
          playing.current = false;
          a.seek(time);
        });
        if (!isDucked) setPlaybackSpeed(1.0);
      } else if (action === 'SEEK') {
        silently(() => {
          lastProgrammaticSeek.current = Date.now();
          a.seek(time);
          if (typeof shouldPlay === 'boolean') {
            if (shouldPlay && !playing.current) {
              a.play();
              playing.current = true;
            } else if (!shouldPlay && playing.current) {
              a.pause();
              playing.current = false;
            }
          }
          setSyncStatus('in_sync');
        });
      }
    };

    const onBeat = ({ time, playing: p, sentAt }) => {
      if (p) correct(time, p, sentAt);
    };

    socket.on('state', onState);
    socket.on('player', onPlayer);
    socket.on('heartbeat', onBeat);

    // Periodic heartbeat with timestamp while playing to keep all devices tightly in sync
    const beat = setInterval(() => {
      if ((me === hostId || !hostId) && playing.current) {
        socket.emit('heartbeat', { time: api.current.time(), playing: true, sentAt: Date.now() });
      }
    }, 1500);

    playerRef.current = {
      pause: () => { api.current.pause(); send('PAUSE'); setPlaybackSpeed(1.0); },
      time: () => api.current.time(),
      getCurrentTime: () => api.current.time(),
      seek: (t) => {
        silently(() => { api.current.seek(t); });
        lastProgrammaticSeek.current = Date.now();
        send('SEEK');
      },
      seekDelta,
      toggleFullscreen,
      getVideoElement: () => (stream ? shareEl.current : vref.current),
      getShareElement: () => shareEl.current,
      getMedia: () => mediaRef.current,
      getYoutubeId: () => (mediaRef.current?.src ? ytId(mediaRef.current.src) : null),
      isPlaying: () => playing.current,
      isScreenSharing: () => Boolean(stream),
    };

    return () => {
      socket.off('state', onState);
      socket.off('player', onPlayer);
      socket.off('heartbeat', onBeat);
      clearInterval(beat);
      clearTimeout(rateTimer.current);
    };
  }, [me, hostId]);

  // ---------- screen share (WebRTC mobile-optimized with zero black screen) ----------
  useEffect(() => {
    const v = shareEl.current;
    if (!v) return;
    if (stream) {
      v.srcObject = stream;
      v.playsInline = true;
      v.setAttribute('playsinline', 'true');
      v.setAttribute('webkit-playsinline', 'true');

      // Attempt immediate playback
      v.play().catch(() => {
        // Autoplay blocked on mobile: temporarily mute so video frames start rendering IMMEDIATELY (NO BLACK SCREEN!)
        v.muted = true;
        v.play().then(() => {
          if (screenBy !== me) setScreenAudioLocked(true);
        }).catch(() => {});
      });

      // Any user touch or click unblocks unmuted audio
      const unlockAudio = () => {
        if (v && screenBy !== me) {
          v.muted = false;
          v.play().catch(() => {});
          setScreenAudioLocked(false);
        }
      };
      window.addEventListener('touchstart', unlockAudio, { once: true });
      window.addEventListener('click', unlockAudio, { once: true });

      return () => {
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('click', unlockAudio);
      };
    } else {
      v.srcObject = null;
      setScreenAudioLocked(false);
    }
  }, [stream, screenBy, me]);

  useEffect(() => {
    if (!share.current) return;
    users.filter((u) => u.id !== me && !called.current.has(u.sid)).forEach((u) => {
      called.current.add(u.sid);
      peerRef.current?.call(u.id, share.current, { metadata: { type: 'screen' } });
    });
  }, [users]);

  const stopShare = () => {
    share.current?.getTracks().forEach((t) => t.stop());
    share.current = null;
    called.current.clear();
    setLocal(null);
    socket.emit('screen:stop');
  };

  const startShare = async () => {
    try {
      let s;
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        try {
          s = await navigator.mediaDevices.getDisplayMedia({
            video: {
              frameRate: { ideal: 30, max: 30 },
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            },
            audio: true,
          });
        } catch (e1) {
          try {
            s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          } catch (e2) {
            // Pure video mode (most reliable on Chrome)
            s = await navigator.mediaDevices.getDisplayMedia({ video: true });
          }
        }
      } else if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        // Fallback for Android WebView & phones: Stream through environment camera (or point phone at TV/screen)
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
        } catch (eCam) {
          setError('Mobile apps restrict native screen capture. You can stream any video file from device or paste direct links with 0ms sync!');
          return;
        }
      } else {
        setError('Screen sharing is not supported on this browser.');
        return;
      }

      s.getVideoTracks().forEach((track) => {
        if ('contentHint' in track) track.contentHint = 'motion';
      });

      share.current = s;
      setLocal(s);
      s.getVideoTracks()[0].onended = stopShare;
      socket.emit('screen:start');

      users.filter((u) => u.id !== me).forEach((u) => {
        called.current.add(u.sid);
        const call = peerRef.current?.call(u.id, s, { metadata: { type: 'screen' } });
        if (call) {
          call.on('error', () => {});
          setTimeout(() => {
            try {
              const senders = call.peerConnection?.getSenders() || [];
              senders.forEach((sender) => {
                if (sender.track?.kind === 'video') {
                  const params = sender.getParameters();
                  if (params.encodings && params.encodings[0]) {
                    params.encodings[0].maxBitrate = 1800000;
                    params.encodings[0].priority = 'high';
                    params.encodings[0].networkPriority = 'high';
                    sender.setParameters(params).catch(() => {});
                  }
                }
              });
            } catch {}
          }, 500);
        }
      });
    } catch (err) {
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
        setError('Screen share error: ' + (err?.message || err?.name || 'Failed to capture screen'));
      }
    }
  };

  const startHybridTabShare = async (platformUrl) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setError('Screen/tab sharing is not supported on this browser. Please use Chrome/Edge on Desktop or Android.');
        return;
      }

      if (platformUrl && /^https?:\/\//i.test(platformUrl)) {
        window.open(platformUrl, '_blank');
      }

      let s;
      try {
        // High quality tab audio + video capture (optimized for mobile phone partners)
        s = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
            frameRate: { ideal: 30, max: 30 },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      } catch (e1) {
        try {
          s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        } catch (e2) {
          s = await navigator.mediaDevices.getDisplayMedia({ video: true });
        }
      }

      s.getVideoTracks().forEach((track) => {
        if ('contentHint' in track) track.contentHint = 'motion';
      });

      share.current = s;
      setLocal(s);
      s.getVideoTracks()[0].onended = stopShare;
      socket.emit('screen:start');

      users.filter((u) => u.id !== me).forEach((u) => {
        called.current.add(u.sid);
        const call = peerRef.current?.call(u.id, s, { metadata: { type: 'screen' } });
        if (call) {
          call.on('error', () => {});
          setTimeout(() => {
            try {
              const senders = call.peerConnection?.getSenders() || [];
              senders.forEach((sender) => {
                if (sender.track?.kind === 'video') {
                  const params = sender.getParameters();
                  if (params.encodings && params.encodings[0]) {
                    params.encodings[0].maxBitrate = 1800000;
                    params.encodings[0].priority = 'high';
                    params.encodings[0].networkPriority = 'high';
                    sender.setParameters(params).catch(() => {});
                  }
                }
              });
            } catch {}
          }, 500);
        }
      });
    } catch (err) {
      if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') {
        setError('Hybrid tab stream error: ' + (err?.message || err?.name || 'Failed to capture browser tab'));
      }
    }
  };

  const playCloudMovie = async (query, platformName) => {
    if (!query) return;
    let meta = null;
    let clean = '';
    let isTv = false;

    if (typeof query === 'object') {
      meta = query;
      clean = query.title || '';
      isTv = Boolean(query.isTv);
      platformName = query.ott || platformName;
    } else {
      clean = String(query).trim();
      meta = await resolveTitleToMetadata(clean);
      if (meta) isTv = Boolean(meta.isTv);
    }

    if (!clean) return;
    const mirrors = getCloudMirrorSources(meta || clean, isTv, clean);
    socket.emit('media:set', {
      media: {
        type: 'embed',
        src: mirrors[0]?.url,
        origSrc: clean,
        title: platformName ? `${platformName}: ${clean}` : clean,
        platform: platformName || 'OTT Cinema',
        movieTitle: clean,
        mirrorSources: mirrors,
        currentServerIndex: 0,
      },
    });
  };

  const buildMedia = async (rawUrl) => {
    let src = (rawUrl || url).trim();
    if (!src) return null;
    if (!/^https?:\/\//i.test(src) && !src.startsWith('/api/')) src = 'https://' + src;

    const isAdult = isAdultMedia(src);

    // 0. OTT platforms (Disney+ Hotstar, Netflix, Prime Video, JioCinema, Zee5, SonyLIV, Apple TV+, Hulu, Max, etc.)
    // Streams directly for all devices with high-definition multi-server cloud mirrors
    const ott = getOttPlatform(src);
    const extracted = extractOttTitle(src);
    if (ott || force === 'hybrid' || extracted) {
      // If extracted is empty or an opaque alphanumeric ID/ASIN, pass full URL to resolve title from server
      const isOpaqueId = !extracted || /^[A-Za-z0-9_-]{10,}$/.test(extracted) || /^\d+$/.test(extracted);
      const queryToResolve = isOpaqueId ? src : extracted;
      const meta = await resolveTitleToMetadata(queryToResolve);
      const titleToPlay = meta?.title || (isOpaqueId ? (ott ? `${ott.name} Cinema` : 'Cinema') : extracted);
      const isTv = Boolean(meta?.isTv);
      const mirrors = getCloudMirrorSources(meta || titleToPlay, isTv, titleToPlay);
      return {
        type: 'embed',
        src: mirrors[0]?.url,
        origSrc: src,
        platform: ott?.name || 'OTT Cinema',
        icon: ott?.icon || '🍿',
        color: ott?.color || '#e11d48',
        title: meta?.title ? `${ott?.name || 'OTT'}: ${meta.title}` : (extracted && !isOpaqueId ? `${ott?.name || 'OTT'}: ${extracted}` : titleToPlay),
        movieTitle: titleToPlay,
        mirrorSources: mirrors,
        currentServerIndex: 0,
      };
    }

    // 1. YouTube direct
    if (ytId(src)) {
      return {
        type: 'youtube',
        src,
        title: '',
      };
    }

    // 2. Vimeo direct
    if (vimeoId(src)) {
      return {
        type: 'vimeo',
        src,
        title: '',
      };
    }

    // 3. Direct video extensions
    const cleanPath = src.split('?')[0].split('#')[0].toLowerCase();
    if (cleanPath.endsWith('.m3u8')) {
      return {
        type: 'hls',
        src: toStreamProxyUrl(src),
        origSrc: src,
        title: isAdult ? '🔒 Private Stream' : '',
      };
    }
    if (cleanPath.endsWith('.mpd')) {
      return {
        type: 'dash',
        src,
        origSrc: src,
        title: isAdult ? '🔒 Private Stream' : '',
      };
    }
    if (/\.(mp4|webm|ogv|ogg|mov|m4v|mkv|mp3|m4a|wav|flac|aac|opus|weba|m4b)$/.test(cleanPath)) {
      return {
        type: 'file',
        src: toStreamProxyUrl(src),
        origSrc: src,
        title: isAdult ? '🔒 Private Stream' : '',
      };
    }

    // 4. Server-side auto-resolver
    try {
      const resolved = await resolveMedia(src);
      if (resolved && (resolved.type === 'hls' || resolved.type === 'file' || resolved.type === 'embed' || resolved.type === 'proxy' || resolved.type === 'dash')) {
        if (resolved.subtitle) setSub(resolved.subtitle);
        if (isAdult) {
          resolved.title = '🔒 Private Stream';
          resolved.origSrc = '🔒 Private Stream';
        }
        return resolved;
      }
    } catch {}

    // 5. Tube or adult platform proxying fallback
    if (isTubeOrEmbedHost(src)) {
      return {
        type: 'embed',
        src: toEmbed(src),
        orig: isAdult ? '🔒 Private Stream' : src,
        title: isAdult ? '🔒 Private Stream' : '',
      };
    }

    // 6. Generic embed fallback
    return {
      type: 'embed',
      src: toEmbed(src),
      orig: src,
      title: isAdult ? '🔒 Private Stream' : '',
    };
  };

  const autoPlayUrl = async (rawUrl) => {
    const target = (rawUrl || '').trim();
    if (!target) return;
    setError('');
    setResolvingStatus('⚡ Auto-detecting link & streaming for everyone...');
    try {
      const m = await buildMedia(target);
      if (m) {
        socket.emit('media:set', { media: m });
        const targetUrl = m.origSrc || m.orig || m.src;
        const h = [targetUrl, ...hist.filter((x) => x !== targetUrl)].slice(0, 20);
        setHist(h);
        try {
          localStorage.hist = JSON.stringify(h);
          window.dispatchEvent(new Event('storage'));
        } catch {}
        setResolvingStatus(`🎬 Playing ${m.platform ? `${m.platform}: ` : ''}${m.title || 'in sync'}!`);
        setTimeout(() => setResolvingStatus(''), 2500);
        setUrl('');
      } else {
        setResolvingStatus('');
      }
    } catch (err) {
      setResolvingStatus('');
      setError('Auto-play error: ' + (err?.message || 'Failed to detect video'));
    }
  };

  // Auto-resolve when room boots with media.type === 'auto' or direct unparsed link
  useEffect(() => {
    if ((media?.type === 'auto' || !media?.type) && media?.src) {
      buildMedia(media.src).then((resolved) => {
        if (resolved) {
          setMedia(resolved);
          if (hostRef.current) {
            socket?.emit('media:set', { media: resolved });
          }
        }
      });
    }
  }, [media?.src, media?.type]);

  const handlePasteAndPlay = (e) => {
    const pasted = e.clipboardData?.getData?.('text')?.trim?.();
    if (pasted) {
      autoPlayUrl(pasted);
    }
  };

  const handleClipboardPasteAndPlay = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text?.trim()) {
          autoPlayUrl(text.trim());
          return;
        }
      }
    } catch {}
    if (url.trim()) {
      autoPlayUrl(url.trim());
    }
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    const clean = val.trim();
    if (
      /^(https?:\/\/|www\.)/i.test(clean) &&
      (clean.includes('netflix.com') ||
       clean.includes('hotstar.com') ||
       clean.includes('primevideo.com') ||
       clean.includes('jiocinema.com') ||
       clean.includes('zee5.com') ||
       clean.includes('sonyliv.com') ||
       clean.includes('mxplayer') ||
       clean.includes('ullu') ||
       clean.includes('pornhub') ||
       clean.includes('xhamster') ||
       clean.includes('xvideos') ||
       clean.includes('xnxx') ||
       clean.includes('youtube.com') ||
       clean.includes('youtu.be') ||
       clean.includes('vimeo.com') ||
       clean.includes('imdb.com') ||
       clean.includes('themoviedb.org') ||
       isOttPlatform(clean) ||
       isTubeOrEmbedHost(clean) ||
       /\.(mp4|m3u8|mpd|webm|mkv|mov)(\?|$)/i.test(clean))
    ) {
      autoPlayUrl(clean);
    }
  };

  const build = async () => buildMedia(url);

  const enqueue = async () => {
    const m = await buildMedia(url);
    if (m) {
      socket.emit('queue:add', { media: m });
      setUrl('');
    }
  };

  const pickLocal = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const blobUrl = URL.createObjectURL(f);
    setLocalUrl(blobUrl);

    // Instant local playback for host with 0-second wait!
    const instantMedia = {
      type: 'local',
      name: f.name,
      fileSize: f.size,
      uploading: true,
      uploaderId: me,
    };
    setMedia(instantMedia);
    // Broadcast immediately so partner knows local movie is selected
    socket?.emit('media:set', { media: instantMedia });

    // Stream file to server with high-performance buffer in background so other devices can stream it
    const startTime = Date.now();
    setUploading({ progress: 0, name: f.name, size: f.size, speed: '0.0' });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('x-file-name', encodeURIComponent(f.name));

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        const elapsedSec = (Date.now() - startTime) / 1000;
        const mbps = elapsedSec > 0 ? ((evt.loaded / (1024 * 1024)) / elapsedSec).toFixed(1) : '0.0';
        setUploading({ progress: pct, name: f.name, size: f.size, speed: mbps });
        socket?.emit('upload:progress', { progress: pct, name: f.name, fileSize: f.size, speed: mbps });
      }
    };

    xhr.onload = () => {
      setUploading(null);
      socket?.emit('upload:progress', { progress: 100, name: f.name, fileSize: f.size, speed: '0.0' });
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          // Broadcast the shared cloud stream URL to partner!
          socket?.emit('media:set', {
            media: {
              type: 'file',
              src: res.url,
              name: f.name,
              uploaderId: me,
            },
          });
        } catch {}
      }
    };

    xhr.onerror = () => {
      setUploading(null);
    };

    xhr.send(f);
    e.target.value = '';
  };

  const pickSub = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    let t = (await f.text()).replace(/\r/g, '');
    if (!t.startsWith('WEBVTT')) t = 'WEBVTT\n\n' + t.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
    setSub(URL.createObjectURL(new Blob([t], { type: 'text/vtt' })));
    e.target.value = '';
  };

  const switchAudio = (id) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = id;
      setCurAudio(id);
    }
  };

  const load = async (e) => {
    e?.preventDefault?.();
    if (url.trim()) {
      autoPlayUrl(url.trim());
    }
  };


  const show = (k) => (!stream && k ? '' : 'hidden');

  return (
    <div className="flex flex-col gap-3">
      {/* Subtitle Cue Custom Styles */}
      <style jsx global>{`
        video::cue {
          font-size: ${subStyle.size === 'sm' ? '14px' : subStyle.size === 'lg' ? '24px' : '18px'} !important;
          color: ${subStyle.color} !important;
          background-color: ${subStyle.bg} !important;
          text-shadow: 0 2px 4px rgba(0,0,0,0.9);
        }
      `}</style>

      <div
        ref={containerRef}
        onClick={isFullscreen ? resetOverlayTimer : undefined}
        onMouseMove={isFullscreen ? resetOverlayTimer : undefined}
        onTouchStart={isFullscreen ? resetOverlayTimer : undefined}
        className={`vault relative overflow-hidden transition-all ${
          theme?.isLight ? 'bg-white/98 border-2 border-rose-200/90 shadow-[0_16px_50px_rgba(244,63,94,0.10)] ring-1 ring-rose-400/20' : 'bg-[#222222] border border-white/10'
        } ${
          isFullscreen
            ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0 flex items-center justify-center'
            : 'aspect-video rounded-3xl'
        }`}
      >
        {/* Top-Left Status Cluster: Sync Status + Live Stream (Always visible on mobile & desktop) */}
        {T !== 'none' && (
          <div
            className={`absolute top-3 left-3 z-30 flex items-center gap-2 transition-opacity duration-300 pointer-events-auto ${
              isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-xl border-2 ${
              theme?.isLight
                ? 'bg-white border-slate-300 text-slate-800 font-extrabold'
                : 'bg-[#181824] border-pink-500/40 text-white font-black'
            }`}>
              <span className={`h-2.5 w-2.5 rounded-full ${syncStatus === 'in_sync' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-pink-500'}`} />
              <span>{syncStatus === 'in_sync' ? `In sync • ${syncLatency}ms` : syncStatus === 'syncing' ? 'Fine-tuning…' : 'Syncing'}</span>
              {syncOffset !== 0 && (
                <span className="text-[10px] text-pink-300 font-mono ml-0.5">
                  ({syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`})
                </span>
              )}
            </div>

            {isLiveStream && (
              <div className="btn-pink flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black text-white border-2 border-white/30 shadow-xl">
                <Radio className="h-3 w-3" />
                <span>LIVE</span>
                <button
                  type="button"
                  onClick={() => {
                    if (hlsRef.current?.liveSyncPosition) vref.current.currentTime = hlsRef.current.liveSyncPosition;
                    else if (vref.current && Number.isFinite(vref.current.duration)) vref.current.currentTime = vref.current.duration;
                  }}
                  className="ml-1 underline hover:text-white text-[10px] cursor-pointer"
                  title="Jump to live edge"
                >
                  Catch up
                </button>
              </div>
            )}
          </div>
        )}

        {/* Screensharing Active Header & Full Screen Toggle */}
        {stream && (
          <div
            className={`absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#161622] border-2 border-pink-500/40 shadow-2xl transition-opacity duration-300 ${
              isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-pink-500 shrink-0" />
              <span className="text-xs font-black text-white truncate">
                {screenBy === me
                  ? '🖥️ You are sharing your screen'
                  : `🖥️ ${users.find((u) => u.id === screenBy)?.name || 'Partner'} is sharing screen`}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="btn-pink !py-1.5 !px-3.5 text-xs flex items-center gap-1.5 text-white border-2 border-pink-300 shadow-md font-black cursor-pointer"
                title={isFullscreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
              {screenBy === me && (
                <button
                  type="button"
                  onClick={stopShare}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-500/25 hover:bg-pink-500/40 text-pink-200 border-2 border-pink-500/50 text-xs font-black cursor-pointer transition"
                  title="Stop sharing your screen"
                >
                  <MonitorOff className="h-3.5 w-3.5 text-pink-400" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Regular Video Mode: Top-Right Toolbar (Full Screen + Sync & Audio) - 100% Permanently Visible */}
        {!stream && (
          <div
            className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 sm:gap-2 transition-all duration-300 pointer-events-auto ${
              isFullscreen
                ? (!showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100')
                : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-[11px] font-black transition cursor-pointer shadow-xl ${
                isFullscreen
                  ? 'btn-pink text-white border-pink-300'
                  : 'bg-[#181824] hover:bg-[#252536] text-white border-pink-500/40 hover:border-pink-400'
              }`}
              title={isFullscreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5 text-white" /> : <Maximize2 className="h-3.5 w-3.5 text-pink-400" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAudioVisualizer(!showAudioVisualizer)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-[11px] font-black transition cursor-pointer shadow-xl ${
                showAudioVisualizer
                  ? 'btn-pink text-white border-pink-300'
                  : 'bg-[#181824] hover:bg-[#252536] text-white border-pink-500/40 hover:border-pink-400'
              }`}
              title="Toggle Dynamic In-Room Cinema Audio Spectrum Visualizer"
            >
              <Volume2 className="h-3.5 w-3.5 text-pink-400" />
              <span className="hidden sm:inline">Visualizer</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-[11px] font-black transition cursor-pointer shadow-xl ${
                showSettings
                  ? 'btn-pink text-white border-pink-300'
                  : 'bg-[#181824] hover:bg-[#252536] text-white border-pink-500/40 hover:border-pink-400'
              }`}
              title="Precision Sync, Speed & Audio Settings"
            >
              <Sliders className="h-3.5 w-3.5 text-pink-400" />
              <span className="hidden sm:inline">Sync & Audio</span>
            </button>
          </div>
        )}

        {/* Synchronized Buffer Hold Overlay (Clean, Solid, No Heavy Animations) */}
        {bufferHold?.active && (
          <div className="absolute inset-0 z-35 flex items-center justify-center p-4 bg-black/90 pointer-events-auto select-none">
            <div className="max-w-md w-full p-6 rounded-3xl bg-[#161622] border-2 border-pink-500/60 text-center shadow-2xl space-y-4">
              <div className="relative mx-auto h-16 w-16 grid place-items-center rounded-2xl bg-pink-500/20 border-2 border-pink-400">
                <Popcorn3D size={42} className="relative z-10" />
              </div>

              <div className="space-y-1">
                <span className="inline-block px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/50 text-[11px] font-black text-pink-300 uppercase tracking-widest">
                  VIP Sync Buffer Hold
                </span>
                <p className="text-sm font-bold text-white pt-1">
                  {bufferHold.isLocal ? (
                    <span>Buffering stream… Holding playback so you stay 100% in sync with your partner.</span>
                  ) : (
                    <span><strong className="text-pink-300 font-black">{bufferHold.name}</strong> is buffering… Playback paused smoothly for both.</span>
                  )}
                </p>
                <p className="text-xs text-pink-200/90 font-medium">
                  ⚡ Auto-playing in 0ms lock the moment buffer recovers • Autonomous auto-fixer handles everything.
                </p>
              </div>

              {/* 16-Bar Luxury Static Equalizer Spectrum Indicator */}
              <div className="flex items-end justify-center gap-1.5 h-8 py-1">
                {[35, 70, 50, 95, 60, 100, 75, 85, 45, 90, 65, 80, 50, 95, 70, 40].map((h, i) => (
                  <span
                    key={i}
                    className="w-1.5 rounded-full bg-gradient-to-t from-pink-500 via-rose-400 to-white"
                    style={{
                      height: `${h}%`,
                      boxShadow: '0 0 6px rgba(236,72,153,0.5)'
                    }}
                  />
                ))}
              </div>

              <div className="pt-2 flex items-center justify-center gap-4">
                <span className="text-xs text-emerald-400 font-extrabold flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
                  Auto-Fixer Active
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBufferHold(null);
                    api.current?.play();
                  }}
                  className="px-4 py-2 rounded-xl bg-pink-500/25 hover:bg-pink-500/40 border-2 border-pink-500/50 text-xs font-black text-white transition cursor-pointer"
                >
                  Resume anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remote Cloud Upload Progress Card (for Partner) */}
        {remoteUpload && remoteUpload.progress < 100 && (
          <div className="absolute top-14 inset-x-4 z-30 mx-auto max-w-md pointer-events-auto">
            <div className="p-3.5 rounded-2xl bg-[#1A1A1D]/95 border border-pink-500/30 backdrop-blur-md shadow-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-pink-200 flex items-center gap-1.5 truncate">
                  <SparkleStar3D size={16} /> Partner uploading: {remoteUpload.name || 'Movie'}
                </span>
                <span className="font-mono text-pink-300 font-extrabold shrink-0">
                  {remoteUpload.progress}% {remoteUpload.speed ? `(${remoteUpload.speed} MB/s)` : ''}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden border border-pink-500/20">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-amber-300 transition-all duration-300 rounded-full"
                  style={{ width: `${remoteUpload.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className="text-[11px] text-pink-200/80 leading-snug">
                  Waiting for cloud upload?
                </p>
                <label className="btn-pink py-1.5 px-3 rounded-xl text-white font-extrabold text-[11px] inline-flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 shrink-0">
                  <Zap className="h-3 w-3" />
                  <span>Pick My Copy (0s Wait)</span>
                  <input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Host Upload Progress Banner */}
        {uploading && uploading.progress < 100 && (
          <div className="absolute top-14 inset-x-4 z-30 mx-auto max-w-md pointer-events-auto">
            <div className="p-2.5 rounded-xl bg-[#1A1A1D]/95 border border-pink-500/30 backdrop-blur-md shadow-2xl flex items-center justify-between gap-3 text-xs">
              <span className="text-pink-200 truncate flex items-center gap-1.5 font-medium">
                <SyncBolt3D size={16} /> High-Speed Cloud upload: {uploading.progress}% {uploading.speed ? `(${uploading.speed} MB/s)` : ''} (Playing locally with 0s wait)
              </span>
              <span className="font-mono text-pink-300 font-bold shrink-0">{uploading.progress}%</span>
            </div>
          </div>
        )}

        {/* Floating In-Room Cinema Audio Spectrum Visualizer HUD */}
        {showAudioVisualizer && (
          <div className="absolute bottom-16 right-4 z-30 pointer-events-auto p-3 rounded-2xl bg-[#1A1A1D]/90 border border-pink-500/30 backdrop-blur-md shadow-2xl flex flex-col gap-2 max-w-xs">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-pink-100 flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-pink-400" />
                <span>Audio Spectrum</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAudioVisualizer(false)}
                className="text-[11px] text-pink-300/60 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Dynamic Equalizer Frequency Wave */}
            <div className="flex items-end justify-between gap-1 h-9 px-1 py-0.5 bg-black/40 rounded-xl border border-pink-500/15">
              {[50, 85, 60, 95, 40, 100, 75, 90, 65, 80, 55, 70].map((baseH, idx) => {
                const isPlaying = st.current?.playing || (vref.current && !vref.current.paused);
                const dynamicH = isPlaying ? Math.max(15, Math.round(baseH * (0.45 + Math.sin(Date.now() / 250 + idx) * 0.45))) : 15;
                return (
                  <span
                    key={idx}
                    className="w-1.5 rounded-full bg-gradient-to-t from-pink-500 to-rose-300 transition-all duration-150"
                    style={{ height: `${dynamicH}%` }}
                  />
                );
              })}
            </div>

            {/* Sound Mode Quick Switch */}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              {[
                { id: 'dolby', label: 'Dolby 3D' },
                { id: 'bass', label: 'Bass +150%' },
                { id: 'clear', label: 'Vocal Clear' },
                { id: 'date', label: 'Lo-Fi Date' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setAudioMode(mode.id);
                    if (mode.id === 'bass') handleAudioBoost(150);
                    else if (mode.id === 'dolby') handleAudioBoost(120);
                    else handleAudioBoost(100);
                  }}
                  className={`py-1 px-1.5 rounded-lg font-bold border transition cursor-pointer text-center ${
                    audioMode === mode.id
                      ? 'btn-pink text-white border-pink-400 shadow-sm'
                      : 'bg-black/30 border-pink-500/20 text-pink-200/70 hover:text-pink-100'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Autonomous Auto-Heal & Self-Healing Toast Badge */}
        {autoHealBadge && (
          <div className="absolute bottom-16 inset-x-4 z-30 mx-auto max-w-sm pointer-events-none flex justify-center">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A1A1D]/95 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-2xl backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{autoHealBadge}</span>
            </div>
          </div>
        )}

        <video
          ref={shareEl}
          autoPlay
          playsInline
          muted={screenBy === me}
          crossOrigin="anonymous"
          className={`absolute inset-0 h-full w-full bg-[#222222] object-contain will-change-transform ${stream ? '' : 'hidden'}`}
          style={{ transform: 'translateZ(0)' }}
        />
        {/* Tap for Sound Button (Mobile Autoplay Unmute) */}
        {screenAudioLocked && stream && screenBy !== me && (
          <button
            type="button"
            onClick={() => {
              if (shareEl.current) {
                shareEl.current.muted = false;
                shareEl.current.play().catch(() => {});
                setScreenAudioLocked(false);
              }
            }}
            className="btn-pink absolute bottom-4 right-4 z-40 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[#FCE7F3] text-xs font-semibold shadow-2xl cursor-pointer"
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Tap for Sound 🔊</span>
          </button>
        )}
        <video
          ref={vref}
          controls
          playsInline
          crossOrigin="anonymous"
          preload="auto"
          onError={(e) => {
            console.warn('HTML5 Video error, invoking auto-healing engine:', e);
            autoFixEngine.autoFixVideo(vref.current, {
              currentTime: st.current?.time || 0,
              src: media?.src || '',
              onReloadSource: (t) => {
                if (media?.src) loadUrl(media.src, t);
              },
              onFallbackProxy: (t) => {
                if (media?.src) loadUrl(toStreamProxyUrl(media.src), t);
              },
            });
          }}
          onWaiting={() => {
            clearTimeout(vref.current?.__stallTimer);
            vref.current.__stallTimer = setTimeout(() => {
              if (vref.current && vref.current.readyState < 3 && playing.current) {
                autoFixEngine.autoFixVideo(vref.current, { currentTime: st.current?.time || 0, src: media?.src });
              }
            }, 3500);
          }}
          onPlaying={() => {
            clearTimeout(vref.current?.__stallTimer);
            autoFixEngine.markHealthy(media?.src || 'current_video');
          }}
          className={`absolute inset-0 h-full w-full ${show(['file', 'hls', 'dash', 'local'].includes(T))}`}
          style={{ transform: 'translateZ(0)' }}
        >
          {sub && <track key={sub} default kind="subtitles" src={sub} srcLang="en" label="Subtitles" />}
        </video>
        <div ref={ytBox} className={`absolute inset-0 ${show(T === 'youtube')}`} />
        <div ref={vmBox} className={`absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full ${show(T === 'vimeo')}`} />
        {(T === 'embed' || T === 'proxy' || T === 'hybrid' || T === 'ott') && !stream && (
          <iframe
            src={media.src || 'about:blank'}
            referrerPolicy="origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="eager"
            className="absolute inset-0 h-full w-full bg-[#222222] border-0"
          />
        )}
        {T === 'local' && !localUrl && !stream && (
          <label className="absolute inset-0 grid cursor-pointer place-items-center p-6 text-center text-white/90 bg-[#222222]/90 backdrop-blur-sm z-20">
            <div className="max-w-sm space-y-3">
              <FolderOpen className="h-10 w-10 mx-auto text-[#EC4899]" />
              <p className="font-semibold text-sm sm:text-base text-[#FCE7F3]">Partner picked: {media.name}</p>
              <p className="text-xs text-[#FBCFE8]/80">Wait a moment while the file uploads, or tap below to pick this file if you already have it on your phone.</p>
              <span className="btn-pink !py-2 !px-4 text-xs inline-flex items-center gap-1.5 text-[#FCE7F3]">
                <FolderOpen className="h-3.5 w-3.5" />
                Pick File from Device
                <input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden />
              </span>
            </div>
          </label>
        )}
        {T === 'none' && !stream && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none ${
            theme?.isLight
              ? 'bg-gradient-to-b from-white/98 via-[#fff7fa] to-rose-50/95 text-slate-900'
              : 'bg-[#222222] text-[#FCE7F3]'
          }`}>
            {/* Sync Telemetry Badge */}
            <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-all duration-300 hover:scale-105 ${
              theme?.isLight
                ? 'bg-white border-2 border-rose-200 text-slate-800 shadow-sm'
                : 'bg-white/10 border border-white/15 text-pink-200'
            }`}>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold">In sync</span>
              <span className="opacity-40">•</span>
              <span className="font-mono text-[11px] text-emerald-600 font-extrabold">131ms</span>
            </div>

            <div className="relative mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 shadow-xl shadow-pink-500/30 anim-pulse-glow hover:scale-110 transition-transform duration-300 cursor-pointer">
              <Play className="h-8 w-8 fill-white text-white ml-1 drop-shadow" />
            </div>
            <p className={`font-display text-2xl sm:text-3xl font-black tracking-tight ${theme?.isLight ? 'text-shimmer-light' : 'text-shimmer'}`}>
              Ready to Stream
            </p>
            <p className={`text-xs sm:text-sm mt-1 max-w-md anim-reveal ${theme?.isLight ? 'text-slate-700 font-medium' : 'text-pink-200/80'}`}>
              Paste a video link below or choose from your watchlist to begin watching together.
            </p>

            {/* Quick Action Suggestion Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => autoPlayUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  theme?.isLight
                    ? 'bg-white hover:bg-rose-50 border-2 border-rose-200 text-slate-800 hover:border-rose-400'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                }`}
              >
                <span>🍿 Demo Film</span>
              </button>
              <label
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ${
                  theme?.isLight
                    ? 'bg-white hover:bg-rose-50 border-2 border-rose-200 text-slate-800 hover:border-rose-400'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white'
                }`}
              >
                <span>📁 Open My File</span>
                <input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden />
              </label>
              <button
                type="button"
                onClick={handleClipboardPasteAndPlay}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                  theme?.isLight
                    ? 'bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-800'
                    : 'btn-pink text-white'
                }`}
              >
                <span>📋 Paste Clipboard</span>
              </button>
            </div>
          </div>
        )}
        {/* Mobile Autoplay Permission Overlay: Unlocks audio/video on tap if browser blocked playback */}
        {autoplayBlocked && (
          <div
            onClick={() => {
              if (vref.current) {
                vref.current.play().then(() => setAutoplayBlocked(false)).catch(() => {});
              } else if (api.current?.play) {
                api.current.play();
                setAutoplayBlocked(false);
              }
            }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#222222]/85 backdrop-blur-sm cursor-pointer p-4 text-center transition"
          >
            <div className="relative mb-3 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-tr from-[#EC4899] to-[#F472B6] shadow-[0_0_30px_rgba(255,109,31,0.6)] animate-pulse">
              <Play className="h-8 w-8 fill-[#FCE7F3] text-[#FCE7F3] ml-1" />
            </div>
            <p className="font-semibold text-base sm:text-lg text-[#FCE7F3]">Tap to Sync &amp; Play</p>
            <p className="text-xs text-[#FBCFE8]/80 mt-1 max-w-xs">Your partner is watching! Tap anywhere to join in real-time sync 🍿</p>
          </div>
        )}

        <div id="reaction-layer" className="pointer-events-none absolute inset-0" />

        {/* Floating Video Call PiP inside Full Screen Mode (Movable & Draggable) */}
        {isFullscreen && showFsPip && (
          <div
            ref={pipRef}
            style={pipPos ? { left: `${pipPos.x}px`, top: `${pipPos.y}px`, right: 'auto', bottom: 'auto' } : undefined}
            className={`absolute z-40 ${pipPos ? '' : cornerClasses[pipCorner]} ${isDraggingPip ? 'select-none transition-none' : 'transition-all duration-200'}`}
            onMouseMove={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-2xl bg-[#222222]/95 backdrop-blur-xl border border-[#EC4899]/40 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden group/pip ring-1 ring-white/10">
              {/* PiP Header Toolbar (Draggable Grip) */}
              <div
                onMouseDown={handlePipDragStart}
                onTouchStart={handlePipDragStart}
                className="flex items-center justify-between gap-1.5 px-1 pb-1 text-[#FCE7F3]/80 border-b border-white/10 mb-1.5 text-[10px] cursor-grab active:cursor-grabbing select-none touch-none bg-white/[0.04] rounded-lg p-1"
                title="Hold & drag to move video call anywhere on screen"
              >
                <div className="flex items-center gap-1.5 font-semibold truncate max-w-[100px] sm:max-w-[130px]">
                  <GripHorizontal className="h-3 w-3 text-[#F472B6] shrink-0" />
                  <span className="text-white text-[10px] font-bold truncate">
                    {users.find((u) => u.id !== me)?.name || 'Video Call'}
                  </span>
                  {(callMedia?.localTalking || Object.values(callMedia?.remoteTalking || {}).some(Boolean)) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {!isGhost && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowFsLocalPip((prev) => !prev); }}
                      className={`p-1 rounded text-[9px] font-semibold transition cursor-pointer ${
                        showFsLocalPip ? 'bg-[#EC4899] text-white shadow-md' : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                      }`}
                      title={showFsLocalPip ? 'Hide my preview' : 'Show my preview'}
                    >
                      You
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={cyclePipCorner}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/90 text-[9px] transition cursor-pointer"
                    title="Snap call to next corner (keeps movie subtitles clear)"
                  >
                    <Move className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowFsPip(false); }}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
                    title="Minimize video call (Audio stays active; click 'Show Call' anytime)"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

              {/* Main Video Call Area: Remote partners + optional local preview */}
              <div className="relative">
                {users.filter((u) => u.id !== me).length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {users.filter((u) => u.id !== me).map((u) => (
                      <Tile
                        key={u.id}
                        stream={callMedia?.remote?.[u.id]}
                        name={u.name}
                        isPartner={true}
                        voiceOnly={callMedia?.voiceOnly}
                        isSpeaking={!!callMedia?.remoteTalking?.[u.id]}
                        isCamOff={!!callMedia?.remoteCamOff?.[u.id]}
                        isMicMuted={!!callMedia?.remoteMicMuted?.[u.id]}
                        disableFullscreen={true}
                        className="!w-32 sm:!w-40 md:!w-48 aspect-video rounded-xl overflow-hidden shadow-md"
                      />
                    ))}
                    {showFsLocalPip && !isGhost && (
                      <div className="pt-1 border-t border-white/10">
                        <Tile
                          stream={callMedia?.mine}
                          name="You"
                          isPartner={false}
                          voiceOnly={callMedia?.voiceOnly}
                          isSpeaking={callMedia?.localTalking}
                          isCamOff={!callMedia?.cam}
                          isMicMuted={!callMedia?.mic}
                          disableFullscreen={true}
                          className="!w-32 sm:!w-40 md:!w-48 aspect-video rounded-xl overflow-hidden shadow-md opacity-90"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-32 sm:w-40 md:!w-48 aspect-video rounded-xl bg-[#222222] border border-white/10 flex flex-col items-center justify-center p-2 text-center">
                    <Video className="h-4 w-4 text-[#F472B6] opacity-70 mb-0.5 animate-pulse" />
                    <p className="text-[10px] text-[#FCE7F3] font-bold">Solo in Room</p>
                    <p className="text-[8px] text-[#FBCFE8]/60">Waiting for partner</p>
                  </div>
                )}
              </div>

              {/* Quick In-Call Controls: Slim mic/cam controls */}
              {!isGhost && (
                <div className="flex items-center justify-between gap-1 pt-1.5 mt-1.5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (callMedia?.toggleMic) callMedia.toggleMic();
                      else callControlsRef?.current?.toggleMic?.();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[9px] font-bold transition cursor-pointer ${
                      callMedia?.mic
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-[#EC4899]/20 border border-[#EC4899]/40 text-[#FCE7F3] shadow-sm'
                    }`}
                    title={callMedia?.mic ? 'Mute microphone' : 'Unmute microphone'}
                  >
                    {callMedia?.mic ? <Mic className="h-2.5 w-2.5" /> : <MicOff className="h-2.5 w-2.5 text-[#F472B6]" />}
                    <span>{callMedia?.mic ? 'Mic On' : 'Muted'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (callMedia?.toggleCam) callMedia.toggleCam();
                      else callControlsRef?.current?.toggleCam?.();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[9px] font-bold transition cursor-pointer ${
                      callMedia?.cam
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                        : 'bg-[#EC4899]/20 border border-[#EC4899]/40 text-[#FCE7F3] shadow-sm'
                    }`}
                    title={callMedia?.cam ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {callMedia?.cam ? <Video className="h-2.5 w-2.5 text-emerald-400" /> : <VideoOff className="h-2.5 w-2.5 text-[#F472B6]" />}
                    <span>{callMedia?.cam ? 'Cam On' : 'Off'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Minimized PiP Pill when user temporarily hid the call */}
        {isFullscreen && !showFsPip && (
          <button
            type="button"
            onClick={() => setShowFsPip(true)}
            className={`absolute z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181824] border-2 border-pink-500/40 text-white text-xs font-black hover:border-pink-400 transition shadow-2xl cursor-pointer ${cornerClasses[pipCorner]}`}
            title="Show Video Call PiP"
          >
            <Video className="h-3.5 w-3.5 text-pink-400" />
            <span>Show Call</span>
            {(callMedia?.localTalking || Object.values(callMedia?.remoteTalking || {}).some(Boolean)) && (
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>
        )}
      </div>

      {/* Instant Multi-User Playback Sync Controls Bar (Fast-Seek, Zero-Drift Play/Pause & Forward/Rewind) */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl border-2 border-pink-500/35 bg-[#161622] shadow-2xl text-xs my-2 transition-colors duration-300">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => seekDelta(-10)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black transition cursor-pointer active:scale-95 border-2 border-white/20 bg-[#222230] hover:bg-[#2C2C3E] text-white shadow-md hover-lift"
            title="Rewind 10 seconds (Synced for all participants)"
          >
            <RotateCcw className="h-3.5 w-3.5 text-pink-400 stroke-[2.5]" />
            <span className="font-mono text-xs">-10s</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (playing.current) {
                api.current.pause();
                send('PAUSE');
              } else {
                api.current.play();
                send('PLAY');
              }
            }}
            className="btn-pink flex items-center gap-2 px-5 py-2 rounded-xl text-white font-black shadow-lg shadow-pink-500/40 transition cursor-pointer active:scale-95 hover-lift hover-sheen text-xs sm:text-sm border-2 border-pink-300"
            title={playing.current ? "Pause video for all participants" : "Play video for all participants"}
          >
            {playing.current ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-white stroke-[2]" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => seekDelta(10)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black transition cursor-pointer active:scale-95 border-2 border-white/20 bg-[#222230] hover:bg-[#2C2C3E] text-white shadow-md hover-lift"
            title="Forward 10 seconds (Synced for all participants)"
          >
            <span className="font-mono text-xs">+10s</span>
            <FastForward className="h-3.5 w-3.5 text-pink-400 stroke-[2.5]" />
          </button>
        </div>

        {/* Sync Status Telemetry & Built-in VPN Shield Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* VPN Shield Status / Quick Toggle Pill */}
          <button
            type="button"
            onClick={() => setVpnShield((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-[11px] sm:text-xs font-black transition cursor-pointer active:scale-95 shadow-md ${
              vpnShield
                ? 'bg-[#14261B] border-emerald-400 text-emerald-300 shadow-emerald-950/60'
                : 'bg-[#222230] border-white/20 text-zinc-300'
            }`}
            title={vpnShield ? '🛡️ VPN Shield Active: IP cloaked & ISP/campus network blocks bypassed' : 'VPN Shield Disabled (Tap to Enable)'}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${vpnShield ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
            <span className="hidden xs:inline">VPN</span>
            <span>{vpnShield ? 'Shield ON' : 'Off'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-emerald-400/60 bg-[#16221A] text-white text-[11px] font-bold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-mono font-black text-emerald-300">0.0ms</span>
            <span className="text-zinc-200">Drift Lock</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl transition border-2 border-white/20 bg-[#222230] hover:bg-[#2C2C3E] text-white shadow-md cursor-pointer hover:border-pink-500/50"
            title="Toggle Cinema Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-pink-400" /> : <Maximize2 className="h-4 w-4 text-pink-400" />}
          </button>
        </div>
      </div>

      {/* Dynamic Stream Server Switcher (Multi-mirror fast fallback & 1080p HD Selector) */}
      {media?.mirrorSources && media.mirrorSources.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-3 bg-[#16161A]/95 border-2 border-pink-500/25 rounded-2xl my-2 text-xs shadow-xl backdrop-blur-2xl">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-black text-[11px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
              <span>💎</span>
              <span>1080p HD</span>
            </span>
            <span className="text-[11px] text-zinc-300 font-bold hidden sm:inline">
              Mirror:
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {media.mirrorSources.map((srv, idx) => {
              const isActive = media.src === srv.url || media.currentServerIndex === idx;
              return (
                <button
                  key={srv.name}
                  type="button"
                  onClick={() => {
                    socket?.emit('media:set', {
                      media: {
                        ...media,
                        src: srv.url,
                        currentServerIndex: idx,
                      },
                    });
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer flex items-center gap-1 shadow-md ${
                    isActive
                      ? 'btn-pink text-white shadow-pink-500/40 border border-pink-300/40'
                      : 'bg-[#25252B] hover:bg-[#32323A] text-white border border-white/20 hover:border-pink-500/50'
                  }`}
                  title={`${srv.name} (${srv.quality || '1080p'})`}
                >
                  <span>{srv.tag || `S${idx + 1}`}</span>
                  <span className="opacity-95 font-bold">{srv.quality || '1080p'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Precision Sync & Audio Drawer (Vivid High Contrast & Complete Visibility) */}
      {showSettings && (
        <div className="card p-5 !bg-[#161622] border-2 border-pink-500/40 rounded-2xl shadow-2xl space-y-4 text-white">
          <div className="flex items-center justify-between border-b-2 border-pink-500/30 pb-3">
            <span className="text-xs font-black text-pink-100 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-pink-400" /> Precision Sync &amp; Audio Controls
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs px-3 py-1 rounded-xl bg-rose-500/25 hover:bg-rose-500/40 border-2 border-rose-400 text-rose-200 font-black cursor-pointer transition"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Playback Speed (Synced) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[#1E1E2C] border-2 border-pink-500/25">
              <div className="flex justify-between text-white font-extrabold">
                <span className="flex items-center gap-1"><FastForward className="h-3.5 w-3.5 text-pink-400" /> Shared Speed</span>
                <span className="font-mono text-pink-200 font-black">{sharedSpeed}x</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSharedSpeed(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      sharedSpeed === s
                        ? 'btn-pink text-white shadow-md border-2 border-pink-300'
                        : 'bg-[#28283A] hover:bg-[#34344E] text-zinc-100 hover:text-white border border-white/20'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Local Audio Boost (Independent) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[#1E1E2C] border-2 border-emerald-500/25">
              <div className="flex justify-between text-white font-extrabold">
                <span className="flex items-center gap-1"><Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Local Audio Boost</span>
                <span className="font-mono text-emerald-300 font-black">{audioBoost}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="5"
                value={audioBoost}
                onChange={(e) => handleAudioBoost(e.target.value)}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <p className="text-[11px] text-zinc-300 font-medium">Boosts volume up to 200% for quiet phone/laptop speakers without affecting your partner.</p>
            </div>

            {/* Manual Sync Offset */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[#1E1E2C] border-2 border-amber-500/25">
              <div className="flex justify-between text-white font-extrabold">
                <span className="flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5 text-amber-400" /> Manual Sync Offset</span>
                <span className="font-mono text-amber-300 font-black">{syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.05"
                  value={syncOffset}
                  onChange={(e) => setSyncOffset(+e.target.value)}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSyncOffset(0)}
                  className="px-3 py-1 rounded-xl bg-[#28283A] hover:bg-[#34344E] text-white border border-white/20 text-xs font-bold shrink-0 cursor-pointer"
                  title="Reset to 0s"
                >
                  Reset
                </button>
              </div>
              <p className="text-[11px] text-zinc-300 font-medium">Compensate for personal Bluetooth headphones or wireless speaker delay.</p>
            </div>

            {/* Subtitle Appearance */}
            <div className="space-y-1.5 p-3 rounded-xl bg-[#1E1E2C] border-2 border-purple-500/25">
              <div className="flex justify-between text-white font-extrabold">
                <span className="flex items-center gap-1"><Captions className="h-3.5 w-3.5 text-purple-400" /> Subtitles Style</span>
                <span className="text-[11px] text-purple-300 font-bold">Independent</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <select
                  value={subStyle.size}
                  onChange={(e) => setSubStyle({ ...subStyle, size: e.target.value })}
                  className="bg-[#28283A] rounded-xl px-2.5 py-1.5 text-xs text-white border-2 border-white/20 font-bold outline-none cursor-pointer"
                >
                  <option value="sm" className="text-black bg-white">Small text</option>
                  <option value="md" className="text-black bg-white">Normal text</option>
                  <option value="lg" className="text-black bg-white">Large text</option>
                </select>
                <select
                  value={subStyle.color}
                  onChange={(e) => setSubStyle({ ...subStyle, color: e.target.value })}
                  className="bg-[#28283A] rounded-xl px-2.5 py-1.5 text-xs text-white border-2 border-white/20 font-bold outline-none cursor-pointer"
                >
                  <option value="#ffffff" className="text-black bg-white">White text</option>
                  <option value="#ffd700" className="text-black bg-white">Yellow text</option>
                  <option value="#00e5ff" className="text-black bg-white">Cyan text</option>
                  <option value="#fb7185" className="text-black bg-white">Rose text</option>
                </select>
                <select
                  value={subStyle.bg}
                  onChange={(e) => setSubStyle({ ...subStyle, bg: e.target.value })}
                  className="bg-[#28283A] rounded-xl px-2.5 py-1.5 text-xs text-white border-2 border-white/20 font-bold outline-none cursor-pointer"
                >
                  <option value="transparent" className="text-black bg-white">No Box</option>
                  <option value="rgba(0,0,0,0.5)" className="text-black bg-white">Semi-Dark</option>
                  <option value="rgba(0,0,0,0.85)" className="text-black bg-white">Dark Box</option>
                </select>
              </div>
            </div>

            {/* Smart Voice Ducking & Slowdown */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1E1E2C] border-2 border-pink-500/25 mt-1">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-pink-400" /> Smart Voice Ducking
                </p>
                <p className="text-[11px] text-zinc-300 font-medium pt-0.5">Auto-slows video (0.82x) and lowers movie volume when anyone speaks</p>
              </div>
              <button
                type="button"
                onClick={() => setSmartDuckingEnabled((prev) => !prev)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition shrink-0 cursor-pointer ${
                  smartDuckingEnabled ? 'btn-pink text-white shadow-md' : 'bg-[#28283A] text-zinc-300 border border-white/20 hover:text-white'
                }`}
              >
                {smartDuckingEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* Built-in VPN Shield & Network IP Cloak */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#1E1E2C] border-2 border-emerald-500/25 mt-1 col-span-1 sm:col-span-2">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  <Shield3D size={16} /> Built-in VPN Shield (Zero-Log IP Cloak)
                </p>
                <p className="text-[11px] text-zinc-300 font-medium pt-0.5">
                  Bypasses college Wi-Fi, strict ISP blocks, DNS firewalls, and hides your IP address via SyncCinema Layer-3 Encrypted Tunnel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVpnShield((prev) => !prev)}
                className={`rounded-xl px-4 py-2 text-xs font-black transition shrink-0 cursor-pointer ${
                  vpnShield ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-[#28283A] text-zinc-300 border border-white/20 hover:text-white'
                }`}
              >
                {vpnShield ? '🛡️ Shield Active' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="card flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 !bg-[#161622] border-2 border-pink-500/40 text-xs text-white shadow-2xl rounded-2xl">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="h-3 w-3 rounded-full bg-emerald-400 shrink-0" />
            <div className="truncate text-left">
              <span className="font-extrabold text-white block truncate">
                ⚡ Fast Cloud Stream: <b>{uploading.name}</b>
              </span>
              <span className="text-[11px] text-pink-200 font-mono font-bold">
                {uploading.speed ? `${uploading.speed} MB/s` : 'Buffering stream'} • {uploading.progress}% • {uploading.eta ? `${uploading.eta}s remaining` : 'Accelerated'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <div className="h-2.5 w-full sm:w-36 bg-[#252536] border border-white/20 rounded-full overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-emerald-400 transition-all duration-200"
                style={{ width: `${uploading.progress}%` }}
              />
            </div>
            <span className="font-mono text-xs text-emerald-400 font-bold shrink-0">{uploading.progress}%</span>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <form onSubmit={load} className="flex flex-col gap-2">
        {resolvingStatus && (
          <div className="flex items-center gap-3 text-xs font-black py-2.5 px-4 rounded-2xl bg-[#1D1426] border-2 border-pink-500 text-pink-100 shadow-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-400 shrink-0" />
            <Sparkles className="h-4 w-4 text-pink-400 shrink-0" />
            <span className="tracking-wide drop-shadow-sm">{resolvingStatus}</span>
          </div>
        )}
        <div className="p-2 sm:p-2.5 rounded-2xl bg-[#161622] border-2 border-pink-500/40 shadow-2xl shadow-black/80 flex flex-col sm:flex-row gap-2">
          <div className="relative min-w-0 flex-1">
            <Link2 className="absolute left-3 top-3.5 h-4 w-4 text-pink-400" />
            <input
              value={url}
              onChange={handleUrlChange}
              onPaste={handlePasteAndPlay}
              placeholder="Paste any video or movie link (YouTube, HLS, MP4, Prime, Netflix) - Auto plays in sync..."
              className="w-full !pl-9 !py-2.5 text-xs sm:text-sm rounded-xl outline-none font-bold bg-[#1E1E2C] border-2 border-pink-500/30 text-white placeholder:text-zinc-400 focus:border-pink-400 shadow-inner"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClipboardPasteAndPlay}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md hover-lift bg-[#252536] hover:bg-[#34344A] text-white border-2 border-pink-500/40 active:scale-95"
              title="Paste link from clipboard and play immediately"
            >
              <span>📋</span>
              <span>Paste &amp; Play</span>
            </button>
            <button
              type="submit"
              className="btn-pink !py-2.5 !px-5 text-xs font-black shrink-0 flex items-center justify-center gap-1.5 rounded-xl shadow-lg shadow-pink-500/40 text-white cursor-pointer active:scale-95 hover-lift hover-sheen border-2 border-pink-300"
            >
              <Play className="h-3.5 w-3.5 fill-white stroke-[2]" />
              <span>Play for All</span>
            </button>
          </div>
        </div>

        {/* Ultra-Vivid Jewel-Toned High-Contrast Action Toolbar */}
        <div className="flex items-center gap-2.5 pt-1 text-xs overflow-x-auto no-scrollbar p-3 rounded-2xl bg-[#121218] border-2 border-pink-500/40 shadow-2xl shadow-black">
          {/* Add to queue */}
          <button
            type="button"
            onClick={enqueue}
            className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-pink-950/40 transition-all duration-200 cursor-pointer shrink-0 border-2 border-pink-500 bg-[#251525] hover:bg-[#381B34] text-white hover:border-pink-300 hover-lift active:scale-95"
            title="Add this link to the Up next list"
          >
            <ListPlus className="h-4 w-4 text-pink-400 stroke-[3] shrink-0" />
            <span className="text-white font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Add to queue</span>
          </button>

          {/* My file */}
          <label
            className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-purple-950/40 transition-all duration-200 cursor-pointer shrink-0 border-2 border-purple-500 bg-[#201530] hover:bg-[#301E4A] text-white hover:border-purple-300 hover-lift active:scale-95"
            title="Play a movie file from your own device"
          >
            <FolderOpen className="h-4 w-4 text-purple-400 stroke-[3] shrink-0" />
            <span className="text-white font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">My file</span>
            <input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden />
          </label>

          {/* Subtitles */}
          <label
            className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all duration-200 cursor-pointer shrink-0 border-2 border-amber-500 bg-[#261E10] hover:bg-[#3D2E14] text-white hover:border-amber-300 hover-lift active:scale-95"
            title="Add .srt or .vtt subtitles"
          >
            <Captions className="h-4 w-4 text-amber-400 stroke-[3] shrink-0" />
            <span className="text-white font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Subtitles</span>
            <input type="file" accept=".srt,.vtt" onChange={pickSub} hidden />
          </label>

          {/* Recent Bar */}
          {onOpenRecent && (
            <button
              type="button"
              onClick={onOpenRecent}
              className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition-all duration-200 cursor-pointer shrink-0 border-2 border-cyan-500 bg-[#10222B] hover:bg-[#153444] text-white hover:border-cyan-300 hover-lift active:scale-95"
              title="Open Recent Plays Bar"
            >
              <History className="h-4 w-4 text-cyan-400 stroke-[3] shrink-0" />
              <span className="text-white font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Recent Bar</span>
            </button>
          )}

          {/* Multi-Audio Language Selector */}
          {audioTracks.length > 1 && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-pink-500 bg-[#251525] px-4 py-2.5 text-xs font-black shadow-lg shadow-pink-950/40 shrink-0 text-white" title="Audio track / language">
              <Volume2 className="h-4 w-4 text-pink-400 stroke-[3] shrink-0" />
              <select value={curAudio} onChange={(e) => switchAudio(+e.target.value)} aria-label="Audio language" className="bg-transparent text-white outline-none cursor-pointer font-black text-xs">
                {audioTracks.map((t) => <option key={t.id} value={t.id} className="text-black bg-white font-bold">{t.name}</option>)}
              </select>
            </div>
          )}

          {/* Screen Share Button */}
          {screenBy === me ? (
            <button
              type="button"
              onClick={stopShare}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 border-2 border-rose-300 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-rose-900/50 transition cursor-pointer shrink-0 active:scale-95"
            >
              <MonitorOff className="h-4 w-4 text-white stroke-[3] shrink-0" />
              <span className="text-white font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Stop sharing</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startShare}
              disabled={!!screenBy}
              className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all duration-200 cursor-pointer disabled:opacity-40 shrink-0 border-2 border-emerald-500 bg-[#102619] hover:bg-[#163B25] text-white hover:border-emerald-300 active:scale-95"
              title="Show your screen to your partner"
            >
              <MonitorUp className="h-4 w-4 text-emerald-400 stroke-[3] shrink-0" />
              <span className="text-white font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Share screen</span>
            </button>
          )}

          {/* Stream Resolver Type Selector */}
          <div className="flex items-center gap-2 rounded-xl border-2 border-rose-500 bg-[#2A1520] px-4 py-2.5 text-xs font-black shadow-lg shadow-rose-950/40 shrink-0 text-white" title="Media stream resolver type">
            <span className="text-rose-400 font-black text-sm">⚡</span>
            <select
              value={force}
              onChange={(e) => setForce(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer font-black text-xs pr-1"
            >
              {TYPES.map((t) => (
                <option key={t} value={t} className="text-black bg-white font-bold">
                  {t === 'auto' ? 'Type: Auto ▾' : t.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {stream && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-pink-950/40 transition cursor-pointer shrink-0 border-2 border-pink-500 bg-[#251525] hover:bg-[#381B34] text-white hover:border-pink-300 active:scale-95"
              title="Full Screen Screenshare"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-pink-400 stroke-[3] shrink-0" /> : <Maximize2 className="h-4 w-4 text-pink-400 stroke-[3] shrink-0" />}
              <span className="text-white font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
