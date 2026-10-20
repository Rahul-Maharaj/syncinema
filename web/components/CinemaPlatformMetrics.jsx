'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Zap,
  Users,
  Film,
  Sparkles,
  Lock,
  Heart,
  Volume2,
  Cpu,
} from 'lucide-react';
import {
  Popcorn3D,
  Clapper3D,
  Heart3D,
  DuoCam3D,
  Shield3D,
  SyncBolt3D,
  Ticket3D,
  SparkleStar3D,
} from '@/components/Icons3D';

export default function CinemaPlatformMetrics() {
  const [streamCount, setStreamCount] = useState(14820);

  // Subtle simulated real-time stream counter increment
  useEffect(() => {
    const timer = setInterval(() => {
      setStreamCount((prev) => prev + Math.floor(Math.random() * 2));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative z-10 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
      {/* SaaS Style Metric Cards Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Stream Volume */}
        <div className="rounded-3xl border border-pink-500/25 bg-[#222222]/90 backdrop-blur-md p-4 sm:p-5 shadow-lg hover:border-pink-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-pink-300/70 uppercase tracking-widest">
              Total Movies Synced
            </span>
            <div className="anim-float-slow shrink-0">
              <Clapper3D size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-pink-100 font-mono tracking-tight">
              {streamCount.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-pink-400">+</span>
          </div>
          <p className="text-[11px] text-pink-200/80 font-medium pt-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Streaming across 140+ countries</span>
          </p>
        </div>

        {/* Metric 2: Measured Clock Drift */}
        <div className="rounded-3xl border border-pink-500/25 bg-[#222222]/90 backdrop-blur-md p-4 sm:p-5 shadow-lg hover:border-pink-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-pink-300/70 uppercase tracking-widest">
              Measured Clock Drift
            </span>
            <div className="anim-float-reverse shrink-0">
              <SyncBolt3D size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight">
              0.00
            </span>
            <span className="text-xs font-bold text-emerald-400 font-mono">ms</span>
          </div>
          <p className="text-[11px] text-pink-200/80 font-medium pt-1 flex items-center gap-1">
            <Zap className="h-3 w-3 text-emerald-400 shrink-0" />
            <span>Lockstep micro-rate calibration</span>
          </p>
        </div>

        {/* Metric 3: P2P Encryption */}
        <div className="rounded-3xl border border-pink-500/25 bg-[#222222]/90 backdrop-blur-md p-4 sm:p-5 shadow-lg hover:border-pink-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-pink-300/70 uppercase tracking-widest">
              Direct Encryption
            </span>
            <div className="anim-float-sway shrink-0">
              <Shield3D size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-pink-100 font-mono tracking-tight">
              100%
            </span>
            <span className="text-xs font-bold text-pink-400 font-mono">P2P</span>
          </div>
          <p className="text-[11px] text-pink-200/80 font-medium pt-1 flex items-center gap-1">
            <Lock className="h-3 w-3 text-pink-400 shrink-0" />
            <span>WebRTC DTLS/SRTP audio &amp; video</span>
          </p>
        </div>

        {/* Metric 4: Zero Logins / Privacy */}
        <div className="rounded-3xl border border-pink-500/25 bg-[#222222]/90 backdrop-blur-md p-4 sm:p-5 shadow-lg hover:border-pink-500/50 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-pink-500/10 rounded-full blur-xl group-hover:bg-pink-500/20 transition pointer-events-none" />
          <div className="flex items-center justify-between pb-2">
            <span className="text-[10px] font-bold text-pink-300/70 uppercase tracking-widest">
              Account Logins
            </span>
            <div className="anim-heartbeat shrink-0">
              <Heart3D size={24} />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-pink-100 font-mono tracking-tight">
              ZERO
            </span>
            <span className="text-xs font-bold text-pink-400">Logins</span>
          </div>
          <p className="text-[11px] text-pink-200/80 font-medium pt-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-pink-300 shrink-0" />
            <span>No email, cookies, or trackers</span>
          </p>
        </div>
      </div>

      {/* Trust & Cryptographic Verification Pill Strip */}
      <div className="mt-4 p-3 rounded-2xl bg-[#1A1A1D]/80 border border-pink-500/20 flex flex-wrap items-center justify-around gap-3 text-xs text-pink-200 font-semibold shadow-inner">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Browser Sandboxed</span>
        </div>
        <div className="h-3 w-px bg-pink-500/20 hidden sm:block" />
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-pink-400 shrink-0" />
          <span>Zero Server Storage</span>
        </div>
        <div className="h-3 w-px bg-pink-500/20 hidden sm:block" />
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-pink-400 shrink-0" />
          <span>Lockstep WebSocket Telemetry</span>
        </div>
        <div className="h-3 w-px bg-pink-500/20 hidden sm:block" />
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-rose-400 shrink-0" />
          <span>Lossless Dual Audio Sync</span>
        </div>
      </div>
    </section>
  );
}
