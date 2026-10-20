'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone, Check, X, Share2, PlusSquare, Sparkles, ExternalLink } from 'lucide-react';

export default function InstallPrompt({ className = '', variant = 'button' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState('android'); // 'ios' | 'android' | 'desktop'
  const [dismissedBanner, setDismissedBanner] = useState(false);

  useEffect(() => {
    // Check if already in standalone (installed) mode
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true)
    ) {
      setInstalled(true);
      return;
    }

    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
        setDeviceType('ios');
      } else if (/Android/i.test(ua)) {
        setDeviceType('android');
      } else {
        setDeviceType('desktop');
      }
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (installed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* 1. BUTTON / PILL VARIANT */}
      {variant === 'button' && (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install SyncCinema as an app on your phone, tablet, or PC"
          className={`glass-btn !px-3 !py-1.5 text-xs font-semibold text-[#FAF3E1] hover:border-[#FF6D1F]/60 hover:bg-[#FF6D1F]/20 transition flex items-center gap-1.5 shadow-md shadow-[#FF6D1F]/20 ${className}`}
        >
          <Smartphone className="h-3.5 w-3.5 text-[#FF6D1F] shrink-0" />
          <span>Install Phone App</span>
        </button>
      )}

      {/* 2. FLOATING MOBILE / TABLET BOTTOM BANNER VARIANT */}
      {variant === 'banner' && !dismissedBanner && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom duration-500">
          <div className="relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#1C1C1F]/95 border border-[#FF6D1F]/40 shadow-[0_10px_35px_rgba(255,109,31,0.25)] backdrop-blur-2xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#FF6D1F] to-[#FF8E42] p-0.5 shadow-lg shadow-[#FF6D1F]/30 shrink-0 flex items-center justify-center">
                <img src="/logo.png" alt="SyncCinema" className="h-8 w-8 object-contain rounded-lg" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#FAF3E1] text-xs truncate">Install SyncCinema App</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FF6D1F]/20 border border-[#FF6D1F]/40 text-[9px] font-extrabold text-[#FF6D1F] uppercase">
                    Phone / Tab
                  </span>
                </div>
                <p className="text-[11px] text-[#F5E7C6]/70 truncate">Fast 0ms sync, full screen, & zero browser lag</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="btn-tangerine px-3 py-1.5 rounded-xl text-[#FAF3E1] font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                <span>Install</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. STEP-BY-STEP INSTALL GUIDE MODAL FOR ALL PHONES & TABLETS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#1C1C1F] border border-[#FF6D1F]/40 p-5 shadow-[0_20px_60px_rgba(255,109,31,0.3)] text-[#FAF3E1] space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#FF6D1F] via-[#FF8E42] to-[#FAF3E1] p-0.5 shadow-xl shadow-[#FF6D1F]/30">
                  <img src="/logo.png" alt="SyncCinema" className="h-full w-full object-contain rounded-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#FAF3E1]">SyncCinema Mobile App</h3>
                  <p className="text-[11px] text-[#FF6D1F] font-medium">Ready for Phone &amp; Tablet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Platform Instructions */}
            {deviceType === 'ios' ? (
              <div className="space-y-3 bg-black/40 rounded-2xl p-4 border border-white/10 text-xs">
                <p className="font-semibold text-[#FF8E42] flex items-center gap-1.5">
                  <span>🍎</span> Install on iPhone / iPad (Safari):
                </p>
                <ol className="space-y-2.5 text-white/80 list-decimal list-inside text-[11px] leading-relaxed">
                  <li>
                    Tap the <b>Share</b> button <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⎋</span> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <b>&ldquo;Add to Home Screen&rdquo;</b> <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">➕</span>.
                  </li>
                  <li>
                    Tap <b>&ldquo;Add&rdquo;</b> at top right. SyncCinema will open instantly like a native mobile app!
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 bg-black/40 rounded-2xl p-4 border border-white/10 text-xs">
                <p className="font-semibold text-[#FF8E42] flex items-center gap-1.5">
                  <span>🤖</span> Install on Android (Chrome / Samsung):
                </p>
                <ol className="space-y-2.5 text-white/80 list-decimal list-inside text-[11px] leading-relaxed">
                  <li>
                    Open Chrome or Samsung Internet menu <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⋮</span> (top right or bottom).
                  </li>
                  <li>
                    Tap <b>&ldquo;Install App&rdquo;</b> or <b>&ldquo;Add to Home screen&rdquo;</b>.
                  </li>
                  <li>
                    Tap <b>&ldquo;Install&rdquo;</b>. SyncCinema icon will appear on your phone home screen!
                  </li>
                </ol>
              </div>
            )}

            {/* Quick Benefits */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-white/70">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/5">
                <Sparkles className="h-3 w-3 text-[#FF8E42] shrink-0" />
                <span>Full screen cinema</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/5">
                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Zero browser address bar</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-tangerine w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-lg shadow-[#FF6D1F]/30 hover:brightness-110 transition cursor-pointer"
            >
              Got It, Continue Streaming
            </button>
          </div>
        </div>
      )}
    </>
  );
}
