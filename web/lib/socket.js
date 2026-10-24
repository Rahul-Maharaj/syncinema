import { io } from 'socket.io-client';

const ENV = process.env.NEXT_PUBLIC_SERVER_URL || ''; // empty = same origin (behind Caddy/nginx/Cloudflare)
export const serverUrl = () => ENV || (typeof window !== 'undefined' ? window.location.origin : '');

let s;
export const getSocket = () =>
  (s ||= io(ENV || undefined, {
    reconnectionDelayMax: 3000,
    reconnectionAttempts: Infinity,
    // University / College Wi-Fi & Cloudpath Bypass:
    // Starts with HTTP long-polling on port 443 (which NO campus firewall or proxy can block),
    // then seamlessly upgrades to WebSockets when supported.
    transports: ['polling', 'websocket'],
    upgrade: true,
    timeout: 20000,
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  }));

export const safeId = (len = 12) => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, len);
    }
  } catch {}
  return (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).slice(0, len);
};

// per-tab identity: survives refresh/reconnect, no login needed
export const getCid = () => {
  let c = '';
  try { c = sessionStorage.getItem('cid'); } catch {}
  if (!c) {
    c = safeId(12);
    try { sessionStorage.setItem('cid', c); } catch {}
  }
  return c;
};
