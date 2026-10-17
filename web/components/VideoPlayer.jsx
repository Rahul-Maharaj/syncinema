'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Link2, MonitorUp, MonitorOff, ExternalLink, AlertTriangle, FolderOpen,
  Captions, ListPlus, Play, Volume2, Sliders, Radio, Zap, Settings,
  RefreshCw, Sparkles, FastForward, Check, RotateCcw, Mic, History,
  Maximize2, Minimize2, Video, VideoOff, MicOff, Move, X, EyeOff, Eye,
  Tv, Film, Search, Globe
} from 'lucide-react';
import {
  detect, ytId, vimeoId, loadScript, ytReady, toEmbed, toProxyUrl,
  toStreamProxyUrl, resolveMedia, isAdultMedia, sanitizeDisplayTitle,
  getOttPlatform, isOttPlatform, OTT_PLATFORMS, getCloudMirrorSources
} from '@/lib/media';
import { Tile } from './CouplesOverlay';

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
  const T = media.type;
  const [localUrl, setLocalUrl] = useState(null), [sub, setSub] = useState(null), [hist, setHist] = useState([]);
  const [uploading, setUploading] = useState(null); // { progress: number, name: string } | null
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
  const [showOttModal, setShowOttModal] = useState(false);
  const [ottSearchQuery, setOttSearchQuery] = useState('');

  // Fullscreen & Floating Video Call PiP State
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsPip, setShowFsPip] = useState(true);
  const [pipCorner, setPipCorner] = useState('bottom-right'); // 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right'
  const [showOverlayControls, setShowOverlayControls] = useState(true);
  const overlayTimerRef = useRef(null);

  const cornerClasses = {
    'bottom-right': 'bottom-4 right-4 sm:bottom-6 sm:right-6',
    'bottom-left': 'bottom-4 left-4 sm:bottom-6 sm:left-6',
    'top-left': 'top-16 left-4 sm:top-18 sm:left-6',
    'top-right': 'top-16 right-4 sm:top-18 sm:right-6',
  };

  const cyclePipCorner = useCallback((e) => {
    e?.stopPropagation?.();
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
    };

    return () => {
      socket.off('state', onState);
      socket.off('player', onPlayer);
      socket.off('heartbeat', onBeat);
      clearInterval(beat);
      clearTimeout(rateTimer.current);
    };
  }, [me, hostId]);

  // ---------- screen share (WebRTC optimized for low-end devices) ----------
  useEffect(() => {
    if (shareEl.current) shareEl.current.srcObject = stream || null;
  }, [stream]);

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
        // High quality tab audio + video capture (best for Hotstar, Netflix, Prime Video)
        s = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
            frameRate: { ideal: 60, max: 60 },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
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
                    params.encodings[0].maxBitrate = 4000000;
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

  const buildMedia = async (rawUrl) => {
    let src = (rawUrl || url).trim();
    if (!src) return null;
    if (!/^https?:\/\//i.test(src) && !src.startsWith('/api/')) src = 'https://' + src;

    const isAdult = isAdultMedia(src);

    // 0. OTT platforms (Disney+ Hotstar, Netflix, Prime Video, JioCinema, Zee5, SonyLIV, etc.)
    const ott = getOttPlatform(src);
    if (ott || force === 'hybrid') {
      return {
        type: 'hybrid',
        src,
        origSrc: src,
        platform: ott?.name || 'Hybrid OTT',
        icon: ott?.icon || '🍿',
        color: ott?.color || '#d9467a',
        title: ott ? `${ott.name} Cinema` : 'Hybrid Cinema',
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

    // 4. Server-side auto-resolver (checks direct HLS extraction, tube converters, movie extractors, etc.)
    try {
      const resolved = await resolveMedia(src);
      if (resolved && (resolved.type === 'hls' || resolved.type === 'file' || resolved.type === 'embed' || resolved.type === 'proxy')) {
        if (resolved.subtitle) setSub(resolved.subtitle);
        if (isAdult) {
          resolved.title = '🔒 Private Stream';
          resolved.origSrc = '🔒 Private Stream';
        }
        return resolved;
      }
    } catch {}

    // 5. Tube or adult platform proxying fallback (bypasses ISP bans and X-Frame-Options)
    if (isTubeOrEmbedHost(src)) {
      return {
        type: 'proxy',
        src: toProxyUrl(src),
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

  const handlePasteAndPlay = async (e) => {
    const pasted = e.clipboardData?.getData?.('text')?.trim?.();
    if (!pasted) return;
    if (
      /^(https?:\/\/|\/api\/|www\.)/i.test(pasted) ||
      ytId(pasted) ||
      vimeoId(pasted) ||
      isOttPlatform(pasted) ||
      isTubeOrEmbedHost(pasted) ||
      /\.(mp4|webm|m3u8|mpd|mkv|mov|mp3|wav|m4a|flac)(\?|$)/i.test(pasted)
    ) {
      setUrl(pasted);
      setError('');
      setResolvingStatus('⚡ Auto-detecting link & playing for everyone...');
      try {
        const m = await buildMedia(pasted);
        if (m) {
          socket.emit('media:set', { media: m });
          const targetUrl = m.origSrc || m.orig || m.src;
          const h = [targetUrl, ...hist.filter((x) => x !== targetUrl)].slice(0, 20);
          setHist(h);
          try {
            localStorage.hist = JSON.stringify(h);
            window.dispatchEvent(new Event('storage'));
          } catch {}
          setResolvingStatus('🎬 Playing now in sync!');
          setTimeout(() => setResolvingStatus(''), 2500);
          setUrl('');
        } else {
          setResolvingStatus('');
        }
      } catch (err) {
        setResolvingStatus('');
        setError('Auto-play error: ' + (err?.message || 'Failed to detect video'));
      }
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
    e.preventDefault();
    setError('');
    const m = await buildMedia(url);
    if (!m) return;
    socket.emit('media:set', { media: m });
    const targetUrl = m.origSrc || m.orig || m.src;
    const h = [targetUrl, ...hist.filter((x) => x !== targetUrl)].slice(0, 20);
    setHist(h);
    try {
      localStorage.hist = JSON.stringify(h);
      window.dispatchEvent(new Event('storage'));
    } catch {}
    setUrl('');
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
        onMouseMove={isFullscreen ? resetOverlayTimer : undefined}
        onTouchStart={isFullscreen ? resetOverlayTimer : undefined}
        className={`vault relative overflow-hidden bg-black transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-50 w-screen h-screen rounded-none border-0 flex items-center justify-center'
            : 'aspect-video rounded-2xl border border-white/10'
        }`}
      >
        {/* Sync Status Badge */}
        <div
          className={`absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 border border-white/10 text-[11px] text-white/90 transition-opacity duration-300 ${
            isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${syncStatus === 'in_sync' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400' : 'bg-rose-400'}`} />
          <span className="font-medium">{syncStatus === 'in_sync' ? `In sync • ${syncLatency}ms` : syncStatus === 'syncing' ? 'Fine-tuning…' : 'Syncing'}</span>
          {syncOffset !== 0 && (
            <span className="text-[10px] text-[#ff6fa0] font-mono ml-0.5">
              ({syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`})
            </span>
          )}
        </div>

        {/* Live Stream Badge */}
        {isLiveStream && (
          <div
            className={`absolute top-3 left-36 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-[11px] font-bold text-white border border-white/20 transition-opacity duration-300 ${
              isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <Radio className="h-3 w-3" />
            <span>LIVE</span>
            <button
              type="button"
              onClick={() => {
                if (hlsRef.current?.liveSyncPosition) vref.current.currentTime = hlsRef.current.liveSyncPosition;
                else if (vref.current && Number.isFinite(vref.current.duration)) vref.current.currentTime = vref.current.duration;
              }}
              className="ml-1 underline hover:text-white/80 text-[10px]"
              title="Jump to live edge"
            >
              Catch up
            </button>
          </div>
        )}

        {/* Smart Voice Talk Ducking & Slowdown Banner */}
        {isDucked && (
          <div
            className={`absolute top-12 left-3 z-30 flex items-center gap-2 rounded-full bg-black border border-white/20 px-3 py-1 text-[11px] font-medium text-white pointer-events-none transition-opacity duration-300 ${
              isFullscreen && !showOverlayControls ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d9467a]"></span>
            </span>
            <span>🎙️ Couch Talk: Audio ducked & video slowed for voice (0.82x)</span>
          </div>
        )}

        {/* Screensharing Active Header & Full Screen Toggle */}
        {stream && (
          <div
            className={`absolute top-3 inset-x-3 z-30 flex items-center justify-between gap-2 p-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 transition-opacity duration-300 ${
              isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6fa0] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#d9467a]"></span>
              </span>
              <span className="text-xs font-semibold text-white truncate">
                {screenBy === me
                  ? '🖥️ You are sharing your screen'
                  : `🖥️ ${users.find((u) => u.id === screenBy)?.name || 'Partner'} is sharing screen`}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="btn !py-1 !px-3 text-xs flex items-center gap-1.5 bg-[#d9467a] hover:bg-[#b83260] text-white border-0 shadow-md font-semibold cursor-pointer"
                title={isFullscreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
              >
                {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
              </button>
              {screenBy === me && (
                <button
                  type="button"
                  onClick={stopShare}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium cursor-pointer transition"
                  title="Stop sharing your screen"
                >
                  <MonitorOff className="h-3.5 w-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Regular Video Mode: Top-Right Toolbar (Full Screen + Sync & Audio) */}
        {!stream && (
          <div
            className={`absolute top-3 right-3 z-30 flex items-center gap-2 transition-opacity duration-300 ${
              isFullscreen && !showOverlayControls ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer shadow-lg ${
                isFullscreen
                  ? 'bg-[#d9467a] text-white border-white/30'
                  : 'bg-black/85 hover:bg-black text-white/90 hover:text-white border-white/20 hover:border-white/40'
              }`}
              title={isFullscreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
            >
              {isFullscreen ? <Minimize2 className="h-3 w-3 text-white" /> : <Maximize2 className="h-3 w-3 text-[#ff6fa0]" />}
              <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer shadow-lg ${
                showSettings
                  ? 'bg-[#d9467a] text-white border-white/30'
                  : 'bg-black/85 hover:bg-black text-white/80 hover:text-white border-white/10 hover:border-white/30'
              }`}
              title="Precision Sync, Speed & Audio Settings"
            >
              <Sliders className="h-3 w-3 text-[#ff6fa0]" />
              <span>Sync & Audio</span>
            </button>
          </div>
        )}

        {/* Partner Buffering Alert Banner */}
        {partnerBuffering?.active && (
          <div className="absolute inset-x-4 top-14 z-30 mx-auto max-w-md">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black border border-amber-500/40 text-amber-200 text-xs">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
              <span><b>{partnerBuffering.name}</b> is buffering… Paused smoothly so you stay in sync 🍿</span>
            </div>
          </div>
        )}

        {/* Desync Recovery Banner */}
        {syncStatus === 'desync' && (
          <div className="absolute inset-x-4 bottom-14 z-30 mx-auto max-w-sm rise">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/90 backdrop-blur-md border border-[#ff6fa0]/40 text-white text-xs shadow-2xl">
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
          className={`absolute inset-0 h-full w-full bg-black object-contain will-change-transform ${stream ? '' : 'hidden'}`}
          style={{ transform: 'translateZ(0)' }}
        />
        <video
          ref={vref}
          controls
          playsInline
          preload="auto"
          className={`absolute inset-0 h-full w-full ${show(['file', 'hls', 'dash', 'local'].includes(T))}`}
          style={{ transform: 'translateZ(0)' }}
        >
          {sub && <track key={sub} default kind="subtitles" src={sub} srcLang="en" label="Subtitles" />}
        </video>
        <div ref={ytBox} className={`absolute inset-0 ${show(T === 'youtube')}`} />
        <div ref={vmBox} className={`absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full ${show(T === 'vimeo')}`} />
        {(T === 'embed' || T === 'proxy') && !stream && (
          <iframe
            src={media.src}
            referrerPolicy="no-referrer-when-downgrade"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            loading="eager"
            className="absolute inset-0 h-full w-full bg-black/90"
          />
        )}
        {T === 'hybrid' && !stream && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 p-4 sm:p-6 text-center text-white overflow-y-auto">
            <div className="max-w-md w-full space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold shadow-inner">
                <span className="text-base">{media.icon || '🍿'}</span>
                <span>{media.platform || 'Hybrid OTT Cinema'}</span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  {media.platform ? `${media.platform} Cinema` : 'Hybrid Movie Stream'}
                </h3>
                <p className="text-xs text-white/70 mt-1.5 leading-relaxed">
                  Stream DRM-protected movies (Hotstar, Netflix, Prime Video) with 1080p video + crystal-clear synchronized stereo tab audio directly to your partner.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startHybridTabShare(media.src)}
                  className="btn !py-2.5 !px-5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
                >
                  <MonitorUp className="h-4 w-4" />
                  <span>Start Tab Audio Stream (1080p Stereo)</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={media.src}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition border border-white/15"
                  >
                    <span>Open in {media.platform || 'Platform'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      socket.emit('media:set', {
                        media: {
                          type: 'proxy',
                          src: toProxyUrl(media.src),
                          orig: media.src,
                          title: media.platform || 'Proxy Stream',
                        },
                      });
                    }}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition border border-white/10"
                    title="Attempt unblocked proxy iframe embed"
                  >
                    Try Proxy Embed
                  </button>
                </div>
              </div>

              {/* Cloud Movie Mirror Alternative */}
              <div className="pt-3 border-t border-white/10 text-left space-y-2">
                <p className="text-[11px] font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1">
                  <Film className="h-3.5 w-3.5 text-[#ff6fa0]" /> No Account? Play Cloud Movie Mirror
                </p>
                <div className="flex gap-1.5">
                  <input
                    value={ottSearchQuery}
                    onChange={(e) => setOttSearchQuery(e.target.value)}
                    placeholder="Search movie title (e.g. Inception, Stranger Things)…"
                    className="field !py-1.5 !px-2.5 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!ottSearchQuery.trim()) return;
                        socket.emit('media:set', {
                          media: {
                            type: 'embed',
                            src: `https://multiembed.mov/?video_id=${encodeURIComponent(ottSearchQuery.trim())}`,
                            orig: ottSearchQuery.trim(),
                            title: `Cloud Movie: ${ottSearchQuery.trim()}`,
                          },
                        });
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!ottSearchQuery.trim()) return;
                      socket.emit('media:set', {
                        media: {
                          type: 'embed',
                          src: `https://multiembed.mov/?video_id=${encodeURIComponent(ottSearchQuery.trim())}`,
                          orig: ottSearchQuery.trim(),
                          title: `Cloud Movie: ${ottSearchQuery.trim()}`,
                        },
                      });
                    }}
                    className="btn !py-1.5 !px-3 text-xs shrink-0"
                  >
                    Play Mirror
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {T === 'local' && !localUrl && !stream && (
          <label className="absolute inset-0 grid cursor-pointer place-items-center p-6 text-center text-white/90 bg-black/85 backdrop-blur-sm z-20">
            <div className="max-w-sm space-y-3">
              <FolderOpen className="h-10 w-10 mx-auto text-[#ff6fa0]" />
              <p className="font-semibold text-sm sm:text-base">Partner picked: {media.name}</p>
              <p className="text-xs text-white/70">Wait a moment while the file uploads, or tap below to pick this file if you already have it on your phone.</p>
              <span className="btn !py-2 !px-4 text-xs inline-flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                Pick File from Device
                <input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden />
              </span>
            </div>
          </label>
        )}
        {T === 'none' && !stream && (
          <div className="absolute inset-0 grid place-items-center bg-black p-6 text-center text-white">
            <div>
              <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#d9467a]"><Play className="h-7 w-7 fill-white" /></div>
              <p className="font-display text-xl font-semibold">Pick tonight&apos;s movie</p>
              <ol className="mt-4 space-y-2 text-left text-sm text-white/80">
                {['Paste any video link in the box below', 'Press “Play for everyone”', 'Or share your screen for any site'].map((t, i) => (
                  <li key={t} className="flex items-center gap-2">
                    <b className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-xs">{i + 1}</b>{t}
                  </li>
                ))}
              </ol>
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
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer p-4 text-center transition"
          >
            <div className="relative mb-3 grid h-16 w-16 place-items-center rounded-full bg-[#d9467a] shadow-[0_0_30px_rgba(217,70,122,0.8)] animate-pulse">
              <Play className="h-8 w-8 fill-white text-white ml-1" />
            </div>
            <p className="font-semibold text-base sm:text-lg text-white">Tap to Sync &amp; Play</p>
            <p className="text-xs text-white/70 mt-1 max-w-xs">Your partner is watching! Tap anywhere to join in real-time sync 🍿</p>
          </div>
        )}

        <div id="reaction-layer" className="pointer-events-none absolute inset-0" />

        {/* Floating Video Call PiP inside Full Screen Mode (Compact & Partner-Only) */}
        {isFullscreen && showFsPip && (
          <div
            className={`absolute z-40 transition-all duration-300 ${cornerClasses[pipCorner]}`}
            onMouseMove={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <div className="relative rounded-xl bg-black/90 backdrop-blur-md border border-white/20 p-1 sm:p-1.5 shadow-2xl overflow-hidden group/pip">
              {/* PiP Header Toolbar (Compact) */}
              <div className="flex items-center justify-between gap-1 px-1 pb-1 text-white/80 border-b border-white/10 mb-1 text-[10px]">
                <div className="flex items-center gap-1 font-semibold truncate max-w-[90px] sm:max-w-[120px]">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-white text-[10px] truncate">
                    {users.find((u) => u.id !== me)?.name || 'Partner'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={cyclePipCorner}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/90 text-[9px] transition cursor-pointer"
                    title="Move call to next corner (keeps movie subtitles visible)"
                  >
                    <Move className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFsPip(false)}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
                    title="Hide video call (Audio stays active; click 'Show Call' anytime)"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

              {/* Main Video Call Area: ONLY the other partner's stream (Local user preview removed) */}
              <div className="relative">
                {users.filter((u) => u.id !== me).length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {users.filter((u) => u.id !== me).map((u) => (
                      <Tile
                        key={u.id}
                        stream={callMedia?.remote?.[u.id]}
                        name={u.name}
                        isPartner={true}
                        voiceOnly={callMedia?.voiceOnly}
                        isSpeaking={!!callMedia?.remoteTalking?.[u.id]}
                        isCamOff={false}
                        disableFullscreen={true}
                        className="!w-28 sm:!w-36 md:!w-40 aspect-video rounded-lg overflow-hidden shadow-md"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-28 sm:w-36 md:w-40 aspect-video rounded-lg bg-black/80 border border-white/10 flex flex-col items-center justify-center p-2 text-center">
                    <Video className="h-4 w-4 text-[#ff6fa0] opacity-70 mb-0.5 animate-pulse" />
                    <p className="text-[10px] text-white/80 font-medium">Solo in Room</p>
                    <p className="text-[8px] text-white/40">Waiting for partner</p>
                  </div>
                )}
              </div>

              {/* Quick In-Call Controls: Slim mic/cam controls */}
              <div className="flex items-center justify-between gap-1 pt-1 mt-1 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (callMedia?.toggleMic) callMedia.toggleMic();
                    else callControlsRef?.current?.toggleMic?.();
                  }}
                  className={`flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded text-[9px] font-semibold transition ${
                    callMedia?.mic
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-rose-500/25 border border-rose-500/40 text-rose-300'
                  }`}
                  title={callMedia?.mic ? 'Mute microphone' : 'Unmute microphone'}
                >
                  {callMedia?.mic ? <Mic className="h-2.5 w-2.5 text-white" /> : <MicOff className="h-2.5 w-2.5 text-rose-400" />}
                  <span>{callMedia?.mic ? 'Mic' : 'Muted'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (callMedia?.toggleCam) callMedia.toggleCam();
                    else callControlsRef?.current?.toggleCam?.();
                  }}
                  className={`flex-1 flex items-center justify-center gap-0.5 py-0.5 px-1 rounded text-[9px] font-semibold transition ${
                    callMedia?.cam
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/25 border border-rose-500/40 text-rose-300'
                  }`}
                  title={callMedia?.cam ? 'Turn off camera' : 'Turn on camera'}
                >
                  {callMedia?.cam ? <Video className="h-2.5 w-2.5 text-emerald-400" /> : <VideoOff className="h-2.5 w-2.5 text-rose-400" />}
                  <span>{callMedia?.cam ? 'Cam' : 'Off'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Minimized PiP Pill when user temporarily hid the call */}
        {isFullscreen && !showFsPip && (
          <button
            type="button"
            onClick={() => setShowFsPip(true)}
            className={`absolute z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs hover:border-[#ff6fa0] transition shadow-2xl cursor-pointer ${cornerClasses[pipCorner]}`}
            title="Show Video Call PiP"
          >
            <Video className="h-3.5 w-3.5 text-[#ff6fa0]" />
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

      {/* Precision Sync & Audio Drawer */}
      {showSettings && (
        <div className="card p-4 !bg-black border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-[#ff6fa0]" /> Precision Sync &amp; Audio Controls
            </span>
            <button onClick={() => setShowSettings(false)} className="text-xs opacity-60 hover:opacity-100">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Playback Speed (Synced) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-white/80">
                <span className="font-semibold flex items-center gap-1"><FastForward className="h-3.5 w-3.5 text-[#ff6fa0]" /> Shared Speed</span>
                <span className="font-mono text-[#ff8fb3]">{sharedSpeed}x</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeSharedSpeed(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      sharedSpeed === s
                        ? 'bg-[#d9467a] text-white shadow-md'
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
                  className="w-full accent-[#d9467a] cursor-pointer"
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
                  <option value="#ff6fa0" className="text-black">Pink text</option>
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
                  <Mic className="h-3.5 w-3.5 text-[#ff6fa0]" /> Smart Voice Ducking
                </p>
                <p className="text-[10px] text-white/50">Auto-slows video (0.82x) and lowers movie volume when anyone speaks</p>
              </div>
              <button
                type="button"
                onClick={() => setSmartDuckingEnabled((prev) => !prev)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition shrink-0 ${
                  smartDuckingEnabled ? 'bg-[#d9467a] text-white' : 'bg-white/10 text-white/50'
                }`}
              >
                {smartDuckingEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="card flex items-center justify-between gap-3 p-3 !bg-black border border-white/20 text-xs text-white">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff6fa0] shrink-0" />
            <span className="truncate">Sharing <b>{uploading.name}</b> with partner&apos;s phone ({uploading.progress}%)…</span>
          </div>
          <div className="h-2 w-28 bg-white/15 rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-[#d9467a] transition-all duration-200" style={{ width: `${uploading.progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {(T === 'embed' || T === 'proxy') && !stream && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs opacity-75">
          <p>
            {T === 'proxy' ? '🛡️ Unblocked Proxy Active: ISP & ad blocks bypassed. ' : 'Embedded player: '}
            If playback is blocked, try{' '}
            <button
              type="button"
              onClick={() => {
                const target = media.orig || media.src;
                socket.emit('media:set', { media: { type: 'proxy', src: toProxyUrl(target), orig: target } });
              }}
              className="font-semibold underline hover:text-[#d9467a]"
            >
              Proxy Mode
            </button>{' '}
            or use <b>Share screen</b>.
          </p>
          <a
            href={media.orig || (media.src?.startsWith('/api/proxy') ? (new URLSearchParams(media.src.split('?')[1] || '').get('url') || media.src) : media.src)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline text-[#ff6fa0] hover:text-white"
          >
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <form onSubmit={load} className="flex flex-col gap-2">
        {resolvingStatus && (
          <div className="flex items-center gap-2 text-xs text-rose-300 font-medium py-1.5 px-3 rounded-xl bg-rose-500/15 border border-rose-500/30">
            <Sparkles className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            <span>{resolvingStatus}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-60">
            <Link2 className="absolute left-3 top-2.5 h-4 w-4 opacity-50" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={handlePasteAndPlay}
              placeholder="Paste any video link: YouTube, Vimeo, mp4, m3u8, movie sites (auto-detects & plays)…"
              className="field !pl-9"
            />
          </div>
          <button className="btn"><Play className="h-4 w-4" />Play for everyone</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={enqueue} className="ghost" title="Add this link to the Up next list"><ListPlus className="h-4 w-4" />Add to queue</button>
          <label className="ghost cursor-pointer" title="Play a movie file from your own device"><FolderOpen className="h-4 w-4" />My file<input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden /></label>
          <label className="ghost cursor-pointer" title="Add .srt or .vtt subtitles"><Captions className="h-4 w-4" />Subtitles<input type="file" accept=".srt,.vtt" onChange={pickSub} hidden /></label>
          {onOpenRecent && (
            <button type="button" onClick={onOpenRecent} className="ghost text-cyan-300 hover:text-white" title="Open Recent Plays Bar">
              <History className="h-4 w-4 text-cyan-400" />
              <span>Recent Bar</span>
            </button>
          )}
          {audioTracks.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/90" title="Audio track / language">
              <Volume2 className="h-4 w-4 text-[#ff6fa0]" />
              <select value={curAudio} onChange={(e) => switchAudio(+e.target.value)} aria-label="Audio language" className="bg-transparent text-white outline-none cursor-pointer">
                {audioTracks.map((t) => <option key={t.id} value={t.id} className="text-black bg-white">{t.name}</option>)}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowOttModal(true)}
            className="ghost text-[#ff6fa0] hover:text-white border border-[#d9467a]/40 bg-[#d9467a]/15 shadow-sm"
            title="Hybrid OTT: Stream Disney+ Hotstar, Netflix, Prime Video, JioCinema with Tab Audio or Cloud Mirror"
          >
            <Tv className="h-4 w-4 text-[#ff6fa0]" />
            <span>Hybrid OTT 🍿</span>
          </button>
          {screenBy === me
            ? <button type="button" onClick={stopShare} className="ghost"><MonitorOff className="h-4 w-4" />Stop sharing</button>
            : <button type="button" onClick={startShare} disabled={!!screenBy} className="ghost" title="Show your screen to your partner"><MonitorUp className="h-4 w-4" />Share screen</button>}
          {stream && (
            <button
              type="button"
              onClick={toggleFullscreen}
              className="ghost text-[#ff6fa0] hover:text-white"
              title="Full Screen Screenshare"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span>{isFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
            </button>
          )}
          <select value={force} onChange={(e) => setForce(e.target.value)} aria-label="Link type" className="field !w-auto" title="Link type (Auto detects it for you)">
            {TYPES.map((t) => <option key={t} value={t} className="text-black">{t === 'auto' ? 'Type: Auto' : t.toUpperCase()}</option>)}
          </select>
        </div>
      </form>

      {/* Hybrid OTT & Cloud Movie Modal */}
      {showOttModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-black border border-white/20 p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#d9467a]/20 border border-[#d9467a]/30 text-[#ff6fa0]">
                  <Tv className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                    Hybrid OTT Cinema <span className="text-xs px-2 py-0.5 rounded-full bg-[#d9467a] text-white">PRO</span>
                  </h3>
                  <p className="text-xs text-white/60">Stream Disney+ Hotstar, Netflix, Prime Video, JioCinema with Tab Audio or Cloud Mirror</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOttModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section 1: Tab Audio Mirror for DRM Platforms */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                  <MonitorUp className="h-3.5 w-3.5 text-[#ff6fa0]" /> 1-Click OTT Tab Audio Mirror (Zero DRM Blocks)
                </span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed">
                Click any platform below to open it and mirror the browser tab with <b>stereo audio &amp; 1080p 60fps video</b>. Both partners watch together in real time!
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { name: 'Disney+ Hotstar', url: 'https://www.hotstar.com', icon: '🌟', color: '#123962' },
                  { name: 'Netflix', url: 'https://www.netflix.com', icon: '🔴', color: '#E50914' },
                  { name: 'Prime Video', url: 'https://www.primevideo.com', icon: '🔵', color: '#00A8E1' },
                  { name: 'JioCinema', url: 'https://www.jiocinema.com', icon: '🟣', color: '#D40078' },
                  { name: 'Zee5', url: 'https://www.zee5.com', icon: '🟠', color: '#7E3AF2' },
                  { name: 'SonyLIV', url: 'https://www.sonyliv.com', icon: '🔷', color: '#0066FF' },
                ].map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setShowOttModal(false);
                      socket.emit('media:set', {
                        media: {
                          type: 'hybrid',
                          src: p.url,
                          origSrc: p.url,
                          platform: p.name,
                          icon: p.icon,
                          color: p.color,
                          title: `${p.name} Cinema`,
                        },
                      });
                      startHybridTabShare(p.url);
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#ff6fa0]/40 text-left transition group cursor-pointer"
                  >
                    <span className="text-lg">{p.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white group-hover:text-[#ff6fa0] truncate">{p.name}</p>
                      <p className="text-[10px] text-white/50">Stream tab</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Free Cloud Movie Mirror (Zero Accounts Needed) */}
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <span className="text-xs font-bold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="h-3.5 w-3.5 text-[#ff6fa0]" /> Unblocked Cloud Movie Mirror (No Account Required)
              </span>
              <p className="text-[11px] text-white/70">
                Don&apos;t have an account? Search any movie or web series title (e.g. <i>Inception, Stranger Things, Mirzapur, Leo</i>) to stream together directly:
              </p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 opacity-50" />
                  <input
                    value={ottSearchQuery}
                    onChange={(e) => setOttSearchQuery(e.target.value)}
                    placeholder="Search movie or TV show title…"
                    className="field !pl-9 !py-2 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!ottSearchQuery.trim()) return;
                        setShowOttModal(false);
                        socket.emit('media:set', {
                          media: {
                            type: 'embed',
                            src: `https://multiembed.mov/?video_id=${encodeURIComponent(ottSearchQuery.trim())}`,
                            orig: ottSearchQuery.trim(),
                            title: `Cloud Movie: ${ottSearchQuery.trim()}`,
                          },
                        });
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!ottSearchQuery.trim()) return;
                    setShowOttModal(false);
                    socket.emit('media:set', {
                      media: {
                        type: 'embed',
                        src: `https://multiembed.mov/?video_id=${encodeURIComponent(ottSearchQuery.trim())}`,
                        orig: ottSearchQuery.trim(),
                        title: `Cloud Movie: ${ottSearchQuery.trim()}`,
                      },
                    });
                  }}
                  className="btn !py-2 !px-4 text-xs font-semibold shrink-0"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Play Movie</span>
                </button>
              </div>

              {/* Quick Popular Picks */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-white/50">Quick picks:</span>
                {['Interstellar', 'Inception', 'Stranger Things', 'Money Heist', 'Avengers Endgame'].map((title) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() => {
                      setShowOttModal(false);
                      socket.emit('media:set', {
                        media: {
                          type: 'embed',
                          src: `https://multiembed.mov/?video_id=${encodeURIComponent(title)}`,
                          orig: title,
                          title: `Cloud Movie: ${title}`,
                        },
                      });
                    }}
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-[#d9467a]/20 text-white/80 hover:text-white border border-white/10 text-[10px] transition"
                  >
                    {title}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowOttModal(false)}
                className="btn !py-1.5 !px-4 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
