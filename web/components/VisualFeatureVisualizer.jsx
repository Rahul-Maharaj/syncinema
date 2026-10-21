'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Play,
  Pause,
  ShieldCheck,
  Volume2,
  VolumeX,
  Film,
  Heart,
  Smartphone,
  Laptop,
  RotateCcw,
  FolderOpen,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ArrowRight,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  Mic,
  MicOff,
  Music,
  Upload,
  FileVideo,
  X,
  Check,
  Disc,
} from 'lucide-react';
import {
  Popcorn3D,
  Clapper3D,
  Heart3D,
  DuoCam3D,
  Shield3D,
  SyncBolt3D,
  Ticket3D,
  SparkleStar3D,
} from '@/components/Icons3D';
import { hindiLofi, HINDI_LOFI_SONGS } from '@/lib/hindiLofiSongs';

const VISUAL_SCENARIOS = [
  {
    id: 'sync_engine',
    title: '0ms Clock Drift Sync',
    badge: 'Core Engine',
    icon: SyncBolt3D,
    description: 'Sub-millisecond frame-locked synchronization across devices worldwide.',
    tagline: 'Drag playhead on Device 1 — watch Device 2 lock frames instantaneously!',
  },
  {
    id: 'instant_local',
    title: 'Instant 0s Local Movie Stream',
    badge: 'Fast Playback',
    icon: FolderOpen,
    description: 'Watch your local files in 0 seconds with zero wait while cloud stream pipes in background.',
    tagline: 'Host plays 2.5GB movie instantly at 0.01s with zero cloud delay!',
  },
  {
    id: 'buffer_hold',
    title: 'Auto-Pause & Buffer Hold',
    badge: 'Autonomous Healer',
    icon: Popcorn3D,
    description: 'When simulated Wi-Fi drops, both devices auto-pause gracefully and auto-resume in sync.',
    tagline: 'Simulate a 4G network glitch to see autonomous buffer hold in action.',
  },
  {
    id: 'voice_ducking',
    title: 'Duo Cam & Voice Ducking',
    badge: 'Couples Date',
    icon: Heart3D,
    description: 'Movie audio smoothly ducks when you speak, making intimate conversations effortless.',
    tagline: 'Simulate lover voice to see movie soundwave gently duck from 100% to 22%.',
  },
  {
    id: 'p2p_vault',
    title: 'P2P Cryptographic Vault',
    badge: 'Anti-Hijack',
    icon: Shield3D,
    description: 'Strict password authentication, zero tracking logs, and encrypted direct streams.',
    tagline: 'PBKDF2 passwords with end-to-end peer privacy.',
  },
];

const VIDEO_PRESETS = [
  {
    id: 'user_uploaded',
    title: 'My Cinema Video (sample-cinema.mp4)',
    url: '/sample-cinema.mp4',
    badge: 'Your Video',
  },
];

export default function VisualFeatureVisualizer({ onStartRoom }) {
  const [activeScenario, setActiveScenario] = useState('sync_engine');
  const [isPlaying, setIsPlaying] = useState(true);
  const [simTime, setSimTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(30);
  const [simSpeed, setSimSpeed] = useState(1.0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isLocalUploading, setIsLocalUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(68);
  const [floatingHearts, setFloatingHearts] = useState([]);
  const [laserPulse, setLaserPulse] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('aaja_sanam');

  // Video Management: Support for user's own video file / URL
  const [videoSource, setVideoSource] = useState('/sample-cinema.mp4');
  const [videoTitle, setVideoTitle] = useState('My Cinema Video (sample-cinema.mp4)');
  const [isCustomVideo, setIsCustomVideo] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Synchronized Video Viewports for Device 1 & Device 2
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const fileInputRef = useRef(null);

  // Control synchronized playback across both video viewports
  useEffect(() => {
    if (isPlaying && !isGlitching) {
      video1Ref.current?.play?.()?.catch(() => {});
      video2Ref.current?.play?.()?.catch(() => {});
    } else {
      video1Ref.current?.pause?.();
      video2Ref.current?.pause?.();
    }
  }, [isPlaying, isGlitching]);

  // Track video time and update scrubber
  const handleTimeUpdate = () => {
    if (video1Ref.current && isPlaying && !isGlitching) {
      setSimTime(video1Ref.current.currentTime);
      if (video1Ref.current.duration && !isNaN(video1Ref.current.duration)) {
        setVideoDuration(video1Ref.current.duration);
      }
    }
  };

  // Hindi Love Instrumental Lo-Fi Soundscape Controller
  useEffect(() => {
    if (soundEnabled) {
      hindiLofi.setSong(selectedSongId);
      hindiLofi.start();
    } else {
      hindiLofi.stop();
    }
    return () => {
      hindiLofi.stop();
    };
  }, [soundEnabled, selectedSongId]);

  // Voice ducking integration with Hindi Lo-Fi
  useEffect(() => {
    hindiLofi.setDucked(isVoiceActive);
  }, [isVoiceActive]);

  const activeSong = HINDI_LOFI_SONGS.find((s) => s.id === selectedSongId) || HINDI_LOFI_SONGS[0];

  const formatSimTime = (totalSec) => {
    if (isNaN(totalSec)) totalSec = 0;
    const mins = Math.floor(totalSec / 60);
    const secs = (totalSec % 60).toFixed(2);
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${pad(mins)}:${parseFloat(secs) < 10 ? '0' : ''}${secs}`;
  };

  // Scrub both videos simultaneously with 0ms delay
  const handleScrub = (newSec) => {
    setSimTime(newSec);
    setLaserPulse(true);
    if (video1Ref.current && Number.isFinite(video1Ref.current.duration)) {
      video1Ref.current.currentTime = newSec % video1Ref.current.duration;
    }
    if (video2Ref.current && Number.isFinite(video2Ref.current.duration)) {
      video2Ref.current.currentTime = newSec % video2Ref.current.duration;
    }
    setTimeout(() => setLaserPulse(false), 600);
  };

  // User Video File Loader (Local MP4/MKV/MOV/WebM)
  const handleUserVideoUpload = (file) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setVideoSource(objectUrl);
    setVideoTitle(file.name);
    setIsCustomVideo(true);
    setShowVideoModal(false);
    setSimTime(0);
    setIsPlaying(true);

    if (video1Ref.current) {
      video1Ref.current.src = objectUrl;
      video1Ref.current.currentTime = 0;
      video1Ref.current.play().catch(() => {});
    }
    if (video2Ref.current) {
      video2Ref.current.src = objectUrl;
      video2Ref.current.currentTime = 0;
      video2Ref.current.play().catch(() => {});
    }
  };

  // User Video URL Loader
  const handleUrlSubmit = (e) => {
    e?.preventDefault();
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();
    setVideoSource(url);
    const cleanName = url.split('/').pop()?.split('?')[0] || 'Custom Video Stream';
    setVideoTitle(cleanName);
    setIsCustomVideo(true);
    setShowVideoModal(false);
    setSimTime(0);
    setIsPlaying(true);

    if (video1Ref.current) {
      video1Ref.current.src = url;
      video1Ref.current.currentTime = 0;
      video1Ref.current.play().catch(() => {});
    }
    if (video2Ref.current) {
      video2Ref.current.src = url;
      video2Ref.current.currentTime = 0;
      video2Ref.current.play().catch(() => {});
    }
  };

  // Reset to default cinema video
  const resetToDefaultVideo = () => {
    setVideoSource('/sample-cinema.mp4');
    setVideoTitle('My Cinema Video (sample-cinema.mp4)');
    setIsCustomVideo(false);
    setShowVideoModal(false);
    setSimTime(0);
    if (video1Ref.current) {
      video1Ref.current.src = '/sample-cinema.mp4';
      video1Ref.current.currentTime = 0;
      video1Ref.current.play().catch(() => {});
    }
    if (video2Ref.current) {
      video2Ref.current.src = '/sample-cinema.mp4';
      video2Ref.current.currentTime = 0;
      video2Ref.current.play().catch(() => {});
    }
  };

  // Drag and Drop Handler for video files
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mkv|mov)$/i))) {
      handleUserVideoUpload(file);
    }
  };

  // Interactive Scenario Trigger: Simulate Glitch & Buffer Hold
  const triggerGlitchSimulation = () => {
    setIsGlitching(true);
    video1Ref.current?.pause?.();
    video2Ref.current?.pause?.();
    setTimeout(() => {
      setIsGlitching(false);
      if (isPlaying) {
        video1Ref.current?.play?.()?.catch(() => {});
        video2Ref.current?.play?.()?.catch(() => {});
      }
    }, 3500);
  };

  // Interactive Scenario Trigger: Simulate Instant Local Upload
  const triggerLocalUploadSimulation = () => {
    setIsLocalUploading(true);
    setUploadPercent(15);
    const timer = setInterval(() => {
      setUploadPercent((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(() => setIsLocalUploading(false), 2000);
          return 100;
        }
        return p + 18;
      });
    }, 400);
  };

  // Interactive Scenario Trigger: Heart Burst
  const triggerHeartBurst = () => {
    const newHearts = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      left: 20 + Math.random() * 60,
      size: 18 + Math.random() * 20,
    }));
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.some((nh) => nh.id === h.id)));
    }, 2000);
  };

  const currentScenario = VISUAL_SCENARIOS.find((s) => s.id === activeScenario) || VISUAL_SCENARIOS[0];
  const ScenarioIcon = currentScenario.icon;

  return (
    <section className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-10">
      {/* Hidden File Input for Picking User Video */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.mkv,.mp4,.webm,.mov"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUserVideoUpload(file);
        }}
      />

      {/* Visualizer Title & Mission Deck */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/35 text-pink-200 text-xs font-black uppercase tracking-wider shadow-lg backdrop-blur-md">
          <SparkleStar3D size={20} className="anim-float-slow" />
          <span>Interactive Visual Architecture</span>
          <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-ping" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-pink-100 tracking-tight leading-tight">
          Same Movie. Real Synchronized Playback.{' '}
          <span className="anim-text-shimmer inline-block">0ms Frame-Lock.</span>
        </h2>

        <p className="text-xs sm:text-sm lg:text-base text-pink-200/80 font-medium leading-relaxed">
          Both screens below play the <strong className="text-pink-300">exact same video in real-time</strong>. Load your own movie file or drag and drop any video to watch both screens lock frames instantaneously.
        </p>
      </div>

      {/* Interactive Scenario Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {VISUAL_SCENARIOS.map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeScenario === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveScenario(item.id);
                if (item.id === 'buffer_hold') triggerGlitchSimulation();
                if (item.id === 'instant_local') triggerLocalUploadSimulation();
                if (item.id === 'voice_ducking') setIsVoiceActive(true);
                else setIsVoiceActive(false);
              }}
              className={`group py-2.5 px-3.5 sm:px-4 rounded-2xl text-xs font-bold border transition-all duration-200 flex items-center gap-2.5 cursor-pointer shadow-md ${
                isActive
                  ? 'btn-pink text-white border-pink-400 shadow-pink-500/30 scale-105 ring-2 ring-pink-500/40'
                  : 'bg-[#1A1A1D]/90 border-pink-500/20 text-pink-200/70 hover:text-white hover:bg-white/5 hover:border-pink-500/40'
              }`}
            >
              <ItemIcon size={20} />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN INTERACTIVE VISUALIZER WORKBENCH */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-3xl border bg-[#222222]/95 backdrop-blur-2xl p-5 sm:p-8 shadow-[0_25px_70px_rgba(236,72,153,0.18)] space-y-6 relative overflow-hidden transition-all duration-300 ${
          isDraggingOver ? 'border-pink-400 ring-4 ring-pink-500/40 scale-[1.01]' : 'border-pink-500/30'
        }`}
      >
        {/* Drag and Drop Overlay Indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-pink-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-3 pointer-events-none">
            <Upload className="h-12 w-12 text-pink-300 animate-bounce" />
            <h4 className="text-xl font-black text-pink-100">Drop Your Video File Here!</h4>
            <p className="text-sm text-pink-200/80">Both mockups will immediately load and frame-lock your video.</p>
          </div>
        )}

        {/* Ambient Glow Aura */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-pink-500/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Workbench Header: Scenario Description & Live Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-pink-500/20 pb-5 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-pink-500/30 shrink-0">
              <ScenarioIcon size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-pink-100 text-lg sm:text-xl">
                  {currentScenario.title}
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-200 border border-pink-500/40">
                  {currentScenario.badge}
                </span>
              </div>
              <p className="text-xs text-pink-300 font-medium mt-0.5">
                {currentScenario.tagline}
              </p>
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
            {/* CHANGE / LOAD MY VIDEO BUTTON */}
            <button
              type="button"
              onClick={() => setShowVideoModal(true)}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 border border-pink-400/80 text-white text-xs font-extrabold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-pink-500/30 active:scale-95"
              title="Change video or upload your own video file"
            >
              <Upload className="h-4 w-4" />
              <span>Change Video / Load My Video</span>
            </button>

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="py-2 px-3.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 fill-pink-200" /> : <Play className="h-3.5 w-3.5 fill-pink-200" />}
              <span>{isPlaying ? 'Pause Both' : 'Play Both'}</span>
            </button>

            {/* Test Glitch / Network Stall Button */}
            <button
              type="button"
              onClick={triggerGlitchSimulation}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                isGlitching
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 animate-pulse'
                  : 'bg-[#1A1A1D] hover:bg-white/5 border-pink-500/25 text-pink-200'
              }`}
              title="Simulate network lag or buffering to see synchronized pause"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>Simulate Glitch</span>
            </button>

            {/* Test Voice Ducking */}
            <button
              type="button"
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                isVoiceActive
                  ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                  : 'bg-[#1A1A1D] hover:bg-white/5 border-pink-500/25 text-pink-200'
              }`}
              title="Simulate voice speech to watch Hindi love lofi duck"
            >
              <Mic className="h-3.5 w-3.5 text-rose-400" />
              <span>{isVoiceActive ? 'Voice Active' : 'Speak'}</span>
            </button>

            {/* Floating Heart Reaction Burst */}
            <button
              type="button"
              onClick={triggerHeartBurst}
              className="py-2 px-3 rounded-xl bg-[#1A1A1D] hover:bg-white/5 border border-pink-500/25 text-pink-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Send synchronized love reactions"
            >
              <Heart className="h-3.5 w-3.5 fill-pink-400 text-pink-400" />
              <span>Burst Hearts</span>
            </button>

            {/* Hindi Love Lo-Fi Soundscape Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`py-2 px-3.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                soundEnabled
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 ring-2 ring-emerald-500/30'
                  : 'bg-[#1A1A1D] border-pink-500/20 text-pink-300/70 hover:text-white'
              }`}
              title="Toggle Hindi Love Instrumental Lo-Fi Songs (Bansuri Flute, Rhodes, Vinyl Tape)"
            >
              <Music className={`h-3.5 w-3.5 ${soundEnabled ? 'text-emerald-400 animate-pulse' : 'text-pink-400'}`} />
              <span>{soundEnabled ? 'Hindi Lofi ON' : 'Hindi Lofi OFF'}</span>
            </button>
          </div>
        </div>

        {/* ACTIVE VIDEO TELEMETRY BANNER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 px-4 rounded-2xl bg-[#1A1A1D] border border-pink-500/25">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300 shrink-0">
              <Film className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-pink-100">
                  Playing: <span className="text-pink-300">{videoTitle}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  {isCustomVideo ? 'Custom User Video' : 'Cinema Sample'} • Frame-Locked Sync
                </span>
              </div>
              <p className="text-[10px] text-pink-300/70">
                Playing the exact same video file across Device 1 and Device 2 with 0.00ms clock lock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs py-1.5 px-3 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-100 font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="h-3 w-3" />
              <span>Choose From Device</span>
            </button>
            {isCustomVideo && (
              <button
                type="button"
                onClick={resetToDefaultVideo}
                className="text-xs py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-pink-200 transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Demo</span>
              </button>
            )}
          </div>
        </div>

        {/* DUAL-DEVICE 3D INTERACTIVE VISUAL STAGE (PLAYING EXACT SAME VIDEO) */}
        <div className="relative py-4 select-none">
          {/* Floating Hearts Animation Overlay */}
          {floatingHearts.map((heart) => (
            <div
              key={heart.id}
              className="absolute bottom-10 z-40 pointer-events-none transition-all duration-1000 ease-out"
              style={{
                left: `${heart.left}%`,
                transform: `translateY(-140px) scale(1.3)`,
                opacity: 0,
                fontSize: `${heart.size}px`,
              }}
            >
              💖
            </div>
          ))}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* DEVICE 1: Smartphone (You in Los Angeles) */}
            <div className="lg:col-span-5 rounded-3xl bg-[#1A1A1D] border-2 border-pink-500/40 p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-3.5 group hover:border-pink-400 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-pink-400" />
                  <span className="text-xs font-bold text-pink-100">
                    Your Device (Los Angeles)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Host • Direct P2P</span>
                </div>
              </div>

              {/* Screen Viewport with REAL SYNCHRONIZED VIDEO */}
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/90 border border-pink-500/30 shadow-inner flex items-center justify-center">
                <video
                  ref={video1Ref}
                  src={videoSource}
                  loop
                  muted
                  playsInline
                  autoPlay
                  onTimeUpdate={handleTimeUpdate}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* SynCinema Logo in Right Top Corner */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-pink-500/40 text-white shadow-xl pointer-events-none select-none">
                  <img
                    src="/logo.png"
                    alt="SynCinema Logo"
                    className="h-3.5 w-3.5 object-contain shrink-0"
                  />
                  <span className="text-[10px] font-black tracking-tight leading-none">
                    <span className="text-white">Syn</span>
                    <span className="text-pink-400">Cinema</span>
                  </span>
                </div>

                {/* In-Screen PiP Webcam Tile */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-pink-500/40 text-[10px] font-bold text-pink-200 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>You (Live 1080p)</span>
                </div>

                {/* Buffer Hold Simulation Overlay */}
                {isGlitching && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center space-y-2 z-25">
                    <Popcorn3D size={28} />
                    <p className="text-xs font-black text-pink-100">Sync Buffer Hold Active</p>
                    <p className="text-[10px] text-pink-200/80">
                      Partner network fluctuating… Holding playback so you stay 100% in sync!
                    </p>
                    <div className="flex items-end gap-1 h-4">
                      {[40, 80, 60, 100, 70, 90, 50].map((h, i) => (
                        <span
                          key={i}
                          className="w-1 rounded-full bg-pink-400 animate-pulse"
                          style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Time & Frame Overlay */}
                <div className="absolute bottom-2.5 right-2.5 text-right font-mono text-[11px] font-bold text-pink-100 drop-shadow-md">
                  {formatSimTime(simTime)}
                </div>
              </div>

              {/* Dynamic Audio Waveform Ribbon */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-pink-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-pink-300 font-semibold truncate">
                  <Volume2 className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                  <span className="truncate">
                    {soundEnabled
                      ? isVoiceActive
                        ? `${activeSong.title.split('•')[0]} (Ducked 20%)`
                        : `${activeSong.title.split('•')[0]} (100%)`
                      : 'Audio Wave (Stereo Phase)'}
                  </span>
                </div>
                <div className="flex items-end gap-0.5 h-4 shrink-0">
                  {[35, 75, 50, 90, 40, 80, 100, 60, 85, 45, 95, 70].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isVoiceActive ? 'bg-pink-400/40' : 'bg-gradient-to-t from-pink-500 to-rose-300'
                      }`}
                      style={{
                        height: isPlaying && !isGlitching ? `${isVoiceActive ? h * 0.25 : h}%` : '4px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER HOLOGRAPHIC QUANTUM SYNC BEAM */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-2 relative">
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-8 w-px bg-gradient-to-b from-pink-500 to-rose-400 relative overflow-hidden hidden lg:block">
                  <div className="absolute inset-x-0 h-4 bg-white anim-sync-laser" />
                </div>

                {/* Sync Nexus Orb */}
                <div
                  className={`p-3 rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 border-2 border-pink-400 shadow-xl shadow-pink-500/40 flex items-center justify-center text-white transition-transform ${
                    laserPulse ? 'scale-125 ring-4 ring-pink-400/60' : 'anim-heartbeat'
                  }`}
                >
                  <SyncBolt3D size={28} />
                </div>

                <div className="text-center mt-1">
                  <span className="text-[10px] font-mono font-extrabold text-emerald-400 uppercase tracking-widest block">
                    0.00ms Drift
                  </span>
                  <span className="text-[9px] font-mono text-pink-300/80">
                    Same Video • 60 FPS
                  </span>
                </div>

                <div className="h-8 w-px bg-gradient-to-b from-rose-400 to-pink-500 relative overflow-hidden hidden lg:block">
                  <div className="absolute inset-x-0 h-4 bg-white anim-sync-laser" />
                </div>
              </div>
            </div>

            {/* DEVICE 2: Laptop / Partner (Tokyo / London) (PLAYING EXACT SAME VIDEO) */}
            <div className="lg:col-span-5 rounded-3xl bg-[#1A1A1D] border-2 border-pink-500/40 p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-3.5 group hover:border-pink-400 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-pink-400" />
                  <span className="text-xs font-bold text-pink-100">
                    Partner&rsquo;s Device (Tokyo)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-200 text-[10px] font-mono font-bold border border-pink-500/40">
                  <Heart className="h-2.5 w-2.5 fill-pink-400 text-pink-400" />
                  <span>Partner • 0ms Drift</span>
                </div>
              </div>

              {/* Screen Viewport with REAL SYNCHRONIZED VIDEO */}
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-black/90 border border-pink-500/30 shadow-inner flex items-center justify-center">
                <video
                  ref={video2Ref}
                  src={videoSource}
                  loop
                  muted
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* SynCinema Logo in Right Top Corner */}
                <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-pink-500/40 text-white shadow-xl pointer-events-none select-none">
                  <img
                    src="/logo.png"
                    alt="SynCinema Logo"
                    className="h-3.5 w-3.5 object-contain shrink-0"
                  />
                  <span className="text-[10px] font-black tracking-tight leading-none">
                    <span className="text-white">Syn</span>
                    <span className="text-pink-400">Cinema</span>
                  </span>
                </div>

                {/* In-Screen PiP Webcam Tile */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-black/85 backdrop-blur-md border border-rose-500/40 text-[10px] font-bold text-rose-200 shadow-md">
                  <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
                  <span>Partner (Live 1080p)</span>
                </div>

                {/* Voice Call Active Bubble (Bottom Left so top-right logo is never blocked) */}
                {isVoiceActive && (
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-rose-950/90 border border-rose-400 text-rose-100 text-[10px] font-bold shadow-lg animate-pulse z-30">
                    <Mic className="h-3 w-3 text-rose-300" />
                    <span>Speaking to you…</span>
                  </div>
                )}

                {/* Buffer Hold Simulation Overlay */}
                {isGlitching && (
                  <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center space-y-2 z-25">
                    <Popcorn3D size={28} />
                    <p className="text-xs font-black text-amber-200">Wi-Fi Glitch Detected</p>
                    <p className="text-[10px] text-amber-100/80">
                      Autonomous Auto-Fixer holding playback… Auto-resuming together!
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] border border-amber-500/40">
                      Self-Healing Active
                    </span>
                  </div>
                )}

                {/* Time & Frame Overlay */}
                <div className="absolute bottom-2.5 right-2.5 text-right font-mono text-[11px] font-bold text-pink-100 drop-shadow-md">
                  {formatSimTime(simTime)}
                </div>
              </div>

              {/* Dynamic Voice/Audio Waveform Ribbon */}
              <div className="p-2.5 rounded-xl bg-black/40 border border-pink-500/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-pink-300 font-semibold truncate">
                  <Volume2 className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                  <span className="truncate">{isVoiceActive ? 'Voice Wave (Clear)' : 'Audio Phase (Stereo Lock)'}</span>
                </div>
                <div className="flex items-end gap-0.5 h-4 shrink-0">
                  {[35, 75, 50, 90, 40, 80, 100, 60, 85, 45, 95, 70].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isVoiceActive ? 'bg-gradient-to-t from-rose-500 to-pink-300' : 'bg-gradient-to-t from-pink-500 to-rose-300'
                      }`}
                      style={{
                        height: isPlaying && !isGlitching ? `${isVoiceActive ? h * 1.1 : h}%` : '4px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE TIMELINE SCRUBBER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#1A1A1D]/90 border border-pink-500/25 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-pink-200 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-pink-400" />
              <span>Interactive Time Scrubber (Seek BOTH videos with 0ms delay)</span>
            </span>
            <span className="font-mono text-pink-300 font-bold">
              {formatSimTime(simTime)} / {formatSimTime(videoDuration)}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={videoDuration || 30}
            step="0.05"
            value={simTime}
            onChange={(e) => handleScrub(parseFloat(e.target.value))}
            className="w-full accent-pink-500 h-2 rounded-full bg-white/10 cursor-pointer"
          />
        </div>

        {/* HINDI LOVE LO-FI SONGS JUKEBOX BAR */}
        <div className="p-4 rounded-2xl bg-[#1A1A1D] border border-pink-500/20 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0 ${soundEnabled ? 'anim-rotate-slow' : ''}`}>
                <Disc className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-pink-100 flex items-center gap-2">
                  <span>Hindi Love Instrumental Lo-Fi Songs</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                    Bansuri Flute + Vinyl Tape
                  </span>
                </h4>
                <p className="text-[10px] text-pink-300/70">
                  Now Playing: <strong className="text-pink-200">{activeSong.title}</strong> ({activeSong.scale})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-200'
                  : 'bg-[#141416] border border-pink-500/20 text-pink-300/70 hover:text-white'
              }`}
            >
              <Music className={`h-3.5 w-3.5 ${soundEnabled ? 'text-emerald-400 animate-pulse' : 'text-pink-400'}`} />
              <span>{soundEnabled ? 'Sound ON' : 'Turn Sound ON'}</span>
            </button>
          </div>

          {/* Song Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HINDI_LOFI_SONGS.map((song) => {
              const isSelected = selectedSongId === song.id;
              return (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => {
                    setSelectedSongId(song.id);
                    if (!soundEnabled) setSoundEnabled(true);
                  }}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'btn-pink text-white border-pink-400 shadow-md ring-1 ring-pink-500/60'
                      : 'bg-[#141416] border-pink-500/20 text-pink-200/80 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate">{song.title.split('•')[0]}</span>
                    {isSelected && soundEnabled && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <span className="text-[10px] text-pink-300/70 truncate mt-0.5">{song.subtitle.split('&')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D Visualizer Art Stickers Pack */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-[#1A1A1D] border border-pink-500/20 text-center space-y-1 group hover:border-pink-400 transition-colors">
            <div className="mx-auto flex justify-center anim-float-slow">
              <SyncBolt3D size={26} />
            </div>
            <p className="text-base font-black text-emerald-400 font-mono">0.00 ms</p>
            <p className="text-[10px] text-pink-200/80 font-bold uppercase tracking-wider">Clock Lock</p>
            <p className="text-[9px] text-pink-300/60">Sub-millisecond rate sync</p>
          </div>

          <div className="p-3 rounded-2xl bg-[#1A1A1D] border border-pink-500/20 text-center space-y-1 group hover:border-pink-400 transition-colors">
            <div className="mx-auto flex justify-center anim-heartbeat">
              <Heart3D size={26} />
            </div>
            <p className="text-base font-black text-pink-200 font-mono">Duo Cam</p>
            <p className="text-[10px] text-pink-200/80 font-bold uppercase tracking-wider">Webcam Tiles</p>
            <p className="text-[9px] text-pink-300/60">Real-time video &amp; voice</p>
          </div>

          <div className="p-3 rounded-2xl bg-[#1A1A1D] border border-pink-500/20 text-center space-y-1 group hover:border-pink-400 transition-colors">
            <div className="mx-auto flex justify-center anim-float-reverse">
              <Popcorn3D size={26} />
            </div>
            <p className="text-base font-black text-amber-300 font-mono">Auto-Healer</p>
            <p className="text-[10px] text-pink-200/80 font-bold uppercase tracking-wider">Buffer Hold</p>
            <p className="text-[9px] text-pink-300/60">Auto pause &amp; auto play</p>
          </div>

          <div className="p-3 rounded-2xl bg-[#1A1A1D] border border-pink-500/20 text-center space-y-1 group hover:border-pink-400 transition-colors">
            <div className="mx-auto flex justify-center anim-float-sway">
              <Shield3D size={26} />
            </div>
            <p className="text-base font-black text-rose-300 font-mono">100% P2P</p>
            <p className="text-[10px] text-pink-200/80 font-bold uppercase tracking-wider">Privacy Vault</p>
            <p className="text-[9px] text-pink-300/60">Zero logs &amp; PBKDF2 keys</p>
          </div>
        </div>

        {/* Call to Action Banner */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-pink-500/20">
          <div className="flex items-center gap-2 text-xs text-pink-200">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Ready to watch your movie together with someone special?</span>
          </div>

          {onStartRoom && (
            <button
              type="button"
              onClick={onStartRoom}
              className="btn-pink py-3 px-6 rounded-2xl text-white font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition active:scale-95 shadow-pink-500/30"
            >
              <span>Create Your Cinema Room</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* CHANGE VIDEO / LOAD MY VIDEO INTERACTIVE MODAL */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#1c1c20] border border-pink-500/30 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-pink-500/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <FileVideo className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-pink-100 text-base">Change Video Player Source</h3>
                  <p className="text-xs text-pink-300/80">Load your own video to test live synchronization</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Option 1: Pick local file from computer */}
            <div className="p-4 rounded-2xl bg-[#141416] border border-pink-500/20 space-y-2.5 text-center">
              <Upload className="h-7 w-7 text-pink-400 mx-auto animate-bounce" />
              <h4 className="text-sm font-bold text-pink-100">Upload / Select Video From Your Files</h4>
              <p className="text-xs text-pink-200/70">
                Pick any MP4, MKV, WebM, or MOV file on your device. Plays instantly with 0MB cloud wait.
              </p>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                className="btn-pink py-2.5 px-5 rounded-xl text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <FolderOpen className="h-4 w-4" />
                <span>Browse My Files</span>
              </button>
            </div>

            {/* Option 2: Enter direct video URL */}
            <form onSubmit={handleUrlSubmit} className="space-y-2">
              <label className="text-xs font-bold text-pink-200">Or Paste Direct Video URL (.mp4 / .webm)</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://example.com/my-movie.mp4"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#141416] border border-pink-500/25 text-xs text-pink-100 placeholder-pink-300/40 outline-none focus:border-pink-500 font-mono"
                />
                <button
                  type="submit"
                  className="btn-pink py-2 px-4 rounded-xl text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  Load URL
                </button>
              </div>
            </form>

            {/* Option 3: Presets */}
            <div className="flex items-center justify-between pt-2 border-t border-pink-500/20 text-xs">
              <button
                type="button"
                onClick={resetToDefaultVideo}
                className="text-pink-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore Default Demo Video</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-pink-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
