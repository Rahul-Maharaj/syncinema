import { io } from 'socket.io-client';
const ENV = process.env.NEXT_PUBLIC_SERVER_URL || '';   // empty = same origin (behind Caddy/nginx)
export const serverUrl = () => ENV || location.origin;
let s;
export const getSocket = () => (s ||= io(ENV || undefined, { reconnectionDelayMax: 3000 }));
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

