'use client';

import { useEffect } from 'react';
import { serverUrl, getSocket } from '@/lib/socket';

/**
 * RealAudienceTracker: Global 100% Genuine Telemetry Beacon
 * Emits strictly real client telemetry (screen resolution, path, referrer, client ID)
 * to /api/stats/visitors to populate the Admin 100% Real Daily Audience Tracking System.
 * Zero fake numbers. Zero synthetic seeds.
 */
export default function RealAudienceTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get or create persistent unique client ID in localStorage
    let cid = '';
    try {
      cid = localStorage.getItem('sc_real_cid');
      if (!cid) {
        cid = 'sc_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now().toString(36);
        localStorage.setItem('sc_real_cid', cid);
      }
    } catch {
      cid = 'sc_anon_' + Date.now();
    }

    const base = serverUrl();
    const socket = getSocket();

    const getMetaParams = () => {
      try {
        const sw = window.screen?.width || 0;
        const sh = window.screen?.height || 0;
        const dpr = window.devicePixelRatio || 1;
        const path = window.location?.pathname || '/';
        const ref = document.referrer || '';
        return `&sw=${sw}&sh=${sh}&dpr=${dpr}&path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}`;
      } catch {
        return '';
      }
    };

    const recordVisit = async () => {
      try {
        const meta = getMetaParams();
        await fetch(`${base}/api/stats/visitors?record=1&cid=${encodeURIComponent(cid)}${meta}`, {
          method: 'GET',
          cache: 'no-store',
        });
      } catch {}
    };

    // Record initial visit immediately on page load
    recordVisit();

    // Ping session every 35s to keep live counter accurate (pauses when tab is hidden)
    const pingTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (socket && socket.connected) {
        try {
          socket.emit('stats:ping', {
            cid,
            path: window.location?.pathname || '/',
            ref: document.referrer || '',
            screen: {
              width: window.screen?.width || 0,
              height: window.screen?.height || 0,
              dpr: window.devicePixelRatio || 1,
            },
          });
        } catch {}
      } else {
        try {
          const meta = getMetaParams();
          fetch(`${base}/api/stats/visitors?record=0&cid=${encodeURIComponent(cid)}${meta}`, {
            method: 'GET',
            cache: 'no-store',
          }).catch(() => {});
        } catch {}
      }
    }, 35000);

    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        recordVisit();
      }
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(pingTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
