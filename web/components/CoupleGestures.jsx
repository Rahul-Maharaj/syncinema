'use client';
import { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { Heart, Sparkles, Flame, MessageCircleHeart, Users2, Wine, Popcorn } from 'lucide-react';

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
          for (let i = 0; i < 12; i++) {
            const el = document.createElement('div');
            el.textContent = i % 2 === 0 ? '💋' : '💖';
            el.className = 'fixed bottom-12 z-50 text-4xl sm:text-5xl pointer-events-none select-none';
            el.style.left = 15 + Math.random() * 70 + '%';
            document.body.append(el);
            gsap.fromTo(
              el,
              { y: 0, opacity: 1, scale: 0.6, rotation: -20 + Math.random() * 40 },
              {
                y: -window.innerHeight * 0.7,
                x: (Math.random() - 0.5) * 120,
                opacity: 0,
                scale: 1.5,
                duration: 2.2 + Math.random(),
                delay: i * 0.08,
                ease: 'power1.out',
                onComplete: () => el.remove(),
              }
            );
          }
          break;
        }

        case 'hug': {
          playChime(440);
          setHugActive(true);
          say?.(`${data.from} is giving you a warm, cozy cuddle 🫂`);
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
          for (let i = 0; i < 8; i++) {
            const el = document.createElement('div');
            el.textContent = '🍿';
            el.className = 'fixed bottom-16 z-50 text-3xl pointer-events-none select-none';
            el.style.left = 30 + Math.random() * 40 + '%';
            document.body.append(el);
            gsap.fromTo(
              el,
              { y: 0, opacity: 1, scale: 0.5 },
              {
                y: -window.innerHeight * 0.5,
                x: (Math.random() - 0.5) * 160,
                rotation: Math.random() * 360,
                opacity: 0,
                scale: 1.3,
                duration: 1.6 + Math.random() * 0.6,
                delay: i * 0.09,
                ease: 'back.out(1.4)',
                onComplete: () => el.remove(),
              }
            );
          }
          break;
        }

        case 'cheers': {
          playChime(880);
          say?.(`Cheers to us from ${data.from}! 🥂✨`);
          for (let i = 0; i < 6; i++) {
            const el = document.createElement('div');
            el.textContent = i % 2 === 0 ? '🥂' : '✨';
            el.className = 'fixed bottom-14 z-50 text-4xl pointer-events-none select-none';
            el.style.left = 20 + Math.random() * 60 + '%';
            document.body.append(el);
            gsap.to(el, {
              y: -window.innerHeight * 0.55,
              opacity: 0,
              scale: 1.4,
              duration: 2,
              delay: i * 0.1,
              ease: 'power2.out',
              onComplete: () => el.remove(),
            });
          }
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
    } else if (type === 'hug') {
      playChime(440);
      setHugActive(true);
      setTimeout(() => setHugActive(false), 3600);
      say?.('Sent a warm cuddle 🫂');
    } else if (type === 'popcorn') {
      playChime(780);
      say?.('Fed popcorn to your partner 🍿');
    } else if (type === 'cheers') {
      playChime(880);
      say?.('Clinked glasses! 🥂');
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

      {/* Couple Gestures Toolbar */}
      <div className="card my-3 flex flex-wrap items-center justify-between gap-2.5 p-3.5 bg-gradient-to-r from-[#d9467a]/15 via-[#8a2be2]/10 to-[#ff9a6b]/15 border-[#ff6fa0]/25 shadow-lg shadow-[#d9467a]/10">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d9467a]/25 text-[#ff6fa0]">
            <Heart className="h-4 w-4 beat fill-current" />
          </div>
          <span className="font-display text-xs sm:text-sm font-semibold tracking-wide text-[#ff9bbd] dark:text-[#ff9bbd]">
            Couple Gestures
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Kiss */}
          <button
            type="button"
            onClick={() => sendGesture('kiss')}
            title="Blow a sweet kiss to your partner"
            className="ghost !px-2.5 !py-1.5 text-xs text-white/90 bg-white/5 hover:bg-[#d9467a]/20 hover:border-[#ff6fa0]/40 transition"
          >
            <span className="text-sm">💋</span>
            <span className="hidden sm:inline">Kiss</span>
          </button>

          {/* Cuddle / Hug */}
          <button
            type="button"
            onClick={() => sendGesture('hug')}
            title="Send a warm, cozy cuddle"
            className="ghost !px-2.5 !py-1.5 text-xs text-white/90 bg-white/5 hover:bg-[#d9467a]/20 hover:border-[#ff6fa0]/40 transition"
          >
            <span className="text-sm">🫂</span>
            <span className="hidden sm:inline">Hug</span>
          </button>

          {/* Hold Hands Interactive */}
          <button
            type="button"
            onClick={toggleHoldHand}
            title={holdingHand ? 'Holding hands! Tap to release' : 'Hold hands with your partner'}
            className={`ghost !px-2.5 !py-1.5 text-xs transition ${
              holdingHand || partnerHolding
                ? 'bg-gradient-to-r from-[#ff6fa0] to-[#d9467a] text-white shadow-md shadow-[#d9467a]/50 border-transparent font-medium'
                : 'text-white/90 bg-white/5 hover:bg-[#d9467a]/20'
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
            className="ghost !px-2.5 !py-1.5 text-xs text-white/90 bg-white/5 hover:bg-[#ff9a6b]/20 hover:border-[#ff9a6b]/40 transition"
          >
            <span className="text-sm">🍿</span>
            <span className="hidden sm:inline">Popcorn</span>
          </button>

          {/* Cheers */}
          <button
            type="button"
            onClick={() => sendGesture('cheers')}
            title="Cheers with a glass of champagne"
            className="ghost !px-2.5 !py-1.5 text-xs text-white/90 bg-white/5 hover:bg-[#f59e0b]/20 hover:border-[#f59e0b]/40 transition"
          >
            <span className="text-sm">🥂</span>
            <span className="hidden sm:inline">Cheers</span>
          </button>

          {/* Candlelight Mode */}
          <button
            type="button"
            onClick={toggleCandle}
            title={candleMode ? 'Turn off candlelight' : 'Light candlelight for romantic ambience'}
            className={`ghost !px-2.5 !py-1.5 text-xs transition ${
              candleMode ? 'bg-amber-500/25 border-amber-400 text-amber-200' : 'text-white/90 bg-white/5'
            }`}
          >
            <span className="text-sm">🕯️</span>
            <span className="hidden sm:inline">Candlelight</span>
          </button>

          {/* Sweet Whisper Notes */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowWhispers(!showWhispers)}
              title="Whisper a sweet love note to your partner"
              className="ghost !px-2.5 !py-1.5 text-xs text-white/90 bg-white/5 hover:bg-[#d9467a]/20 transition"
            >
              <MessageCircleHeart className="h-3.5 w-3.5 text-[#ff6fa0]" />
              <span className="hidden sm:inline">Whisper</span>
            </button>

            {/* Whisper Dropdown Menu */}
            {showWhispers && (
              <div className="absolute right-0 bottom-full mb-2 w-72 sm:w-80 rounded-2xl border border-white/20 bg-[#160d1f]/95 p-3 shadow-2xl backdrop-blur-xl z-50 text-white">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                  <span className="text-xs font-semibold text-[#ff8fb3] flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                    Whisper a Sweet Note
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowWhispers(false)}
                    className="text-xs text-white/50 hover:text-white"
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
                      className="w-full text-left text-xs rounded-xl p-2 bg-white/5 hover:bg-[#d9467a]/25 text-white/90 hover:text-white transition"
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
                    className="field !py-1 !text-xs !bg-white/10 !text-white"
                    maxLength={100}
                  />
                  <button type="submit" className="btn !py-1 !px-2.5 !text-xs shrink-0">
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
