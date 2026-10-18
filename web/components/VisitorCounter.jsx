'use client';
import { useEffect, useState } from 'react';
import { Users, Eye, Sparkles, Film, ShieldCheck, Radio, Lock } from 'lucide-react';
import { serverUrl, getSocket } from '@/lib/socket';
import { isRealHumanBrowser, getHumanProofToken } from '@/lib/antiBot';

export default function VisitorCounter() {
  const [stats, setStats] = useState({
    totalVisitors: 1,
    todayVisitors: 1,
    liveVisitors: 1,
    activeRooms: 0,
  });

  useEffect(() => {
    const base = serverUrl();
    const socket = getSocket();

    // Persistent genuine client identity in localStorage
    let clientId = '';
    try {
      clientId = localStorage.getItem('sc_real_cid');
      if (!clientId) {
        clientId = 'sc_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('sc_real_cid', clientId);
      }
    } catch {
      clientId = 'sc_anon_' + Date.now();
    }

    const applyStats = (data) => {
      if (data) {
        setStats({
          totalVisitors: Math.max(1, Number(data.totalVisitors) || 1),
          todayVisitors: Math.max(1, Number(data.todayVisitors) || 1),
          liveVisitors: Math.max(1, Number(data.liveVisitors) || 1),
          activeRooms: Number(data.activeRooms) || 0,
        });
      }
    };

    // 1. Fetch genuine real stats from verified endpoint (strictly human-only)
    const fetchRealStats = async (record = false) => {
      if (!isRealHumanBrowser()) return;
      try {
        const hp = getHumanProofToken();
        const res = await fetch(
          `${base}/api/stats/visitors?record=${record ? '1' : '0'}&cid=${encodeURIComponent(clientId)}&hp=${encodeURIComponent(hp)}`
        );
        if (res.ok) {
          const data = await res.json();
          applyStats(data);
        }
      } catch (e) {}
    };

    // First visit registers the verified genuine visitor
    fetchRealStats(true);

    // 2. Real-time WebSocket synchronization
    if (socket) {
      socket.on('stats:visitors', applyStats);
      socket.emit('stats:ping', { cid: clientId });
    }

    // 3. Heartbeat every 25 seconds to keep genuine session active (skips when tab is hidden to save server capacity)
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (socket && socket.connected) {
        socket.emit('stats:ping', { cid: clientId });
      } else {
        fetchRealStats(false);
      }
    }, 25000);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchRealStats(false);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
      if (socket) {
        socket.off('stats:visitors', applyStats);
      }
    };
  }, []);

  return (
    <section
      aria-label="Real-Time Verified Community Statistics"
      className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 select-none"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-950/20 via-[#0c0818]/85 to-purple-950/20 border border-pink-500/25 p-5 sm:p-7 backdrop-blur-2xl shadow-[0_10px_40px_rgba(236,72,153,0.12)]">
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-pink-400/60 to-transparent" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Left Title & Live Badge */}
          <div className="text-center md:text-left space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>100% REAL LIVE AUDIENCE</span>
            </div>
            <h3 className="text-lg sm:text-xl font-display font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-2">
              <span>Verified Audience Telemetry</span>
              <Sparkles className="h-4 w-4 text-pink-400" />
            </h3>
            <p className="text-xs text-slate-300/80 max-w-md">
              Genuine real-time audience metrics for{' '}
              <span className="text-pink-400 font-semibold">syncinema.site</span>. Deduplicated by IP and device fingerprint.
            </p>
          </div>

          {/* Right Real Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            {/* Real Live Online Now */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/60 border border-emerald-500/30 backdrop-blur-md flex flex-col justify-center text-center shadow-lg transition-all">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Online Now</span>
              </div>
              <div className="text-xl sm:text-2xl font-display font-black text-white">
                {stats.liveVisitors.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-300/80 font-medium mt-0.5">Live Viewers</div>
            </div>

            {/* Real All-Time Unique Visitors */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/60 border border-pink-500/30 backdrop-blur-md flex flex-col justify-center text-center shadow-lg transition-all">
              <div className="flex items-center justify-center gap-1.5 text-pink-400 mb-1">
                <Users className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">All-Time</span>
              </div>
              <div className="text-xl sm:text-2xl font-display font-black text-white">
                {stats.totalVisitors.toLocaleString()}
              </div>
              <div className="text-[10px] text-pink-300/80 font-medium mt-0.5">Real Visitors Reached</div>
            </div>

            {/* Real Today's Unique Visitors */}
            <div className="col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-2xl bg-black/60 border border-purple-500/30 backdrop-blur-md flex flex-col justify-center text-center shadow-lg transition-all">
              <div className="flex items-center justify-center gap-1.5 text-purple-400 mb-1">
                <Film className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase font-bold tracking-wider">Today</span>
              </div>
              <div className="text-xl sm:text-2xl font-display font-black text-white">
                {stats.todayVisitors.toLocaleString()}
              </div>
              <div className="text-[10px] text-purple-300/80 font-medium mt-0.5">Unique Today</div>
            </div>
          </div>
        </div>

        {/* Bottom Trust & Security Banner */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-pink-300/90 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Anti-Bot Shield Active &bull; Zero Manipulation Telemetry &bull; Zero Log Encryption</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
            <span>{stats.activeRooms} Private Theaters Active</span>
          </div>
        </div>
      </div>
    </section>
  );
}
