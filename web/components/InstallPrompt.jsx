'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';

export default function InstallPrompt({ className = '' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone (installed) mode
    if (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone) {
      setInstalled(true);
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
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
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Check if iOS
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIos) {
        setShowIosGuide(true);
        setTimeout(() => setShowIosGuide(false), 5000);
      } else {
        alert('To install SyncCinema in Chrome:\n1. Open the Chrome menu (⋮ at top-right)\n2. Tap "Install SyncCinema" or "Add to Home screen"');
      }
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install SyncCinema as an app on your phone or laptop"
        className={`glass-btn !px-3 !py-1.5 text-xs font-medium text-white hover:border-[#ff6fa0]/50 hover:bg-[#d9467a]/25 transition flex items-center gap-1.5 ${className}`}
      >
        <Download className="h-3.5 w-3.5 text-[#ff6fa0]" />
        <span>Install App</span>
      </button>

      {showIosGuide && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-white/20 bg-[#160d1f]/95 p-3 text-xs text-white shadow-2xl backdrop-blur-xl z-50">
          <p className="font-semibold text-[#ff8fb3] mb-1">Install on iPhone / iPad:</p>
          <p className="opacity-80">Tap the <b>Share</b> button (⎋) at the bottom of Safari, then select <b>&ldquo;Add to Home Screen&rdquo;</b> (➕).</p>
        </div>
      )}
    </div>
  );
}
