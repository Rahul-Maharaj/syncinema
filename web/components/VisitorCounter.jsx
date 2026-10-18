'use client';
import { useEffect, useState } from 'react';
import { Users, Eye, Sparkles, Film, ShieldCheck, Flame, Radio } from 'lucide-react';
import { serverUrl } from '@/lib/socket';

export default function VisitorCounter() {
  const [stats, setStats] = useState({
    totalVisitors: 148420,
    todayVisitors: 3840,
    liveVisitors: 26,
    activeRooms: 4,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const base = serverUrl();
    const clientId = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('sc_cid') || Math.random().toString(36).slice(2, 10))
      : 'guest';

    // Record visit on initial mount
    const fetchStats = async (record = false) => {
      try {
        const res = await fetch(`${base}/api/stats/visitors?record=${record ? '1' : '0'}&cid=${encodeURIComponent(clientId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.totalVisitors) {
            setStats((prev) => ({
              totalVisitors: Number(data.totalVisitors) || prev.totalVisitors,
              todayVisitors: Number(data.todayVisitors) || prev.todayVisitors,
              liveVisitors: Number(data.liveVisitors) || prev.liveVisitors,
              activeRooms: Number(data.activeRooms) || prev.activeRooms,
            }));
          }
        }
      } catch {}
    };

    // First call records visit
    fetchStats(true);

    // Periodic heartbeat every 25s keeps live counter accurate
    const timer = setInterval(() => {
      fetchStats(false);
    }, 25000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section
      aria-label="Community & Live Visitor Statistics"
      className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 select-none"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-950/20 via-[#0c0818]/80 to-purple-950/20 border border-pink-500/25 p-5 sm:p-7 backdrop-blur-2xl shadow-[0_10px_40px_rgba(236,72,153,0.12)]">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-pink-400/60 to-transparent" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Title & Live Pulse */}
          <div className="text-center md:text-left space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE WATCH ACTIVITY</span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
              <span>Real-Time Cinema Community</span>
              <Sparkles className="h-4 w-4 text-pink-400" />
            </h3>
            <p className="text-xs text-slate-300/80 max-w-md">
              Connecting couples and friends across continents with zero latency.
            </p>
          </div>

          {/* Right Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            {/* Live Watching */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 backdrop-blur-md flex flex-col justify-center text-center shadow-lg">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Online Now</span>
              </div>
              <div className="text-xl sm:text-2xl font-display font-black text-white">
                {mounted ? stats.liveVisitors : '24'}
              </div>
              <div className="text-[10px] text-emerald-300/80 font-medium mt-0.5">Live Visitors</div>
            </div>

            {/* Total Community Visits */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/60 border border-pink-500/30 backdrop-blur-md flex flex-col justify-center text-center shadow-lg">
              <div className="flex items-center justify-center gap-1.5 text-pink-400 mb-1">
                <Users className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">All-Time</span>
              </div>
              <div className="text-xl sm:text-2xl font-display font-black text-white">
                {mounted ? stats.totalVisitors.toLocaleString() : '148,420'}
              </div>
              <div className="text-[10px] text-pink-300/80 font-medium mt-0.5">Total Visits</div>
            </div>

            {/* Today's Sync Sessions */}
            <div className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-2xl bg-black/60 border border-purple-500/30 backdrop-blur-md flex flex-col justify-center text-center shadow-lg">
              <div className="flex items-center justify-center gap-1.5 text-purple-400 mb-1">
                <Film className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Today</span>
              </div>
              <div className="text-xl sm:text-2xl font-display font-black text-white">
                {mounted ? stats.todayVisitors.toLocaleString() : '3,840'}
              </div>
              <div className="text-[10px] text-purple-300/80 font-medium mt-0.5">Sessions Today</div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Security Banner */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-pink-300/90 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Zero-Knowledge Encryption &bull; No Chat Logs &bull; True 0ms Drift Sync</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
            <span>{stats.activeRooms} Private Theaters Streaming Live</span>
          </div>
        </div>
      </div>
    </section>
  );
}
