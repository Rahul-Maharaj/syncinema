'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, Film, AlertTriangle } from 'lucide-react';

export default function RoomError({ error, reset }) {
  useEffect(() => {
    console.error('Room Client Exception caught by ErrorBoundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#222222] text-pink-100 flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-[#222222] via-[#222222]/80 to-[#222222]/50 pointer-events-none" />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full p-6 sm:p-8 rounded-3xl bg-[#1a1a1d]/90 border border-pink-500/30 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-lg shadow-pink-500/20">
          <Film className="h-8 w-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-pink-100">Cinema Room Connection Refreshed</h2>
          <p className="text-xs text-pink-200/80 leading-relaxed">
            The private streaming room encountered a temporary client-side sync glitch. Tap below to reload the room with your existing session intact.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 rounded-xl bg-black/40 border border-pink-500/20 text-left text-[11px] font-mono text-pink-300/80 max-h-24 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset ? reset() : window.location.reload()}
            className="btn-pink hover-lift hover-sheen w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-500/25"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Cinema Room</span>
          </button>

          <Link
            href="/"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-pink-200 bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
