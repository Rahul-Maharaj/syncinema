'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone, Check, X, Sparkles, Android, ExternalLink } from 'lucide-react';

export default function InstallPrompt({ className = '', variant = 'button' }) {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState('android'); // 'ios' | 'android' | 'desktop'
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!mounted || installed) return null;

  const triggerApkDownload = () => {
    try {
      setDownloadStarted(true);
      const link = document.createElement('a');
      link.href = '/syncinema.apk';
      link.download = 'SyncCinema.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloadStarted(false), 5000);
    } catch (e) {
      console.warn('APK download link error:', e);
    }
  };

  const handleInstallClick = async () => {
    // 📥 Download the native Android APK file directly
    triggerApkDownload();

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      } catch {}
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {/* 1. BUTTON / PILL VARIANT */}
      {variant === 'button' && (
        <button
          suppressHydrationWarning
          type="button"
          onClick={handleInstallClick}
          title="Download SyncCinema Android App (APK 9.6 MB)"
          className={`glass-btn !px-3 !py-1.5 text-xs font-semibold text-pink-100 hover:border-pink-500/60 hover:bg-pink-500/20 transition flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer ${className}`}
        >
          <Smartphone className="h-3.5 w-3.5 text-pink-400 shrink-0" />
          <span>Download App (APK)</span>
        </button>
      )}

      {/* 2. FLOATING MOBILE / TABLET BOTTOM BANNER VARIANT */}
      {variant === 'banner' && !dismissedBanner && (
        <div suppressHydrationWarning className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom duration-500">
          <div className="relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#222222]/95 border border-pink-500/40 shadow-[0_10px_35px_rgba(236,72,153,0.25)] backdrop-blur-2xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-500 p-0.5 shadow-lg shadow-pink-500/30 shrink-0 flex items-center justify-center">
                <img src="/logo.png" alt="SyncCinema" className="h-8 w-8 object-contain rounded-lg" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-pink-100 text-xs truncate">SyncCinema Mobile App</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-extrabold text-emerald-300 uppercase">
                    APK Ready
                  </span>
                </div>
                <p className="text-[11px] text-pink-200/70 truncate">Fast 0ms sync &bull; Android APK (9.6 MB)</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="btn-pink px-3 py-1.5 rounded-xl text-white font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{downloadStarted ? 'Downloading…' : 'Download APK'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition cursor-pointer"
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
          <div className="relative w-full max-w-sm rounded-3xl bg-[#222222] border border-pink-500/40 p-5 shadow-[0_20px_60px_rgba(236,72,153,0.3)] text-pink-100 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-pink-300 p-0.5 shadow-xl shadow-pink-500/30">
                  <img src="/logo.png" alt="SyncCinema" className="h-full w-full object-contain rounded-xl" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-pink-100">SyncCinema Mobile App</h3>
                  <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Android APK Ready (9.6 MB)</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Direct APK Download Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500/20 via-rose-500/10 to-transparent border border-pink-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-pink-200 flex items-center gap-1.5">
                  <span>🤖</span> Android Native APK
                </span>
                <span className="text-[10px] text-pink-300/80 font-mono">v1.0.0 &bull; 9.6 MB</span>
              </div>
              <a
                href="/syncinema.apk"
                download="SyncCinema.apk"
                onClick={() => setDownloadStarted(true)}
                className="btn-pink w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition cursor-pointer text-center no-underline"
              >
                <Download className="h-4 w-4" />
                <span>Download Android APK Directly</span>
              </a>
              <p className="text-[10px] text-pink-300/70 text-center">
                Tap the downloaded file in your notifications to install!
              </p>
            </div>

            {/* Platform Instructions for iOS */}
            {deviceType === 'ios' && (
              <div className="space-y-3 bg-[#1a1a1a]/70 rounded-2xl p-4 border border-pink-500/20 text-xs">
                <p className="font-semibold text-pink-400 flex items-center gap-1.5">
                  <span>🍎</span> Install on iPhone / iPad (Safari):
                </p>
                <ol className="space-y-2 text-pink-100/90 list-decimal list-inside text-[11px] leading-relaxed">
                  <li>
                    Tap <b>Share</b> <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">⎋</span> at the bottom of Safari.
                  </li>
                  <li>
                    Scroll down and tap <b>&ldquo;Add to Home Screen&rdquo;</b> <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">➕</span>.
                  </li>
                  <li>
                    Tap <b>&ldquo;Add&rdquo;</b>. SyncCinema will open instantly in full screen!
                  </li>
                </ol>
              </div>
            )}

            {/* Quick Benefits */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-pink-200/80">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-pink-500/10">
                <Sparkles className="h-3 w-3 text-pink-400 shrink-0" />
                <span>Notch-free cinema</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-pink-500/10">
                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>Zero browser lag</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-pink-200 font-semibold text-xs border border-white/10 transition cursor-pointer"
            >
              Close &amp; Return to Movie
            </button>
          </div>
        </div>
      )}
    </>
  );
}
