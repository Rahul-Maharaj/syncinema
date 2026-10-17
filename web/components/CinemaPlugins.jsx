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
  onTriggerReaction
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [soundVolume, setSoundVolume] = useState(60);
  const [activeTracks, setActiveTracks] = useState({
    rain: false,
    fire: false,
    vinyl: false,
    space: false,
  });

  // Keepsake state
  const canvasRef = useRef(null);
  const [caption, setCaption] = useState('Under the stars, lost in the cinema magic together ✨');
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Draw Polaroid Keepsake onto HTML5 Canvas
  const drawPolaroid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 760;
    canvas.width = width;
    canvas.height = height;

    // Vintage paper background
    ctx.fillStyle = '#fbfbfa';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper edge shadow
    ctx.strokeStyle = '#e2e2dd';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Photo Area
    const photoX = 40;
    const photoY = 40;
    const photoW = 560;
    const photoH = 500;

    // Dark Cinema Gradient Inside Photo
    const grad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(photoX, photoY, photoW, photoH);

    // Decorative Stars / Sparkles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 40; i++) {
      const rx = photoX + (Math.sin(i * 123) * 0.5 + 0.5) * photoW;
      const ry = photoY + (Math.cos(i * 456) * 0.5 + 0.5) * photoH;
      const rad = 1 + (i % 3);
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top Brand Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(photoX + 20, photoY + 20, 200, 32, 16);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('✦ SYNCCINEMA KEEPSAKE', photoX + 36, photoY + 41);

    // Center Movie Title
    const titleText = currentMedia?.title || 'Cozy Watch Night';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText.length > 28 ? titleText.slice(0, 28) + '…' : titleText, width / 2, photoY + 240);

    // Subtitle / Date
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`🍿 MOVIE NIGHT • ${dateStr}`, width / 2, photoY + 275);

    // Names of Watchers
    const names = users.map((u) => u.name).join(' & ') || 'Couples Stream';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Watching together: ${names}`, width / 2, photoY + 310);

    // Polaroid Bottom Caption Section
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText(`“${caption}”`, width / 2, height - 130);

    // Timestamp & Watermark
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(`SyncCinema • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, width / 2, height - 70);
  };

  useEffect(() => {
    if (activeTab === 'keepsake') {
      drawPolaroid();
    }
  }, [activeTab, caption, currentMedia, users]);

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="card w-full max-w-xl p-4 sm:p-6 space-y-4 border border-purple-500/30 !bg-[#0b0c20]/95 rounded-3xl shadow-2xl rise text-slate-100 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
                Cinema Plugins Deck
              </h3>
              <p className="text-[11px] text-slate-400">Atmosphere, keepsakes, break timers &amp; prompts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Pills */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[#070814] border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('soundscapes')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'soundscapes'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Music className="h-3.5 w-3.5 text-purple-300" />
            <span>Sounds</span>
            {isPlayingAnySound && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('keepsake')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'keepsake'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
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
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Timer className="h-3.5 w-3.5 text-amber-300" />
            <span>Break</span>
            {timer?.running && <span className="text-[9px] bg-amber-500 text-black px-1 rounded-full font-bold">LIVE</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`py-2 px-1 rounded-xl text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'prompts'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-cyan-300" />
            <span>Trivia</span>
          </button>
        </div>

        {/* TAB 1: Soundscapes & Lofi Atmosphere */}
        {activeTab === 'soundscapes' && (
          <div className="space-y-4 rise">
            <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-purple-400" />
                <span className="font-semibold">Master Atmosphere Volume</span>
              </div>
              <span className="font-mono text-purple-300 font-bold">{soundVolume}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={soundVolume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
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

        {/* TAB 2: Polaroid Keepsake Booth */}
        {activeTab === 'keepsake' && (
          <div className="space-y-4 rise">
            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                className="w-full max-w-[280px] sm:max-w-[320px] rounded-2xl shadow-2xl border border-white/20 aspect-[4/5] object-contain bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Custom Date Caption:</span>
                <span className="text-[10px] text-slate-400">Printed on Polaroid</span>
              </label>
              <input
                type="text"
                value={caption}
                maxLength={60}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Best movie night ever 🍿💖"
                className="field text-xs !py-2 text-white bg-slate-900 border-slate-800 rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={downloadPolaroid}
                className="btn flex-1 !py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600"
              >
                <Download className="h-4 w-4" />
                <span>Save Keepsake (PNG)</span>
              </button>

              <button
                type="button"
                onClick={postKeepsakeToChat}
                className="ghost !py-2.5 px-3.5 text-xs rounded-xl border border-slate-700 hover:border-slate-600 flex items-center gap-1.5 text-slate-200"
                title="Post to room chat"
              >
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <span className="hidden sm:inline">Post in Chat</span>
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
                className="ghost !py-2.5 px-4 text-xs rounded-xl border border-slate-700 hover:border-slate-600 flex items-center gap-1.5 text-slate-200"
                title="Send this question to room chat"
              >
                <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                <span>Send to Chat</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
