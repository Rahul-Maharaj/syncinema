'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Link2, MonitorUp, MonitorOff, ExternalLink, AlertTriangle, FolderOpen,
  Captions, ListPlus, Play, Volume2, Sliders, Radio, Zap, Settings,
  RefreshCw, Sparkles, FastForward, Check, RotateCcw
} from 'lucide-react';
import { detect, ytId, vimeoId, loadScript, ytReady, toEmbed, toProxyUrl, toStreamProxyUrl, resolveMedia } from '@/lib/media';

const TYPES = ['auto', 'file', 'hls', 'dash', 'embed', 'proxy'];
const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function VideoPlayer({ socket, me, hostId, users, peerRef, initial, screenBy, screenStream, playerRef }) {
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

  // Handle partner buffering & speed synchronization
  useEffect(() => {
    if (!socket) return;
    const onBuffering = ({ cid, name, buffering }) => {
      if (cid !== me) {
        if (buffering) {
          setPartnerBuffering({ name, active: true });
          silently(() => api.current.pause());
        } else {
          setPartnerBuffering(null);
          if (st.current.playing) {
            silently(() => api.current.play());
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
    socket.on('player:buffering', onBuffering);
    socket.on('player:speed', onSpeed);
    return () => {
      socket.off('player:buffering', onBuffering);
      socket.off('player:speed', onSpeed);
    };
  }, [socket, me]);

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

  // Ultra-Precise Sync: Network latency compensation + micro-rate adjustment + manual offset
  const correct = (targetTime, shouldPlay) => silently(() => {
    const a = api.current;
    const v = vref.current;
    const curTime = a.time();

    // Latency compensation: add estimated one-way trip and manual syncOffset
    const latencySec = (syncLatency || 16) / 1000;
    const compensatedTarget = Math.max(0, targetTime + (shouldPlay ? latencySec : 0) + (syncOffset || 0));
    const drift = curTime - compensatedTarget;
    const absDrift = Math.abs(drift);

    // Sync play/pause state
    if (shouldPlay !== playing.current) {
      shouldPlay ? a.play() : a.pause();
      playing.current = shouldPlay;
    }

    // If element is already buffering or seeking, let it finish loading first
    if (v && (v.seeking || v.readyState < 2)) return;

    // 1. Minor drift (< 0.35s): Inaudible difference, stay at shared speed
    if (absDrift < 0.35) {
      setSyncStatus('in_sync');
      setPlaybackSpeed(sharedSpeed);
      return;
    }

    // 2. Soft Sync (0.35s to 2.8s) while playing:
    // Micro-adjust playback speed by 6% to converge without stutter or buffer dumping
    if (absDrift <= 2.8 && shouldPlay) {
      setSyncStatus('syncing');
      if (drift < 0) {
        setPlaybackSpeed(sharedSpeed * 1.06); // Behind: catch up smoothly
      } else {
        setPlaybackSpeed(sharedSpeed * 0.94); // Ahead: wait smoothly
      }
      clearTimeout(rateTimer.current);
      rateTimer.current = setTimeout(() => {
        setPlaybackSpeed(sharedSpeed);
        setSyncStatus('in_sync');
      }, 1600);
      return;
    }

    // 3. Hard Sync (> 2.8s): intentional user skip or big gap
    if (absDrift > 2.8) {
      setSyncStatus('desync');
      setPlaybackSpeed(sharedSpeed);
      a.seek(compensatedTarget);
      setTimeout(() => setSyncStatus('in_sync'), 700);
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
          lowLatencyMode: true,
          backBufferLength: 60,
          manifestLoadingMaxRetry: 4,
          levelLoadingMaxRetry: 4,
          fragLoadingMaxRetry: 5,
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
      play: () => v.play().catch(() => {}),
      pause: () => v.pause(),
      seek: (t) => (v.currentTime = t),
      setSpeed: (s) => (v.playbackRate = s),
    };
    const evs = [['play', 'PLAY'], ['playing', 'PLAY'], ['pause', 'PAUSE'], ['seeked', 'SEEK']]
      .map(([e, a]) => { const f = () => send(a); v.addEventListener(e, f); return () => v.removeEventListener(e, f); });
    
    const onWait = () => {
      send('BUFFERING');
      socket.emit('player:buffering', { buffering: true, time: v.currentTime });
    };
    const onResume = () => {
      socket.emit('player:buffering', { buffering: false, time: v.currentTime });
    };
    v.addEventListener('waiting', onWait);
    v.addEventListener('stalled', onWait);
    v.addEventListener('canplay', onResume);
    v.addEventListener('playing', onResume);

    // Clear errors when frames actually load or play
    v.onplaying = () => setError('');
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
      v.removeEventListener('waiting', onWait);
      v.removeEventListener('stalled', onWait);
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
            if (a) send(a);
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

    const onPlayer = ({ action, time }) => silently(() => {
      const a = api.current;
      if (action === 'PLAY') {
        a.play();
        playing.current = true;
        correct(time, true);
      } else if (action === 'PAUSE' || action === 'BUFFERING') {
        a.pause();
        playing.current = false;
        setPlaybackSpeed(1.0);
      } else if (action === 'SEEK') {
        a.seek(time);
        correct(time, playing.current);
      }
    });

    const onBeat = ({ time, playing: p }) => {
      if (p) correct(time, p);
    };

    socket.on('state', onState);
    socket.on('player', onPlayer);
    socket.on('heartbeat', onBeat);

    // Host emits periodic heartbeat only while playing, minimizing network chatter
    const beat = setInterval(() => {
      if (me === hostId && playing.current) {
        socket.emit('heartbeat', { time: api.current.time(), playing: true });
      }
    }, 4000);

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
      // 720p 30fps ideal constraints prevent GPU throttling and network stalls on low-end devices
      let s;
      try {
        s = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'motion',
            frameRate: { ideal: 30, max: 30 },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: true,
        });
      } catch {
        s = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'motion',
            frameRate: { ideal: 30, max: 30 },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
        });
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
        peerRef.current?.call(u.id, s, { metadata: { type: 'screen' } });
      });
    } catch { /* cancelled by user */ }
  };

  const build = async () => {
    let src = url.trim();
    if (!src) return null;
    if (!/^https?:\/\//i.test(src) && !src.startsWith('/api/')) src = 'https://' + src;
    const type = force === 'auto' ? detect(src) : force;
    if (type === 'proxy') return { type: 'proxy', src: toProxyUrl(src), orig: src };
    if (type === 'auto' || type === 'embed') {
      const resolved = await resolveMedia(src);
      if (resolved && (resolved.type === 'hls' || resolved.type === 'file' || resolved.type === 'embed')) {
        if (resolved.subtitle) setSub(resolved.subtitle);
        return resolved;
      }
    }
    return { type, src: type === 'embed' ? toEmbed(src) : src };
  };

  const enqueue = async () => {
    const m = await build();
    if (m) { socket.emit('queue:add', { media: m }); setUrl(''); }
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
    const m = await build();
    if (!m) return;
    socket.emit('media:set', { media: m });
    const h = [m.origSrc || m.src, ...hist.filter((x) => x !== (m.origSrc || m.src))].slice(0, 6);
    setHist(h);
    localStorage.hist = JSON.stringify(h);
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

      <div className="vault relative aspect-video overflow-hidden rounded-2xl bg-black shadow-[0_20px_80px_-24px_rgba(217,70,122,.55)] ring-1 ring-white/10">
        {/* Sync Status Badge */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/10 text-[11px] text-white/90">
          <span className={`h-2 w-2 rounded-full ${syncStatus === 'in_sync' ? 'bg-emerald-400' : syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400 animate-ping'}`} />
          <span className="font-medium">{syncStatus === 'in_sync' ? `In sync • ${syncLatency}ms` : syncStatus === 'syncing' ? 'Fine-tuning…' : 'Syncing'}</span>
          {syncOffset !== 0 && (
            <span className="text-[10px] text-[#ff6fa0] font-mono ml-0.5">
              ({syncOffset > 0 ? `+${syncOffset}s` : `${syncOffset}s`})
            </span>
          )}
        </div>

        {/* Live Stream Badge */}
        {isLiveStream && (
          <div className="absolute top-3 left-36 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600/85 backdrop-blur-md text-[11px] font-bold text-white shadow-lg animate-pulse">
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

        {/* Precision Settings Toggle Button */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-medium transition ${
            showSettings
              ? 'bg-[#d9467a] text-white border-white/30 shadow-lg shadow-[#d9467a]/40'
              : 'bg-black/65 text-white/80 hover:text-white border-white/10'
          }`}
          title="Precision Sync, Speed & Audio Settings"
        >
          <Sliders className="h-3 w-3" />
          <span>Sync & Audio</span>
        </button>

        {/* Partner Buffering Alert Banner */}
        {partnerBuffering?.active && (
          <div className="absolute inset-x-4 top-14 z-30 mx-auto max-w-md rise">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-200 text-xs shadow-2xl">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
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
            className="absolute inset-0 h-full w-full bg-black/90"
          />
        )}
        {T === 'local' && !localUrl && !stream && (
          <label className="absolute inset-0 grid cursor-pointer place-items-center p-6 text-center text-white/90 bg-black/85 backdrop-blur-sm z-20">
            <div className="max-w-sm space-y-3">
              <FolderOpen className="h-10 w-10 mx-auto text-[#ff6fa0] animate-pulse" />
              <p className="font-semibold text-sm sm:text-base">Partner picked: {media.name}</p>
              <p className="text-xs text-white/70">Wait a moment while the file uploads, or tap below to pick this file if you already have it on your phone.</p>
              <span className="btn !py-2 !px-4 text-xs inline-flex items-center gap-1.5 shadow-lg shadow-[#d9467a]/40">
                <FolderOpen className="h-3.5 w-3.5" />
                Pick File from Device
                <input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden />
              </span>
            </div>
          </label>
        )}
        {T === 'none' && !stream && (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,#2a1636,#0b0610)] p-6 text-center text-white">
            <div>
              <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#d9467a] shadow-[0_0_50px_rgba(217,70,122,.6)]"><i className="ring" /><Play className="h-7 w-7 fill-white" /></div>
              <p className="font-display text-xl font-semibold">Pick tonight&apos;s movie</p>
              <ol className="mt-4 space-y-2 text-left text-sm text-white/80">
                {['Paste any video link in the box below', 'Press “Play for everyone”', 'Or share your screen for any site'].map((t, i) => (
                  <li key={t} className="rise flex items-center gap-2" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                    <b className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15 text-xs">{i + 1}</b>{t}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
        <div id="reaction-layer" className="pointer-events-none absolute inset-0" />
      </div>

      {/* Precision Sync & Audio Drawer */}
      {showSettings && (
        <div className="card rise p-4 bg-[#140c1a]/95 border border-white/15 space-y-4 shadow-xl">
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
          </div>
        </div>
      )}

      {uploading && (
        <div className="card flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-[#d9467a]/25 via-purple-600/20 to-pink-600/25 border-[#ff6fa0]/40 text-xs text-white shadow-lg shadow-[#d9467a]/20">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff6fa0] animate-ping shrink-0" />
            <span className="truncate">Sharing <b>{uploading.name}</b> with partner&apos;s phone ({uploading.progress}%)…</span>
          </div>
          <div className="h-2 w-28 bg-white/15 rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-gradient-to-r from-[#ff6fa0] to-[#d9467a] transition-all duration-200" style={{ width: `${uploading.progress}%` }} />
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
            {T === 'proxy' ? 'Proxy Mode: blocks bypassed. ' : 'Embedded page: '}
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
          <a href={media.orig || media.src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      <form onSubmit={load} className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-60">
            <Link2 className="absolute left-3 top-2.5 h-4 w-4 opacity-50" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste any link: YouTube, Vimeo, mp4, m3u8, movie websites…" className="field !pl-9" />
          </div>
          <button className="btn"><Play className="h-4 w-4" />Play for everyone</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={enqueue} className="ghost" title="Add this link to the Up next list"><ListPlus className="h-4 w-4" />Add to queue</button>
          <label className="ghost cursor-pointer" title="Play a movie file from your own device"><FolderOpen className="h-4 w-4" />My file<input type="file" accept="video/*,audio/*,.mkv" onChange={pickLocal} hidden /></label>
          <label className="ghost cursor-pointer" title="Add .srt or .vtt subtitles"><Captions className="h-4 w-4" />Subtitles<input type="file" accept=".srt,.vtt" onChange={pickSub} hidden /></label>
          {audioTracks.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/90" title="Audio track / language">
              <Volume2 className="h-4 w-4 text-[#ff6fa0]" />
              <select value={curAudio} onChange={(e) => switchAudio(+e.target.value)} aria-label="Audio language" className="bg-transparent text-white outline-none cursor-pointer">
                {audioTracks.map((t) => <option key={t.id} value={t.id} className="text-black bg-white">{t.name}</option>)}
              </select>
            </div>
          )}
          {screenBy === me
            ? <button type="button" onClick={stopShare} className="ghost"><MonitorOff className="h-4 w-4" />Stop sharing</button>
            : <button type="button" onClick={startShare} disabled={!!screenBy} className="ghost" title="Show your screen to your partner"><MonitorUp className="h-4 w-4" />Share screen</button>}
          <select value={force} onChange={(e) => setForce(e.target.value)} aria-label="Link type" className="field !w-auto" title="Link type (Auto detects it for you)">
            {TYPES.map((t) => <option key={t} value={t} className="text-black">{t === 'auto' ? 'Type: Auto' : t.toUpperCase()}</option>)}
          </select>
        </div>
      </form>
      {hist.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs opacity-70">
          {hist.map((h) => <button key={h} onClick={() => setUrl(h)} className="max-w-[16rem] truncate rounded-full border border-current/20 px-2 py-0.5 hover:opacity-100" title={h}>{h.replace(/^https?:\/\/(www\.)?/, '')}</button>)}
        </div>
      )}
    </div>
  );
}
