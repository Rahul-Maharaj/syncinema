'use client';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { autoFixEngine, initGlobalWatchdog } from '@/lib/autoFixEngine';

export default function AutoFixWatchdog() {
  const [mounted, setMounted] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    setMounted(true);
    initGlobalWatchdog();

    const unsubscribe = autoFixEngine.onFix((event) => {
      if (event.type === 'video_healed' || event.type === 'runtime_error_healed') {
        setNotification(event.message);
        const timer = setTimeout(() => setNotification(null), 3800);
        return () => clearTimeout(timer);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!mounted || !notification) return null;

  return (
    <div
      suppressHydrationWarning
      className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#222222]/95 border border-pink-500/40 text-pink-100 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-300"
    >
      <div className="h-6 w-6 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
      </div>
      <span>{notification}</span>
    </div>
  );
}
