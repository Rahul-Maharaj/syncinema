'use client';
import { useState, useEffect } from 'react';
import { History, QrCode, Play, Trash2, X, ExternalLink, Smartphone, Copy, Check } from 'lucide-react';

export default function WatchHistoryModal({ isOpen, onClose, roomId, onPlayUrl, say }) {
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('handoff'); // 'handoff' | 'history'

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.hist || '[]');
      setHistory(h);
    } catch {
      setHistory([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    say?.('Room link copied!');
  };

  const clearHistory = () => {
    if (confirm('Clear your local watch history?')) {
      localStorage.hist = '[]';
      setHistory([]);
      say?.('Watch history cleared');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md">
      <div className="card vault w-full max-w-md rise space-y-4 p-5 bg-[#160d1f] border border-[#ff6fa0]/30 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-[#d9467a] to-purple-600 text-white">
              {tab === 'handoff' ? <QrCode className="h-4 w-4" /> : <History className="h-4 w-4" />}
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-white">
                {tab === 'handoff' ? 'Cross-Device Handoff' : 'Watch History'}
              </h3>
              <p className="text-[11px] text-white/60">
                {tab === 'handoff' ? 'Scan to continue watching on your phone' : 'Recently played videos'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented Switcher */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 gap-1">
          <button
            type="button"
            onClick={() => setTab('handoff')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              tab === 'handoff' ? 'bg-[#d9467a] text-white shadow' : 'text-white/70 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Mobile Handoff</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              tab === 'history' ? 'bg-[#d9467a] text-white shadow' : 'text-white/70 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History ({history.length})</span>
          </button>
        </div>

        {/* Tab 1: QR Code Mobile Handoff */}
        {tab === 'handoff' && (
          <div className="space-y-4 text-center text-xs rise">
            <div className="relative mx-auto w-48 h-48 p-2.5 rounded-2xl bg-white shadow-2xl flex items-center justify-center">
              <img
                src={qrUrl}
                alt="Room QR Code"
                className="w-full h-full object-contain"
                loading="eager"
              />
            </div>
            <div className="space-y-1 text-white/80">
              <p className="font-semibold text-white text-sm">Scan with your Phone Camera</p>
              <p className="text-[11px] text-white/60">
                Instantly connects to Room <b className="text-[#ff8fb3] font-mono">{roomId}</b> with secret passkey attached.
              </p>
            </div>
            <button
              type="button"
              onClick={copyUrl}
              className="btn !py-2 !px-4 text-xs w-full flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied link to clipboard' : 'Copy Full Invite Link'}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Watch History */}
        {tab === 'history' && (
          <div className="space-y-3 text-xs rise">
            {history.length === 0 ? (
              <div className="py-8 text-center text-white/50">
                <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No history yet. Videos you play will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition group"
                  >
                    <span className="truncate text-white/85 text-xs font-mono flex-1 text-left">
                      {url.replace(/^https?:\/\/(www\.)?/, '')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onPlayUrl?.(url);
                        onClose();
                      }}
                      className="p-1.5 rounded-lg bg-[#d9467a]/20 hover:bg-[#d9467a]/40 text-[#ff8fb3] transition shrink-0"
                      title="Play this again"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {history.length > 0 && (
              <div className="flex justify-end pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear History
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
