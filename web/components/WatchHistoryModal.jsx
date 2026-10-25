'use client';
import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { History, QrCode, Play, Trash2, X, Smartphone, Copy, Check, Lock, Share2 } from 'lucide-react';
import { isAdultMedia, sanitizeDisplayTitle } from '@/lib/media';
import { getSmallInviteUrl } from '@/lib/invite';

export default function WatchHistoryModal({ isOpen, onClose, roomId, roomPass = '', onPlayUrl, say, theme }) {
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('handoff'); // 'handoff' | 'history'
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [handoffUrl, setHandoffUrl] = useState('');

  // Extract pass if not explicitly passed as prop
  const activePass =
    roomPass ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('rp_' + roomId) : '') ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('rp_' + roomId) : '') ||
    '';

  useEffect(() => {
    try {
      const h = JSON.parse(localStorage.hist || '[]');
      setHistory(h);
    } catch {
      setHistory([]);
    }
  }, [isOpen]);

  // Generate crisp, 100% offline QR Code when modal opens
  useEffect(() => {
    if (!isOpen || !roomId) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const targetUrl = getSmallInviteUrl(origin, roomId, activePass);
    setHandoffUrl(targetUrl);

    QRCode.toDataURL(targetUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1e1b2e',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.warn('QR Code generation failed:', err);
      });
  }, [isOpen, roomId, activePass]);

  if (!isOpen) return null;

  const copyUrl = async () => {
    const textToCopy = handoffUrl || (typeof window !== 'undefined' ? window.location.href : '');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      say?.('Room link copied! 📋');
    } catch {
      say?.('Could not copy link');
    }
  };

  const shareHandoff = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `SyncCinema Room: ${roomId}`,
          text: `🍿 Continue watching in private room "${roomId}"!\n${activePass ? `Password: ${activePass}\n` : ''}`,
          url: handoffUrl,
        });
        say?.('Room shared successfully! 💌');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }
    copyUrl();
  };

  const clearHistory = () => {
    if (confirm('Clear your local watch history?')) {
      localStorage.hist = '[]';
      setHistory([]);
      say?.('Watch history cleared 🧹');
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-md">
      <div className={`card vault w-full max-w-md space-y-4 p-5 sm:p-6 rounded-3xl backdrop-blur-2xl shadow-2xl rise transition-all ${
        theme?.isLight
          ? 'bg-white/98 border-2 border-rose-200/90 shadow-[0_20px_60px_rgba(244,63,94,0.12)] text-slate-900'
          : 'bg-[#161622] border-2 border-pink-500/40 shadow-2xl text-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b-2 pb-3 ${theme?.isLight ? 'border-rose-100' : 'border-pink-500/30'}`}>
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-500/30">
              {tab === 'handoff' ? <QrCode className="h-5 w-5" /> : <History className="h-5 w-5" />}
            </div>
            <div>
              <h3 className={`font-display text-sm sm:text-base font-extrabold ${theme?.isLight ? 'text-slate-900' : 'text-white'}`}>
                {tab === 'handoff' ? 'QR Phone Handoff' : 'Watch History'}
              </h3>
              <p className={`text-[11px] font-semibold ${theme?.isLight ? 'text-slate-500' : 'text-pink-200'}`}>
                {tab === 'handoff' ? 'Scan to seamlessly continue on your phone or tablet' : 'Recently played videos'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              theme?.isLight
                ? 'text-slate-500 hover:text-slate-900 hover:bg-rose-50 border-slate-200'
                : 'text-zinc-200 hover:text-white bg-[#222230] border-white/20'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented Switcher */}
        <div className={`flex rounded-2xl p-1 gap-1 border-2 ${
          theme?.isLight ? 'bg-rose-50/70 border-rose-200 shadow-xs' : 'bg-[#12121A] border-pink-500/30'
        }`}>
          <button
            type="button"
            onClick={() => setTab('handoff')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              tab === 'handoff'
                ? 'btn-pink text-white shadow-md shadow-pink-500/30 border-2 border-pink-300'
                : theme?.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-rose-100/60'
                  : 'bg-[#222230] text-zinc-100 hover:text-white border border-white/15'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Phone Handoff</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
              tab === 'history'
                ? 'btn-pink text-white shadow-md shadow-pink-500/30 border-2 border-pink-300'
                : theme?.isLight
                  ? 'text-slate-600 hover:text-slate-950 hover:bg-rose-100/60'
                  : 'bg-[#222230] text-zinc-100 hover:text-white border border-white/15'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History ({history.length})</span>
          </button>
        </div>

        {/* Tab 1: QR Code Mobile Handoff */}
        {tab === 'handoff' && (
          <div className="space-y-4 text-center text-xs rise pt-1">
            <div className={`relative mx-auto w-52 h-52 p-3 rounded-2xl bg-white flex items-center justify-center ${
              theme?.isLight
                ? 'border-2 border-rose-200 shadow-xl ring-1 ring-rose-400/20'
                : 'shadow-2xl shadow-pink-500/15 border border-pink-200'
            }`}>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Room Handoff QR Code"
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-800 gap-2">
                  <div className="h-6 w-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-semibold text-slate-600">Generating QR…</span>
                </div>
              )}
            </div>

            <div className="space-y-1 px-2">
              <p className={`font-bold text-sm ${theme?.isLight ? 'text-slate-900' : 'text-pink-100'}`}>Scan with your Phone Camera</p>
              <p className={`text-[11px] font-medium ${theme?.isLight ? 'text-slate-600' : 'text-pink-200/80'}`}>
                Instantly opens room <span className="text-pink-600 dark:text-pink-400 font-mono font-bold">{roomId}</span> with password pre-loaded.
              </p>
              {activePass && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full text-[11px] font-semibold ${
                  theme?.isLight
                    ? 'bg-rose-50 border-2 border-rose-200 text-slate-900 shadow-xs'
                    : 'bg-[#1a1a1a] border border-pink-500/25 text-pink-200'
                }`}>
                  <Lock className="h-3 w-3 text-pink-500" />
                  <span>Password:</span>
                  <span className="font-mono font-bold text-pink-600 dark:text-pink-300">{activePass}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={copyUrl}
                className="btn-pink flex-1 !py-2.5 !px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer active:scale-95 font-bold"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
              <button
                type="button"
                onClick={shareHandoff}
                className="btn-pink !bg-pink-700/80 hover:!bg-pink-600 !py-2.5 !px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-pink-400/30 font-bold"
                title="Share link to mobile or WhatsApp"
              >
                <Share2 className="h-4 w-4 text-white" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Watch History */}
        {tab === 'history' && (
          <div className="space-y-3 text-xs rise">
            {history.length === 0 ? (
              <div className={`py-10 text-center ${theme?.isLight ? 'text-slate-500' : 'text-pink-300/50'}`}>
                <History className="h-8 w-8 mx-auto mb-2 opacity-40 text-pink-500" />
                <p className={`font-medium ${theme?.isLight ? 'text-slate-600' : 'text-pink-200/70'}`}>No history yet. Videos you play will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {history.map((url, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border-2 transition group shadow-xs ${
                      theme?.isLight
                        ? 'bg-rose-50/60 hover:bg-rose-100/70 border-rose-200/80 text-slate-900'
                        : 'bg-[#1a1a1a] border-pink-500/20 hover:border-pink-500/40 text-pink-100'
                    }`}
                  >
                    <span className={`truncate text-xs font-mono flex-1 text-left flex items-center gap-1.5 font-medium ${
                      theme?.isLight ? 'text-slate-900' : 'text-pink-100'
                    }`}>
                      {isAdultMedia(url) && <Lock className="h-3.5 w-3.5 text-pink-500 shrink-0" />}
                      <span className={isAdultMedia(url) ? 'text-pink-600 font-sans font-semibold' : ''}>
                        {sanitizeDisplayTitle(url)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onPlayUrl?.(url);
                        onClose();
                      }}
                      className={`p-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                        theme?.isLight
                          ? 'bg-white hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-200 shadow-xs'
                          : 'bg-pink-500/20 hover:bg-pink-500/40 text-pink-200'
                      }`}
                      title="Play this again"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {history.length > 0 && (
              <div className={`flex justify-end pt-2 border-t ${theme?.isLight ? 'border-rose-100' : 'border-pink-500/15'}`}>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition"
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
