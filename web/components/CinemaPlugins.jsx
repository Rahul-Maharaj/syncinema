'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Music, Camera, Timer, HelpCircle, Heart, X, Play, Pause,
  Volume2, VolumeX, Download, MessageSquare, RefreshCw, Flame, CloudRain,
  Radio, Compass, Check, Coffee, Popcorn, Smile, Trophy, Award, Zap
} from 'lucide-react';

// Soundscapes Web Audio procedurals
class SoundscapeAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.activeTracks = new Map(); // name -> { gain, nodes: [] }
    this.volume = 0.6;
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio init failed:', e);
    }
  }

  setMasterVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  playRain() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.activeTracks.has('rain')) return;

    // Pink / Brown noise buffer for rain
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to sound like soft rainfall against a glass window
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start();
    this.activeTracks.set('rain', { gain, nodes: [whiteNoise, filter, gain] });
  }

  playFireplace() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.activeTracks.has('fire')) return;

    // Low rumble oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, this.ctx.currentTime);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    osc.connect(oscGain);

    // Crackle noise generator
    const bufferSize = this.ctx.sampleRate;
    const crackleBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = crackleBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // sparse random pops
      data[i] = Math.random() > 0.992 ? (Math.random() * 2 - 1) * 0.8 : 0;
    }
    const crackleSource = this.ctx.createBufferSource();
    crackleSource.buffer = crackleBuffer;
    crackleSource.loop = true;

    const crackleFilter = this.ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    const crackleGain = this.ctx.createGain();
    crackleGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    crackleSource.connect(crackleFilter);
    crackleFilter.connect(crackleGain);

    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0.5, this.ctx.currentTime);

    oscGain.connect(trackGain);
    crackleGain.connect(trackGain);
    trackGain.connect(this.masterGain);

    osc.start();
    crackleSource.start();

    this.activeTracks.set('fire', { gain: trackGain, nodes: [osc, crackleSource, crackleFilter, trackGain] });
  }

  playVinyl() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.activeTracks.has('vinyl')) return;

    // Vinyl needle noise
    const bufferSize = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      d[i] = Math.random() > 0.996 ? (Math.random() * 2 - 1) * 0.4 : (Math.random() * 2 - 1) * 0.02;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1400, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    source.connect(bandpass);
    bandpass.connect(trackGain);
    trackGain.connect(this.masterGain);

    source.start();
    this.activeTracks.set('vinyl', { gain: trackGain, nodes: [source, bandpass, trackGain] });
  }

  playSpace() {
    if (!this.ctx) this.init();
    if (!this.ctx || this.activeTracks.has('space')) return;

    // Dual resonant binaural sine oscillators for space ambient
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(108, this.ctx.currentTime); // 108Hz
    osc2.frequency.setValueAtTime(110.5, this.ctx.currentTime); // 2.5Hz binaural beat

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    const trackGain = this.ctx.createGain();
    trackGain.gain.setValueAtTime(0.25, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(trackGain);
    trackGain.connect(this.masterGain);

    osc1.start();
    osc2.start();
    this.activeTracks.set('space', { gain: trackGain, nodes: [osc1, osc2, filter, trackGain] });
  }

  stopTrack(name) {
    const track = this.activeTracks.get(name);
    if (!track) return;
    try {
      track.nodes.forEach((n) => {
        try { if (n.stop) n.stop(); } catch {}
        try { n.disconnect(); } catch {}
      });
    } catch {}
    this.activeTracks.delete(name);
  }

  stopAll() {
    for (const name of Array.from(this.activeTracks.keys())) {
      this.stopTrack(name);
    }
  }

  playIntermissionChime() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 retro arpeggio
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        g.gain.setValueAtTime(0, now + i * 0.12);
        g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.6);
        osc.connect(g);
        g.connect(this.masterGain || this.ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.65);
      });
    } catch {}
  }

  playShutterClick() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(g);
      g.connect(this.masterGain || this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }
}

// Global engine instance so sound keeps playing seamlessly
let globalAudioEngine = null;
function getAudioEngine() {
  if (typeof window === 'undefined') return null;
  if (!globalAudioEngine) {
    globalAudioEngine = new SoundscapeAudioEngine();
  }
  return globalAudioEngine;
}

// Curated trivia & conversation cards
const PROMPT_DECK = [
  { id: 1, category: 'hot-takes', tag: '🍿 Hot Take', q: 'Predict the ending right now without looking it up! Who survives?' },
  { id: 2, category: 'hot-takes', tag: '🍿 Plot Twist', q: 'If you were the main character in this exact scene, what would you have done differently?' },
  { id: 3, category: 'hot-takes', tag: '🍿 Hot Take', q: 'Who is the secret villain or most misunderstood character in this story?' },
  { id: 4, category: 'hot-takes', tag: '🍿 Soundtrack', q: 'Rate this movie’s background score from 1 to 10 so far and name your favorite moment!' },
  { id: 5, category: 'hot-takes', tag: '🍿 Re-Casting', q: 'If this movie was remade in 2030, which actors should play the lead roles?' },
  { id: 6, category: 'couples', tag: '💖 Duo Vibes', q: 'Which character in this film reminds you of me the most and why?' },
  { id: 7, category: 'couples', tag: '💖 Survival Check', q: 'If we were trapped together in this movie’s universe, how long would we survive?' },
  { id: 8, category: 'couples', tag: '💖 Memories', q: 'What was the very first movie we ever watched together, and what snacks did we have?' },
  { id: 9, category: 'couples', tag: '💖 Roleplay', q: 'If this movie had a post-credits scene featuring the two of us, what would happen?' },
  { id: 10, category: 'couples', tag: '💖 Snack Vibe', q: 'What movie snack best describes our relationship dynamic?' },
  { id: 11, category: 'trivia', tag: '🎬 Film Buff', q: 'Name 2 other movies starring this main lead actor without checking Google!' },
  { id: 12, category: 'trivia', tag: '🎬 Cinema Trivia', q: 'Can you guess what year this movie was originally released in theaters?' },
  { id: 13, category: 'trivia', tag: '🎬 Director Cut', q: 'What other famous masterpiece was directed by this filmmaker?' },
  { id: 14, category: 'couples', tag: '💖 Tearjerker', q: 'Who is more likely to cry at emotional scenes — you or me?' },
  { id: 15, category: 'hot-takes', tag: '🍿 Unpopular Opinion', q: 'What is your most controversial or unpopular opinion about this movie genre?' },
];

// Helper to draw an image or video with "object-fit: cover", center cropping and optional mirroring
function drawCoverMedia(ctx, source, dx, dy, dw, dh, options = {}) {
  if (!source) return false;
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  if (!sw || !sh) return false;

  const srcAspect = sw / sh;
  const dstAspect = dw / dh;

  let sx, sy, sWidth, sHeight;
  if (srcAspect > dstAspect) {
    sHeight = sh;
    sWidth = sh * dstAspect;
    sx = (sw - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = sw;
    sHeight = sw / dstAspect;
    sx = 0;
    sy = (sh - sHeight) / 2;
  }

  try {
    ctx.save();
    if (options.clipRadius && typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(dx, dy, dw, dh, options.clipRadius);
      ctx.clip();
    }
    if (options.flipHorizontal) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, dw, dh);
    } else {
      ctx.drawImage(source, sx, sy, sWidth, sHeight, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  } catch (err) {
    console.warn('drawCoverMedia canvas draw error:', err);
    return false;
  }
}

export default function CinemaPlugins({
  isOpen,
  onClose,
  socket,
  me,
  hostId,
  users = [],
  currentMedia,
  timer,
  say,
  defaultTab = 'soundscapes',
  onTriggerReaction,
  callMedia,
  playerRef
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [soundVolume, setSoundVolume] = useState(60);
  const [activeTracks, setActiveTracks] = useState({
    rain: false,
    fire: false,
    vinyl: false,
    space: false,
  });

  // Keepsake state - Couples Polaroid with Real Movie & Live Video Call Webcams
  const canvasRef = useRef(null);
  const localCamVideoRef = useRef(null);
  const partnerCamVideoRef = useRef(null);
  const ytThumbRef = useRef(null);
  const [caption, setCaption] = useState('Under the stars, lost in the cinema magic together ✨');
  const [polaroidLayout, setPolaroidLayout] = useState('split'); // 'split' | 'couch' | 'pip'
  const [selectedStickers, setSelectedStickers] = useState(['heart', 'popcorn', 'sparkles']);
  const [activeFilter, setActiveFilter] = useState('rose'); // 'rose' | 'warm' | 'noir' | 'none'
  const [copiedLink, setCopiedLink] = useState(false);
  const [snapshotNonce, setSnapshotNonce] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [liveViewfinder, setLiveViewfinder] = useState(false);

  // Preloaded background / fallback images for instant canvas draw
  const imagesRef = useRef({
    couch: null,
    couple: null,
    logo: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const img1 = new Image();
    img1.src = '/ad-duo-cinema.jpg';
    img1.onload = () => { imagesRef.current.couch = img1; if (activeTab === 'keepsake') drawPolaroid(); };

    const img2 = new Image();
    img2.src = '/feature-couple.jpg';
    img2.onload = () => { imagesRef.current.couple = img2; if (activeTab === 'keepsake') drawPolaroid(); };
  }, [activeTab]);

  // Keep offscreen webcam video elements continuously fed with active WebRTC streams
  useEffect(() => {
    const el = localCamVideoRef.current;
    if (el && callMedia?.mine) {
      if (el.srcObject !== callMedia.mine) {
        el.srcObject = callMedia.mine;
        el.play().catch(() => {});
      }
    }
  }, [callMedia?.mine]);

  useEffect(() => {
    const el = partnerCamVideoRef.current;
    const partner = users.find((u) => u.id !== me);
    const partnerStream = partner ? callMedia?.remote?.[partner.id] : Object.values(callMedia?.remote || {})[0];
    if (el && partnerStream) {
      if (el.srcObject !== partnerStream) {
        el.srcObject = partnerStream;
        el.play().catch(() => {});
      }
    }
  }, [callMedia?.remote, users, me]);

  // Load YouTube high-res thumbnail if current media is YouTube
  useEffect(() => {
    let ytIdStr = null;
    if (currentMedia?.src) {
      const match = currentMedia.src.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
      if (match) ytIdStr = match[1];
    }
    if (ytIdStr) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = `https://img.youtube.com/vi/${ytIdStr}/hqdefault.jpg`;
      img.onload = () => {
        ytThumbRef.current = img;
        if (activeTab === 'keepsake') drawPolaroid();
      };
    }
  }, [currentMedia?.src, activeTab]);

  // Optional live viewfinder interval (updates frame 2x/sec if live viewfinder is toggled on)
  useEffect(() => {
    if (!liveViewfinder || activeTab !== 'keepsake' || !isOpen) return;
    const interval = setInterval(() => {
      drawPolaroid();
    }, 500);
    return () => clearInterval(interval);
  }, [liveViewfinder, activeTab, isOpen, polaroidLayout, selectedStickers, activeFilter, caption]);

  // Romantic caption presets
  const CAPTION_PRESETS = [
    'Under the stars, lost in cinema magic together ✨',
    'Miles apart, but our hearts are on the same screen 💖',
    'Our cozy late-night movie date 🍿🌙',
    'Popcorn, cozy blanket & the best company 🥰',
    'Every scene is better when watching with you 🎬',
  ];

  // Prompts state
  const [promptIndex, setPromptIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  // Sync tab with defaultTab when modal opens
  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  // Handle soundscape audio engine toggling
  const toggleTrack = (trackName) => {
    const engine = getAudioEngine();
    if (!engine) return;
    engine.init();

    setActiveTracks((prev) => {
      const nextState = !prev[trackName];
      if (nextState) {
        if (trackName === 'rain') engine.playRain();
        if (trackName === 'fire') engine.playFireplace();
        if (trackName === 'vinyl') engine.playVinyl();
        if (trackName === 'space') engine.playSpace();
      } else {
        engine.stopTrack(trackName);
      }
      return { ...prev, [trackName]: nextState };
    });
  };

  const handleVolumeChange = (newVal) => {
    setSoundVolume(newVal);
    const engine = getAudioEngine();
    if (engine) engine.setMasterVolume(newVal / 100);
  };

  const stopAllAudio = () => {
    const engine = getAudioEngine();
    if (engine) engine.stopAll();
    setActiveTracks({ rain: false, fire: false, vinyl: false, space: false });
    say?.('Soundscapes silenced 🔇');
  };

  // Intermission Timer Actions (Host Only)
  const startIntermission = (mins, label) => {
    if (!socket) return;
    const engine = getAudioEngine();
    if (engine) engine.playIntermissionChime();
    socket.emit('timer:start', { duration: mins * 60, label });
    say?.(`🍿 Started ${mins}m ${label}!`);
  };

  const resetIntermission = () => {
    if (!socket) return;
    socket.emit('timer:reset');
    say?.('Intermission ended.');
  };

  const snapLiveFrame = () => {
    const engine = getAudioEngine();
    if (engine) engine.playShutterClick();
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 250);
    setSnapshotNonce((n) => n + 1);
    say?.('📸 Snapped fresh real movie & couple selfie frame!');
  };

  // Draw Couples Polaroid with Real Movie & Live Video Call Webcams
  const drawPolaroid = (opts = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 780;
    canvas.width = width;
    canvas.height = height;

    // 1. Vintage Polaroid Paper Surface
    ctx.fillStyle = '#fcfbf8';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper grain & warm border shadow
    ctx.strokeStyle = '#e6e4dc';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, width - 6, height - 6);

    // Photo Area
    const px = 36;
    const py = 36;
    const pw = 568;
    const ph = 530;

    // Save context for photo clipping
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();

    // Dark backdrop inside photo
    ctx.fillStyle = '#0f0e17';
    ctx.fillRect(px, py, pw, ph);

    // 1. Locate real movie video element
    let movieVideoEl = null;
    try {
      if (playerRef?.current?.getVideoElement) {
        movieVideoEl = playerRef.current.getVideoElement();
      }
      if (!movieVideoEl && typeof document !== 'undefined') {
        const vids = Array.from(document.querySelectorAll('video')).filter(
          (v) => v !== localCamVideoRef.current && v !== partnerCamVideoRef.current
        );
        movieVideoEl = vids.find((v) => v.videoWidth > 400 || v.classList.contains('object-contain')) || vids[0];
      }
    } catch (e) {
      console.warn('Video element query failed:', e);
    }

    const hasRealMovieVideo = Boolean(
      !opts?.safeFallback &&
      movieVideoEl &&
      movieVideoEl.readyState >= 2 &&
      movieVideoEl.videoWidth > 0
    );

    // 2. Locate real live webcam streams
    const getCamSource = (isPartner) => {
      const offscreenEl = isPartner ? partnerCamVideoRef.current : localCamVideoRef.current;
      if (offscreenEl && offscreenEl.readyState >= 2 && offscreenEl.videoWidth > 0) {
        return offscreenEl;
      }
      if (typeof document !== 'undefined') {
        const camVids = Array.from(document.querySelectorAll('video')).filter(
          (v) => v !== movieVideoEl && v !== localCamVideoRef.current && v !== partnerCamVideoRef.current && v.readyState >= 2 && v.videoWidth > 0
        );
        if (isPartner && camVids.length > 1) return camVids[1];
        if (!isPartner && camVids.length > 0) return camVids[0];
      }
      return null;
    };

    const partner = users.find((u) => u.id !== me);
    const myCamSource = getCamSource(false);
    const partnerCamSource = getCamSource(true);
    const myCamActive = Boolean(myCamSource && callMedia?.cam !== false);
    const partnerCamActive = Boolean(partnerCamSource && !callMedia?.remoteCamOff?.[partner?.id]);

    const myName = users.find((u) => u.id === me)?.name || 'You';
    const partnerName = partner?.name || 'Partner';

    let movieTimeSec = 0;
    try {
      movieTimeSec = playerRef?.current?.getCurrentTime?.() || (movieVideoEl ? movieVideoEl.currentTime : 0) || 0;
    } catch {}
    const fmtTime = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
    };
    const timecodeStr = fmtTime(movieTimeSec);
    const movieTitle = currentMedia?.title || 'Private Cinema Premiere';

    // LAYOUT 1: SPLIT (Real Movie on Top + Real Live Video Call on Bottom)
    if (polaroidLayout === 'split') {
      const movieH = 320;
      const callH = ph - movieH;

      // Draw real movie in top half
      let movieDrawn = false;
      if (hasRealMovieVideo) {
        movieDrawn = drawCoverMedia(ctx, movieVideoEl, px, py, pw, movieH);
      }
      if (!movieDrawn && ytThumbRef.current && ytThumbRef.current.complete) {
        movieDrawn = drawCoverMedia(ctx, ytThumbRef.current, px, py, pw, movieH);
      }
      if (!movieDrawn && imagesRef.current.couch && imagesRef.current.couch.complete) {
        movieDrawn = drawCoverMedia(ctx, imagesRef.current.couch, px, py, pw, movieH);
      }
      if (!movieDrawn) {
        const mgrad = ctx.createLinearGradient(px, py, px + pw, py + movieH);
        mgrad.addColorStop(0, '#1e1b4b');
        mgrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = mgrad;
        ctx.fillRect(px, py, pw, movieH);
      }

      // Cinema Ambient Glow & Vignette
      const movieVignette = ctx.createLinearGradient(px, py, px, py + movieH);
      movieVignette.addColorStop(0, 'rgba(0,0,0,0.65)');
      movieVignette.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      movieVignette.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = movieVignette;
      ctx.fillRect(px, py, pw, movieH);

      // Now Playing Glass HUD Top-Left
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.beginPath();
      ctx.roundRect(px + 14, py + 14, 270, 32, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#fce7f3';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🎬 ${movieTitle.slice(0, 24)}${movieTitle.length > 24 ? '…' : ''}`, px + 26, py + 34);

      // Real Timecode & Sync Badge Top-Right
      ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
      ctx.beginPath();
      ctx.roundRect(px + pw - 120, py + 14, 106, 26, 13);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`▶ ${timecodeStr} • SYNC`, px + pw - 67, py + 31);

      // Divider between Movie and Calls
      ctx.fillStyle = '#18181b';
      ctx.fillRect(px, py + movieH, pw, callH);

      ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py + movieH);
      ctx.lineTo(px + pw, py + movieH);
      ctx.stroke();

      // Lower Section: COUPLES VIDEO CALL (2 Side-by-Side Webcam Tiles)
      const callTileW = (pw - 24) / 2;
      const callTileH = callH - 24;
      const callTileY = py + movieH + 12;

      // Tile 1: Left (You) - REAL LIVE WEBCAM (Mirrored)
      const t1x = px + 8;
      let t1Drawn = false;
      if (myCamActive) {
        t1Drawn = drawCoverMedia(ctx, myCamSource, t1x, callTileY, callTileW, callTileH, {
          flipHorizontal: true,
          clipRadius: 16
        });
      }
      if (!t1Drawn) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(t1x, callTileY, callTileW, callTileH, 16);
        ctx.clip();
        const cGrad1 = ctx.createLinearGradient(t1x, callTileY, t1x + callTileW, callTileY + callTileH);
        cGrad1.addColorStop(0, '#3b0764');
        cGrad1.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = cGrad1;
        ctx.fillRect(t1x, callTileY, callTileW, callTileH);

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(t1x + callTileW / 2, callTileY + callTileH / 2 - 10, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(myName.charAt(0).toUpperCase() || 'U', t1x + callTileW / 2, callTileY + callTileH / 2 - 2);
        ctx.restore();
      }

      ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(t1x, callTileY, callTileW, callTileH, 16);
      ctx.stroke();

      // Name Tag Overlay (You)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(t1x + 8, callTileY + callTileH - 28, 110, 22, 11);
      ctx.fill();
      ctx.fillStyle = '#fce7f3';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🎙️ ${myName.slice(0, 10)} (You)`, t1x + 16, callTileY + callTileH - 13);

      // Tile 2: Right (Partner) - REAL LIVE WEBCAM
      const t2x = px + pw - callTileW - 8;
      let t2Drawn = false;
      if (partnerCamActive) {
        t2Drawn = drawCoverMedia(ctx, partnerCamSource, t2x, callTileY, callTileW, callTileH, {
          flipHorizontal: false,
          clipRadius: 16
        });
      }
      if (!t2Drawn) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(t2x, callTileY, callTileW, callTileH, 16);
        ctx.clip();
        const cGrad2 = ctx.createLinearGradient(t2x, callTileY, t2x + callTileW, callTileY + callTileH);
        cGrad2.addColorStop(0, '#581c87');
        cGrad2.addColorStop(1, '#831843');
        ctx.fillStyle = cGrad2;
        ctx.fillRect(t2x, callTileY, callTileW, callTileH);

        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(t2x + callTileW / 2, callTileY + callTileH / 2 - 10, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(partnerName.charAt(0).toUpperCase() || 'P', t2x + callTileW / 2, callTileY + callTileH / 2 - 2);
        ctx.restore();
      }

      ctx.strokeStyle = 'rgba(244, 63, 94, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(t2x, callTileY, callTileW, callTileH, 16);
      ctx.stroke();

      // Name Tag Overlay (Partner)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(t2x + 8, callTileY + callTileH - 28, 110, 22, 11);
      ctx.fill();
      ctx.fillStyle = '#fce7f3';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🎙️ ${partnerName.slice(0, 10)}`, t2x + 16, callTileY + callTileH - 13);

      // Center Heart Connector Badge between the two real video calls
      const heartBadgeX = px + pw / 2;
      const heartBadgeY = callTileY + callTileH / 2;
      ctx.fillStyle = 'rgba(236, 72, 153, 0.95)';
      ctx.beginPath();
      ctx.arc(heartBadgeX, heartBadgeY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💖', heartBadgeX, heartBadgeY + 6);
    }
    // LAYOUT 2: COUCH (VIP Living Room Theater Artwork + Real Movie Screen + Inset Live Cams)
    else if (polaroidLayout === 'couch') {
      let couchDrawn = false;
      if (imagesRef.current.couch && imagesRef.current.couch.complete) {
        couchDrawn = drawCoverMedia(ctx, imagesRef.current.couch, px, py, pw, ph);
      }
      if (!couchDrawn) {
        const cGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
        cGrad.addColorStop(0, '#181024');
        cGrad.addColorStop(0.5, '#2e0819');
        cGrad.addColorStop(1, '#090812');
        ctx.fillStyle = cGrad;
        ctx.fillRect(px, py, pw, ph);
      }

      // Real Playing Movie Screen on Theater Wall
      const screenX = px + 28;
      const screenY = py + 72;
      const screenW = pw - 56;
      const screenH = 270;

      let screenDrawn = false;
      if (hasRealMovieVideo) {
        screenDrawn = drawCoverMedia(ctx, movieVideoEl, screenX, screenY, screenW, screenH, { clipRadius: 14 });
      }
      if (!screenDrawn && ytThumbRef.current && ytThumbRef.current.complete) {
        screenDrawn = drawCoverMedia(ctx, ytThumbRef.current, screenX, screenY, screenW, screenH, { clipRadius: 14 });
      }
      if (!screenDrawn) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(screenX, screenY, screenW, screenH, 14);
        ctx.clip();
        ctx.fillStyle = '#020617';
        ctx.fillRect(screenX, screenY, screenW, screenH);
        ctx.restore();
      }

      // Neon Cinema Border
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(screenX, screenY, screenW, screenH, 14);
      ctx.stroke();

      // Title & Date Header on top
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(px + 18, py + 14, pw - 36, 46, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🍿 ${movieTitle}`, px + pw / 2, py + 34);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#f472b6';
      ctx.fillText(`${myName} & ${partnerName} • Playing at ${timecodeStr}`, px + pw / 2, py + 50);

      // Inset Floating Live Cam Badges on bottom corners
      const pipW = 124;
      const pipH = 92;
      const pipY = py + ph - pipH - 16;

      // Left Pip (You) - REAL LIVE WEBCAM (Mirrored)
      const p1x = px + 16;
      let p1Drawn = false;
      if (myCamActive) {
        p1Drawn = drawCoverMedia(ctx, myCamSource, p1x, pipY, pipW, pipH, { flipHorizontal: true, clipRadius: 14 });
      }
      if (!p1Drawn) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(p1x, pipY, pipW, pipH, 14);
        ctx.clip();
        ctx.fillStyle = '#3b0764';
        ctx.fillRect(p1x, pipY, pipW, pipH);
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(myName.slice(0, 8), p1x + pipW / 2, pipY + pipH / 2 + 6);
        ctx.restore();
      }
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(p1x, pipY, pipW, pipH, 14);
      ctx.stroke();

      // Right Pip (Partner) - REAL LIVE WEBCAM
      const p2x = px + pw - pipW - 16;
      let p2Drawn = false;
      if (partnerCamActive) {
        p2Drawn = drawCoverMedia(ctx, partnerCamSource, p2x, pipY, pipW, pipH, { flipHorizontal: false, clipRadius: 14 });
      }
      if (!p2Drawn) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(p2x, pipY, pipW, pipH, 14);
        ctx.clip();
        ctx.fillStyle = '#4c0519';
        ctx.fillRect(p2x, pipY, pipW, pipH);
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(partnerName.slice(0, 8), p2x + pipW / 2, pipY + pipH / 2 + 6);
        ctx.restore();
      }
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(p2x, pipY, pipW, pipH, 14);
      ctx.stroke();
    }
    // LAYOUT 3: PIP (Duo Live Video Call Primary + Real Movie PiP Inset)
    else {
      const halfW = pw / 2;

      // Left: You - REAL LIVE WEBCAM (Mirrored)
      let leftDrawn = false;
      if (myCamActive) {
        leftDrawn = drawCoverMedia(ctx, myCamSource, px, py, halfW, ph, { flipHorizontal: true });
      }
      if (!leftDrawn) {
        const cGrad1 = ctx.createLinearGradient(px, py, px + halfW, py + ph);
        cGrad1.addColorStop(0, '#1e1b4b');
        cGrad1.addColorStop(1, '#3b0764');
        ctx.fillStyle = cGrad1;
        ctx.fillRect(px, py, halfW, ph);
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(px + halfW / 2, py + ph / 2 - 20, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(myName.charAt(0).toUpperCase() || 'U', px + halfW / 2, py + ph / 2 - 8);
      }

      // Right: Partner - REAL LIVE WEBCAM
      let rightDrawn = false;
      if (partnerCamActive) {
        rightDrawn = drawCoverMedia(ctx, partnerCamSource, px + halfW, py, halfW, ph, { flipHorizontal: false });
      }
      if (!rightDrawn) {
        const cGrad2 = ctx.createLinearGradient(px + halfW, py, px + pw, py + ph);
        cGrad2.addColorStop(0, '#4c0519');
        cGrad2.addColorStop(1, '#831843');
        ctx.fillStyle = cGrad2;
        ctx.fillRect(px + halfW, py, halfW, ph);
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(px + halfW + halfW / 2, py + ph / 2 - 20, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(partnerName.charAt(0).toUpperCase() || 'P', px + halfW + halfW / 2, py + ph / 2 - 8);
      }

      // Center Divider Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + halfW, py);
      ctx.lineTo(px + halfW, py + ph);
      ctx.stroke();

      // Top-Right Inset: REAL PLAYING MOVIE PiP
      const pipW = 210;
      const pipH = 128;
      const pipX = px + pw - pipW - 14;
      const pipY = py + 14;

      let pipMovieDrawn = false;
      if (hasRealMovieVideo) {
        pipMovieDrawn = drawCoverMedia(ctx, movieVideoEl, pipX, pipY, pipW, pipH, { clipRadius: 14 });
      }
      if (!pipMovieDrawn && ytThumbRef.current && ytThumbRef.current.complete) {
        pipMovieDrawn = drawCoverMedia(ctx, ytThumbRef.current, pipX, pipY, pipW, pipH, { clipRadius: 14 });
      }
      if (!pipMovieDrawn && imagesRef.current.couch && imagesRef.current.couch.complete) {
        pipMovieDrawn = drawCoverMedia(ctx, imagesRef.current.couch, pipX, pipY, pipW, pipH, { clipRadius: 14 });
      }
      if (!pipMovieDrawn) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pipX, pipY, pipW, pipH, 14);
        ctx.clip();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(pipX, pipY, pipW, pipH);
        ctx.restore();
      }

      // PiP Screen Border & Badge
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipW, pipH, 14);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.beginPath();
      ctx.roundRect(pipX + 8, pipY + pipH - 24, pipW - 16, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#fce7f3';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🎬 ${movieTitle.slice(0, 18)} • ${timecodeStr}`, pipX + pipW / 2, pipY + pipH - 12);
    }

    // Restore context after photo drawing
    ctx.restore();

    // Photo Aperture Border (Slight inner bezel)
    ctx.strokeStyle = '#dcd8cf';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Filter Overlay on Photo
    if (activeFilter === 'rose') {
      ctx.fillStyle = 'rgba(236, 72, 153, 0.08)';
      ctx.fillRect(px, py, pw, ph);
    } else if (activeFilter === 'warm') {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.12)';
      ctx.fillRect(px, py, pw, ph);
    } else if (activeFilter === 'noir') {
      ctx.fillStyle = 'rgba(20, 20, 25, 0.35)';
      ctx.fillRect(px, py, pw, ph);
    }

    // Decorative Floating 3D Stickers on Polaroid Frame
    if (selectedStickers.includes('heart')) {
      ctx.font = '28px sans-serif';
      ctx.fillText('💖', px + pw - 30, py + ph - 20);
    }
    if (selectedStickers.includes('popcorn')) {
      ctx.font = '28px sans-serif';
      ctx.fillText('🍿', px + 12, py + ph - 20);
    }
    if (selectedStickers.includes('sparkles')) {
      ctx.font = '24px sans-serif';
      ctx.fillText('✨', px + pw - 24, py + 26);
    }
    if (selectedStickers.includes('cheers')) {
      ctx.font = '24px sans-serif';
      ctx.fillText('🥂', px + 12, py + 26);
    }
    if (selectedStickers.includes('clapper')) {
      ctx.font = '24px sans-serif';
      ctx.fillText('🎬', px + pw / 2 - 12, py + 26);
    }

    // 2. POLAROID CAPTION AREA (Bottom)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1c1917';
    ctx.font = 'italic 700 20px "Dancing Script", cursive, Georgia, serif';
    ctx.fillText(`“${caption}”`, width / 2, height - 140);

    // Watchers Signatures
    ctx.fillStyle = '#ec4899';
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillText(`With Love: ${myName} & ${partnerName} 💕`, width / 2, height - 105);

    // Date & Time Stamp + Holographic Keepsake Seal
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillStyle = '#78716c';
    ctx.font = '600 11px sans-serif';
    ctx.fillText(`SyncCinema Couples Keepsake • ${dateStr} • ${timeStr}`, width / 2, height - 75);

    // Bottom Watermark
    ctx.fillStyle = '#a8a29e';
    ctx.font = '10px sans-serif';
    ctx.fillText(`Private Room Date Memory • Zero-Leak WebRTC Cryptographic Capture`, width / 2, height - 45);
  };

  useEffect(() => {
    if (activeTab === 'keepsake') {
      drawPolaroid();
    }
  }, [activeTab, caption, polaroidLayout, selectedStickers, activeFilter, snapshotNonce, currentMedia, users, callMedia]);

  // Download Polaroid as PNG (with tainted canvas auto-recovery protection)
  const downloadPolaroid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `syncinema-keepsake-${Date.now()}.png`;
      a.click();
      say?.('Polaroid Keepsake downloaded! 📸');
    } catch (err) {
      console.warn('Canvas export tainted by cross-origin video, retrying with safe composite:', err);
      // Redraw canvas with safe graphic composite and download
      drawPolaroid({ safeFallback: true });
      setTimeout(() => {
        try {
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `syncinema-keepsake-${Date.now()}.png`;
          a.click();
          say?.('Polaroid Keepsake downloaded! 📸');
        } catch (e2) {
          say?.('Could not download due to browser cross-origin media isolation.');
        }
      }, 60);
    }
  };

  // Share Polaroid to Chat
  const postKeepsakeToChat = () => {
    if (!socket) return;
    const title = currentMedia?.title || 'Our Movie';
    const text = `📸 Snapped a Polaroid Keepsake for "${title}": "${caption}" 💗`;
    socket.emit('chat', { text });
    say?.('Shared Keepsake notice in chat! 💬');
  };

  // Next trivia prompt
  const nextPrompt = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setPromptIndex((prev) => (prev + 1) % PROMPT_DECK.length);
      setIsFlipping(false);
    }, 180);
  };

  const sharePromptToChat = () => {
    if (!socket) return;
    const p = PROMPT_DECK[promptIndex];
    socket.emit('chat', { text: `🎯 [${p.tag}]: ${p.q}` });
    say?.('Sent discussion prompt to room chat! 💬');
  };

  if (!isOpen) return null;

  const currentPrompt = PROMPT_DECK[promptIndex];
  const isPlayingAnySound = Object.values(activeTracks).some(Boolean);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      {/* Offscreen active WebRTC decoders for instant live polaroid pixel capture */}
      <video
        ref={localCamVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', top: -9999, left: -9999, width: 320, height: 240, opacity: 0, pointerEvents: 'none' }}
      />
      <video
        ref={partnerCamVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', top: -9999, left: -9999, width: 320, height: 240, opacity: 0, pointerEvents: 'none' }}
      />
      <div className="card w-full max-w-xl p-4 sm:p-6 space-y-4 border border-pink-500/25 !bg-[#222222]/95 rounded-3xl shadow-2xl shadow-pink-500/10 rise text-pink-100 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-pink-500/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-pink-100 flex items-center gap-2">
                Cinema Plugins Deck
              </h3>
              <p className="text-[11px] text-pink-300/70">Atmosphere, keepsakes, break timers &amp; prompts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[#1a1a1d] border border-pink-500/20">
          <button
            type="button"
            onClick={() => setActiveTab('soundscapes')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'soundscapes'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/30'
                : 'text-pink-300/60 hover:text-white hover:bg-pink-500/10'
            }`}
          >
            <Music className="h-3.5 w-3.5 text-pink-300" />
            <span>Sounds</span>
            {isPlayingAnySound && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keepsake')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'keepsake'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/30'
                : 'text-pink-300/60 hover:text-white hover:bg-pink-500/10'
            }`}
          >
            <Camera className="h-3.5 w-3.5 text-pink-300" />
            <span>Polaroid</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('intermission')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'intermission'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/30'
                : 'text-pink-300/60 hover:text-white hover:bg-pink-500/10'
            }`}
          >
            <Timer className="h-3.5 w-3.5 text-pink-300" />
            <span>Break</span>
            {timer?.running && <span className="text-[9px] bg-pink-500 text-white px-1 rounded-full font-bold">LIVE</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'prompts'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-md shadow-pink-500/30'
                : 'text-pink-300/60 hover:text-white hover:bg-pink-500/10'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-pink-300" />
            <span>Trivia</span>
          </button>
        </div>

        {/* TAB 1: Soundscapes & Lofi Atmosphere */}
        {activeTab === 'soundscapes' && (
          <div className="space-y-4 rise">
            <div className="flex items-center justify-between text-xs text-pink-200 bg-[#1a1a1d] p-3 rounded-2xl border border-pink-500/20">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-pink-400" />
                <span className="font-semibold">Master Atmosphere Volume</span>
              </div>
              <span className="font-mono text-pink-300 font-bold">{soundVolume}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={soundVolume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="w-full accent-pink-500 h-2 bg-pink-500/20 rounded-lg cursor-pointer"
            />

            <div className="grid grid-cols-2 gap-2.5">
              {/* Rain */}
              <button
                type="button"
                onClick={() => toggleTrack('rain')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  activeTracks.rain
                    ? 'bg-purple-950/60 border-purple-500/60 text-white shadow-lg'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeTracks.rain ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <CloudRain className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Rain on Window</span>
                    {activeTracks.rain && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Gentle soothing downpour</div>
                </div>
              </button>

              {/* Fireplace */}
              <button
                type="button"
                onClick={() => toggleTrack('fire')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  activeTracks.fire
                    ? 'bg-amber-950/60 border-amber-500/60 text-white shadow-lg'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeTracks.fire ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Flame className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Campfire Crackle</span>
                    {activeTracks.fire && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Warm fireplace pops</div>
                </div>
              </button>

              {/* Vinyl */}
              <button
                type="button"
                onClick={() => toggleTrack('vinyl')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  activeTracks.vinyl
                    ? 'bg-rose-950/60 border-rose-500/60 text-white shadow-lg'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeTracks.vinyl ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Radio className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Warm Vinyl Dust</span>
                    {activeTracks.vinyl && <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Lofi turntable hiss</div>
                </div>
              </button>

              {/* Space */}
              <button
                type="button"
                onClick={() => toggleTrack('space')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                  activeTracks.space
                    ? 'bg-indigo-950/60 border-indigo-500/60 text-white shadow-lg'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeTracks.space ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Compass className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Cosmic Drone</span>
                    {activeTracks.space && <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Binaural deep space</div>
                </div>
              </button>
            </div>

            {isPlayingAnySound && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Atmosphere audio playing in background
                </span>
                <button
                  type="button"
                  onClick={stopAllAudio}
                  className="ghost !py-1 !px-2.5 text-xs text-rose-400 hover:text-rose-300 border border-rose-500/30 rounded-xl"
                >
                  Stop All Sounds
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Couples Polaroid Keepsake Booth (Movie & Video Call Live Blend) */}
        {activeTab === 'keepsake' && (
          <div className="space-y-4 rise">
            {/* Live Canvas View */}
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="relative group p-1.5 rounded-3xl bg-[#111019] border border-pink-500/30 shadow-2xl shadow-pink-500/10 overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full max-w-[280px] sm:max-w-[320px] rounded-2xl aspect-[4/5] object-contain bg-white shadow-xl"
                />

                {/* Camera Shutter Flash effect */}
                {isFlashing && (
                  <div className="absolute inset-0 bg-white/95 rounded-2xl pointer-events-none transition-opacity duration-300 animate-pulse z-20" />
                )}

                {/* Snap Real Frame button with authentic shutter action */}
                <button
                  type="button"
                  onClick={snapLiveFrame}
                  className="absolute bottom-4 right-4 py-2 px-3 rounded-full btn-pink text-white shadow-xl backdrop-blur-md transition active:scale-90 flex items-center gap-1.5 text-xs font-bold cursor-pointer z-10"
                  title="Snap fresh frame from movie and video call"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Snap Real Frame 📸</span>
                </button>
              </div>

              {/* Status pill & Live Viewfinder Toggle */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-pink-300/80 pt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${callMedia?.cam !== false ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  <span>Real Video &amp; Webcams Blended</span>
                </span>

                <button
                  type="button"
                  onClick={() => setLiveViewfinder((v) => !v)}
                  className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    liveViewfinder
                      ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                      : 'bg-[#1a1a1d] border-pink-500/20 text-pink-300/60 hover:text-white'
                  }`}
                  title="Continuously stream live webcam and movie frames into polaroid preview"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${liveViewfinder ? 'bg-rose-400 animate-ping' : 'bg-zinc-500'}`} />
                  <span>{liveViewfinder ? 'Live Viewfinder: ON' : 'Live Viewfinder: Off'}</span>
                </button>
              </div>
            </div>

            {/* Polaroid Layout Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-pink-200 flex items-center justify-between">
                <span>Polaroid Layout:</span>
                <span className="text-[10px] text-pink-300/60">Choose composition style</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'split', label: 'Movie & Duo Cam', icon: '🎬' },
                  { id: 'couch', label: 'Couch Ambiance', icon: '🛋️' },
                  { id: 'pip', label: 'Duo Cam & PiP', icon: '📱' },
                ].map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setPolaroidLayout(l.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      polaroidLayout === l.id
                        ? 'btn-pink text-white border-pink-400 shadow-md shadow-pink-500/30'
                        : 'bg-[#1a1a1d] border-pink-500/20 text-pink-200/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{l.icon}</span>
                    <span className="truncate">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Decorative Stickers */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-pink-200 flex items-center justify-between">
                <span>Sticker Decorations:</span>
                <span className="text-[10px] text-pink-300/60">Tap to toggle stickers</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'heart', label: '💖 Heart' },
                  { id: 'popcorn', label: '🍿 Popcorn' },
                  { id: 'sparkles', label: '✨ Sparkles' },
                  { id: 'cheers', label: '🥂 Cheers' },
                  { id: 'clapper', label: '🎬 Clapper' },
                ].map((s) => {
                  const isChecked = selectedStickers.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStickers((prev) =>
                          isChecked ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
                        isChecked
                          ? 'bg-pink-500/30 border-pink-400 text-pink-100 shadow-sm'
                          : 'bg-[#1a1a1d] border-pink-500/20 text-pink-300/50 hover:text-pink-100'
                      }`}
                    >
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Vintage Filter Modes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-pink-200 flex items-center justify-between">
                <span>Film Color Tone:</span>
                <span className="text-[10px] text-pink-300/60">Atmosphere grading</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'rose', label: '🌸 Rose Pastel' },
                  { id: 'warm', label: '🕯️ Cozy Warm' },
                  { id: 'noir', label: '🎞️ Noir B&W' },
                  { id: 'none', label: '⚡ Natural' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFilter(f.id)}
                    className={`py-1.5 px-1 rounded-xl text-[11px] font-semibold border transition text-center cursor-pointer truncate ${
                      activeFilter === f.id
                        ? 'bg-pink-500/25 border-pink-400 text-pink-100 shadow-sm font-bold'
                        : 'bg-[#1a1a1d] border-pink-500/20 text-pink-300/60 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Caption & Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-pink-200 flex items-center justify-between">
                <span>Romantic Date Caption:</span>
                <span className="text-[10px] text-pink-300/60">Printed in vintage script</span>
              </label>
              <input
                type="text"
                value={caption}
                maxLength={70}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write your custom romantic note…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1a1a1a] border border-pink-500/25 text-xs text-pink-100 placeholder-pink-300/40 outline-none focus:border-pink-500 font-serif italic shadow-inner"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {CAPTION_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCaption(p)}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-[#1a1a1d] hover:bg-pink-500/20 border border-pink-500/15 text-pink-200/80 hover:text-white transition cursor-pointer truncate max-w-[260px]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={downloadPolaroid}
                className="btn-pink flex-1 !py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 cursor-pointer active:scale-95"
              >
                <Download className="h-4 w-4" />
                <span>Save Polaroid (PNG)</span>
              </button>

              <button
                type="button"
                onClick={postKeepsakeToChat}
                className="ghost !py-2.5 px-4 text-xs font-bold rounded-xl border border-pink-500/30 hover:border-pink-500/60 flex items-center gap-1.5 text-pink-100 hover:text-white cursor-pointer transition active:scale-95"
                title="Broadcast keepsake to room chat"
              >
                <MessageSquare className="h-4 w-4 text-pink-400" />
                <span className="hidden sm:inline">Share in Chat</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Intermission & Snack Bar Break */}
        {activeTab === 'intermission' && (
          <div className="space-y-4 rise">
            {timer?.running ? (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-black border border-amber-500/40 text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span>INTERMISSION IN PROGRESS</span>
                </div>

                <div className="font-mono text-4xl sm:text-5xl font-black text-amber-400 tracking-wider">
                  {Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) / 60)}:
                  {(Math.floor(Math.max(0, (timer.endsAt - Date.now()) / 1000) % 60) + '').padStart(2, '0')}
                </div>

                <p className="text-xs text-amber-200/80">{timer.label || 'Snack & Bathroom Break 🍿'}</p>

                {me === hostId && (
                  <button
                    type="button"
                    onClick={resetIntermission}
                    className="btn !py-2 !px-4 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-xl"
                  >
                    Resume Movie Now (End Break)
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  {me === hostId
                    ? 'Pick an intermission break duration. Both viewers will see a synchronized retro cinema countdown clock!'
                    : 'Waiting for the room host to trigger an intermission break.'}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { mins: 3, label: '3m Quick Bathroom Run 🧻' },
                    { mins: 5, label: '5m Popcorn Refill 🍿' },
                    { mins: 10, label: '10m Intermission ☕' },
                    { mins: 15, label: '15m Deep Snack Break 🍕' },
                    { mins: 20, label: '20m Dinner Pause 🍱' },
                    { mins: 30, label: '30m Halftime Chill 🛋️' },
                  ].map((preset) => (
                    <button
                      key={preset.mins}
                      type="button"
                      disabled={me !== hostId}
                      onClick={() => startIntermission(preset.mins, preset.label)}
                      className={`p-3 rounded-2xl border text-left transition ${
                        me === hostId
                          ? 'bg-slate-900/60 border-slate-800 hover:border-amber-500/60 hover:bg-amber-950/20 text-slate-200 cursor-pointer active:scale-95'
                          : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Popcorn className="h-3.5 w-3.5" />
                        <span>{preset.mins} Minutes</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{preset.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Movie Trivia & Couples Prompts */}
        {activeTab === 'prompts' && (
          <div className="space-y-4 rise">
            <div
              className={`p-6 rounded-3xl bg-gradient-to-br from-[#12132e] to-[#0a0b1c] border border-purple-500/30 text-center space-y-4 transition-all duration-200 ${
                isFlipping ? 'scale-95 opacity-50' : 'scale-100 opacity-100'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{currentPrompt.tag}</span>
              </div>

              <p className="font-display text-base sm:text-lg font-semibold text-white leading-relaxed px-2">
                “{currentPrompt.q}”
              </p>

              <div className="text-[11px] text-slate-400">Card {promptIndex + 1} of {PROMPT_DECK.length}</div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={nextPrompt}
                className="btn flex-1 !py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Draw Next Card</span>
              </button>

              <button
                type="button"
                onClick={sharePromptToChat}
                className="ghost !py-2.5 px-4 text-xs rounded-xl border border-pink-500/20 hover:border-pink-500/40 flex items-center gap-1.5 text-pink-100"
                title="Send this question to room chat"
              >
                <MessageSquare className="h-3.5 w-3.5 text-pink-400" />
                <span>Send to Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
