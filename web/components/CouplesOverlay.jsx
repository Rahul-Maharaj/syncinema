'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, GripHorizontal, Maximize2, Minimize2, EyeOff, Eye, Volume2 } from 'lucide-react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { serverUrl } from '@/lib/socket';
import { getKey } from '@/lib/vault';
gsap.registerPlugin(Draggable);

// Lightweight Voice Activity Detection (VAD) hook using Web Audio Analyser
function useStreamVoiceActivity(stream, onTalkChange) {
  useEffect(() => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks || audioTracks.length === 0) return;

    let ctx = null, analyser = null, src = null, timer = null, dead = false;
    let currentlyTalking = false;
    let holdTimer = null;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.2;
      src = ctx.createMediaStreamSource(new MediaStream(audioTracks));
      src.connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);

      const check = () => {
        if (dead) return;
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length;

        // Threshold 12 indicates human speech above ambient room noise
        const isLoud = avg > 12;

        if (isLoud) {
          clearTimeout(holdTimer);
          if (!currentlyTalking) {
            currentlyTalking = true;
            onTalkChange?.(true);
          }
          // Hold speech state for 1200ms after speech pauses
          holdTimer = setTimeout(() => {
            if (currentlyTalking) {
              currentlyTalking = false;
              onTalkChange?.(false);
            }
          }, 1200);
        }

        timer = setTimeout(check, 100);
      };

      check();
    } catch {}

    return () => {
      dead = true;
      clearTimeout(timer);
      clearTimeout(holdTimer);
      try { src?.disconnect(); } catch {}
      try { ctx?.close(); } catch {}
    };
  }, [stream]);
}

// Persistent Remote Audio Sink - ensures call audio ALWAYS plays even if video is hidden or voiceOnly
function RemoteAudio({ stream, name, onTalk }) {
  const audioRef = useRef(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.volume = 1.0;

    const playAudio = () => {
      el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    };
    playAudio();

    const unlock = () => {
      el.play().then(() => setBlocked(false)).catch(() => {});
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, [stream]);

  useStreamVoiceActivity(stream, onTalk);

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline />
      {blocked && (
        <button
          type="button"
          onClick={() => audioRef.current?.play().then(() => setBlocked(false))}
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#d9467a] to-[#ff6fa0] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xl animate-pulse cursor-pointer"
        >
          <Volume2 className="h-3.5 w-3.5" />
          <span>Tap to unmute {name || 'Partner'}</span>
        </button>
      )}
    </>
  );
}

function Tile({ stream, name, isPartner, voiceOnly, isSpeaking }) {
  const r = useRef();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (r.current) {
      r.current.srcObject = stream || null;
      // Remote audio is played via persistent RemoteAudio element to prevent double-audio echo
      r.current.muted = true;
    }
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
      className={`vault group relative aspect-video w-36 overflow-hidden rounded-xl bg-black/85 transition-all duration-300 sm:w-40 shrink-0 ${
        isSpeaking
          ? 'ring-2 ring-[#ff6fa0] shadow-[0_0_15px_rgba(255,111,160,0.6)]'
          : 'ring-1 ring-white/10'
      }`}
      title={isPartner ? 'Double click or tap expand for full screen' : name}
    >
      {voiceOnly ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-950/80 to-[#160d1f] p-2 text-center">
          <div className={`relative mb-1 grid h-8 w-8 place-items-center rounded-full bg-[#d9467a]/20 border border-[#ff6fa0]/40 text-[#ff8fb3] ${isSpeaking ? 'scale-110 animate-bounce' : 'animate-pulse'}`}>
            <Mic className="h-4 w-4" />
          </div>
          <span className="text-[10px] text-white/70">Voice Mode</span>
        </div>
      ) : (
        <video
          ref={r}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      )}
      <span className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm flex items-center gap-1">
        {name}
        {isSpeaking && <i className="h-1.5 w-1.5 rounded-full bg-[#ff6fa0] animate-ping" />}
      </span>
      {isSpeaking && (
        <span className="absolute top-1 left-1.5 flex items-center gap-0.5 rounded bg-[#d9467a]/90 px-1.5 py-0.5 text-[9px] font-semibold text-white animate-pulse">
          <Mic className="h-2.5 w-2.5" /> Speaking
        </span>
      )}
      {isPartner && stream && !voiceOnly && (
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

export default function CouplesOverlay({ me, users, peerRef, onScreen, showCall, setShowCall, socket, onVoiceActivity }) {
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

  // Voice Activity State Tracking (Local + Remote)
  const [localTalking, setLocalTalking] = useState(false);
  const [remoteTalking, setRemoteTalking] = useState({});

  const handleRemoteTalk = (peerId, talking) => {
    setRemoteTalking((prev) => ({ ...prev, [peerId]: talking }));
  };

  const isAnyoneTalking = localTalking || Object.values(remoteTalking).some(Boolean);

  useEffect(() => {
    onVoiceActivity?.(isAnyoneTalking);
    if (socket) {
      socket.emit('voice:active', { active: isAnyoneTalking });
    }
  }, [isAnyoneTalking]);

  useStreamVoiceActivity(mine, setLocalTalking);

  // Bandwidth capping for RTCPeerConnection to keep calls smooth on low-end devices & slow 2G/3G networks
  const clampBitrates = (pc) => {
    if (!pc || !pc.getSenders) return;
    try {
      pc.getSenders().forEach((sender) => {
        if (!sender.track) return;
        const params = sender.getParameters();
        if (!params || !params.encodings || params.encodings.length === 0) return;
        if (sender.track.kind === 'video') {
          params.encodings[0].maxBitrate = 220000; // 220 kbps for smooth low-spec video
          params.encodings[0].maxFramerate = 24;
        } else if (sender.track.kind === 'audio') {
          params.encodings[0].maxBitrate = 32000; // 32 kbps Opus crystal clear voice
        }
        sender.setParameters(params).catch(() => {});
      });
    } catch {}
  };

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
          c.on('stream', (s) => {
            setRemote((p) => ({ ...p, [c.peer]: s }));
            clampBitrates(c.peerConnection);
          });
        }
      });
    };

    (async () => {
      let stream;
      try {
        // Optimized for low-end devices: 480p ideal, 20-24fps, mono audio with AEC & AGC
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 480, max: 640 },
            height: { ideal: 360, max: 480 },
            frameRate: { ideal: 20, max: 24 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch (e1) {
        try {
          // If camera denied or unavailable, capture microphone audio
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
          });
          const cStream = blank();
          stream = new MediaStream([
            ...cStream.getVideoTracks(),
            ...audioStream.getAudioTracks()
          ]);
        } catch (e2) {
          // Last resort fallback (completely silent canvas)
          stream = blank();
        }
      }
      if (dead) return;
      local.current = stream;
      setMine(stream);
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
      c?.on('stream', (s) => {
        setRemote((p) => ({ ...p, [u.id]: s }));
        clampBitrates(c?.peerConnection);
      });
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

  const [voiceOnly, setVoiceOnly] = useState(false);
  const [layout, setLayout] = useState('floating'); // 'floating' | 'side'

  const toggleVoiceOnly = () => {
    const next = !voiceOnly;
    setVoiceOnly(next);
    local.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
  };

  const cycleLayout = () => {
    setLayout((l) => (l === 'floating' ? 'side' : 'floating'));
  };

  return (
    <>
      {/* Persistent Audio for Remote Peers: Always mounted so voice call NEVER drops even when video call is hidden */}
      <div className="sr-only">
        {users.filter((u) => u.id !== me && remote[u.id]).map((u) => (
          <RemoteAudio
            key={u.id}
            stream={remote[u.id]}
            name={u.name}
            onTalk={(talking) => handleRemoteTalk(u.id, talking)}
          />
        ))}
      </div>

      {isHidden ? (
        <button
          type="button"
          onClick={() => setHide(false)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-[#160d1f]/90 px-3.5 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur transition hover:scale-105 hover:border-[#ff6fa0]/60 hover:bg-[#d9467a]/20 cursor-pointer"
          title="Show video call window"
        >
          <Video className="h-3.5 w-3.5 text-[#ff6fa0]" />
          <span>Show Video Call</span>
          {isAnyoneTalking && <span className="h-2 w-2 rounded-full bg-[#ff6fa0] animate-ping" />}
        </button>
      ) : (
        <div ref={box} className={`fixed bottom-5 right-5 z-40 rounded-2xl border border-white/10 bg-[#160d1f]/95 p-2.5 shadow-2xl backdrop-blur-md transition-all ${layout === 'side' ? 'max-w-[92vw]' : ''}`}>
          <div className="flex items-center justify-between pb-1.5 px-0.5 text-white/50 gap-2">
            <div ref={grip} className="flex flex-1 cursor-grab items-center active:cursor-grabbing" title="Drag to move">
              <GripHorizontal className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={cycleLayout}
                title={layout === 'floating' ? 'Switch to side-by-side layout' : 'Switch to floating stacked layout'}
                className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition text-[10px]"
              >
                {layout === 'floating' ? 'Side-by-side' : 'Stack'}
              </button>
              <button
                type="button"
                onClick={() => setHide(true)}
                title="Hide video call (audio remains active in background)"
                className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className={`flex ${layout === 'side' ? 'flex-row overflow-x-auto max-w-[85vw]' : 'flex-col'} gap-2`}>
            <Tile stream={mine} name="You" isPartner={false} voiceOnly={voiceOnly} isSpeaking={localTalking} />
            {users.filter((u) => u.id !== me).map((u) => (
              <Tile
                key={u.id}
                stream={remote[u.id]}
                name={u.name}
                isPartner={true}
                voiceOnly={voiceOnly}
                isSpeaking={!!remoteTalking[u.id]}
              />
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
            <button
              type="button"
              onClick={toggleVoiceOnly}
              aria-label="Voice-only mode"
              title={voiceOnly ? 'Switch back to video mode' : 'Voice-only mode (saves bandwidth on low-end connection)'}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                voiceOnly
                  ? 'bg-[#d9467a] text-white shadow-md'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {voiceOnly ? 'Voice: On' : 'Voice Only'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
