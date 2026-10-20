'use client';
import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { animate, stagger } from 'animejs';
import { Heart, Sparkles, MessageCircleHeart } from 'lucide-react';
import { Heart3D, Popcorn3D, SparkleStar3D } from '@/components/Icons3D';

const SWEET_WHISPERS = [
  'I wish you were sitting right next to me right now 💗',
  'You make my whole day better just being here 💕',
  'Can’t wait to hold you in real life 🥰',
  'You look so cute tonight ✨',
  'My favorite place in the world is beside you 💖',
  'Thank you for watching this with me 🍿',
];

// Soft romantic chime using Web Audio API
function playChime(freq = 520, type = 'sine') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {}
}

/**
 * MicroKit UI + anime.js Particle Physics Engine
 * Generates spring-eased floating reactions across the viewer screen
 */
function spawnAnimeReaction(items, count = 10) {
  if (typeof document === 'undefined') return;
  const elements = [];

  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.textContent = items[i % items.length];
    el.className = 'fixed z-[9999] pointer-events-none select-none text-3xl sm:text-4xl';
    el.style.left = `${15 + Math.random() * 70}%`;
    el.style.bottom = `${8 + Math.random() * 12}%`;
    el.style.opacity = '1';
    document.body.appendChild(el);
    elements.push(el);
  }

  // anime.js v4 physics animation
  animate(elements, {
    translateY: () => -(window.innerHeight * (0.45 + Math.random() * 0.45)),
    translateX: () => (Math.random() - 0.5) * 180,
    rotate: () => (Math.random() - 0.5) * 90,
    scale: [
      { to: 1.4, duration: 400, ease: 'outElastic(1, .5)' },
      { to: 1.1, duration: 1000 },
      { to: 0.6, duration: 600, ease: 'inQuad' },
    ],
    opacity: [
      { to: 1, duration: 1200 },
      { to: 0, duration: 600, ease: 'outQuad' },
    ],
    delay: stagger(80),
    ease: 'outCubic',
    onComplete: () => {
      elements.forEach((el) => el.remove());
    },
  });
}

export default function CoupleGestures({ socket, me, name, users, say }) {
  const [holdingHand, setHoldingHand] = useState(false);
  const [partnerHolding, setPartnerHolding] = useState(false);
  const [candleMode, setCandleMode] = useState(false);
  const [showWhispers, setShowWhispers] = useState(false);
  const [customWhisper, setCustomWhisper] = useState('');
  const [hugActive, setHugActive] = useState(false);
  const holdTimer = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const onGesture = (data) => {
      const isFromPartner = data.fromId !== me;
      if (!isFromPartner) return;

      navigator.vibrate?.([150, 75, 150]);

      switch (data.type) {
        case 'kiss': {
          playChime(640);
          say?.(`${data.from} blew you a sweet kiss 💋`);
          spawnAnimeReaction(['💋', '💖', '✨', '🥰'], 14);
          break;
        }

        case 'hug': {
          playChime(440);
          setHugActive(true);
          say?.(`${data.from} is giving you a warm, cozy cuddle 🫂`);
          spawnAnimeReaction(['🫂', '💕', '🧡', '🤍'], 10);
          setTimeout(() => setHugActive(false), 3600);
          break;
        }

        case 'hold_hands_start': {
          setPartnerHolding(true);
          say?.(`${data.from} is reaching for your hand 🤝 Tap "Hold Hands"!`);
          break;
        }

        case 'hold_hands_stop': {
          setPartnerHolding(false);
          break;
        }

        case 'popcorn': {
          playChime(780);
          say?.(`${data.from} fed you a warm piece of popcorn! 🍿`);
          spawnAnimeReaction(['🍿', '✨', '😋'], 12);
          break;
        }

        case 'cheers': {
          playChime(880);
          say?.(`Cheers to us from ${data.from}! 🥂✨`);
          spawnAnimeReaction(['🥂', '✨', '🍾', '🎉'], 10);
          break;
        }

        case 'candle': {
          setCandleMode(data.meta?.on);
          say?.(data.meta?.on ? `${data.from} lit candlelight for your movie date 🕯️` : `${data.from} blew out the candles`);
          break;
        }

        case 'whisper': {
          playChime(580);
          say?.(`💌 ${data.from} whispered: "${data.meta?.text}"`);
          break;
        }

        default:
          break;
      }
    };

    socket.on('gesture', onGesture);
    return () => socket.off('gesture', onGesture);
  }, [socket, me, say]);

  const sendGesture = (type, meta = {}) => {
    if (!socket) return;
    socket.emit('gesture', { type, meta });

    if (type === 'kiss') {
      playChime(640);
      say?.('You blew a kiss 💋');
      spawnAnimeReaction(['💋', '💖', '✨'], 10);
    } else if (type === 'hug') {
      playChime(440);
      setHugActive(true);
      setTimeout(() => setHugActive(false), 3600);
      say?.('Sent a warm cuddle 🫂');
      spawnAnimeReaction(['🫂', '💕', '🧡'], 8);
    } else if (type === 'popcorn') {
      playChime(780);
      say?.('Fed popcorn to your partner 🍿');
      spawnAnimeReaction(['🍿', '✨'], 8);
    } else if (type === 'cheers') {
      playChime(880);
      say?.('Clinked glasses! 🥂');
      spawnAnimeReaction(['🥂', '✨'], 8);
    }
  };

  const toggleHoldHand = () => {
    if (!holdingHand) {
      setHoldingHand(true);
      socket.emit('gesture', { type: 'hold_hands_start' });
      playChime(540);
      if (partnerHolding) {
        say?.('Both holding hands together! 🤝💕');
      } else {
        say?.('Reaching out to hold your partner\'s hand 🤝');
      }
      clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        setHoldingHand(false);
        socket.emit('gesture', { type: 'hold_hands_stop' });
      }, 10000);
    } else {
      setHoldingHand(false);
      socket.emit('gesture', { type: 'hold_hands_stop' });
      clearTimeout(holdTimer.current);
    }
  };

  const toggleCandle = () => {
    const next = !candleMode;
    setCandleMode(next);
    sendGesture('candle', { on: next });
    say?.(next ? 'Candlelight romantic mode turned on 🕯️' : 'Candlelight mode off');
  };

  const sendWhisper = (txt) => {
    if (!txt.trim()) return;
    sendGesture('whisper', { text: txt.trim() });
    setShowWhispers(false);
    setCustomWhisper('');
    say?.(`Whispered: "${txt}" 💌`);
  };

  return (
    <>
      {/* Screen edge cuddle glow */}
      {hugActive && <div className="fixed inset-0 z-40 hug-active pointer-events-none" />}

      {/* Romantic Candlelight Ambience */}
      {candleMode && (
        <div className="fixed inset-x-0 bottom-4 z-40 pointer-events-none flex justify-between px-8 sm:px-24">
          <div className="flex flex-col items-center">
            <span className="candle-flame text-2xl">🔥</span>
            <span className="text-xl -mt-1 opacity-90">🕯️</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="candle-flame text-2xl" style={{ animationDelay: '0.8s' }}>🔥</span>
            <span className="text-xl -mt-1 opacity-90">🕯️</span>
          </div>
        </div>
      )}

      {/* Couple Gestures Toolbar styled in Black Hole & Electric Tangerine */}
      <div className="card-blackhole my-3 flex flex-wrap items-center justify-between gap-2.5 p-3.5 rounded-2xl bg-[#1C1C1F]/90 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6D1F]/20 text-[#FAF3E1] border border-[#FF6D1F]/30">
            <Heart3D size={20} />
          </div>
          <span className="font-display text-xs sm:text-sm font-bold tracking-wide text-[#FAF3E1]">
            Couple Gestures
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Kiss */}
          <button
            type="button"
            onClick={() => sendGesture('kiss')}
            title="Blow a sweet kiss to your partner"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FAF3E1] bg-[#222222] border border-white/10 hover:border-[#FF6D1F]/50 hover:bg-[#FF6D1F]/20 transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span className="text-sm">💋</span>
            <span>Kiss</span>
          </button>

          {/* Cuddle / Hug */}
          <button
            type="button"
            onClick={() => sendGesture('hug')}
            title="Send a warm, cozy cuddle"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FAF3E1] bg-[#222222] border border-white/10 hover:border-[#FF6D1F]/50 hover:bg-[#FF6D1F]/20 transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span className="text-sm">🫂</span>
            <span>Hug</span>
          </button>

          {/* Hold Hands Interactive */}
          <button
            type="button"
            onClick={toggleHoldHand}
            title={holdingHand ? 'Holding hands! Tap to release' : 'Hold hands with your partner'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
              holdingHand || partnerHolding
                ? 'btn-tangerine text-[#FAF3E1]'
                : 'text-[#FAF3E1] bg-[#222222] border border-white/10 hover:border-[#FF6D1F]/50'
            }`}
          >
            <span className="text-sm">🤝</span>
            <span>
              {holdingHand && partnerHolding ? 'Holding Hands 💕' : holdingHand ? 'Holding…' : partnerHolding ? 'Take Hand!' : 'Hold Hands'}
            </span>
          </button>

          {/* Popcorn */}
          <button
            type="button"
            onClick={() => sendGesture('popcorn')}
            title="Feed your partner popcorn"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FAF3E1] bg-[#222222] border border-white/10 hover:border-[#FF6D1F]/50 hover:bg-[#FF6D1F]/20 transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span className="text-sm">🍿</span>
            <span>Popcorn</span>
          </button>

          {/* Cheers */}
          <button
            type="button"
            onClick={() => sendGesture('cheers')}
            title="Cheers with a glass of champagne"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FAF3E1] bg-[#222222] border border-white/10 hover:border-[#FF6D1F]/50 hover:bg-[#FF6D1F]/20 transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span className="text-sm">🥂</span>
            <span>Cheers</span>
          </button>

          {/* Candlelight Mode */}
          <button
            type="button"
            onClick={toggleCandle}
            title={candleMode ? 'Turn off candlelight' : 'Light candlelight for romantic ambience'}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1 ${
              candleMode ? 'bg-[#FF6D1F]/30 border-[#FF6D1F] text-[#FAF3E1]' : 'text-[#FAF3E1] bg-[#222222] border border-white/10'
            }`}
          >
            <span className="text-sm">🕯️</span>
            <span>Candle</span>
          </button>

          {/* Sweet Whisper Notes */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWhispers(!showWhispers)}
              title="Whisper a sweet love note to your partner"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FAF3E1] bg-[#222222] border border-white/10 hover:border-[#FF6D1F]/50 hover:bg-[#FF6D1F]/20 transition active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <MessageCircleHeart className="h-3.5 w-3.5 text-[#FF6D1F]" />
              <span>Whisper</span>
            </button>

            {/* Whisper Dropdown Menu */}
            {showWhispers && (
              <div className="absolute right-0 bottom-full mb-2 w-72 sm:w-80 rounded-2xl border border-white/15 bg-[#1C1C1F] p-3 z-50 text-[#FAF3E1] shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                  <span className="text-xs font-semibold text-[#FF6D1F] flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    Whisper a Sweet Note
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWhispers(false)}
                    className="text-xs text-[#F5E7C6]/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {SWEET_WHISPERS.map((w, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendWhisper(w)}
                      className="w-full text-left text-xs rounded-xl p-2 bg-[#222222] hover:bg-[#FF6D1F]/20 text-[#FAF3E1] hover:text-white transition"
                    >
                      {w}
                    </button>
                  ))}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendWhisper(customWhisper);
                  }}
                  className="mt-2.5 pt-2 border-t border-white/10 flex gap-1.5"
                >
                  <input
                    type="text"
                    value={customWhisper}
                    onChange={(e) => setCustomWhisper(e.target.value)}
                    placeholder="Write a custom whisper…"
                    className="flex-1 py-1.5 px-3 text-xs bg-[#0D0D10] border border-white/10 rounded-xl text-[#FAF3E1] outline-none focus:border-[#FF6D1F]"
                    maxLength={100}
                  />
                  <button type="submit" className="btn-tangerine py-1 px-3 text-xs rounded-xl font-bold shrink-0">
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
