'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Users, Crown, Trash2 } from 'lucide-react';
import gsap from 'gsap';

const EMOJI = ['❤️', '😂', '😮', '😢', '🔥', '👏'];
const QUESTIONS = [
  'What is a memory of us you replay the most?',
  'What small thing did I do that made you smile this week?',
  'Where should our first trip together be?',
  'What song reminds you of me?',
  'What are you looking forward to this month?',
  'If we had a free day together tomorrow, what would we do?',
  'What is one thing you want us to try this year?',
  'What was the best part of your day?',
  'What is a dream you have never told me?',
  'Which movie should we watch next, and why?',
  'What do you miss most about being together?',
  'What is the first thing we do when we meet?',
];

const fmt = (s) => {
  if (isNaN(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export default function ChatPanel({
  socket,
  me,
  name,
  users = [],
  hostId,
  chat = [],
  playerRef,
  say,
  isMobile = false,
}) {
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const prevCount = useRef(chat.length);

  // Auto-scroll & subtle entrance animation on new messages
  useEffect(() => {
    if (!listRef.current) return;
    if (chat.length > prevCount.current) {
      const last = listRef.current.lastElementChild;
      if (last) {
        gsap.from(last, { x: 16, opacity: 0, duration: 0.25, ease: 'power2.out' });
      }
    }
    prevCount.current = chat.length;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chat.length]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  const handleSend = (e) => {
    e?.preventDefault?.();
    const clean = text.trim();
    if (!clean) return;

    const vt = playerRef?.current?.time?.() || 0;
    socket?.emit('chat', { text: clean, vt });
    setText('');

    // Keep focus on input for continuous conversation without re-clicking
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleClearChat = () => {
    if (confirm('Delete the chat history for both of you? This cannot be undone.')) {
      socket?.emit('chat:clear');
      say?.('Chat history cleared 🧹');
    }
  };

  const attachTimestamp = () => {
    const cur = playerRef?.current?.time?.() || 0;
    const tag = `[${fmt(cur)}] `;
    setText((prev) => tag + prev);
    inputRef.current?.focus();
  };

  const askQuestion = () => {
    const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
    const vt = playerRef?.current?.time?.() || 0;
    socket?.emit('chat', { text: '💬 ' + q, vt });
  };

  return (
    <div
      className="card vault flex flex-col p-2.5 sm:p-4 border border-white/10 !bg-black h-full flex-1 min-h-0 rounded-2xl overflow-hidden"
    >
      {/* Header: User Presence & Roster */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="flex items-center gap-1 text-xs opacity-60">
          <Users className="h-3.5 w-3.5" />
          {users.length} here
        </span>
        {users.map((u) => (
          <span
            key={u.id}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/90"
          >
            <i className="h-2 w-2 rounded-full" style={{ background: u.color || '#f43f5e' }} />
            <span className="truncate max-w-[80px] sm:max-w-[110px]">{u.name}</span>
            {u.id === hostId && <Crown className="h-3 w-3 text-amber-400" title="Room Host" />}
            {me === hostId && u.id !== me && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Pass host controls to ${u.name}?`)) {
                    socket?.emit('host:handover', { targetId: u.id });
                    say?.(`Handed host controls to ${u.name}`);
                  }
                }}
                className="opacity-40 hover:opacity-100 hover:text-amber-400 p-0.5 ml-0.5 transition"
                title={`Transfer host controls to ${u.name}`}
              >
                <Crown className="h-2.5 w-2.5" />
              </button>
            )}
          </span>
        ))}
        {chat.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            title="Delete chat history"
            aria-label="Delete chat history"
            className="ml-auto rounded-lg p-1 text-white/40 hover:text-pink-400 transition hover:bg-white/5"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto pr-1 select-text">
        {chat.length === 0 && (
          <div className="mt-8 text-center text-sm opacity-50 px-4">
            <p>No messages yet.</p>
            <p className="mt-1 text-xs text-white/40">Say hi 👋 or tap 💬 for a conversation starter.</p>
          </div>
        )}
        {chat.map((m, idx) => {
          const mine = m.user === name;
          return (
            <div
              key={m.id || `${m.user}-${idx}-${m.vt || 0}`}
              className={`flex flex-col text-sm leading-snug ${mine ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-xs mb-0.5">
                <b style={{ color: m.color || (mine ? '#F472B6' : '#FCE7F3') }}>{mine ? 'You' : m.user}</b>
                {m.vt !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      playerRef?.current?.seek?.(m.vt);
                      say?.(`Jumped to ${fmt(m.vt)} ⏱️`);
                    }}
                    title="Jump to this video moment"
                    className="rounded bg-pink-500/15 px-1 text-[10px] text-pink-300 hover:bg-pink-500/30 transition font-mono"
                  >
                    {fmt(m.vt)}
                  </button>
                )}
              </div>
              <p
                className={`max-w-[85%] break-words rounded-2xl px-3.5 py-1.5 text-sm ${
                  mine
                    ? 'rounded-tr-sm bg-gradient-to-r from-pink-600 via-rose-500 to-pink-500 text-white shadow-md shadow-pink-500/20'
                    : 'rounded-tl-sm bg-[#222222] text-pink-100 border border-pink-500/20'
                }`}
              >
                {m.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Reactions & Action Helpers */}
      <div className="my-2 flex items-center justify-between gap-1 border-t border-white/5 pt-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                socket?.emit('reaction', e);
                socket?.emit('reaction:timed', { emoji: e, vt: playerRef?.current?.time?.() || 0 });
              }}
              aria-label={`React ${e}`}
              className="rounded-lg p-1 text-lg sm:text-xl transition hover:-translate-y-1 hover:scale-125 active:scale-90"
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={attachTimestamp}
            title="Attach current video timestamp"
            className="rounded-lg text-[11px] text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 px-2 py-1 font-mono transition flex items-center gap-1"
          >
            <span>⏱️</span>
            <span>{fmt(playerRef?.current?.time?.() || 0)}</span>
          </button>
          <button
            type="button"
            onClick={askQuestion}
            aria-label="Romantic conversation starter"
            title="Send random conversation starter"
            className="rounded-lg p-1 text-lg sm:text-xl transition hover:-translate-y-1 hover:scale-125 active:scale-90"
          >
            💬
          </button>
        </div>
      </div>

      {/* Chat Input Form */}
      <form onSubmit={handleSend} className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder="Say something sweet…"
          className="field flex-1 !bg-[#1A1A1D] border border-pink-500/25 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 text-sm text-pink-100 placeholder-pink-300/40 px-3 py-2 rounded-xl outline-none transition"
          autoComplete="off"
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-pink !px-3.5 !py-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-pink-500/30"
          aria-label="Send message"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </form>
    </div>
  );
}
