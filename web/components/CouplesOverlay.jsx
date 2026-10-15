'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, GripHorizontal, Maximize2, Minimize2, EyeOff, Eye } from 'lucide-react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { serverUrl } from '@/lib/socket';
import { getKey } from '@/lib/vault';
gsap.registerPlugin(Draggable);

function Tile({ stream, name, muted, isPartner }) {
  const r = useRef();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (r.current) r.current.srcObject = stream || null;
  }, [stream]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === r.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = (e) => {
    e?.stopPropagation?.();
    if (!r.current) return;
    if (!document.fullscreenElement) {
      if (r.current.requestFullscreen) {
        r.current.requestFullscreen().catch(() => {});
      } else if (r.current.webkitRequestFullscreen) {
        r.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      onDoubleClick={toggleFullscreen}
      className="vault group relative aspect-video w-36 overflow-hidden rounded-xl bg-black/70 ring-1 ring-white/10 sm:w-40"
      title={isPartner ? 'Double click or tap expand for full screen' : name}
    >
      <video
        ref={r}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <span className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
        {name}
      </span>
      {isPartner && stream && (
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full screen' : 'Full screen partner video'}
          className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white/80 opacity-80 backdrop-blur transition hover:scale-110 hover:opacity-100"
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}

export default function CouplesOverlay({ me, users, peerRef, onScreen, showCall, setShowCall }) {
  const [mine, setMine] = useState(null);
  const [remote, setRemote] = useState({});     // peerId -> MediaStream
  const [ready, setReady] = useState(false);
  const [mic, setMic] = useState(true), [cam, setCam] = useState(true);
  const [internalHidden, setInternalHidden] = useState(false);
  const isHidden = showCall !== undefined ? !showCall : internalHidden;
  const setHide = (val) => {
    if (setShowCall) setShowCall(!val);
    setInternalHidden(val);
  };
  const box = useRef(), grip = useRef(), local = useRef(), called = useRef(new Set());
  const usersRef = useRef(users); usersRef.current = users;

  useEffect(() => {
    let peer, dead = false, timer;
    const blank = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      return c.captureStream(1);
    };
    const u = new URL(serverUrl());
    let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];

    const open = async () => {
      const { default: Peer } = await import('peerjs');
      if (dead) return;
      let peerKey;
      try {
        const j = await (await fetch(serverUrl() + '/api/ice?key=' + encodeURIComponent(getKey()))).json();
        iceServers = j.iceServers;
        peerKey = j.peerKey;
      } catch {}

      peer = new Peer(me, {
        host: u.hostname,
        port: +u.port || (u.protocol === 'https:' ? 443 : 80),
        path: '/peerjs',
        secure: u.protocol === 'https:',
        config: { iceServers },
        ...(peerKey && { key: peerKey }),
      });
      peerRef.current = peer;

      peer.on('open', () => setReady(true));
      peer.on('disconnected', () => !dead && peer.reconnect());
      peer.on('error', (e) => {
        if (e.type === 'unavailable-id') {
          peer.destroy();
          timer = setTimeout(open, 2000);
        }
      });
      peer.on('call', (c) => {
        if (!usersRef.current.some((u) => u.id === c.peer)) return c.close();
        if (c.metadata?.type === 'screen') {
          c.answer();
          c.on('stream', onScreen);
          c.on('close', () => onScreen(null));
        } else {
          c.answer(local.current);
          c.on('stream', (s) => setRemote((p) => ({ ...p, [c.peer]: s })));
        }
      });
    };

    (async () => {
      try {
        // Optimized for low-end devices: 640x480 ideal, 24fps
        local.current = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 24, max: 30 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        local.current = blank();
      }
      if (dead) return;
      setMine(local.current);
      open();
    })();

    return () => {
      dead = true;
      clearTimeout(timer);
      local.current?.getTracks().forEach((t) => t.stop());
      peer?.destroy();
      peerRef.current = null;
    };
  }, [me]);

  useEffect(() => {
    if (!ready) return;
    users.filter((u) => u.id !== me && me < u.id && !called.current.has(u.sid)).forEach((u) => {
      called.current.add(u.sid);
      const c = peerRef.current.call(u.id, local.current, { metadata: { type: 'cam' } });
      c?.on('stream', (s) => setRemote((p) => ({ ...p, [u.id]: s })));
    });
  }, [users, ready]);

  useEffect(() => {
    if (isHidden || !box.current) return;
    const d = Draggable.create(box.current, { trigger: grip.current, bounds: window, inertia: false })[0];
    gsap.from(box.current, { scale: 0.85, opacity: 0, duration: 0.4, ease: 'back.out(1.5)' });
    return () => d?.kill?.();
  }, [isHidden]);

  const toggle = (kind) => {
    const on = kind === 'mic' ? !mic : !cam;
    local.current?.[kind === 'mic' ? 'getAudioTracks' : 'getVideoTracks']().forEach((t) => (t.enabled = on));
    kind === 'mic' ? setMic(on) : setCam(on);
  };

  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => setHide(false)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-[#160d1f]/90 px-3.5 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur transition hover:scale-105 hover:border-[#ff6fa0]/60 hover:bg-[#d9467a]/20"
        title="Show video call window"
      >
        <Video className="h-3.5 w-3.5 text-[#ff6fa0]" />
        <span>Show Video Call</span>
      </button>
    );
  }

  return (
    <div ref={box} className="fixed bottom-5 right-5 z-40 rounded-2xl border border-white/10 bg-[#160d1f]/90 p-2.5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-1.5 px-0.5 text-white/50">
        <div ref={grip} className="flex flex-1 cursor-grab items-center justify-center active:cursor-grabbing" title="Drag to move">
          <GripHorizontal className="h-4 w-4" />
        </div>
        <button
          type="button"
          onClick={() => setHide(true)}
          title="Hide video call (saves battery and screen space)"
          className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <Tile stream={mine} name="You" muted isPartner={false} />
        {users.filter((u) => u.id !== me).map((u) => (
          <Tile key={u.id} stream={remote[u.id]} name={u.name} isPartner={true} />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 text-white">
        <button
          type="button"
          onClick={() => toggle('mic')}
          aria-label="Toggle microphone"
          title={mic ? 'Mute mic' : 'Unmute mic'}
          className={`rounded-full p-2 transition ${mic ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/50'}`}
        >
          {mic ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
        </button>
        <button
          type="button"
          onClick={() => toggle('cam')}
          aria-label="Toggle camera"
          title={cam ? 'Turn off camera' : 'Turn on camera'}
          className={`rounded-full p-2 transition ${cam ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/50'}`}
        >
          {cam ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-rose-400" />}
        </button>
      </div>
    </div>
  );
}
