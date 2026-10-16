'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, GripHorizontal, Maximize2, Minimize2, EyeOff, Eye, Volume2 } from 'lucide-react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { serverUrl } from '@/lib/socket';
import { getKey } from '@/lib/vault';
gsap.registerPlugin(Draggable);

// Helper to generate a blank canvas video track when camera hardware is powered off
function createBlankVideoTrack() {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, 320, 240);
    }
    const stream = canvas.captureStream ? canvas.captureStream(5) : null;
    return stream ? stream.getVideoTracks()[0] : null;
  } catch (err) {
    console.warn('Could not create dummy blank track:', err);
    return null;
  }
}

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
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      {blocked && (
        <button
          type="button"
          onClick={() => audioRef.current?.play().then(() => setBlocked(false))}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#d9467a] px-4 py-2 text-xs font-semibold text-white cursor-pointer border border-white/20"
        >
          <Volume2 className="h-4 w-4" />
          <span>Tap to hear {name || 'Partner'} 🔊</span>
        </button>
      )}
    </>
  );
}

export function Tile({ stream, name, isPartner, voiceOnly, isSpeaking, isCamOff, className = '', disableFullscreen = false }) {
  const videoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (stream && !isCamOff) {
      el.srcObject = stream;
      el.muted = true; // Video element is muted; audio plays through RemoteAudio

      const vTracks = stream.getVideoTracks();
      setHasVideoTrack(vTracks.length > 0 && vTracks.some((t) => t.enabled && t.readyState === 'live'));

      const tryPlay = () => {
        el.play().catch(() => {
          const resume = () => { el.play().catch(() => {}); };
          window.addEventListener('click', resume, { once: true });
          window.addEventListener('touchstart', resume, { once: true });
        });
      };
      tryPlay();
    } else {
      el.srcObject = null;
      setHasVideoTrack(false);
    }
  }, [stream, isCamOff]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === videoRef.current);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = (e) => {
    e?.stopPropagation?.();
    if (disableFullscreen) return;
    const el = videoRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      onDoubleClick={disableFullscreen ? undefined : toggleFullscreen}
      className={`vault group relative overflow-hidden rounded-xl bg-black transition-all duration-300 shrink-0 ${
        className || 'aspect-video w-36 sm:w-44'
      } ${
        isSpeaking
          ? 'ring-2 ring-[#ff6fa0]'
          : 'ring-1 border border-white/10 ring-transparent'
      }`}
      title={disableFullscreen ? name : isPartner ? 'Double click or tap expand for full screen' : name}
    >
      {/* Voice Only Mode */}
      {voiceOnly ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-2 text-center">
          <div className={`relative mb-1 grid h-8 w-8 place-items-center rounded-full bg-[#d9467a]/20 border border-[#ff6fa0]/40 text-[#ff8fb3] ${isSpeaking ? 'scale-105 border-white/60' : ''}`}>
            <Mic className="h-4 w-4" />
          </div>
          <span className="text-[10px] text-white/70">Voice Mode</span>
        </div>
      ) : isCamOff ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-2 text-center z-10 pointer-events-none">
          <div className="relative mb-1 grid h-8 w-8 place-items-center rounded-full bg-white/10 border border-white/20 text-white/60">
            <VideoOff className="h-4 w-4 text-rose-400" />
          </div>
          <span className="text-[10px] text-white/70 font-medium">Camera Off</span>
          <span className="text-[9px] text-white/40">Hardware released</span>
        </div>
      ) : (
        <>
          {/* Waiting/Connecting placeholder when stream is absent */}
          {(!stream || !hasVideoTrack) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-2 text-center z-10 pointer-events-none">
              <div className="relative mb-1 grid h-8 w-8 place-items-center rounded-full bg-[#d9467a]/20 border border-[#ff6fa0]/40 text-[#ff8fb3]">
                <Video className="h-4 w-4" />
              </div>
              <span className="text-[10px] text-white/60">{isPartner ? 'Connecting video…' : 'Starting camera…'}</span>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            webkit-playsinline="true"
            muted
            className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 ${(!hasVideoTrack || isCamOff) ? 'hidden' : 'block'}`}
          />
        </>
      )}

      {/* User Name Tag */}
      <span className="absolute bottom-1 left-1.5 rounded bg-black/80 border border-white/10 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm flex items-center gap-1 z-20">
        {name}
        {isSpeaking && <i className="h-1.5 w-1.5 rounded-full bg-[#ff6fa0]" />}
      </span>

      {/* Speaking Indicator */}
      {isSpeaking && (
        <span className="absolute top-1 left-1.5 flex items-center gap-0.5 rounded bg-[#d9467a]/90 px-1.5 py-0.5 text-[9px] font-semibold text-white z-20">
          <Mic className="h-2.5 w-2.5" /> Speaking
        </span>
      )}

      {/* Fullscreen Button */}
      {isPartner && stream && !voiceOnly && !isCamOff && !disableFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full screen' : 'Full screen partner video'}
          className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white/80 opacity-80 backdrop-blur transition hover:scale-110 hover:opacity-100 z-20"
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}

export default function CouplesOverlay({
  me,
  users = [],
  peerRef,
  onScreen,
  showCall,
  setShowCall,
  socket,
  onVoiceActivity,
  callControlsRef,
  onCamChange,
  onMicChange,
  onStreamsChange,
  isMobileCallActive = false,
  onSwitchToCallTab,
}) {
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

  const box = useRef(), grip = useRef(), local = useRef();
  const activeCalls = useRef(new Map()); // targetPeerId -> PeerJS MediaConnection
  const knownReadyPeers = useRef(new Set()); // peerIds that announced readiness via socket

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

  // Bandwidth capping for RTCPeerConnection to keep calls smooth on mobile & low-bandwidth connections
  const clampBitrates = (pc) => {
    if (!pc || !pc.getSenders) return;
    try {
      pc.getSenders().forEach((sender) => {
        if (!sender.track) return;
        const params = sender.getParameters();
        if (!params || !params.encodings || params.encodings.length === 0) return;
        if (sender.track.kind === 'video') {
          params.encodings[0].maxBitrate = 260000; // ~260 kbps for smooth mobile video
          params.encodings[0].maxFramerate = 24;
        } else if (sender.track.kind === 'audio') {
          params.encodings[0].maxBitrate = 32000; // 32 kbps Opus crystal clear voice
        }
        sender.setParameters(params).catch(() => {});
      });
    } catch {}
  };

  // Helper to place an outgoing call to a specific peer
  const callPeer = useCallback((targetId) => {
    if (!peerRef.current || !ready || !local.current) return;
    if (activeCalls.current.has(targetId)) {
      if (remote[targetId]) return; // already connected with remote stream
      try { activeCalls.current.get(targetId)?.close(); } catch {}
      activeCalls.current.delete(targetId);
    }

    try {
      const c = peerRef.current.call(targetId, local.current, { metadata: { type: 'cam' } });
      if (!c) return;
      activeCalls.current.set(targetId, c);

      c.on('stream', (s) => {
        setRemote((prev) => ({ ...prev, [targetId]: s }));
        clampBitrates(c.peerConnection);
      });

      c.on('close', () => {
        activeCalls.current.delete(targetId);
        setRemote((prev) => {
          const next = { ...prev };
          delete next[targetId];
          return next;
        });
      });

      c.on('error', (err) => {
        console.warn('Call error with peer', targetId, err);
        activeCalls.current.delete(targetId);
      });
    } catch (e) {
      console.warn('Failed to initiate call to', targetId, e);
      activeCalls.current.delete(targetId);
    }
  }, [ready, remote]);

  // Main WebRTC & Media Initialization
  useEffect(() => {
    let peer = null, dead = false, timer = null;

    const blank = () => {
      const c = document.createElement('canvas');
      c.width = 320;
      c.height = 240;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(0, 0, 320, 240);
      return c.captureStream(5);
    };

    const openPeer = async () => {
      const { default: Peer } = await import('peerjs');
      if (dead) return;

      let iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.services.mozilla.com' },
      ];
      let peerKey = 'peerjs';

      try {
        const keyParam = encodeURIComponent(getKey() || '');
        const res = await fetch(`${serverUrl()}/api/ice?key=${keyParam}`);
        if (res.ok) {
          const j = await res.json();
          if (j.iceServers && j.iceServers.length) iceServers = j.iceServers;
          if (j.peerKey) peerKey = j.peerKey;
        }
      } catch {}

      const u = new URL(serverUrl());
      peer = new Peer(me, {
        host: u.hostname,
        port: +u.port || (u.protocol === 'https:' ? 443 : 80),
        path: '/peerjs',
        secure: u.protocol === 'https:',
        config: { iceServers },
        key: peerKey,
      });
      peerRef.current = peer;

      peer.on('open', (id) => {
        if (dead) return;
        setReady(true);
        // Broadcast WebRTC readiness to partner in room via socket
        socket?.emit('webrtc:signal', { type: 'ready', peerId: id, cid: me });
      });

      peer.on('disconnected', () => {
        if (!dead) peer?.reconnect();
      });

      peer.on('error', (e) => {
        console.warn('PeerJS warning:', e.type, e.message);
        if (e.type === 'unavailable-id') {
          peer?.destroy();
          timer = setTimeout(openPeer, 2000);
        } else if (e.type === 'peer-unavailable') {
          const target = e.message.split(' ').pop();
          if (target) {
            activeCalls.current.delete(target);
          }
        }
      });

      peer.on('call', (c) => {
        if (c.metadata?.type === 'screen') {
          c.answer();
          c.on('stream', (s) => {
            onScreen(s);
            try {
              c.peerConnection?.getReceivers().forEach((receiver) => {
                if ('playoutDelayHint' in receiver) {
                  receiver.playoutDelayHint = 0;
                }
              });
            } catch {}
          });
          c.on('close', () => onScreen(null));
        } else {
          const partnerId = c.peer;
          activeCalls.current.set(partnerId, c);

          const answerWithStream = (streamToAnswer) => {
            try {
              c.answer(streamToAnswer);
            } catch (err) {
              console.warn('Error answering call:', err);
            }

            c.on('stream', (s) => {
              setRemote((prev) => ({ ...prev, [partnerId]: s }));
              clampBitrates(c.peerConnection);
            });

            c.on('close', () => {
              activeCalls.current.delete(partnerId);
              setRemote((prev) => {
                const next = { ...prev };
                delete next[partnerId];
                return next;
              });
            });

            c.on('error', (err) => {
              console.warn('Incoming call error with', partnerId, err);
              activeCalls.current.delete(partnerId);
            });
          };

          if (local.current) {
            answerWithStream(local.current);
          } else {
            const checkLocalTimer = setInterval(() => {
              if (local.current) {
                clearInterval(checkLocalTimer);
                answerWithStream(local.current);
              }
            }, 100);
            setTimeout(() => clearInterval(checkLocalTimer), 6000);
          }
        }
      });
    };

    // Acquire camera & microphone with progressive fallback
    (async () => {
      let stream = null;
      try {
        // Ideal standard parameters (good quality + low CPU on phones)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err1) {
        console.warn('Standard getUserMedia failed, trying universal fallback:', err1);
        try {
          // Universal fallback: basic video + audio without specific constraints
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err2) {
          console.warn('Basic video+audio failed, trying audio only:', err2);
          try {
            // Audio only fallback
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const cStream = blank();
            stream = new MediaStream([
              ...cStream.getVideoTracks(),
              ...audioStream.getAudioTracks(),
            ]);
          } catch (err3) {
            console.warn('Media capture failed completely, using placeholder:', err3);
            stream = blank();
          }
        }
      }

      if (dead) return;
      local.current = stream;
      setMine(stream);
      await openPeer();
    })();

    return () => {
      dead = true;
      clearTimeout(timer);
      local.current?.getTracks().forEach((t) => t.stop());
      peer?.destroy();
      peerRef.current = null;
    };
  }, [me]);

  // Socket signaling listener for immediate and synchronized WebRTC connection
  useEffect(() => {
    if (!socket) return;

    const onSignal = (payload = {}) => {
      const fromPeerId = payload.peerId || payload.fromCid;
      if (!fromPeerId || fromPeerId === me) return;

      if (payload.type === 'ready') {
        knownReadyPeers.current.add(fromPeerId);
        // Deterministic caller: peer with lexicographically smaller ID initiates
        if (ready && local.current) {
          if (me < fromPeerId) {
            callPeer(fromPeerId);
          } else {
            // Acknowledge so the other peer knows we are listening and ready
            socket.emit('webrtc:signal', { type: 'ready_ack', targetId: fromPeerId, peerId: me, cid: me });
          }
        }
      } else if (payload.type === 'ready_ack') {
        if (payload.targetId === me && ready && local.current && (me < fromPeerId)) {
          callPeer(fromPeerId);
        }
      } else if (payload.type === 'retry') {
        if (payload.targetId === me && ready && local.current && (me < fromPeerId)) {
          activeCalls.current.delete(fromPeerId);
          callPeer(fromPeerId);
        }
      }
    };

    socket.on('webrtc:signal', onSignal);
    return () => socket.off('webrtc:signal', onSignal);
  }, [socket, ready, me, callPeer]);

  // Watchdog & Reconnection loop: checks every 3 seconds to ensure every peer has a live stream
  useEffect(() => {
    if (!ready || !local.current) return;

    const checkConnections = () => {
      const partnerUsers = users.filter((u) => u.id !== me);
      partnerUsers.forEach((partner) => {
        // If partner is present in room, but we don't have their stream yet:
        if (!remote[partner.id]) {
          if (me < partner.id) {
            callPeer(partner.id);
          } else {
            // Signal partner to retry calling us
            socket?.emit('webrtc:signal', { type: 'retry', targetId: partner.id, fromCid: me });
          }
        }
      });
    };

    const interval = setInterval(checkConnections, 3200);
    checkConnections();
    return () => clearInterval(interval);
  }, [users, ready, remote, me, socket, callPeer]);

  // GSAP Draggable for video window
  useEffect(() => {
    if (isHidden || !box.current) return;
    const d = Draggable.create(box.current, { trigger: grip.current, bounds: window, inertia: false })[0];
    gsap.from(box.current, { scale: 0.85, opacity: 0, duration: 0.35, ease: 'back.out(1.4)' });
    return () => d?.kill?.();
  }, [isHidden]);

  const [camSwitching, setCamSwitching] = useState(false);
  const [voiceOnly, setVoiceOnly] = useState(false);
  const [layout, setLayout] = useState('floating'); // 'floating' | 'side'

  // Physical Camera Hardware Toggle: Stops hardware sensor to completely power down device camera light
  const toggleCam = async () => {
    if (camSwitching) return;
    setCamSwitching(true);

    try {
      if (cam) {
        // --- TURN CAMERA OFF: STOP PHYSICAL CAMERA HARDWARE SENSOR ---
        const currentVideoTracks = local.current ? local.current.getVideoTracks() : [];
        currentVideoTracks.forEach((track) => {
          try {
            track.stop(); // Powers off the physical camera light and sensor on device
          } catch {}
          try {
            local.current?.removeTrack(track);
          } catch {}
        });

        // Insert blank dummy canvas track so WebRTC RTCPeerConnection stays connected
        const dummyTrack = createBlankVideoTrack();
        if (dummyTrack && local.current) {
          local.current.addTrack(dummyTrack);
        }

        // Replace track on all active PeerJS RTCPeerConnection video senders
        activeCalls.current.forEach((call) => {
          try {
            const senders = call.peerConnection?.getSenders?.() || [];
            const videoSender = senders.find((s) => s.track?.kind === 'video' || s.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(dummyTrack || null).catch((e) => console.warn('replaceTrack off error:', e));
            }
          } catch {}
        });

        if (local.current) {
          setMine(new MediaStream(local.current.getTracks()));
        }
        setCam(false);
      } else {
        // --- TURN CAMERA ON: RE-ACQUIRE FROM USER MEDIA ---
        let freshStream = null;
        try {
          freshStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
          });
        } catch {
          try {
            freshStream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (err) {
            console.warn('Failed to re-acquire camera:', err);
            alert('Could not start camera. Please ensure camera permissions are granted.');
            setCamSwitching(false);
            return;
          }
        }

        const freshTrack = freshStream?.getVideoTracks()?.[0];
        if (freshTrack && local.current) {
          // Stop and remove dummy blank tracks
          local.current.getVideoTracks().forEach((track) => {
            try { track.stop(); } catch {}
            try { local.current.removeTrack(track); } catch {}
          });

          local.current.addTrack(freshTrack);

          // Update active WebRTC calls with the fresh real camera track
          activeCalls.current.forEach((call) => {
            try {
              const senders = call.peerConnection?.getSenders?.() || [];
              const videoSender = senders.find((s) => s.track?.kind === 'video' || s.kind === 'video');
              if (videoSender) {
                videoSender.replaceTrack(freshTrack).catch((e) => console.warn('replaceTrack on error:', e));
              }
            } catch {}
          });

          setMine(new MediaStream(local.current.getTracks()));
          setCam(true);
        }
      }
    } finally {
      setCamSwitching(false);
    }
  };

  const toggleMic = () => {
    const next = !mic;
    local.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMic(next);
  };

  const toggleVoiceOnly = async () => {
    const next = !voiceOnly;
    setVoiceOnly(next);
    if (next) {
      if (cam) await toggleCam();
    } else {
      if (!cam) await toggleCam();
    }
  };

  const cycleLayout = () => {
    setLayout((l) => (l === 'floating' ? 'side' : 'floating'));
  };

  // Sync state to parent controls if provided
  useEffect(() => {
    onCamChange?.(cam);
  }, [cam, onCamChange]);

  useEffect(() => {
    onMicChange?.(mic);
  }, [mic, onMicChange]);

  useEffect(() => {
    if (callControlsRef) {
      callControlsRef.current = {
        toggleCam,
        toggleMic,
        toggleVoiceOnly,
        cam,
        mic,
        voiceOnly,
        camSwitching,
      };
    }
  }, [cam, mic, voiceOnly, camSwitching, callControlsRef]);

  useEffect(() => {
    onStreamsChange?.({
      mine,
      remote,
      cam,
      mic,
      voiceOnly,
      localTalking,
      remoteTalking,
      toggleCam,
      toggleMic,
    });
  }, [mine, remote, cam, mic, voiceOnly, localTalking, remoteTalking, onStreamsChange]);

  return (
    <>
      {/* Persistent Audio for Remote Peers: Always mounted so call audio NEVER drops even when video is hidden or minimized */}
      <div>
        {users.filter((u) => u.id !== me && remote[u.id]).map((u) => (
          <RemoteAudio
            key={u.id}
            stream={remote[u.id]}
            name={u.name}
            onTalk={(talking) => handleRemoteTalk(u.id, talking)}
          />
        ))}
      </div>

      {/* 1. MOBILE PHONE LAYOUT: Embedded Full-Sized Call Hub (when user selects Call tab on phone) */}
      {isMobileCallActive && (
        <div className="lg:hidden card p-4 border border-white/10 !bg-black space-y-4 rounded-2xl mb-24 w-full max-w-xl sm:max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="font-semibold text-sm text-white">Live Video Call</span>
              <span className="text-[11px] text-white/50">({users.length} connected)</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cam ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-rose-500/30 text-rose-300 bg-rose-500/10'}`}>
              {cam ? 'Camera Live' : 'Camera Off (Hardware Released)'}
            </span>
          </div>

          {/* Large Video Grid for Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Local Preview Tile */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10">
              <Tile
                stream={mine}
                name="You"
                isPartner={false}
                voiceOnly={voiceOnly}
                isSpeaking={localTalking}
                isCamOff={!cam}
              />
            </div>

            {/* Remote Partner Tiles */}
            {users.filter((u) => u.id !== me).map((u) => (
              <div key={u.id} className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10">
                <Tile
                  key={u.id}
                  stream={remote[u.id]}
                  name={u.name}
                  isPartner={true}
                  voiceOnly={voiceOnly}
                  isSpeaking={!!remoteTalking[u.id]}
                  isCamOff={false}
                />
              </div>
            ))}
          </div>

          {/* Easy-to-tap Mobile Controls Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={toggleMic}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
                mic ? 'bg-white/10 border-white/15 text-white' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {mic ? <Mic className="h-5 w-5 mb-1 text-white" /> : <MicOff className="h-5 w-5 mb-1 text-rose-400" />}
              <span className="text-[11px] font-semibold">{mic ? 'Mute Mic' : 'Unmuted'}</span>
            </button>

            <button
              type="button"
              onClick={toggleCam}
              disabled={camSwitching}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
                cam ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {cam ? <Video className="h-5 w-5 mb-1 text-emerald-400" /> : <VideoOff className="h-5 w-5 mb-1 text-rose-400" />}
              <span className="text-[11px] font-semibold">{camSwitching ? 'Switching…' : cam ? 'Cam: ON' : 'Cam: OFF'}</span>
            </button>

            <button
              type="button"
              onClick={toggleVoiceOnly}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
                voiceOnly ? 'bg-[#d9467a]/30 border-[#d9467a] text-white' : 'bg-white/10 border-white/15 text-white/70'
              }`}
            >
              <Volume2 className="h-5 w-5 mb-1 text-[#ff6fa0]" />
              <span className="text-[11px] font-semibold">{voiceOnly ? 'Voice Only' : 'Video Mode'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MOBILE PHONE FLOATING MINI-PIP (Shown when user is on another tab like Chat or Watch, so call never covers typing) */}
      {!isMobileCallActive && showCall && (
        <button
          type="button"
          onClick={() => onSwitchToCallTab?.()}
          className="lg:hidden fixed bottom-20 right-3 z-30 flex items-center gap-2 rounded-full border border-white/20 !bg-black px-3.5 py-2 text-xs font-medium text-white shadow-xl cursor-pointer hover:border-[#ff6fa0]/60 active:scale-95 transition"
          title="Open Video Call Tab"
        >
          {cam ? <Video className="h-3.5 w-3.5 text-emerald-400" /> : <VideoOff className="h-3.5 w-3.5 text-rose-400" />}
          <span>Video Call</span>
          {isAnyoneTalking && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
        </button>
      )}

      {/* 3. DESKTOP FLOATING WINDOW (Hidden on mobile phones, preserved for desktop displays) */}
      {isHidden ? (
        <button
          type="button"
          onClick={() => setHide(false)}
          className="hidden lg:flex fixed bottom-5 left-5 z-40 items-center gap-2 rounded-full border border-white/20 !bg-black px-3.5 py-2 text-xs font-medium text-white transition hover:border-[#ff6fa0]/60 cursor-pointer"
          title="Show video call window"
        >
          <Video className="h-3.5 w-3.5 text-[#ff6fa0]" />
          <span>Show Video Call</span>
          {isAnyoneTalking && <span className="h-2 w-2 rounded-full bg-[#ff6fa0]" />}
        </button>
      ) : (
        <div ref={box} className={`hidden lg:block fixed bottom-5 left-5 z-40 rounded-2xl border border-white/20 !bg-black p-2.5 transition-all ${layout === 'side' ? 'max-w-[92vw]' : ''}`}>
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
            {/* Local User Tile */}
            <Tile stream={mine} name="You" isPartner={false} voiceOnly={voiceOnly} isSpeaking={localTalking} isCamOff={!cam} />

            {/* Remote Peer Tiles */}
            {users.filter((u) => u.id !== me).map((u) => (
              <Tile
                key={u.id}
                stream={remote[u.id]}
                name={u.name}
                isPartner={true}
                voiceOnly={voiceOnly}
                isSpeaking={!!remoteTalking[u.id]}
                isCamOff={false}
              />
            ))}
          </div>

          <div className="mt-2 flex items-center justify-center gap-2 text-white">
            <button
              type="button"
              onClick={toggleMic}
              aria-label="Toggle microphone"
              title={mic ? 'Mute mic' : 'Unmute mic'}
              className={`rounded-full p-2 transition ${mic ? 'bg-white/10 hover:bg-white/20' : 'bg-rose-500/30 text-rose-300 ring-1 ring-rose-500/50'}`}
            >
              {mic ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-rose-400" />}
            </button>
            <button
              type="button"
              onClick={toggleCam}
              disabled={camSwitching}
              aria-label="Toggle camera"
              title={cam ? 'Turn off camera (releases hardware)' : 'Turn on camera'}
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
