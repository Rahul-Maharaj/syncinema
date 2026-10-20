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
}) {
  const [media, setMedia] = useState(initial.media);
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
  const [isLiveStream, setIsLiveStream] = useState(false);
  const [audioBoost, setAudioBoost] = useState(100); // 100% to 200%
  const [showSettings, setShowSettings] = useState(false);
  const [subStyle, setSubStyle] = useState({ size: 'md', color: '#ffffff', bg: 'rgba(0,0,0,0.75)' });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [resolvingStatus, setResolvingStatus] = useState('');
  const [screenAudioLocked, setScreenAudioLocked] = useState(false);

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

  // Handle partner buffering status & speed synchronization (non-blocking)
  useEffect(() => {
    if (!socket) return;
    let partnerBufferTimeout = null;
    const onBuffering = ({ cid, name, buffering }) => {
      if (cid !== me) {
        if (buffering) {
          setPartnerBuffering({ name, active: true });
          clearTimeout(partnerBufferTimeout);
          partnerBufferTimeout = setTimeout(() => setPartnerBuffering(null), 4000);
        } else {
          clearTimeout(partnerBufferTimeout);
          setPartnerBuffering(null);
        }
      }
    };
    const onSpeed = ({ speed, by }) => {
      if (by !== me) {
        setSharedSpeed(speed);
        setPlaybackSpeed(speed);
      }
    };
    socket.on('player:buffering', onBuffering);
    socket.on('player:speed', onSpeed);
    return () => {
      socket.off('player:buffering', onBuffering);
      socket.off('player:speed', onSpeed);
      if (partnerBufferTimeout) clearTimeout(partnerBufferTimeout);
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

  const silently = (fn) => { quiet.current = true; fn(); setTimeout(() => (quiet.current = false), 800); };
  const send = (action) => {
    if (quiet.current) return;
    playing.current = action === 'PLAY' ? true : action === 'SEEK' ? playing.current : false;
    socket.emit('player', { action, time: api.current.time() });
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
  const correct = (targetTime, shouldPlay, sentAt) => silently(() => {
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
      if (shouldPlay) {
        a.play();
      } else {
        a.pause();
      }
      playing.current = shouldPlay;
    }

    // If element is already buffering or seeking, let it finish loading first
    if (v && (v.seeking || v.readyState < 2)) return;

    // 1. Rock-Solid Deadband (<= 0.5s):
    // Inaudible difference. Zero rate shift, zero seeking. Keeps both phones rock-solid in sync.
    if (absDrift <= 0.5) {
      setSyncStatus('in_sync');
      driftHistory.current = [];
      if (!voiceActive) setPlaybackSpeed(sharedSpeed);
      return;
    }

    // 2. Soft Sync (0.5s to 2.2s) while playing:
    // Gently glide back into sync using imperceptible +/- 4% speed micro-adjustment. NO hard pauses or seeking!
    if (absDrift <= 2.2 && shouldPlay) {
      setSyncStatus('syncing');
      driftHistory.current.push(drift);
      if (driftHistory.current.length > 2) driftHistory.current.shift();
      const avg = driftHistory.current.reduce((x, y) => x + y, 0) / driftHistory.current.length;

      if (!voiceActive) {
        if (avg < 0) {
          setPlaybackSpeed(sharedSpeed * 1.04); // Behind: catch up smoothly
        } else {
          setPlaybackSpeed(sharedSpeed * 0.96); // Ahead: wait smoothly
        }
      }
      clearTimeout(rateTimer.current);
      rateTimer.current = setTimeout(() => {
        if (!voiceActive) setPlaybackSpeed(sharedSpeed);
        setSyncStatus('in_sync');
      }, 1500);
      return;
    }

    // 3. Hard Sync (> 2.2s): user skip, track change, or major network lag
    if (absDrift > 2.2) {
      setSyncStatus('syncing');
      lastProgrammaticSeek.current = Date.now();
      if (!voiceActive) setPlaybackSpeed(sharedSpeed);
      a.seek(compensatedTarget);
      driftHistory.current = [];
      setTimeout(() => setSyncStatus('in_sync'), 600);
    }
  });

  // ---------- <video>: mp4/webm/audio, HLS, DASH ----------
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    setError('');
    if (!['file', 'hls', 'dash', 'local'].includes(T)) { v.pause(); v.removeAttribute('src'); v.load(); return; }
    if (T === 'local' && !localUrl) { v.removeAttribute('src'); v.load(); return; }
    let dispose = () => {};
    setAudioTracks([]);

    if (T === 'hls' && !v.canPlayType('application/vnd.apple.mpegurl'))
      import('hls.js').then(({ default: H }) => {
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
        hlsRef.current = h;
        h.loadSource(media.src);
        h.attachMedia(v);
        dispose = () => { hlsRef.current = null; h.destroy(); };

        h.on(H.Events.MANIFEST_PARSED, () => {
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
          setError('');
        });
        h.on(H.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
          if (data.audioTracks && data.audioTracks.length > 0) {
            setAudioTracks(data.audioTracks.map((t, idx) => ({ id: idx, name: t.name || t.lang || `Track ${idx + 1}` })));
          }
        });
        h.on(H.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
          setCurAudio(data.id);
        });
        h.on(H.Events.ERROR, (_, d) => {
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
    else if (T === 'dash') import('dashjs').then(({ MediaPlayer }) => { const d = MediaPlayer().create(); d.initialize(v, media.src, false); dispose = () => d.reset(); });
    else v.src = T === 'local' ? localUrl : media.src;

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
          if (Date.now() - lastProgrammaticSeek.current < 2000) return;
          send(a);
        };
        v.addEventListener(e, f);
        return () => v.removeEventListener(e, f);
      });
    
    let waitTimer = null;
    const onWait = () => {
      clearTimeout(waitTimer);
      waitTimer = setTimeout(() => {
        socket.emit('player:buffering', { buffering: true, time: v.currentTime });
      }, 700);
    };
    const onResume = () => {
      clearTimeout(waitTimer);
      socket.emit('player:buffering', { buffering: false, time: v.currentTime });
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
      evs.forEach((o) => o());
      clearTimeout(waitTimer);
      v.removeEventListener('waiting', onWait);
      v.removeEventListener('canplay', onResume);
      v.removeEventListener('playing', onResume);
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

    const onPlayer = ({ action, time, by, sentAt }) => silently(() => {
      const a = api.current;
      if (by === me) return;
      if (action === 'PLAY') {
        a.play();
        playing.current = true;
        correct(time, true, sentAt);
      } else if (action === 'PAUSE') {
        a.pause();
        playing.current = false;
        if (!isDucked) setPlaybackSpeed(1.0);
      } else if (action === 'SEEK') {
        lastProgrammaticSeek.current = Date.now();
        a.seek(time);
        correct(time, playing.current, sentAt);
      }
    });

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
      seek: (t) => { api.current.seek(t); send('SEEK'); },
      toggleFullscreen,
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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setError('Screen sharing is not supported on this mobile browser. Note: iOS Safari restricts screen capture. Please use Android Chrome 107+ or desktop Chrome/Edge/Firefox.');
        return;
      }

      // Robust progressive fallback for mobile and desktop screenshare
      let s;
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
          // Pure video mode (most reliable on Android Chrome)
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
       clean.includes('youtube.com') ||
       clean.includes('youtu.be') ||
       clean.includes('vimeo.com') ||
       clean.includes('imdb.com') ||
       clean.includes('themoviedb.org') ||
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
    setLocalUrl(URL.createObjectURL(f));
    setUploading({ progress: 0, name: f.name });

    // Stream file to server so partner's phone can automatically play it
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('x-file-name', encodeURIComponent(f.name));

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setUploading({ progress: pct, name: f.name });
      }
    };

    xhr.onload = () => {
      setUploading(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          // Broadcast the shared file stream URL to partner!
          socket.emit('media:set', {
            media: {
              type: 'file',
              src: res.url,
              name: f.name,
            },
          });
        } catch {}
      } else {
        socket.emit('media:set', { media: { type: 'local', name: f.name } });
      }
    };

    xhr.onerror = () => {
      setUploading(null);
      socket.emit('media:set', { media: { type: 'local', name: f.name } });
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
        className={`vault relative overflow-hidden bg-[#222222] transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0 flex items-center justify-center'
            : 'aspect-video rounded-2xl border border-white/10'
        }`}
      >
        {/* Top-Left Status Cluster: Sync Status + Live Stream (Zero Overlap) */}
        <div
          className={`absolute top-3 left-3 z-30 flex items-center gap-2 transition-opacity duration-300 pointer-events-auto ${
            isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/10 text-[11px] text-white/90 shadow-lg">
            <span className={`h-2 w-2 rounded-full ${syncStatus === 'in_sync' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-[#EC4899]'}`} />
            <span className="font-medium">{syncStatus === 'in_sync' ? `In sync • ${syncLatency}ms` : syncStatus === 'syncing' ? 'Fine-tuning…' : 'Syncing'}</span>
            {syncOffset !== 0 && (
              <span className="text-[10px] text-[#F472B6] font-mono ml-0.5">
                ({syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`})
              </span>
            )}
          </div>

          {isLiveStream && (
            <div className="btn-pink flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#FCE7F3] border border-white/20 shadow-lg backdrop-blur-md">
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

        {/* Screensharing Active Header & Full Screen Toggle */}
        {stream && (
          <div
            className={`absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-2 p-2 rounded-xl bg-[#222222]/90 backdrop-blur-md border border-white/15 transition-opacity duration-300 ${
              isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EC4899] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EC4899]"></span>
              </span>
              <span className="text-xs font-semibold text-[#FCE7F3] truncate">
                {screenBy === me
                  ? '🖥️ You are sharing your screen'
                  : `🖥️ ${users.find((u) => u.id === screenBy)?.name || 'Partner'} is sharing screen`}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="btn-pink !py-1 !px-3 text-xs flex items-center gap-1.5 text-[#FCE7F3] border-0 shadow-md font-semibold cursor-pointer"
                title={isFullscreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
              {screenBy === me && (
                <button
                  type="button"
                  onClick={stopShare}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EC4899]/20 hover:bg-[#EC4899]/30 text-[#FCE7F3] border border-[#EC4899]/30 text-xs font-medium cursor-pointer transition"
                  title="Stop sharing your screen"
                >
                  <MonitorOff className="h-3.5 w-3.5 text-[#F472B6]" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Regular Video Mode: Top-Right Toolbar (Full Screen + Sync & Audio) */}
        {!stream && (
          <div
            className={`absolute top-3 right-3 z-20 flex items-center gap-2 transition-all duration-300 ${
              isFullscreen
                ? (!showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100')
                : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100 focus-within:opacity-100 pointer-events-auto'
            }`}
          >
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer shadow-lg backdrop-blur-md ${
                isFullscreen
                  ? 'btn-pink text-[#FCE7F3] border-white/30'
                  : 'bg-[#222222]/90 hover:bg-[#222222] text-[#FCE7F3]/90 hover:text-[#FCE7F3] border-white/20 hover:border-white/40'
              }`}
              title={isFullscreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3 text-[#FCE7F3]" /> : <Maximize2 className="h-3 w-3 text-[#F472B6]" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer shadow-lg backdrop-blur-md ${
                showSettings
                  ? 'btn-pink text-[#FCE7F3] border-white/30'
                  : 'bg-[#222222]/90 hover:bg-[#222222] text-[#FCE7F3]/80 hover:text-[#FCE7F3] border-white/10 hover:border-white/30'
              }`}
              title="Precision Sync, Speed & Audio Settings"
            >
              <Sliders className="h-3 w-3 text-[#F472B6]" />
              <span className="hidden sm:inline">Sync & Audio</span>
            </button>
          </div>
        )}

        {/* Partner Buffering Alert Banner */}
        {partnerBuffering?.active && (
          <div className="absolute inset-x-4 top-14 z-30 mx-auto max-w-md">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#222222] border border-amber-500/40 text-amber-200 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
              <span><b>{partnerBuffering.name}</b> is buffering… Paused smoothly so you stay in sync 🍿</span>
            </div>
          </div>
        )}

        {/* Desync Recovery Banner */}
        {syncStatus === 'desync' && (
          <div className="absolute inset-x-4 bottom-14 z-30 mx-auto max-w-sm rise">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#222222]/95 backdrop-blur-md border border-[#EC4899]/40 text-[#FCE7F3] text-xs shadow-2xl">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>Drift detected</span>
              </div>
              <button
                type="button"
                onClick={() => correct(st.current.time, st.current.playing)}
                className="btn !py-1 !px-2.5 text-[11px] flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" /> Resync
              </button>
            </div>
          </div>
        )}

        <video
          ref={shareEl}
          autoPlay
          playsInline
          muted={screenBy === me}
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
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-fullscreen"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#222222] p-4 text-center text-[#FCE7F3]">
            <div className="relative mb-2 grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl bg-gradient-to-tr from-[#EC4899] to-[#F472B6] shadow-xl shadow-[#EC4899]/30 animate-pulse">
              <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-[#FCE7F3] text-[#FCE7F3] ml-0.5" />
            </div>
            <p className="font-display text-sm sm:text-base font-bold text-[#FCE7F3] tracking-wide">Ready to Stream</p>
            <p className="text-[11px] sm:text-xs text-[#FBCFE8]/80 mt-0.5 max-w-xs">
              Paste any movie or video link below to watch together in 0ms sync
            </p>
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
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer p-4 text-center transition"
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
            className={`absolute z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#222222]/95 backdrop-blur-md border border-white/20 text-[#FCE7F3] text-xs hover:border-[#EC4899] transition shadow-2xl cursor-pointer ${cornerClasses[pipCorner]}`}
            title="Show Video Call PiP"
          >
            <Video className="h-3.5 w-3.5 text-[#F472B6]" />
            <span>Show Call</span>
            {(callMedia?.localTalking || Object.values(callMedia?.remoteTalking || {}).some(Boolean)) && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </button>
        )}
      </div>

      {/* Dynamic Stream Server Switcher (Multi-mirror fast fallback & 1080p HD Selector) */}
      {media?.mirrorSources && media.mirrorSources.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 bg-[#222222] border border-white/10 rounded-2xl my-2 text-xs backdrop-blur-xl">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1">
              <span>💎</span>
              <span>1080p HD</span>
            </span>
            <span className="text-[10px] text-white/50 font-semibold hidden sm:inline">
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
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? 'btn-pink text-[#FCE7F3] shadow-md font-bold border border-[#EC4899]/50'
                      : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10'
                  }`}
                  title={`${srv.name} (${srv.quality || '1080p'})`}
                >
                  <span>{srv.tag || `S${idx + 1}`}</span>
                  <span className="opacity-90">{srv.quality || '1080p'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Precision Sync & Audio Drawer */}
      {showSettings && (
        <div className="card p-4 !bg-[#222222] border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold text-[#FCE7F3] uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[#F472B6]" /> Precision Sync &amp; Audio Controls
            </span>
            <button onClick={() => setShowSettings(false)} className="text-xs opacity-60 hover:opacity-100">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Playback Speed (Synced) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-white/80">
                <span className="font-semibold flex items-center gap-1"><FastForward className="h-3.5 w-3.5 text-[#F472B6]" /> Shared Speed</span>
                <span className="font-mono text-[#FCE7F3]">{sharedSpeed}x</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSharedSpeed(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      sharedSpeed === s
                        ? 'btn-pink text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Local Audio Boost (Independent) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-white/80">
                <span className="font-semibold flex items-center gap-1"><Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Local Audio Boost</span>
                <span className="font-mono text-emerald-300">{audioBoost}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="5"
                value={audioBoost}
                onChange={(e) => handleAudioBoost(e.target.value)}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[10px] text-white/50">Boosts volume up to 200% for quiet phone/laptop speakers without affecting your partner.</p>
            </div>

            {/* Manual Sync Offset */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-white/80">
                <span className="font-semibold flex items-center gap-1"><RotateCcw className="h-3.5 w-3.5 text-amber-400" /> Manual Sync Offset</span>
                <span className="font-mono text-amber-300">{syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.05"
                  value={syncOffset}
                  onChange={(e) => setSyncOffset(+e.target.value)}
                  className="w-full accent-[#EC4899] cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setSyncOffset(0)}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] shrink-0"
                  title="Reset to 0s"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-white/50">Compensate for personal Bluetooth headphones or wireless speaker delay.</p>
            </div>

            {/* Subtitle Appearance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-white/80">
                <span className="font-semibold flex items-center gap-1"><Captions className="h-3.5 w-3.5 text-indigo-400" /> Subtitles Style</span>
                <span className="text-[10px] text-white/60">Independent</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={subStyle.size}
                  onChange={(e) => setSubStyle({ ...subStyle, size: e.target.value })}
                  className="bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/10"
                >
                  <option value="sm" className="text-black">Small text</option>
                  <option value="md" className="text-black">Normal text</option>
                  <option value="lg" className="text-black">Large text</option>
                </select>
                <select
                  value={subStyle.color}
                  onChange={(e) => setSubStyle({ ...subStyle, color: e.target.value })}
                  className="bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/10"
                >
                  <option value="#ffffff" className="text-black">White text</option>
                  <option value="#ffd700" className="text-black">Yellow text</option>
                  <option value="#00e5ff" className="text-black">Cyan text</option>
                  <option value="#fb7185" className="text-black">Rose text</option>
                </select>
                <select
                  value={subStyle.bg}
                  onChange={(e) => setSubStyle({ ...subStyle, bg: e.target.value })}
                  className="bg-white/10 rounded px-2 py-1 text-xs text-white border border-white/10"
                >
                  <option value="transparent" className="text-black">No Box</option>
                  <option value="rgba(0,0,0,0.5)" className="text-black">Semi-Dark</option>
                  <option value="rgba(0,0,0,0.85)" className="text-black">Dark Box</option>
                </select>
              </div>
            </div>

            {/* Smart Voice Ducking & Slowdown */}
            <div className="flex items-center justify-between py-2 border-t border-white/10 mt-1">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Mic className="h-3.5 w-3.5 text-[#F472B6]" /> Smart Voice Ducking
                </p>
                <p className="text-[10px] text-white/50">Auto-slows video (0.82x) and lowers movie volume when anyone speaks</p>
              </div>
              <button
                type="button"
                onClick={() => setSmartDuckingEnabled((prev) => !prev)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition shrink-0 ${
                  smartDuckingEnabled ? 'btn-pink text-white shadow-md' : 'bg-white/10 text-white/50'
                }`}
              >
                {smartDuckingEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="card flex items-center justify-between gap-3 p-3 !bg-[#222222] border border-white/20 text-xs text-white">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-2.5 w-2.5 rounded-full bg-[#EC4899] shrink-0" />
            <span className="truncate">Sharing <b>{uploading.name}</b> with partner&apos;s phone ({uploading.progress}%)…</span>
          </div>
          <div className="h-2 w-28 bg-white/15 rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-gradient-to-r from-[#EC4899] to-[#F472B6] transition-all duration-200" style={{ width: `${uploading.progress}%` }} />
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
          <div className="flex items-center gap-2 text-xs text-[#FCE7F3] font-medium py-1.5 px-3 rounded-xl bg-[#EC4899]/15 border border-[#EC4899]/30">
            <Sparkles className="h-3.5 w-3.5 text-[#F472B6] shrink-0" />
            <span>{resolvingStatus}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative min-w-0 flex-1">
            <Link2 className="absolute left-3 top-3 h-4 w-4 opacity-50" />
            <input
              value={url}
              onChange={handleUrlChange}
              onPaste={handlePasteAndPlay}
              placeholder="Paste any video or movie link (YouTube, HLS, MP4, Prime, Netflix) - Auto plays in sync..."
              className="field !pl-9 !py-2.5 text-xs sm:text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClipboardPasteAndPlay}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/25 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md hover:border-[#EC4899]/60 hover:text-[#FCE7F3] backdrop-blur-md"
              title="Paste link from clipboard and play immediately"
            >
              <span>📋</span>
              <span>Paste &amp; Play</span>
            </button>
            <button
              type="submit"
              className="btn-pink !py-2.5 !px-5 text-xs font-extrabold shrink-0 flex items-center justify-center gap-1.5 shadow-lg shadow-[#EC4899]/30 text-[#FCE7F3] cursor-pointer active:scale-95"
            >
              <Play className="h-3.5 w-3.5 fill-[#FCE7F3]" />
              <span>Play for All</span>
            </button>
          </div>
        </div>

        {/* High-Contrast, Crystal-Clear Secondary Action Toolbar */}
        <div className="flex items-center gap-2 pt-1 text-xs overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={enqueue}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 hover:border-[#EC4899]/60 text-white hover:text-[#FCE7F3] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition cursor-pointer"
            title="Add this link to the Up next list"
          >
            <ListPlus className="h-4 w-4 text-[#F472B6] shrink-0" />
            <span>Add to queue</span>
          </button>

          <label
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 hover:border-[#EC4899]/60 text-white hover:text-[#FCE7F3] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition cursor-pointer"
            title="Play a movie file from your own device"
          >
            <FolderOpen className="h-4 w-4 text-[#F472B6] shrink-0" />
            <span>My file</span>
            <input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden />
          </label>

          <label
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 hover:border-[#EC4899]/60 text-white hover:text-[#FCE7F3] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition cursor-pointer"
            title="Add .srt or .vtt subtitles"
          >
            <Captions className="h-4 w-4 text-[#F472B6] shrink-0" />
            <span>Subtitles</span>
            <input type="file" accept=".srt,.vtt" onChange={pickSub} hidden />
          </label>

          {onOpenRecent && (
            <button
              type="button"
              onClick={onOpenRecent}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 hover:border-cyan-400/60 text-white hover:text-cyan-300 font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition cursor-pointer"
              title="Open Recent Plays Bar"
            >
              <History className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Recent Bar</span>
            </button>
          )}

          {audioTracks.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white shadow-md backdrop-blur-md" title="Audio track / language">
              <Volume2 className="h-4 w-4 text-[#F472B6] shrink-0" />
              <select value={curAudio} onChange={(e) => switchAudio(+e.target.value)} aria-label="Audio language" className="bg-transparent text-white outline-none cursor-pointer font-semibold">
                {audioTracks.map((t) => <option key={t.id} value={t.id} className="text-black bg-white">{t.name}</option>)}
              </select>
            </div>
          )}

          {screenBy === me ? (
            <button
              type="button"
              onClick={stopShare}
              className="px-3 py-2 rounded-xl bg-[#EC4899]/30 hover:bg-[#EC4899]/50 border border-[#EC4899]/60 text-white font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition cursor-pointer"
            >
              <MonitorOff className="h-4 w-4 text-[#F472B6] shrink-0" />
              <span>Stop sharing</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startShare}
              disabled={!!screenBy}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 hover:border-emerald-400/60 text-white hover:text-emerald-300 font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition cursor-pointer disabled:opacity-40"
              title="Show your screen to your partner"
            >
              <MonitorUp className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Share screen</span>
            </button>
          )}

          {stream && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 hover:border-[#EC4899]/60 text-white hover:text-[#FCE7F3] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-md transition cursor-pointer"
              title="Full Screen Screenshare"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-[#F472B6] shrink-0" /> : <Maximize2 className="h-4 w-4 text-[#F472B6] shrink-0" />}
              <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>
          )}

          <select
            value={force}
            onChange={(e) => setForce(e.target.value)}
            aria-label="Link type"
            className="px-3 py-2 rounded-xl border border-white/25 bg-[#222222] text-white text-xs font-semibold shadow-md backdrop-blur-md outline-none focus:border-[#EC4899] transition cursor-pointer"
            title="Link type (Auto detects it for you)"
          >
            {TYPES.map((t) => <option key={t} value={t} className="text-black bg-white">{t === 'auto' ? 'Type: Auto' : t.toUpperCase()}</option>)}
          </select>
        </div>
      </form>
    </div>
  );
}
