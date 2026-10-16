'use client';
import { useState, useEffect } from 'react';
import {
  Sparkles, Film, HelpCircle, MessageSquareHeart, Compass, Plus,
  Play, Check, RefreshCw, AlertCircle, ChevronRight, BookmarkPlus, Heart
} from 'lucide-react';

const MOODS = [
  { id: 'romantic', label: 'Romantic 💕', desc: 'Heartwarming tearjerkers & passion' },
  { id: 'cozy', label: 'Cozy & Chill ☕', desc: 'Warm vibes, food & animation' },
  { id: 'thrilling', label: 'Thrilling Mystery 🔍', desc: 'Whodunits & gripping suspense' },
  { id: 'comedy', label: 'Laugh Together 😂', desc: 'Hilarious feel-good comedies' },
  { id: 'mindbending', label: 'Mind-Bending 🌌', desc: 'Sci-fi, space & time travel' },
];

export default function AiWatchAssistant({ socket, currentMedia, onPlayMedia, onAddToQueue, onAddToWatchlist, say }) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'explain' | 'prompts' | 'recommend'
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [explainTopic, setExplainTopic] = useState('');
  const [explainResult, setExplainResult] = useState(null);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [selectedMood, setSelectedMood] = useState('romantic');
  const [recommendations, setRecommendations] = useState([]);

  // Auto-identify when currentMedia title or src changes
  useEffect(() => {
    if (!currentMedia?.title && !currentMedia?.src) return;
    fetchSummary();
  }, [currentMedia?.title, currentMedia?.src]);

  const queryAi = (action, payload) => {
    return new Promise((resolve, reject) => {
      if (socket?.connected) {
        socket.emit('ai:query', { action, payload }, (res) => {
          if (res?.ok) resolve(res.data);
          else reject(new Error(res?.error || 'Failed to query AI assistant'));
        });
      } else {
        fetch('/api/ai/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload }),
        })
          .then((r) => r.json())
          .then((j) => (j.ok ? resolve(j.data) : reject(new Error(j.error || 'Server error'))))
          .catch(reject);
      }
    });
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await queryAi('identify', {
        title: currentMedia?.title || currentMedia?.name || '',
        src: currentMedia?.src || '',
      });
      setSummaryData(data);
    } catch {
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async (topic) => {
    const t = topic || explainTopic;
    if (!t) return;
    setLoading(true);
    try {
      const data = await queryAi('explain', {
        title: currentMedia?.title || currentMedia?.name || '',
        topic: t,
        spoilers: showSpoilers,
      });
      setExplainResult(data);
    } catch (e) {
      say?.('Could not load explanation: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompt = async () => {
    try {
      const data = await queryAi('conversation', {
        title: currentMedia?.title || currentMedia?.name || '',
      });
      setCurrentPrompt(data.prompt);
    } catch {}
  };

  const fetchRecommendations = async (mood) => {
    const m = mood || selectedMood;
    try {
      const data = await queryAi('recommend', { mood: m });
      setRecommendations(data.recommendations || []);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'prompts' && !currentPrompt) fetchPrompt();
    if (activeTab === 'recommend') fetchRecommendations(selectedMood);
  }, [activeTab, selectedMood]);

  return (
    <div className="card vault p-4 sm:p-5 space-y-4 bg-gradient-to-b from-[#160d1f] to-[#0e0714] border border-[#ff6fa0]/25 shadow-2xl rounded-2xl">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-[#d9467a] to-purple-600 text-white shadow-lg shadow-[#d9467a]/40">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-semibold flex items-center gap-1.5 text-white">
              AI Watch Assistant
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#ff6fa0]/20 text-[#ff8fb3]">Date Copilot</span>
            </h3>
            <p className="text-xs text-white/60">Spoiler-free summaries, scene explainers &amp; couple cards</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'summary' ? 'bg-[#d9467a] text-white shadow' : 'text-white/70 hover:text-white'
            }`}
          >
            Synopsis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explain')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'explain' ? 'bg-[#d9467a] text-white shadow' : 'text-white/70 hover:text-white'
            }`}
          >
            Scene Explainer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'prompts' ? 'bg-[#d9467a] text-white shadow' : 'text-white/70 hover:text-white'
            }`}
          >
            Date Prompts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recommend')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'recommend' ? 'bg-[#d9467a] text-white shadow' : 'text-white/70 hover:text-white'
            }`}
          >
            Next Movie
          </button>
        </div>
      </div>

      {/* Tab 1: Spoiler-Free Synopsis */}
      {activeTab === 'summary' && (
        <div className="space-y-3.5 rise text-xs">
          {loading ? (
            <div className="py-8 text-center text-white/60 flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 text-[#ff6fa0] animate-spin" />
              <span>Analyzing tonight&apos;s title and preparing spoiler-free summary…</span>
            </div>
          ) : summaryData ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="space-y-0.5">
                  <h4 className="font-semibold text-sm sm:text-base text-white">{summaryData.title}</h4>
                  <p className="text-white/60 text-[11px]">{summaryData.genre} • {summaryData.runtime || 'Feature'} • {summaryData.mood}</p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d9467a]/20 border border-[#d9467a]/40 text-[#ff8fb3] font-bold">
                  <Heart className="h-3.5 w-3.5 fill-[#d9467a] text-[#d9467a]" />
                  <span>{summaryData.coupleScore || '96%'} Couple Score</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-white/85 leading-relaxed">
                <span className="font-semibold text-white block mb-1">Spoiler-Free Overview:</span>
                {summaryData.synopsis}
              </div>

              {summaryData.themes && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-white/70 block">Core Themes &amp; Discussion Topics:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {summaryData.themes.map((t) => (
                      <span key={t} className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-[11px]">
                        ✨ {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 text-center text-white/60 space-y-2">
              <p>No active video detected or movie title is empty.</p>
              <button onClick={fetchSummary} className="btn !py-1.5 !px-3 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Retry Identification
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Scene Explainer */}
      {activeTab === 'explain' && (
        <div className="space-y-3.5 rise text-xs">
          <p className="text-white/70">
            Confused by a scene, plot twist, or character choice? Ask the assistant for a safe, non-spoiling breakdown.
          </p>

          <div className="flex flex-wrap gap-2">
            {['Explain what just happened', 'Symbolism in this scene', 'Character motives', 'Explain ending'].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setExplainTopic(q);
                  handleExplain(q);
                }}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white/80 transition"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={explainTopic}
              onChange={(e) => setExplainTopic(e.target.value)}
              placeholder="e.g. Why did they look back at the train station?"
              className="field !py-2 flex-1 text-xs"
            />
            <button
              onClick={() => handleExplain(explainTopic)}
              disabled={loading || !explainTopic.trim()}
              className="btn !py-2 !px-3 text-xs shrink-0"
            >
              Explain
            </button>
          </div>

          {explainResult && (
            <div className="p-3.5 rounded-xl bg-black/40 border border-[#ff6fa0]/30 space-y-2 text-white/90">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                <span className="font-semibold text-[#ff8fb3] capitalize">{explainResult.topic}</span>
                <span className="text-[10px] text-emerald-400 font-medium">Safe • No Spoilers</span>
              </div>
              <p className="leading-relaxed">{explainResult.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Date Intermission Prompts */}
      {activeTab === 'prompts' && (
        <div className="space-y-3.5 rise text-xs">
          <div className="p-4 rounded-xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-pink-950/40 border border-[#ff6fa0]/30 text-center space-y-3">
            <div className="inline-flex items-center justify-center p-2 rounded-full bg-[#d9467a]/20 text-[#ff8fb3] mb-1">
              <MessageSquareHeart className="h-5 w-5" />
            </div>
            <h4 className="font-semibold text-white/90 text-sm">Intermission Date Prompt</h4>
            <p className="font-display text-sm sm:text-base text-white/95 leading-relaxed font-medium px-2">
              &ldquo;{currentPrompt || 'What is a memory of us you replay the most?'}&rdquo;
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={fetchPrompt}
                className="btn !py-1.5 !px-3 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Next Question 🎲
              </button>
              <button
                type="button"
                onClick={() => {
                  if (socket && currentPrompt) {
                    socket.emit('chat', { text: `💬 [Date Prompt] ${currentPrompt}`, vt: 0 });
                    say?.('Sent to room chat!');
                  }
                }}
                className="ghost !py-1.5 !px-3 text-xs border-white/20"
              >
                Send to Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Couple Movie Recommendations */}
      {activeTab === 'recommend' && (
        <div className="space-y-3.5 rise text-xs">
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMood(m.id);
                  fetchRecommendations(m.id);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  selectedMood === m.id
                    ? 'bg-[#d9467a] text-white shadow-md'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {recommendations.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/10 hover:border-[#ff6fa0]/40 transition group"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="font-semibold text-white text-xs sm:text-sm group-hover:text-[#ff8fb3] transition truncate">
                    {item.title}
                  </h5>
                  <p className="text-white/65 text-[11px] line-clamp-1">{item.why}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {onAddToWatchlist && (
                    <button
                      type="button"
                      onClick={() => onAddToWatchlist(item)}
                      title="Add to Watchlist"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onAddToQueue && (
                    <button
                      type="button"
                      onClick={() => onAddToQueue(item)}
                      title="Add to Up Next Queue"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-[#d9467a]/40 text-white/80 hover:text-white transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
