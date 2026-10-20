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

  // Keepsake state - Couples Polaroid with Movie & Video Call
  const canvasRef = useRef(null);
  const [caption, setCaption] = useState('Under the stars, lost in the cinema magic together ✨');
  const [polaroidLayout, setPolaroidLayout] = useState('split'); // 'split' | 'couch' | 'pip'
  const [selectedStickers, setSelectedStickers] = useState(['heart', 'popcorn', 'sparkles']);
  const [activeFilter, setActiveFilter] = useState('rose'); // 'rose' | 'warm' | 'noir' | 'none'
  const [copiedLink, setCopiedLink] = useState(false);
  const [snapshotNonce, setSnapshotNonce] = useState(0);

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

  // Draw Couples Polaroid with Movie & Video Call Images
  const drawPolaroid = () => {
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
    ctx.fillStyle = '#111019';
    ctx.fillRect(px, py, pw, ph);

    // Find main video player element on the page
    let videoEl = null;
    try {
      if (playerRef?.current?.getVideoElement) {
        videoEl = playerRef.current.getVideoElement();
      }
      if (!videoEl && typeof document !== 'undefined') {
        const vids = Array.from(document.querySelectorAll('video'));
        // Find player video (typically has dimensions or inside player container)
        videoEl = vids.find((v) => v.videoWidth > 400 || v.classList.contains('object-contain')) || vids[0];
      }
    } catch {}

    // Find couple video call elements
    let myCamEl = null;
    let partnerCamEl = null;
    try {
      if (typeof document !== 'undefined') {
        const vids = Array.from(document.querySelectorAll('video'));
        const callVids = vids.filter((v) => v !== videoEl);
        if (callVids.length > 0) myCamEl = callVids[0];
        if (callVids.length > 1) partnerCamEl = callVids[1];
      }
    } catch {}

    const myName = users.find((u) => u.id === me)?.name || 'You';
    const otherUsers = users.filter((u) => u.id !== me);
    const partnerName = otherUsers[0]?.name || 'My Partner';

    // LAYOUT 1: SPLIT (Movie on Top + Couple Video Call on Bottom)
    if (polaroidLayout === 'split') {
      const movieH = 320;
      const callH = ph - movieH;

      // Draw Movie in Top Half
      let movieDrawn = false;
      if (videoEl && videoEl.readyState >= 2) {
        try {
          ctx.drawImage(videoEl, px, py, pw, movieH);
          movieDrawn = true;
        } catch {}
      }
      if (!movieDrawn) {
        if (imagesRef.current.couple && imagesRef.current.couple.complete) {
          ctx.drawImage(imagesRef.current.couple, px, py, pw, movieH);
        } else {
          const mgrad = ctx.createLinearGradient(px, py, px + pw, py + movieH);
          mgrad.addColorStop(0, '#1e1b4b');
          mgrad.addColorStop(1, '#0f172a');
          ctx.fillStyle = mgrad;
          ctx.fillRect(px, py, pw, movieH);
        }
      }

      // Cinema Screen Ambient Glow & Vignette
      const movieVignette = ctx.createLinearGradient(px, py, px, py + movieH);
      movieVignette.addColorStop(0, 'rgba(0,0,0,0.6)');
      movieVignette.addColorStop(0.5, 'rgba(0,0,0,0)');
      movieVignette.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = movieVignette;
      ctx.fillRect(px, py, pw, movieH);

      // Movie Title Pill on Top
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.beginPath();
      ctx.roundRect(px + 16, py + 16, 260, 30, 15);
      ctx.fill();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fce7f3';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      const mTitle = currentMedia?.title || 'Private Cinema Night';
      ctx.fillText(`🎬 ${mTitle.slice(0, 26)}${mTitle.length > 26 ? '…' : ''}`, px + 28, py + 36);

      // Live 4K / Sync badge
      ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
      ctx.beginPath();
      ctx.roundRect(px + pw - 90, py + 16, 74, 24, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('0ms SYNC', px + pw - 53, py + 32);

      // Divider between Movie and Calls
      ctx.fillStyle = '#222222';
      ctx.fillRect(px, py + movieH, pw, callH);

      ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py + movieH);
      ctx.lineTo(px + pw, py + movieH);
      ctx.stroke();

      // Lower Section: COUPLES VIDEO CALL (2 Side-by-Side Webcam Tiles)
      const callTileW = (pw - 24) / 2;
      const callTileH = callH - 24;
      const callTileY = py + movieH + 12;

      // Tile 1: Left (You)
      const t1x = px + 8;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(t1x, callTileY, callTileW, callTileH, 16);
      ctx.clip();

      let t1Drawn = false;
      if (myCamEl && myCamEl.readyState >= 2) {
        try {
          ctx.drawImage(myCamEl, t1x, callTileY, callTileW, callTileH);
          t1Drawn = true;
        } catch {}
      }
      if (!t1Drawn) {
        const cGrad1 = ctx.createLinearGradient(t1x, callTileY, t1x + callTileW, callTileY + callTileH);
        cGrad1.addColorStop(0, '#3b0764');
        cGrad1.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = cGrad1;
        ctx.fillRect(t1x, callTileY, callTileW, callTileH);

        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(t1x + callTileW / 2, callTileY + callTileH / 2 - 12, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(myName.charAt(0).toUpperCase() || 'U', t1x + callTileW / 2, callTileY + callTileH / 2 - 4);
      }

      // Name Tag Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(t1x + 8, callTileY + callTileH - 28, 100, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#fce7f3';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🎙️ ${myName.slice(0, 10)}`, t1x + 16, callTileY + callTileH - 14);
      ctx.restore();

      // Border for Tile 1
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(t1x, callTileY, callTileW, callTileH, 16);
      ctx.stroke();

      // Tile 2: Right (Partner)
      const t2x = px + pw - callTileW - 8;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(t2x, callTileY, callTileW, callTileH, 16);
      ctx.clip();

      let t2Drawn = false;
      if (partnerCamEl && partnerCamEl.readyState >= 2) {
        try {
          ctx.drawImage(partnerCamEl, t2x, callTileY, callTileW, callTileH);
          t2Drawn = true;
        } catch {}
      }
      if (!t2Drawn) {
        const cGrad2 = ctx.createLinearGradient(t2x, callTileY, t2x + callTileW, callTileY + callTileH);
        cGrad2.addColorStop(0, '#581c87');
        cGrad2.addColorStop(1, '#831843');
        ctx.fillStyle = cGrad2;
        ctx.fillRect(t2x, callTileY, callTileW, callTileH);

        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(t2x + callTileW / 2, callTileY + callTileH / 2 - 12, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(partnerName.charAt(0).toUpperCase() || 'P', t2x + callTileW / 2, callTileY + callTileH / 2 - 4);
      }

      // Name Tag Overlay Partner
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(t2x + 8, callTileY + callTileH - 28, 100, 20, 10);
      ctx.fill();
      ctx.fillStyle = '#fce7f3';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`🎙️ ${partnerName.slice(0, 10)}`, t2x + 16, callTileY + callTileH - 14);
      ctx.restore();

      // Border for Tile 2
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(t2x, callTileY, callTileW, callTileH, 16);
      ctx.stroke();

      // Center Heart Connector Badge between the two video calls
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
    // LAYOUT 2: COUCH (Romantic Couple Cinema Scene Artwork + Cam Insets)
    else if (polaroidLayout === 'couch') {
      let couchDrawn = false;
      if (imagesRef.current.couch && imagesRef.current.couch.complete) {
        ctx.drawImage(imagesRef.current.couch, px, py, pw, ph);
        couchDrawn = true;
      }
      if (!couchDrawn) {
        const cGrad = ctx.createLinearGradient(px, py, px + pw, py + ph);
        cGrad.addColorStop(0, '#1e1b4b');
        cGrad.addColorStop(0.5, '#4c0519');
        cGrad.addColorStop(1, '#020617');
        ctx.fillStyle = cGrad;
        ctx.fillRect(px, py, pw, ph);
      }

      // Title & Date Header on top
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.roundRect(px + 20, py + 20, pw - 40, 50, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🍿 ${currentMedia?.title || 'Romantic Cinema Date Night'}`, px + pw / 2, py + 42);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#f472b6';
      ctx.fillText(`${myName} & ${partnerName} • Synced Stream`, px + pw / 2, py + 60);

      // Inset Duo Cam Floating Badges on bottom corners
      const pipW = 120;
      const pipH = 85;
      const pipY = py + ph - pipH - 16;

      // Left Pip (You)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px + 16, pipY, pipW, pipH, 12);
      ctx.clip();
      ctx.fillStyle = '#222222';
      ctx.fillRect(px + 16, pipY, pipW, pipH);
      if (myCamEl && myCamEl.readyState >= 2) {
        try { ctx.drawImage(myCamEl, px + 16, pipY, pipW, pipH); } catch {}
      } else {
        ctx.fillStyle = '#ec4899';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(myName.slice(0, 6), px + 16 + pipW / 2, pipY + pipH / 2 + 7);
      }
      ctx.restore();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px + 16, pipY, pipW, pipH, 12);
      ctx.stroke();

      // Right Pip (Partner)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px + pw - pipW - 16, pipY, pipW, pipH, 12);
      ctx.clip();
      ctx.fillStyle = '#222222';
      ctx.fillRect(px + pw - pipW - 16, pipY, pipW, pipH);
      if (partnerCamEl && partnerCamEl.readyState >= 2) {
        try { ctx.drawImage(partnerCamEl, px + pw - pipW - 16, pipY, pipW, pipH); } catch {}
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(partnerName.slice(0, 6), px + pw - pipW - 16 + pipW / 2, pipY + pipH / 2 + 7);
      }
      ctx.restore();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px + pw - pipW - 16, pipY, pipW, pipH, 12);
      ctx.stroke();
    }
    // LAYOUT 3: PIP (Duo Video Call Primary + Movie PiP Inset)
    else {
      const halfW = pw / 2;

      // Left: You
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, halfW, ph);
      ctx.clip();
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(px, py, halfW, ph);
      if (myCamEl && myCamEl.readyState >= 2) {
        try { ctx.drawImage(myCamEl, px, py, halfW, ph); } catch {}
      } else {
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(px + halfW / 2, py + ph / 2 - 20, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(myName.charAt(0) || 'U', px + halfW / 2, py + ph / 2 - 8);
      }
      ctx.restore();

      // Right: Partner
      ctx.save();
      ctx.beginPath();
      ctx.rect(px + halfW, py, halfW, ph);
      ctx.clip();
      ctx.fillStyle = '#4c0519';
      ctx.fillRect(px + halfW, py, halfW, ph);
      if (partnerCamEl && partnerCamEl.readyState >= 2) {
        try { ctx.drawImage(partnerCamEl, px + halfW, py, halfW, ph); } catch {}
      } else {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(px + halfW + halfW / 2, py + ph / 2 - 20, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(partnerName.charAt(0) || 'P', px + halfW + halfW / 2, py + ph / 2 - 8);
      }
      ctx.restore();

      // Center Divider Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + halfW, py);
      ctx.lineTo(px + halfW, py + ph);
      ctx.stroke();

      // Movie Screen PiP Inset (Top Right)
      const pipW = 200;
      const pipH = 120;
      const pipX = px + pw - pipW - 14;
      const pipY = py + 14;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipW, pipH, 14);
      ctx.clip();
      if (videoEl && videoEl.readyState >= 2) {
        try { ctx.drawImage(videoEl, pipX, pipY, pipW, pipH); } catch {}
      } else if (imagesRef.current.couple && imagesRef.current.couple.complete) {
        ctx.drawImage(imagesRef.current.couple, pipX, pipY, pipW, pipH);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(pipX, pipY, pipW, pipH);
      }
      ctx.restore();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipW, pipH, 14);
      ctx.stroke();
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
    ctx.fillText(`Private Room Date Memory • Zero-Leak P2P Cryptographic Capture`, width / 2, height - 45);
  };

  useEffect(() => {
    if (activeTab === 'keepsake') {
      drawPolaroid();
    }
  }, [activeTab, caption, polaroidLayout, selectedStickers, activeFilter, snapshotNonce, currentMedia, users]);

  // Download Polaroid as PNG
  const downloadPolaroid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `syncinema-keepsake-${Date.now()}.png`;
    a.click();
    say?.('Polaroid Keepsake downloaded! 📸');
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
              <div className="relative group p-1.5 rounded-3xl bg-[#111019] border border-pink-500/30 shadow-2xl shadow-pink-500/10">
                <canvas
                  ref={canvasRef}
                  className="w-full max-w-[280px] sm:max-w-[320px] rounded-2xl aspect-[4/5] object-contain bg-white shadow-xl"
                />
                <button
                  type="button"
                  onClick={() => setSnapshotNonce((n) => n + 1)}
                  className="absolute bottom-4 right-4 p-2.5 rounded-full bg-pink-600/90 hover:bg-pink-500 text-white shadow-lg backdrop-blur-md transition active:scale-90 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Snap fresh frame from movie and video call"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Snap Fresh Frame</span>
                </button>
              </div>
              <p className="text-[11px] text-pink-300/70 text-center">
                📸 Captures active movie screen &amp; your video call selfies into a high-res souvenir
              </p>
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
