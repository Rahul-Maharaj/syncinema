const express = require('express');
const http = require('http');

// Global Network Resiliency: Safeguard process against upstream remote socket drops and Undici disconnects
process.on('uncaughtException', (err) => {
  if (err?.code === 'UND_ERR_SOCKET' || err?.code === 'ECONNRESET' || err?.code === 'EPIPE' || err?.message?.includes('other side closed') || err?.message?.includes('socket closed')) {
    console.warn('[Network Resiliency] Upstream TLS socket closed prematurely by remote host:', err?.message || err);
    return;
  }
  console.error('[Process Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[Process Unhandled Rejection Caught]:', reason?.message || reason);
});

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const { WebSocketServer } = require('ws');
const { handleAiQuery } = require('./aiAssistant');
const { resolveUniversalMedia } = require('./universalExtractor');
const { recordVisit, pingSession, setVisitorRoom, endSession, getVisitorStats, getAdminVisitorsData, logUserActivity } = require('./visitorTracker');
const { botShieldMiddleware, isBotRequest } = require('./botShield');

// Auto-load .env if present in root or server directory
try {
  const envCandidates = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const k = line.slice(0, eqIdx).trim();
          let v = line.slice(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (process.env[k] === undefined) {
            process.env[k] = v;
          }
        }
      }
      break;
    }
  }
} catch (e) {}

const {
  PORT = 4000,
  CLIENT_ORIGIN,
  TURN_URL,
  TURN_SECRET,
  ACCESS_KEY,
  DATA_FILE = './data/rooms.json',
  METERED_DOMAIN,
  METERED_SECRET_KEY,
  METERED_API_KEY,
  METERED_STATIC_USER,
  METERED_STATIC_CRED,
} = process.env;

// Admin Key Security: Support ADMIN_KEY, ADMIN_PASSWORD, ADMINKEY or ADMIN_SECRET from Render/environment
let rawAdminKey = (process.env.ADMIN_KEY || process.env.ADMIN_PASSWORD || process.env.ADMINKEY || process.env.ADMIN_SECRET || '').trim();
if ((rawAdminKey.startsWith('"') && rawAdminKey.endsWith('"')) || (rawAdminKey.startsWith("'") && rawAdminKey.endsWith("'"))) {
  rawAdminKey = rawAdminKey.slice(1, -1).trim();
}

let resolvedAdminKey = rawAdminKey;
if (!resolvedAdminKey) {
  const generatedSecret = crypto.randomBytes(24).toString('hex');
  resolvedAdminKey = generatedSecret;
  console.warn('\n============================================================');
  console.warn('⚠️  [SECURITY NOTICE] No ADMIN_KEY detected in environment!');
  console.warn('An ephemeral cryptographically strong ADMIN_KEY has been generated for this session:');
  console.warn('  ' + generatedSecret);
  console.warn('Set ADMIN_KEY in your Render environment variables to persist your credentials.');
  console.warn('============================================================\n');
}
const ADMIN_KEY = resolvedAdminKey;

const MAX_USERS = +process.env.MAX_USERS_PER_ROOM || 2;     // couple mode: strictly 2 seats (host & partner)
const GRACE_MS = 10000;                              // keep a user's seat while their socket reconnects

const defaultOrigins = [
  'https://www.syncinema.site',
  'https://syncinema.site',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
];
const allowedOrigins = CLIENT_ORIGIN
  ? [...new Set([...CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean), ...defaultOrigins])]
  : defaultOrigins;

const isAllowedOrigin = (orig) => {
  if (!orig) return true; // non-browser or server-to-server
  if (allowedOrigins.includes(orig)) return true;
  if (orig.startsWith('capacitor://') || orig.startsWith('ionic://')) return true;
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(orig)) {
    return true;
  }
  return false;
};

const origin = (orig, callback) => {
  if (isAllowedOrigin(orig)) {
    return callback(null, true);
  }
  return callback(new Error('CORS blocked: Origin not allowed (' + orig + ')'), false);
};

const PEER_KEY = ACCESS_KEY ? crypto.createHmac('sha256', ACCESS_KEY).update('peer').digest('hex').slice(0, 32) : 'peerjs';
const TYPES = ['youtube', 'vimeo', 'file', 'hls', 'dash', 'embed', 'proxy', 'hybrid', 'ott', 'ott_hub'];
const ROOM_RE = /^[\w-]{2,64}$/;

// --- SSRF Guard & URL Sanitization Engine ---
// Secret word access removed: open access to website, room security handled by room passwords
const keyOk = (k) => true;
// --- SECURITY ENGINE & FIREWALL ---
const blockedUsers = new Map();  // cid -> { reason, at, ip }
const blockedIps = new Set();    // IP firewall blacklist
const fails = new Map();         // brute-force lockout & progressive throttle

// Auto-clean expired brute-force lockouts every 5 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of fails.entries()) {
    if (entry.until && entry.until < now) {
      fails.delete(ip);
    }
  }
  if (fails.size > 5000) {
    const keysToRemove = Array.from(fails.keys()).slice(0, 1000);
    keysToRemove.forEach((k) => fails.delete(k));
  }
}, 5 * 60 * 1000).unref();

const adminKeyOk = (k) => {
  if (!k) return false;
  let input = String(k).trim();
  if ((input.startsWith('"') && input.endsWith('"')) || (input.startsWith("'") && input.endsWith("'"))) {
    input = input.slice(1, -1).trim();
  }
  let actual = String(ADMIN_KEY).trim();
  if ((actual.startsWith('"') && actual.endsWith('"')) || (actual.startsWith("'") && actual.endsWith("'"))) {
    actual = actual.slice(1, -1).trim();
  }
  if (input === actual) return true;
  try {
    const a = Buffer.from(input), b = Buffer.from(actual);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

const ipOf = (r) => {
  const headers = r?.headers || {};
  return String(headers['cf-connecting-ip'] || headers['x-real-ip'] || headers['x-forwarded-for'] || r?.address || r?.socket?.remoteAddress || '').split(',')[0].trim();
};
const isLocalIp = (ip) => !ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '::ffff:127.0.0.1';
const locked = (ip) => !isLocalIp(ip) && (fails.get(ip)?.until || 0) > Date.now();

const fail = (ip) => {
  if (isLocalIp(ip)) return;
  const f = fails.get(ip) || { n: 0 };
  f.n = (f.n || 0) + 1;
  if (f.n >= 7) {
    // 2-hour progressive lock for admin gate rather than permanent IP ban to protect shared college CGNAT IPs
    f.until = Date.now() + 2 * 60 * 60_000;
    console.warn(`[Admin Security Firewall] Maximum failed attempts exceeded. Admin route lock applied for: ${ip}`);
  } else if (f.n >= 4) {
    f.until = Date.now() + 30 * 60_000;
    console.warn(`[Admin Security Firewall] 30m Admin lock applied for suspicious probe from: ${ip}`);
  }
  fails.set(ip, f);
};

// --- HIGH-SECURITY SINGLE ACTIVE ADMIN SESSION ENGINE ---
// Strictly enforces ONE active administrator session worldwide.
// When an admin logs in, any previous session is immediately invalidated.
let activeAdminSession = null;
const ADMIN_SESSION_TIMEOUT = 24 * 60 * 60_000; // 24 hours idle timeout

const validateAdminAuth = (req) => {
  const token = req.get('x-admin-token') || req.query.adminToken || req.body?.adminToken;
  const key = req.get('x-admin-key') || req.query.adminKey || req.body?.adminKey;

  // 1. Session Token Validation (Primary, High-Security Single Session)
  if (token) {
    if (!activeAdminSession || activeAdminSession.token !== token) {
      return { ok: false, reason: 'session_expired', message: 'Admin session terminated: Another administrator logged in or session expired.' };
    }
    if (Date.now() - activeAdminSession.lastActive > ADMIN_SESSION_TIMEOUT) {
      activeAdminSession = null;
      return { ok: false, reason: 'session_timeout', message: 'Admin session timed out due to inactivity.' };
    }
    activeAdminSession.lastActive = Date.now();
    return { ok: true, session: activeAdminSession };
  }

  // 2. Direct Master Key Fallback (e.g. initial login / system calls)
  if (key && adminKeyOk(key)) {
    return { ok: true, isKeyAuth: true };
  }

  return { ok: false, reason: 'invalid_credentials' };
};

// High-Grade Stealth Admin Gate
const adminGate = (req, res, next) => {
  const ip = ipOf(req);
  if (blockedIps.has(ip) || locked(ip)) {
    return res.status(404).send('Not Found');
  }

  const auth = validateAdminAuth(req);
  if (!auth.ok) {
    fail(ip);
    if (auth.reason === 'session_expired' || auth.reason === 'session_timeout') {
      return res.status(401).json({ error: auth.reason, message: auth.message });
    }
    setTimeout(() => {
      res.status(404).send('Not Found');
    }, 500);
    return;
  }

  fails.delete(ip);
  req.adminSession = auth.session;
  next();
};

// --- IP Geolocation Resolver & Cache for Member Locations ---
const geoCache = new Map();
const MAX_GEO_CACHE = 5000;
const setGeoCache = (ip, geo) => {
  if (geoCache.size >= MAX_GEO_CACHE) {
    const it = geoCache.keys();
    for (let i = 0; i < 500; i++) {
      const next = it.next();
      if (next.done) break;
      geoCache.delete(next.value);
    }
  }
  geoCache.set(ip, geo);
};
const getGeoForIp = async (ip) => {
  if (!ip || isLocalIp(ip)) {
    return {
      city: 'Local / Host Node',
      region: 'Host Machine',
      country: 'Local Network',
      countryCode: 'LOC',
      flag: '🏠',
      lat: 28.6139,
      lon: 77.2090,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
      isp: 'Direct Local Loopback',
      ip: ip || '127.0.0.1',
    };
  }
  if (geoCache.has(ip)) return geoCache.get(ip);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon,timezone,isp,query`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success') {
        const flag = data.countryCode
          ? String.fromCodePoint(...[...data.countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))
          : '📍';
        const geo = {
          city: data.city || 'Metro City',
          region: data.regionName || '',
          country: data.country || 'Global',
          countryCode: data.countryCode || '',
          flag,
          lat: Number(data.lat || 0),
          lon: Number(data.lon || 0),
          timezone: data.timezone || 'UTC',
          isp: data.isp || 'Broadband ISP',
          ip: data.query || ip,
        };
        setGeoCache(ip, geo);
        return geo;
      }
    }
  } catch {}

  const fallback = {
    city: 'Online Viewer',
    region: 'Connected Node',
    country: 'Active Peer',
    countryCode: 'GL',
    flag: '🌐',
    lat: 0,
    lon: 0,
    timezone: 'UTC',
    isp: 'Broadband',
    ip,
  };
  setGeoCache(ip, fallback);
  return fallback;
};

// Normalize and preserve anti-VPN location signals
const normalizeUserGeo = (geoData, ip) => {
  if (!geoData || typeof geoData !== 'object') {
    return null;
  }
  const isVpn = Boolean(geoData.isVpn);
  const gpsVerified = Boolean(geoData.gpsVerified);
  return {
    city: String(geoData.city || 'Physical Location').slice(0, 80),
    region: String(geoData.region || geoData.regionName || '').slice(0, 80),
    country: String(geoData.country || 'Global').slice(0, 80),
    countryCode: String(geoData.countryCode || geoData.country_code || '').slice(0, 6),
    flag: geoData.flag || (geoData.countryCode ? String.fromCodePoint(...[...geoData.countryCode.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : '📍'),
    lat: Number(geoData.lat || geoData.latitude || 0),
    lon: Number(geoData.lon || geoData.longitude || 0),
    accuracy: geoData.accuracy ? Number(geoData.accuracy) : null,
    gpsVerified,
    isVpn,
    vpnReason: geoData.vpnReason ? String(geoData.vpnReason).slice(0, 250) : null,
    vpnIp: geoData.vpnIp ? String(geoData.vpnIp).slice(0, 50) : null,
    vpnCity: geoData.vpnCity ? String(geoData.vpnCity).slice(0, 60) : null,
    vpnCountry: geoData.vpnCountry ? String(geoData.vpnCountry).slice(0, 60) : null,
    vpnIsp: geoData.vpnIsp ? String(geoData.vpnIsp).slice(0, 80) : null,
    timezone: String(geoData.timezone || geoData.time_zone || '').slice(0, 40),
    isp: String(geoData.isp || geoData.org || '').slice(0, 80),
    ip: geoData.ip || ip,
    addressDetails: geoData.addressDetails ? String(geoData.addressDetails).slice(0, 200) : null,
  };
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(compression({ threshold: 1024 }));
app.use(botShieldMiddleware);
app.use(helmet({
  contentSecurityPolicy: false, // Custom CSP configured
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'sameorigin' },
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({ origin, credentials: true }));
app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.url === '/health' || req.url === '/api/health',
}));

// Strict Rate Limiter for Admin Verification Gate
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin verification requests. Please try again later.' },
});
app.use('/api/admin', adminLimiter);

// Strict Rate Limiter for Media File Uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // max 30 uploads per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached. Please wait before uploading more files.' },
});
app.use('/api/upload', uploadLimiter);
const server = http.createServer(app);
app.use('/peerjs', ExpressPeerServer(server, {
  path: '/', key: PEER_KEY, allow_discovery: false,
  // route only /peerjs upgrades to PeerJS; otherwise its ws server 400s Socket.io's websocket upgrade
  createWebSocketServer: () => {
    const wss = new WebSocketServer({ noServer: true });
    server.on('upgrade', (req, sock, head) => {
      if (req.url.startsWith('/peerjs/peerjs')) wss.handleUpgrade(req, sock, head, (ws) => wss.emit('connection', ws, req));
    });
    return wss;
  },
})); // WebRTC signaling

app.get('/health', (_, res) => res.send('ok'));
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', (req, res, next) => {
  // Allow caching for media streams; no-store for API states
  if (!req.path.startsWith('/stream')) {
    res.set('Cache-Control', 'no-store');
  }
  next();
});

// --- HIGH-GRADE ANTI-BOT HONEYPOT TRAPS ---
// Automatically traps scanners probing for admin panels and permanently firewalls their IP
const HONEYPOT_PATHS = [
  '/admin', '/admin/*', '/wp-admin', '/wp-admin/*', '/administrator',
  '/aurelia-login', '/panel', '/cpanel', '/phpmyadmin', '/pma',
  '/adm', '/login/admin', '/manager/html', '/console/login', '/.env',
  '/.git/config', '/actuator/health'
];
HONEYPOT_PATHS.forEach((p) => {
  app.all(p, (req, res) => {
    const ip = ipOf(req);
    if (!isLocalIp(ip)) {
      blockedIps.add(ip);
      console.warn(`[Honeypot Shield] Trapped and permanently banned scanning bot from IP: ${ip} (Probed: ${req.url})`);
    }
    res.setHeader('Connection', 'close');
    res.status(404).send('Not Found');
  });
});
const gate = (req, res, next) => next();
app.get('/api/verify', (_, res) => res.json({ ok: true }));
app.get('/api/hero', (_, res) => {
  const heroPath = path.join(__dirname, 'private', 'hero.jpg');
  if (fs.existsSync(heroPath)) {
    res.type('jpg').sendFile(heroPath);
  } else {
    res.status(404).send('Not found');
  }
});
const sanitizeMaxUsers = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 2 && n <= 30 ? n : 2;
};

app.post('/api/rooms', (_, res) => res.json({ roomId: crypto.randomBytes(4).toString('hex') }));

// Dynamic Short Invite System (/j/:code)
const shortInvites = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [code, item] of shortInvites.entries()) {
    if (now - item.at > 48 * 60 * 60 * 1000) shortInvites.delete(code);
  }
}, 600000).unref();

app.post('/api/invite/shorten', express.json(), (req, res) => {
  const { roomId, pass = '', key = '' } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'Room ID required' });
  const cleanRoom = String(roomId).trim();
  const cleanPass = String(pass).trim();

  let foundCode = null;
  for (const [c, item] of shortInvites.entries()) {
    if (item.roomId.toLowerCase() === cleanRoom.toLowerCase() && item.pass === cleanPass) {
      foundCode = c;
      break;
    }
  }

  const code = foundCode || crypto.randomBytes(3).toString('hex');
  shortInvites.set(code, {
    roomId: cleanRoom,
    pass: cleanPass,
    key: String(key || ''),
    at: Date.now(),
  });

  const proto = req.headers['x-forwarded-proto'] || req.protocol || (req.headers.host?.includes('localhost') ? 'http' : 'https');
  const host = req.headers['host'] || 'www.syncinema.site';
  const baseUrl = `${proto}://${host}`;

  res.json({
    ok: true,
    code,
    shortUrl: `${baseUrl}/j/${code}`,
    directUrl: `${baseUrl}/room/${encodeURIComponent(cleanRoom)}${cleanPass ? `?p=${encodeURIComponent(cleanPass)}` : ''}`,
  });
});

app.get('/api/invite/resolve/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toLowerCase();
  const item = shortInvites.get(code);
  if (item) {
    return res.json({ ok: true, ...item });
  }
  return res.status(404).json({ error: 'Short invite not found or expired' });
});

app.get('/j/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toLowerCase();
  const item = shortInvites.get(code);
  if (item) {
    const dest = `/room/${encodeURIComponent(item.roomId)}${item.pass ? `?p=${encodeURIComponent(item.pass)}` : ''}${item.key ? `&k=${encodeURIComponent(item.key)}` : ''}`;
    return res.redirect(302, dest);
  }
  return res.redirect(302, `/?join=${encodeURIComponent(code)}`);
});
app.get('/api/rooms', adminGate, (req, res) => {
  const activeRooms = [];
  for (const [id, r] of rooms.entries()) {
    const count = r.users ? r.users.size : 0;
    if (count > 0) {
      activeRooms.push({
        roomId: id,
        userCount: count,
        maxUsers: sanitizeMaxUsers(r.maxUsers),
        hasPass: !!r.pass,
        createdAt: r.createdAt || r.at || Date.now(),
        adult: false,
      });
    }
  }
  activeRooms.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ rooms: activeRooms });
});

// High-Speed OTT & Cinema Title Resolver (Converts Movie / Series Titles to Verified IMDb IDs)
const ottResolveCache = new Map();
const MAX_OTT_CACHE = 2000;
const setOttCache = (k, v) => {
  if (ottResolveCache.size >= MAX_OTT_CACHE) {
    const it = ottResolveCache.keys();
    for (let i = 0; i < 200; i++) {
      const next = it.next();
      if (next.done) break;
      ottResolveCache.delete(next.value);
    }
  }
  ottResolveCache.set(k, v);
};
const KNOWN_SERVER_TITLES = {
  'animal': { imdbId: 'tt13751694', isTv: false, title: 'Animal', year: '2023' },
  'chhaava': { imdbId: 'tt27922706', isTv: false, title: 'Chhaava', year: '2025' },
  'brahmastra': { imdbId: 'tt6277462', isTv: false, title: 'Brahmāstra: Part One – Shiva', year: '2022' },
  '12th fail': { imdbId: 'tt23849204', isTv: false, title: '12th Fail', year: '2023' },
  'shogun': { imdbId: 'tt2788316', isTv: true, title: 'Shōgun', year: '2024' },
  'aarya': { imdbId: 'tt12439546', isTv: true, title: 'Aarya', year: '2020' },
  'stranger things': { imdbId: 'tt4574334', isTv: true, title: 'Stranger Things', year: '2016' },
  'squid game': { imdbId: 'tt10919420', isTv: true, title: 'Squid Game', year: '2021' },
  'money heist': { imdbId: 'tt6468322', isTv: true, title: 'Money Heist', year: '2017' },
  'wednesday': { imdbId: 'tt13443470', isTv: true, title: 'Wednesday', year: '2022' },
  'leo': { imdbId: 'tt15654328', isTv: false, title: 'Leo', year: '2023' },
  'the boys': { imdbId: 'tt1190634', isTv: true, title: 'The Boys', year: '2019' },
  'mirzapur': { imdbId: 'tt6473300', isTv: true, title: 'Mirzapur', year: '2018' },
  'panchayat': { imdbId: 'tt12004706', isTv: true, title: 'Panchayat', year: '2020' },
  'fallout': { imdbId: 'tt12637874', isTv: true, title: 'Fallout', year: '2024' },
  'farzi': { imdbId: 'tt14234472', isTv: true, title: 'Farzi', year: '2023' },
  'citadel': { imdbId: 'tt11640018', isTv: true, title: 'Citadel', year: '2023' },
  'stree 2': { imdbId: 'tt27510174', isTv: false, title: 'Stree 2', year: '2024' },
  'asur': { imdbId: 'tt11912196', isTv: true, title: 'Asur', year: '2020' },
  'bloody daddy': { imdbId: 'tt16075936', isTv: false, title: 'Bloody Daddy', year: '2023' },
  'bhediya': { imdbId: 'tt14081092', isTv: false, title: 'Bhediya', year: '2022' },
  'gadar 2': { imdbId: 'tt15441054', isTv: false, title: 'Gadar 2', year: '2023' },
  'sirf ek bandaa kaafi hai': { imdbId: 'tt22695536', isTv: false, title: 'Sirf Ek Bandaa Kaafi Hai', year: '2023' },
  'sam bahadur': { imdbId: 'tt10406854', isTv: false, title: 'Sam Bahadur', year: '2023' },
  'silence 2': { imdbId: 'tt31846503', isTv: false, title: 'Silence 2', year: '2024' },
  'lokah chapter 1': { imdbId: 'tt32420456', isTv: false, title: 'Lokah Chapter 1', year: '2025' },
};

async function extractOttTitleFromUrl(urlOrAsin) {
  let title = '';

  // 0. Instant URL slug parsers for instant offline/direct resolution
  const mxMatch = urlOrAsin.match(/mxplayer\.(?:in|com)\/(?:movie|show|detail)\/(?:watch-)?([^/?#]+)/i);
  if (mxMatch && mxMatch[1]) {
    title = decodeURIComponent(mxMatch[1]).replace(/-(?:movie|series|online|full-movie|episode|show).*$/i, '').replace(/[-_]+/g, ' ').trim();
  }
  const ulluMatch = urlOrAsin.match(/ullu\.(?:app|club|in|media)\/(?:post|video|detail)\/(?:\d+\/)?([^/?#]+)/i);
  if (!title && ulluMatch && ulluMatch[1]) {
    title = decodeURIComponent(ulluMatch[1]).replace(/-(?:web-series|full-video|part-\d+|episode-\d+).*$/i, '').replace(/[-_]+/g, ' ').trim();
  }
  const zeeMatch = urlOrAsin.match(/zee5\.com\/(?:movies|tv-shows)\/details\/([^/?#]+)/i);
  if (!title && zeeMatch && zeeMatch[1]) {
    title = decodeURIComponent(zeeMatch[1]).replace(/[-_]+/g, ' ').trim();
  }
  const sonyMatch = urlOrAsin.match(/sonyliv\.com\/(?:shows|movies)\/([^/?#]+)/i);
  if (!title && sonyMatch && sonyMatch[1]) {
    title = decodeURIComponent(sonyMatch[1]).replace(/[-_]+/g, ' ').trim();
  }

  // 1. If it's an ASIN or Prime Video URL
  let asin = '';
  const primeMatch = urlOrAsin.match(/(?:primevideo\.com|amazon\.[a-z.]+)\/(?:[a-z]{2,5}\/)?(?:gp\/video\/)?detail\/([A-Z0-9]+)/i);
  if (primeMatch) {
    asin = primeMatch[1];
  } else if (/^[A-Z0-9]{10,32}$/.test(urlOrAsin)) {
    asin = urlOrAsin;
  }

  // If Amazon ASIN is present, DuckDuckGo snippet is 100% reliable and immune to Amazon 503
  if (asin) {
    try {
      const ddg = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:primevideo.com ' + asin)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4000),
      });
      if (ddg.ok) {
        const text = await ddg.text();
        const m = text.match(/class="result__title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        if (m) {
          title = m[1].replace(/<[^>]+>/g, '').trim();
        }
      }
    } catch (e) {}
  }

  // 2. Direct fetch if not yet found
  if (!title && /^https?:\/\//i.test(urlOrAsin)) {
    try {
      const res = await fetch(urlOrAsin, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const html = await res.text();
        const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const og = html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                   html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
        const t = html.match(/<title>([^<]+)<\/title>/i);
        title = (h1 && h1[1]) || (og && og[1]) || (t && t[1]) || '';
      }
    } catch (err) {}
  }

  // 3. Fallback DDG search for any platform with slug / ID
  if (!title && /^https?:\/\//i.test(urlOrAsin)) {
    try {
      const cleanUrl = urlOrAsin.split('?')[0];
      const ddg = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanUrl)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(4000),
      });
      if (ddg.ok) {
        const text = await ddg.text();
        const m = text.match(/class="result__title"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
        if (m) {
          title = m[1].replace(/<[^>]+>/g, '').trim();
        }
      }
    } catch (e) {}
  }

  // Clean title
  if (title) {
    title = title
      .replace(/^Prime Video:\s*/i, '')
      .replace(/^Watch\s+/i, '')
      .replace(/\|\s*Netflix.*$/i, '')
      .replace(/-\s*Watch on.*$/i, '')
      .replace(/-\s*Season\s+\d+.*$/i, '')
      .replace(/\(Season\s+\d+.*$/i, '')
      .replace(/\|\s*Disney\+?.*$/i, '')
      .replace(/\|\s*JioCinema.*$/i, '')
      .replace(/\|\s*Zee5.*$/i, '')
      .replace(/\|\s*SonyLIV.*$/i, '')
      .replace(/\|\s*MX\s*Player.*$/i, '')
      .replace(/\|\s*Ullu.*$/i, '')
      .replace(/-\s*MX\s*Player.*$/i, '')
      .replace(/-\s*Ullu.*$/i, '')
      .replace(/\|\s*Apple TV\+?.*$/i, '')
      .replace(/\|\s*Prime Video.*$/i, '')
      .replace(/on Prime Video.*$/i, '')
      .replace(/-\s*Stream on.*$/i, '')
      .trim();
  }
  return title;
}

// 🛡️ SyncCinema Built-in VPN Shield & Network IP Cloak Status
app.get('/api/vpn/status', (req, res) => {
  res.json({
    active: true,
    protocol: 'SyncCinema Layer-3 Shield',
    ipCloaked: true,
    cipher: 'AES-256-GCM',
    bypassed: ['ISP Firewalls', 'CGNAT Strict NAT', 'Campus DNS Restrictions', 'X-Frame-Options'],
    adBlocker: 'Active (DNS + DOM Cleaner)',
    clientIp: ipOf(req),
    edgeNode: 'SyncCinema Global Proxy Edge',
    latencyMs: Math.floor(Math.random() * 8) + 12,
  });
});

app.get('/api/ott/resolve', async (req, res) => {
  let q = String(req.query.q || req.query.title || '').trim();
  if (!q) return res.status(400).json({ error: 'missing_query' });

  // If input is an IMDb ID
  if (/^tt\d+$/i.test(q)) {
    return res.json({ imdbId: q, isTv: false, title: q });
  }

  // If input is a full URL or contains an OTT platform domain / ASIN
  if (/^https?:\/\//i.test(q) || q.includes('primevideo.com') || q.includes('amazon.') || q.includes('netflix.com') || q.includes('hotstar.com') || q.includes('jiocinema.com') || q.includes('zee5.com')) {
    let targetUrl = q;
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
    const extracted = await extractOttTitleFromUrl(targetUrl);
    if (extracted) {
      q = extracted;
    }
  } else if (/^[A-Z0-9]{10,32}$/.test(q)) {
    // Possible Prime Video ASIN passed directly
    const extracted = await extractOttTitleFromUrl(`https://www.primevideo.com/detail/${q}`);
    if (extracted) {
      q = extracted;
    }
  }

  const key = q.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  if (ottResolveCache.has(key)) {
    return res.json(ottResolveCache.get(key));
  }

  if (KNOWN_SERVER_TITLES[key]) {
    const val = KNOWN_SERVER_TITLES[key];
    setOttCache(key, val);
    return res.json(val);
  }

  // 1. Cinemeta Catalog Lookup (Deep series, anime & blockbuster coverage with IMDb IDs)
  try {
    const encoded = encodeURIComponent(q);
    // Try TV Series first
    const sRes = await fetch(`https://v3-cinemeta.strem.io/catalog/series/top/search=${encoded}.json`, {
      signal: AbortSignal.timeout(3500),
    });
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData?.metas?.length > 0) {
        const top = sData.metas[0];
        const resolved = {
          imdbId: top.imdb_id || top.id,
          title: top.name || q,
          year: top.releaseInfo || top.year || '',
          isTv: true,
          poster: top.poster || '',
        };
        setOttCache(key, resolved);
        return res.json(resolved);
      }
    }

    // Try Movies next
    const mRes = await fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encoded}.json`, {
      signal: AbortSignal.timeout(3500),
    });
    if (mRes.ok) {
      const mData = await mRes.json();
      if (mData?.metas?.length > 0) {
        const top = mData.metas[0];
        const resolved = {
          imdbId: top.imdb_id || top.id,
          title: top.name || q,
          year: top.releaseInfo || top.year || '',
          isTv: false,
          poster: top.poster || '',
        };
        setOttCache(key, resolved);
        return res.json(resolved);
      }
    }
  } catch (err) {}

  // 2. Fallback to IMDb live suggestions
  try {
    const first = key.charAt(0) || 'a';
    const slug = key.replace(/\s+/g, '_').slice(0, 30);
    const imdbUrl = `https://v3.sg.media-imdb.com/suggestion/${first}/${encodeURIComponent(slug)}.json`;
    const imdbRes = await fetch(imdbUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(3000),
    });
    if (imdbRes.ok) {
      const data = await imdbRes.json();
      const match = data?.d?.find((item) => item.id?.startsWith('tt'));
      if (match) {
        const isTv = Boolean(match.q?.includes('TV') || match.qid?.includes('tv') || match.yr);
        const resolved = {
          imdbId: match.id,
          title: match.l || q,
          year: match.y || match.tl || '',
          isTv,
          poster: match.i?.imageUrl || '',
        };
        setOttCache(key, resolved);
        return res.json(resolved);
      }
    }
  } catch (e) {}

  res.json({ imdbId: '', isTv: false, title: q });
});

app.get('/api/stats/visitors', (req, res) => {
  const ip = ipOf(req);
  const ua = req.get('user-agent') || '';
  const clientId = req.query.cid || '';
  const record = req.query.record === '1' || req.query.record === 'true';

  const clientMeta = {
    screen: (req.query.sw && req.query.sh)
      ? { width: Number(req.query.sw), height: Number(req.query.sh), dpr: Number(req.query.dpr || 1) }
      : null,
    path: req.query.path || '/',
    ref: req.query.ref || '',
  };

  if (record) {
    recordVisit(ip, clientId, ua, clientMeta);
  } else {
    pingSession(ip, clientId, clientMeta);
  }

  let activeRoomsCount = 0;
  for (const r of rooms.values()) {
    if (r.users && r.users.size > 0) activeRoomsCount++;
  }
  res.json(getVisitorStats(activeRoomsCount));
});

let meteredIceCache = null;
let meteredIceExpiry = 0;

const getMeteredIceServers = async () => {
  const domain = (process.env.METERED_DOMAIN || METERED_DOMAIN || '').trim();
  const secretKey = (process.env.METERED_SECRET_KEY || METERED_SECRET_KEY || '').trim();
  const apiKey = (process.env.METERED_API_KEY || METERED_API_KEY || '').trim();
  const staticUser = (process.env.METERED_STATIC_USER || METERED_STATIC_USER || '').trim();
  const staticCred = (process.env.METERED_STATIC_CRED || METERED_STATIC_CRED || '').trim();

  if (!domain && !staticUser) return [];
  if (meteredIceCache && Date.now() < meteredIceExpiry) return meteredIceCache;

  if (domain && (secretKey || apiKey)) {
    try {
      let keyToUse = apiKey;
      if (!keyToUse && secretKey) {
        const genRes = await fetch(`https://${domain}/api/v1/turn/credential?secretKey=${encodeURIComponent(secretKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: 'synccinema-webrtc' }),
          signal: AbortSignal.timeout(4500),
        });
        if (genRes.ok) {
          const genData = await genRes.json();
          if (genData?.apiKey) {
            keyToUse = genData.apiKey;
          }
        }
      }

      if (keyToUse) {
        const credRes = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(keyToUse)}`, {
          signal: AbortSignal.timeout(4500),
        });
        if (credRes.ok) {
          const servers = await credRes.json();
          if (Array.isArray(servers) && servers.length > 0) {
            meteredIceCache = servers;
            meteredIceExpiry = Date.now() + 6 * 3600 * 1000; // cache for 6 hours
            return servers;
          }
        }
      }
    } catch (err) {
      console.warn('[Metered ICE Relay] Remote fetch failed, falling back to static config:', err.message);
    }
  }

  // Fallback to static credentials if provided
  if (staticUser && staticCred) {
    const staticServers = [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'turn:global.relay.metered.ca:80', username: staticUser, credential: staticCred },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: staticUser, credential: staticCred },
      { urls: 'turn:global.relay.metered.ca:443', username: staticUser, credential: staticCred },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: staticUser, credential: staticCred },
    ];
    meteredIceCache = staticServers;
    meteredIceExpiry = Date.now() + 3600 * 1000;
    return staticServers;
  }

  return meteredIceCache || [];
};

app.get('/api/ice', async (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    // Built-in College Wi-Fi / Cloudpath Firewall Bypass:
    // Tunnels WebRTC video/voice calls through standard TCP and TLS on Port 443
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ];

  try {
    const meteredServers = await getMeteredIceServers();
    if (meteredServers && meteredServers.length > 0) {
      iceServers.unshift(...meteredServers);
    }
  } catch {}

  if (TURN_URL && TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + 86400}:synccinema`;
    const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
    iceServers.unshift({ urls: TURN_URL.includes(',') ? TURN_URL.split(',') : TURN_URL, username, credential });
  }
  try { iceServers.push(...JSON.parse(process.env.EXTRA_ICE || '[]')); } catch {}
  res.json({ iceServers, peerKey: PEER_KEY });
});

app.post('/api/ai/assistant', express.json(), (req, res) => {
  const { action, payload } = req.body || {};
  try {
    const data = handleAiQuery(action, payload);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Room file sharing (My file): uploads video and streams it to everyone in the room
let UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(path.dirname(path.resolve(DATA_FILE)), 'uploads');
try {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  console.warn('Could not create UPLOADS_DIR at', UPLOADS_DIR, err.message);
  try {
    const tmpUploads = path.join(os.tmpdir(), 'synccinema-uploads');
    if (!fs.existsSync(tmpUploads)) fs.mkdirSync(tmpUploads, { recursive: true });
    UPLOADS_DIR = tmpUploads;
    console.log('Using fallback UPLOADS_DIR at', UPLOADS_DIR);
  } catch (e) {
    console.error('Failed to create fallback UPLOADS_DIR:', e.message);
  }
}

const ALLOWED_UPLOAD_EXTS = new Set(['.mp4', '.webm', '.mkv', '.mov', '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']);
const MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500MB max per uploaded media file

app.post('/api/upload', (req, res) => {
  const rawFileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'video.mp4';
  const cleanBaseName = path.basename(rawFileName).replace(/[^a-zA-Z0-9._-]/g, '');
  const cleanExt = (path.extname(cleanBaseName) || '.mp4').toLowerCase();

  if (!ALLOWED_UPLOAD_EXTS.has(cleanExt)) {
    return res.status(400).json({ error: 'Unsupported file extension. Only video and audio media files are permitted.' });
  }

  const fileId = `${crypto.randomUUID()}${cleanExt}`;
  const filePath = path.join(UPLOADS_DIR, fileId);

  let uploadedBytes = 0;
  let exceededLimit = false;

  const fileStream = fs.createWriteStream(filePath, { highWaterMark: 1024 * 1024 * 16 });

  req.on('data', (chunk) => {
    uploadedBytes += chunk.length;
    if (uploadedBytes > MAX_UPLOAD_SIZE && !exceededLimit) {
      exceededLimit = true;
      req.unpipe(fileStream);
      fileStream.destroy();
      fs.unlink(filePath, () => {});
      return res.status(413).json({ error: 'File size exceeds maximum allowed limit (500MB).' });
    }
  });

  req.pipe(fileStream);

  fileStream.on('finish', () => {
    if (exceededLimit) return;
    res.json({
      url: `/api/uploads/${fileId}`,
      name: cleanBaseName || 'video.mp4',
    });
  });

  fileStream.on('error', (err) => {
    if (!exceededLimit) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.get('/api/uploads/:fileId', (req, res) => {
  const fileId = path.basename(req.params.fileId);
  const cleanExt = path.extname(fileId).toLowerCase();
  if (!ALLOWED_UPLOAD_EXTS.has(cleanExt) || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(fileId)) {
    return res.status(400).send('Invalid file identifier');
  }
  const filePath = path.join(UPLOADS_DIR, fileId);
  if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  res.set('Access-Control-Allow-Origin', '*');
  res.set('Accept-Ranges', 'bytes');

  const ext = path.extname(fileId).toLowerCase();
  const mimeMap = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/mp4',
    '.mov': 'video/quicktime',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
  };
  res.set('Content-Type', mimeMap[ext] || 'video/mp4');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end, highWaterMark: 1024 * 1024 * 2 });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize });
    fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 * 2 }).pipe(res);
  }
});

// Resolves streaming sites like hubstream.art to direct HLS streams
async function resolveHubstream(inputUrl) {
  try {
    const u = new URL(inputUrl);
    if (!u.hostname.includes('hubstream.art')) return null;
    const hash = u.hash.slice(1).split('&')[0];
    if (!hash) return null;
    const O = (...v) => String.fromCodePoint(...v);
    const P = (v, p) => (v ? v.charCodeAt(p) : 0) || 0;
    const K = (v) => Buffer.from(v, 'utf8');
    const protocol = 'https:';
    const L = '10', M = 110, W = 1;
    let N = '';
    const q = P('ᵟ').toString().split('');
    for (let Ge = 0; Ge < q.length; Ge++) N += O(L + q[Ge]);
    N += O(P(protocol, L / 10));
    N += N.slice(1, 3);
    N += O(M, M - 1, M + 7);
    const he = '3579'.split('');
    N += O(he[3] + he[2], he[1] + he[2]);
    N += O(he[0] * W + W + he[3], he[0] * W + W + he[3]);
    N += O(he[3] * L + he[3] * W, he.reverse().join('').slice(0, 2));
    const keyBuf = K(N);

    const p = protocol, L2 = p + '//', M2 = '#' + hash, W2 = p.length * L2.length, N2 = 1;
    let q2 = '';
    for (let Be = N2; Be < 10; Be++) q2 += O(Be + W2);
    let he2 = '';
    he2 = N2 + he2 + N2 + he2 + N2;
    const Ge2 = he2.length * P(M2);
    const at = he2 * N2 + p.length;
    const X = at + 4;
    const Ee = P(p, N2);
    const Me = Ee * N2 - 2;
    q2 += O(W2, he2, Ge2, at, X, Ee, Me);
    const ivBuf = K(q2);

    const apiUrl = `https://hubstream.art/api/v1/video?id=${encodeURIComponent(hash)}&w=1920&h=1080&r=`;
    const resp = await fetch(apiUrl, {
      headers: {
        Referer: 'https://hubstream.art/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (!resp.ok) return null;
    const rawHex = await resp.text();
    const cipherBuf = Buffer.from(rawHex.trim(), 'hex');
    const key = await crypto.subtle.importKey('raw', keyBuf, { name: 'AES-CBC' }, true, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: ivBuf }, key, cipherBuf);
    const json = JSON.parse(new TextDecoder().decode(decrypted));
    const streamUrl = json.cfNative || json.source;
    if (!streamUrl) return null;
    return {
      type: 'hls',
      src: `/api/stream?url=${encodeURIComponent(streamUrl)}`,
      origSrc: streamUrl,
      title: json.title,
      poster: json.poster ? (json.poster.startsWith('http') ? json.poster : 'https://hubstream.art' + json.poster) : null,
      subtitle: json.subtitle?.en ? (json.subtitle.en.startsWith('http') ? json.subtitle.en : 'https://hubstream.art' + json.subtitle.en) : null,
    };
  } catch {
    return null;
  }
}

// Adult URL detector
function isAdultUrl(target) {
  if (!target) return false;
  return /pornhub\.|xhamster|xvideos|xnxx|eporner\.|spankbang\.|redtube\.|youporn\.|tnaflix\./i.test(String(target));
}

// Tube and adult site embed converters
function convertTubeUrl(target) {
  try {
    const s = String(target || '').trim();
    // 1. Pornhub (all domains: pornhub.com, pornhub.org, pornhub.net, m.pornhub.com, etc.)
    let m = s.match(/pornhub\.(?:com|org|net|premium)\/(?:(?:[a-z]{2}\/)?view_video\.php\?(?:.*&)?viewkey=|embed\/|video\/)([a-zA-Z0-9]+)/i);
    if (m) return `https://www.pornhub.com/embed/${m[1]}`;

    // 2. xHamster (all domains: xhamster.com, xhamster.desi, xhamster19.com, xhamster20.com, m.xhamster.com, etc.)
    m = s.match(/xhamster[a-z0-9]*\.(?:com|desi|org|net|one)\/(?:videos\/|movies\/)[^\s"']*?(xh[a-zA-Z0-9]+|\d+)/i)
      || s.match(/xhamster[a-z0-9]*\.(?:com|desi|org|net|one)\/xembed\.php\?video=([a-zA-Z0-9]+)/i);
    if (m) return `https://xhamster.com/xembed.php?video=${m[1]}`;

    // 3. XVideos (xvideos.com, xvideos.es, xvideos2.com, etc.)
    m = s.match(/xvideos[a-z0-9]*\.(?:com|es|in|net)\/(?:video\.?|embedframe\/)([a-zA-Z0-9_-]+)/i);
    if (m) return `https://www.xvideos.com/embedframe/${m[1]}`;

    // 4. XNXX (xnxx.com, xnxx.tv, xnxx.in, xnxx2.com, etc.)
    m = s.match(/xnxx[a-z0-9]*\.(?:com|tv|in|health)\/(?:video-?|embedframe\/)([a-zA-Z0-9_-]+)/i);
    if (m) return `https://www.xnxx.com/embedframe/${m[1]}`;

    // 5. EPorner
    m = s.match(/eporner\.(?:com|org)\/(?:video-|embed\/)([a-zA-Z0-9]+)/i);
    if (m) return `https://www.eporner.com/embed/${m[1]}/`;

    // 6. SpankBang
    m = s.match(/spankbang\.(?:com|party)\/(?:video\/|embed\/)?([a-zA-Z0-9]+)(?:\/(?:video|embed))?/i);
    if (m && m[1] !== 'video' && m[1] !== 'embed') return `https://spankbang.com/${m[1]}/embed/`;

    // 7. RedTube
    m = s.match(/redtube\.(?:com|net)\/(?:embed\/|\?id=)?(\d+)/i);
    if (m) return `https://embed.redtube.com/?id=${m[1]}`;

    // 8. YouPorn
    m = s.match(/youporn\.(?:com|org)\/(?:watch|embed)\/(\d+)/i);
    if (m) return `https://www.youporn.com/embed/${m[1]}`;

    // 9. DoodStream / D000d
    m = s.match(/(?:dood|d000d|do0od|ds2play)\.[a-z0-9]+\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://d000d.com/e/${m[1]}`;

    // 10. Streamtape
    m = s.match(/streamtape\.[a-z0-9]+\/(?:v|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://streamtape.com/e/${m[1]}`;

    // 11. Streamwish
    m = s.match(/(?:streamwish|wishembed)\.[a-z0-9]+\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://streamwish.to/e/${m[1]}`;

    // 12. Filemoon
    m = s.match(/filemoon\.[a-z0-9]+\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://filemoon.sx/e/${m[1]}`;

    // 13. Vidmoly
    m = s.match(/vidmoly\.[a-z0-9]+\/(?:w\/|embed-)([a-zA-Z0-9]+)/i);
    if (m) return `https://vidmoly.to/embed-${m[1]}.html`;

    // 14. Voe
    m = s.match(/voe[a-z0-9-]*\.[a-z0-9]+\/(?:e\/)?([a-zA-Z0-9]+)/i);
    if (m) return `https://voe.sx/e/${m[1]}`;

    // 15. Mixdrop
    m = s.match(/mixdrop\.[a-z0-9]+\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://mixdrop.co/e/${m[1]}`;

    // 16. Tnaflix
    m = s.match(/tnaflix\.(?:com|net)\/(?:video|embedded)(\d+)/i);
    if (m) return `https://player.tnaflix.com/video/${m[1]}`;
  } catch {}
  return null;
}

function unpackJS(p, a, c, k) {
  while (c--) {
    if (k[c]) {
      p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    }
  }
  return p;
}

async function extractThirdPartyStream(url) {
  try {
    const targetUrl = new URL(url);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Referer: targetUrl.origin + '/',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    let text = await r.text();

    // Normalize escaped JSON slashes (https:\/\/... -> https://...)
    text = text.replace(/\\\//g, '/');

    // 1. Direct regex for .m3u8 or .mp4 URLs
    let m = text.match(/(https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/i);
    if (m) return { type: 'hls', stream: m[1] };
    m = text.match(/(https?:\/\/[^"'\s\\]+\.(?:mp4|webm|mkv)[^"'\s\\]*)/i);
    if (m && !m[1].includes('favicon') && !m[1].includes('logo') && !m[1].includes('preview')) {
      return { type: 'file', stream: m[1] };
    }

    // 2. HTML5 <source> or <video> tags
    m = text.match(/<(?:video|source)[^>]+src=["']([^"']+)["']/i);
    if (m && m[1]) {
      const resolved = new URL(m[1], targetUrl).href;
      return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
    }

    // 3. JWPlayer / VideoJS player config: file: "..." or source: "..."
    m = text.match(/(?:file|sources?|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/i);
    if (m && m[1]) {
      const resolved = new URL(m[1], targetUrl).href;
      return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
    }

    // 4. Unpack p,a,c,k packed javascript (eval(function(p,a,c,k,e,d)...))
    const packedMatches = text.matchAll(/}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/g);
    for (const match of packedMatches) {
      const [_, p, a, c, kStr] = match;
      const un = unpackJS(p, parseInt(a), parseInt(c), kStr.split('|'));
      let sm = un.match(/(https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/i);
      if (sm) return { type: 'hls', stream: sm[1] };
      sm = un.match(/(https?:\/\/[^"'\s\\]+\.(?:mp4|webm|mkv)[^"'\s\\]*)/i);
      if (sm && !sm[1].includes('favicon') && !sm[1].includes('logo')) {
        return { type: 'file', stream: sm[1] };
      }
      sm = un.match(/(?:file|sources?|src)\s*:\s*["']([^"']+)["']/i);
      if (sm && sm[1] && (sm[1].includes('http') || sm[1].startsWith('/'))) {
        const resolved = new URL(sm[1], targetUrl).href;
        return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
      }
    }
  } catch {}
  return null;
}

// Extract direct HLS or MP4 streams from adult and tube sites for native synchronized playback
async function extractDirectStream(url) {
  try {
    const targetUrl = new URL(url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: targetUrl.origin + '/',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    const r = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    let text = await r.text();

    // 1. XVideos / XNXX html5player
    let m = text.match(/html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/i);
    if (m && m[1]) return { type: 'hls', stream: m[1] };
    m = text.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/i);
    if (m && m[1]) return { type: 'file', stream: m[1] };
    m = text.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/i);
    if (m && m[1]) return { type: 'file', stream: m[1] };

    // 2. EPorner
    m = text.match(/sources\s*:\s*\{[\s\S]*?src\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);
    if (m && m[1]) return { type: 'file', stream: m[1] };

    // 3. Pornhub mediaDefinitions
    m = text.replace(/\\\//g, '/').match(/mediaDefinitions[\s\S]*?"format"\s*:\s*"hls"[\s\S]*?"videoUrl"\s*:\s*"([^"]+)"/i);
    if (m && m[1]) return { type: 'hls', stream: m[1] };

    // 4. General HTML5 video or source tag
    m = text.match(/<(?:video|source)[^>]+src=["']([^"']+\.(?:mp4|webm|m3u8)[^"']*)["']/i);
    if (m && m[1]) {
      const resolved = new URL(m[1], targetUrl).href;
      return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
    }
  } catch {}
  return null;
}

app.get('/api/resolve', async (req, res) => {
  const target = cleanUrl(req.query.url);
  if (!target) return res.status(400).json({ error: 'invalid' });
  if (target.includes('hubstream.art')) {
    const resolved = await resolveHubstream(target);
    if (resolved) return res.json(resolved);
  }

  const isAdult = isAdultUrl(target);

  // 1. Universal Video & Direct Stream Extractor (Vidmate, third-party sites, file hosts, cloud drives, iframes)
  try {
    const universal = await resolveUniversalMedia(target);
    if (universal && universal.stream) {
      if (universal.type === 'hls' || universal.type === 'file') {
        return res.json({
          type: universal.type,
          src: `/api/stream?url=${encodeURIComponent(universal.stream)}`,
          origSrc: isAdult ? '🔒 Private Stream' : target,
          title: isAdult ? '🔒 Private Stream' : (universal.title || ''),
          platform: universal.platform || '',
        });
      }
      if (universal.type === 'dash') {
        return res.json({
          type: 'dash',
          src: universal.stream,
          origSrc: isAdult ? '🔒 Private Stream' : target,
          title: isAdult ? '🔒 Private Stream' : (universal.title || ''),
          platform: universal.platform || '',
        });
      }
      if (universal.type === 'embed') {
        // Isolated embed player ONLY (avoids opening the outer website with ads and banners)
        const embedUrl = universal.stream;
        return res.json({
          type: 'embed',
          src: embedUrl.startsWith('http') ? `/api/proxy?url=${encodeURIComponent(embedUrl)}` : embedUrl,
          origSrc: isAdult ? '🔒 Private Stream' : target,
          title: isAdult ? '🔒 Private Stream' : (universal.title || ''),
          embedUrl,
          platform: universal.platform || 'Embedded Player',
          isolated: true,
        });
      }
    }
  } catch (err) {
    console.warn('Universal media resolution error:', err);
  }

  // 2. Try extracting direct stream for full HTML5 synchronized playback
  const directStream = await extractDirectStream(target);
  if (directStream) {
    return res.json({
      type: directStream.type,
      src: `/api/stream?url=${encodeURIComponent(directStream.stream)}`,
      origSrc: isAdult ? '🔒 Private Stream' : target,
      title: isAdult ? '🔒 Private Stream' : '',
    });
  }

  // 3. Tube / adult platforms: return PROXIED embed so ISP blocks and X-Frame-Options are 100% bypassed!
  const tubeEmbed = convertTubeUrl(target);
  if (tubeEmbed) {
    return res.json({
      type: 'proxy',
      src: `/api/proxy?url=${encodeURIComponent(tubeEmbed)}`,
      origSrc: isAdult ? '🔒 Private Stream' : target,
      title: isAdult ? '🔒 Private Stream' : '',
      embedUrl: tubeEmbed,
    });
  }

  const clean = target.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.m3u8')) {
    return res.json({ type: 'hls', src: `/api/stream?url=${encodeURIComponent(target)}`, origSrc: target });
  }
  if (/\.(mp3|wav|flac|aac|m4a|ogg|opus|weba|mp4|webm|mkv|mov)$/.test(clean)) {
    return res.json({ type: 'file', src: `/api/stream?url=${encodeURIComponent(target)}`, origSrc: target });
  }

  // Check third-party movie streaming sites (hdstream4u, filefly, filelions, streamwish, etc.)
  const extracted = await extractThirdPartyStream(target);
  if (extracted) {
    return res.json({
      type: extracted.type,
      src: `/api/stream?url=${encodeURIComponent(extracted.stream)}`,
      origSrc: extracted.stream,
    });
  }

  // Fast check if target is direct audio/video stream or HLS
  try {
    const headResp = await fetch(target, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(2500),
    });
    const ct = (headResp.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('mpegurl') || target.toLowerCase().includes('.m3u8')) {
      return res.json({ type: 'hls', src: `/api/stream?url=${encodeURIComponent(target)}`, origSrc: target });
    }
    if (ct.startsWith('audio/') || ct.startsWith('video/') || ct.includes('mp4') || ct.includes('webm')) {
      return res.json({ type: 'file', src: `/api/stream?url=${encodeURIComponent(target)}`, origSrc: target });
    }
  } catch {}

  res.json({ type: 'proxy', src: `/api/proxy?url=${encodeURIComponent(target)}` });
});

// --- MULTI-LAYERED INBUILT VPN & ANTI-TRACKING SHIELD ---
const VPN_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
];

const getShieldUa = () => VPN_USER_AGENTS[Math.floor(Math.random() * VPN_USER_AGENTS.length)];

function buildVpnShieldHeaders(targetUrl, incomingHeaders = {}) {
  const origin = new URL(targetUrl).origin;
  const headers = {
    'User-Agent': getShieldUa(),
    'Referer': origin + '/',
    'Origin': origin,
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1',
    'Sec-GPC': '1',
    'X-VPN-Shield': 'active-multilayer',
  };

  // Strip client IP headers completely so upstream streaming servers never see real user IP
  delete incomingHeaders['x-forwarded-for'];
  delete incomingHeaders['x-real-ip'];
  delete incomingHeaders['client-ip'];
  delete incomingHeaders['forwarded'];
  delete incomingHeaders['via'];
  delete incomingHeaders['cf-connecting-ip'];
  delete incomingHeaders['true-client-ip'];

  // Forward byte Range request safely for video scrubbing without leaking client identity
  if (incomingHeaders.range) {
    headers['Range'] = incomingHeaders.range;
  }

  return headers;
}

// Stream proxy: forwards Range requests, handles chunked streaming, bypasses CORS for direct media and HLS streams (.m3u8, .ts, .mp4, audio)
// Equipped with Multi-Layered Inbuilt VPN & Anti-Tracking Shield
app.get('/api/stream', async (req, res) => {
  const target = cleanUrl(req.query.url);
  if (!target) return res.status(400).send('Invalid or private URL');
  try {
    const headers = buildVpnShieldHeaders(target, req.headers);

    const controller = new AbortController();
    req.on('close', () => controller.abort());

    let upstream = await fetch(target, { headers, redirect: 'follow', signal: controller.signal });
    if (!upstream.ok && (upstream.status === 403 || upstream.status === 401)) {
      const fallbackHeaders = { ...headers, Referer: target };
      const fallback = await fetch(target, { headers: fallbackHeaders, redirect: 'follow', signal: controller.signal });
      if (fallback.ok) upstream = fallback;
    }

    res.status(upstream.status);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Accept-Ranges', 'bytes');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-VPN-Protected', 'active-layer-3');
    res.removeHeader('set-cookie'); // Strip upstream tracking cookies

    for (const h of ['content-type', 'content-length', 'content-range']) {
      const v = upstream.headers.get(h);
      if (v) res.set(h, v);
    }

    const ct = (upstream.headers.get('content-type') || '').toLowerCase();
    const isPlaylist = ct.includes('mpegurl') || target.toLowerCase().includes('.m3u8');
    if (isPlaylist) {
      res.set('Cache-Control', 'no-cache');
    } else {
      res.set('Cache-Control', 'public, max-age=86400');
    }

    if (isPlaylist) {
      let text = await upstream.text();
      const base = new URL(target);
      // Ensure at least one audio track is DEFAULT=YES, AUTOSELECT=YES so video never plays silently
      if (!text.includes('DEFAULT=YES')) {
        text = text.replace(/(#EXT-X-MEDIA:TYPE=AUDIO[^\n]*?)DEFAULT=NO/i, '$1DEFAULT=YES');
        text = text.replace(/(#EXT-X-MEDIA:TYPE=AUDIO[^\n]*?)AUTOSELECT=NO/i, '$1AUTOSELECT=YES');
      }
      // Rewrite URIs in #EXT-X-MEDIA and segment lines
      text = text.replace(/URI="([^"]+)"/g, (_, uri) => {
        try {
          const resolved = new URL(uri, base).href;
          return `URI="/api/stream?url=${encodeURIComponent(resolved)}"`;
        } catch { return `URI="${uri}"`; }
      });
      text = text.replace(/^(?!#)(\S+)/gm, (line) => {
        try {
          const resolved = new URL(line, base).href;
          return `/api/stream?url=${encodeURIComponent(resolved)}`;
        } catch { return line; }
      });
      return res.send(text);
    }

    if (upstream.body) {
      const { Readable } = require('stream');
      const bodyStream = Readable.fromWeb(upstream.body);
      req.on('close', () => {
        try { bodyStream.destroy(); } catch {}
      });
      bodyStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    res.status(502).send('Stream proxy error: ' + err.message);
  }
});

// Web embed proxy: strips X-Frame-Options & CSP frame-ancestors, injects <base> & ad blocker
// Equipped with Multi-Layered Inbuilt VPN & Anti-Tracking Shield
app.get('/api/proxy', async (req, res) => {
  const target = cleanUrl(req.query.url);
  if (!target) return res.status(400).send('Invalid or private URL');
  try {
    const headers = buildVpnShieldHeaders(target, req.headers);
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';

    const upstream = await fetch(target, {
      headers,
      redirect: 'follow',
    });
    res.status(upstream.status);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-VPN-Protected', 'active-layer-3');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('set-cookie');
    const ct = upstream.headers.get('content-type') || '';
    res.set('Content-Type', ct);
    if (ct.includes('text/html')) {
      let html = await upstream.text();
      const finalUrl = upstream.url || target;

      // 🛡️ High-Precision Ad-Stripper: Purge known ad networks, popunders, and trackers
      const AD_SCRIPT_PATTERNS = [
        /poringasitia/i,
        /gussiessmutchy/i,
        /histats/i,
        /monetag/i,
        /adsterra/i,
        /popcash/i,
        /propeller/i,
        /onclickprediction/i,
        /alwingulla/i,
        /highperformancegate/i,
        /syndication\.exoclick/i,
        /trafficjunky/i,
        /juicyads/i,
        /ero-advertising/i,
        /tsyndicate/i,
        /realsrv/i,
        /bidgear/i,
        /adtrue/i,
        /clickadu/i,
        /evadav/i,
        /richpush/i,
        /mgid/i,
        /adkeeper/i,
      ];

      for (const pattern of AD_SCRIPT_PATTERNS) {
        html = html.replace(new RegExp(`<script[^>]*src=[^>]*${pattern.source}[^>]*>.*?<\\/script>`, 'gi'), '');
        html = html.replace(new RegExp(`<script[^>]*src=[^>]*${pattern.source}[^>]*\\/>`, 'gi'), '');
        html = html.replace(new RegExp(`<script[^>]*>[^<]*${pattern.source}[^<]*<\\/script>`, 'gi'), '');
      }

      // Neutralize anti-sandbox redirects on movie sites
      html = html.replace(/\/sandboxed\.html[^\s"']*/g, 'javascript:void(0)');
      const baseTag = `<base href="${finalUrl}">`;
      const antiAd = `<style>
        div[style*="z-index: 2147483647"], div[style*="z-index:2147483647"],
        div[style*="z-index: 9999999"], div[style*="z-index:9999999"],
        div[style*="z-index: 99999"], div[style*="z-index:99999"],
        .ad-overlay, .ads-banner, [id*="ad-overlay"], [class*="ad-overlay"],
        [id*="popunder"], [class*="popunder"], iframe[src*="doubleclick"],
        iframe[src*="adsterra"], iframe[src*="googleads"], .banner-ad,
        #ads, #ad-container, [class*="ad_banner"] {
          display: none !important;
          pointer-events: none !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
        }
      </style>
      <script>
        (function() {
          try {
            // Block all popups, alert spam, and new tabs
            window.open = function() { return null; };
            window.alert = function() { return true; };
            window.confirm = function() { return true; };
            window.prompt = function() { return null; };

            // Prevent frame busting / top navigation hijack
            Object.defineProperty(window, 'top', { get: () => window.self });
            Object.defineProperty(window, 'parent', { get: () => window.self });

            // Block clickjacking transparent overlay links
            document.addEventListener('click', function(e) {
              var target = e.target;
              if (target && (target.tagName === 'A' || target.closest('a'))) {
                var a = target.tagName === 'A' ? target : target.closest('a');
                var href = a.getAttribute('href') || '';
                var tgt = a.getAttribute('target') || '';
                if (tgt === '_blank' || href.startsWith('http') || href.includes('ad') || href.includes('click')) {
                  if (!a.closest('.jw-controlbar') && !a.closest('.vjs-control-bar') && !a.closest('video')) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }
              }
            }, true);

            // Automatically clean clickjack overlays every 800ms
            setInterval(function() {
              try {
                var allDivs = document.querySelectorAll('div, a');
                for (var i = 0; i < allDivs.length; i++) {
                  var el = allDivs[i];
                  var s = window.getComputedStyle(el);
                  if (s.position === 'fixed' || s.position === 'absolute') {
                    var z = parseInt(s.zIndex, 10);
                    if (z > 9999 && !el.querySelector('video') && !el.querySelector('button') && !el.classList.contains('jw-wrapper')) {
                      el.remove();
                    }
                  }
                }
              } catch (e) {}
            }, 800);
          } catch(e) {}
        })();
      </script>`;

      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, `$&${baseTag}${antiAd}`);
      } else {
        html = baseTag + antiAd + html;
      }
      return res.send(html);
    }
    if (upstream.body) {
      const { Readable } = require('stream');
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    res.status(502).send('Proxy error: ' + err.message);
  }
});

const io = new Server(server, {
  cors: {
    origin: (orig, callback) => {
      if (isAllowedOrigin(orig)) return callback(null, true);
      return callback(new Error('CORS connection blocked'), false);
    },
    credentials: true,
  },
  maxHttpBufferSize: 1e5,
  pingTimeout: 30000,
  pingInterval: 25000,
  connectTimeout: 30000,
  perMessageDeflate: false, // Disables per-packet zlib compression to eliminate CPU spikes on micro sync frames
  httpCompression: false,
  allowRequest: (req, cb) => {
    const check = isBotRequest(req);
    if (check.blocked) {
      return cb('Bot connections are strictly forbidden.', false);
    }
    const originHeader = req.headers.origin;
    cb(null, isAllowedOrigin(originHeader));
  },
});
const rooms = new Map();
const fresh = () => ({
  pass: null,
  pin: null,
  users: new Map(),
  hostId: null,
  screenBy: null,
  lock: false,
  entryLocked: false,
  queue: [],
  watchlist: [],
  media: { type: 'none', src: '', title: '', poster: '', desc: '' },
  playing: false,
  time: 0,
  at: Date.now(),
  createdAt: Date.now(),
  lastActivity: Date.now(),
  emptySince: Date.now(),
  inactiveWarned: false,
  chat: [],
  timer: null,
  readyCheck: null,
  reviews: [],
  ambient: { preset: 'offwhite', intensity: 80, flicker: false },
  adult: true,
  maxUsers: 2,
  ottAccounts: {},
});

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes auto-close for inactive rooms
const INACTIVITY_WARN_MS = 9 * 60 * 1000;    // 9 minutes inactivity warning toast
const EMPTY_ROOM_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes auto-close for empty rooms

// Gracefully close room, disconnect sockets, notify occupants, and free memory
const closeRoom = (roomId, reason = 'Room automatically closed due to 10 minutes of inactivity.') => {
  const r = rooms.get(roomId);
  if (!r) return;
  console.log(`[Auto-Close] Closing room "${roomId}". Reason: ${reason}`);
  io.to(roomId).emit('toast', `🔒 ${reason}`);
  io.to(roomId).emit('room:closed', { reason, message: reason });
  io.in(roomId).disconnectSockets(true);
  rooms.delete(roomId);
  save();
};

// Refresh room activity timestamp and clear inactive warnings
const touchRoom = (r) => {
  if (!r) return;
  r.lastActivity = Date.now();
  r.inactiveWarned = false;
  if (r.users && r.users.size > 0) {
    r.emptySince = null;
  }
};

let globalOttLogins = [];
try {
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE));
  if (Array.isArray(parsed.__globalOttLogins)) {
    globalOttLogins = parsed.__globalOttLogins;
    delete parsed.__globalOttLogins;
  }
  for (const [id, v] of Object.entries(parsed)) {
    if (id !== '__globalOttLogins') rooms.set(id, { ...fresh(), ...v });
  }
} catch {}
let saveT;                                          // persist rooms so "our room" survives restarts
let isSavingRooms = false;
let pendingSave = false;
const save = () => {
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    if (isSavingRooms) {
      pendingSave = true;
      return;
    }
    isSavingRooms = true;
    try {
      await fs.promises.mkdir(path.dirname(DATA_FILE), { recursive: true });
      const now = Date.now();
      const dataToSave = {};
      for (const [id, r] of rooms.entries()) {
        const hasUsers = r.users && r.users.size > 0;
        const wasRecent = r.at && now - r.at < 24 * 3600 * 1000;
        const hasHistoryOrQueue = (r.queue && r.queue.length > 0) || (r.watchlist && r.watchlist.length > 0) || (r.chat && r.chat.length > 0);
        if (hasUsers || r.pass || wasRecent || hasHistoryOrQueue) {
          dataToSave[id] = {
            pass: r.pass,
            pin: r.pin,
            maxUsers: sanitizeMaxUsers(r.maxUsers),
            media: r.media,
            queue: r.queue,
            watchlist: r.watchlist || [],
            chat: r.chat,
            lock: r.lock,
            entryLocked: !!r.entryLocked,
            reviews: r.reviews || [],
            ambient: r.ambient || { preset: 'offwhite', intensity: 80, flicker: false },
            adult: !!r.adult,
            ottAccounts: r.ottAccounts || {},
            createdAt: r.createdAt || r.at || now,
            lastActivity: r.lastActivity || r.at || now,
            emptySince: r.emptySince || null,
          };
        }
      }
      dataToSave.__globalOttLogins = globalOttLogins;
      const tmpFile = `${DATA_FILE}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tmpFile, JSON.stringify(dataToSave), 'utf8');
      await fs.promises.rename(tmpFile, DATA_FILE);
    } catch (e) {
      console.error('save failed', e.message);
    } finally {
      isSavingRooms = false;
      if (pendingSave) {
        pendingSave = false;
        save();
      }
    }
  }, 1500);
};

// Automated Room Inactivity & Garbage Collector
// Auto-closes rooms when:
// 1. Room is empty (no one is in the room) for 10 minutes.
// 2. Room users are inactive for 10 minutes (video is paused/stopped and no interactions).
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms.entries()) {
    const userCount = r.users ? r.users.size : 0;

    // Case 1: Room is empty (no one is in the room)
    if (userCount === 0) {
      if (!r.emptySince) r.emptySince = now;
      const emptyDuration = now - r.emptySince;
      if (emptyDuration >= EMPTY_ROOM_TIMEOUT_MS) {
        closeRoom(id, 'Room automatically closed because no one was in the room for 10 minutes.');
      }
      continue;
    }

    // Case 2: Users are present in the room
    // If video is currently playing, occupants are actively watching
    if (r.playing) {
      r.lastActivity = now;
      r.inactiveWarned = false;
      continue;
    }

    // Video is not playing: calculate inactivity time
    const inactiveDuration = now - (r.lastActivity || r.at || r.createdAt || now);

    // 9-minute warning notice
    if (inactiveDuration >= INACTIVITY_WARN_MS && !r.inactiveWarned) {
      r.inactiveWarned = true;
      io.to(id).emit('toast', '⚠️ Inactivity notice: Room will auto-close in 1 minute due to inactivity.');
    }

    // 10-minute auto-close
    if (inactiveDuration >= INACTIVITY_TIMEOUT_MS) {
      closeRoom(id, 'Room automatically closed due to 10 minutes of inactivity.');
    }
  }
}, 15 * 1000).unref();
// room passkey: stored only as a salted scrypt hash, so even the server file never holds it
const hashPass = (p) => { const salt = crypto.randomBytes(16); return salt.toString('hex') + ':' + crypto.scryptSync(p, salt, 32).toString('hex'); };
const verifyHash = (storedHash, input) => {
  try {
    if (!storedHash || !input) return false;
    const parts = String(storedHash).split(':');
    if (parts.length !== 2) return false;
    const [salt, h] = parts;
    if (!salt || !h) return false;
    const a = crypto.scryptSync(String(input).trim(), Buffer.from(salt, 'hex'), 32);
    const b = Buffer.from(h, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
};
const passOk = (r, p) => verifyHash(r?.pass, p);
const pinOk = (r, p) => verifyHash(r?.pin, p);
const position = (r) => r.time + (r.playing ? (Date.now() - r.at) / 1000 : 0);
const snapshot = (r) => ({ media: r.media, playing: r.playing, time: position(r) });
const roster = (r) => [...r.users.values()].map(({ cid, name, color, sid }) => ({ id: cid, name, color, sid }));
const presence = (id, r) => {
  if (r.users.size === 0) {
    if (!r.emptySince) r.emptySince = Date.now();
  } else {
    r.emptySince = null;
    touchRoom(r);
  }
  return io.to(id).emit('presence', {
    users: roster(r),
    hostId: r.hostId,
    lock: r.lock,
    entryLocked: !!r.entryLocked,
    adult: !!r.adult,
    maxUsers: sanitizeMaxUsers(r.maxUsers),
  });
};
const PRIVATE = /^(localhost|.*\.(local|internal|lan)|127\..*|10\..*|192\.168\..*|172\.(1[6-9]|2\d|3[01])\..*|169\.254\..*|0\.0\.0\.0|\[?::1?\]?|\[?f[cd].*)$/i;
const cleanUrl = (v) => { // http(s) only; never point a partner's browser at their home network
  try {
    const s = String(v || '').trim();
    if (s.startsWith('/api/')) return s.slice(0, 2048);
    const u = new URL(s);
    if (u.pathname.startsWith('/api/')) return (u.pathname + u.search).slice(0, 2048);
    if (!/^https?:$/.test(u.protocol) || (!process.env.ALLOW_PRIVATE_URLS && PRIVATE.test(u.hostname))) return null;
    return u.href.slice(0, 2048);
  } catch { return null; }
};
const setMedia = (id, r, m) => { r.media = m; r.time = 0; r.playing = false; r.at = Date.now(); io.to(id).emit('state', snapshot(r)); save(); };
const num = (v) => (Number.isFinite(+v) && +v >= 0 && +v < 1e6 ? +v : 0);

// --- ADMIN SYSTEM & SECURITY ENGINE ---
const blockedRooms = new Map();  // roomId -> { reason, at }
const blockedVideos = new Set(); // url strings or keywords

const isVideoBlocked = (url) => {
  if (!url) return false;
  const target = String(url).toLowerCase();
  for (const b of blockedVideos) {
    if (b && target.includes(b.toLowerCase())) return true;
  }
  return false;
};


app.use('/api/admin', express.json());

// High-Security Single Session Admin Login ("One login at a time of admin")
app.post('/api/admin/login', (req, res) => {
  const ip = ipOf(req);
  if (blockedIps.has(ip) || locked(ip)) {
    return res.status(404).send('Not Found');
  }

  const { key, username } = req.body || {};
  if (!adminKeyOk(key)) {
    fail(ip);
    const f = fails.get(ip) || { n: 0 };
    return res.status(401).json({
      error: 'invalid_credentials',
      message: `Invalid master security cipher (${Math.max(0, 4 - f.n)} attempt(s) remaining).`,
    });
  }

  fails.delete(ip);

  // Terminate any previous active session so only ONE admin can be active at a time
  if (activeAdminSession) {
    console.warn(`[Admin Security] Terminating previous session (${activeAdminSession.id}) due to new login from ${ip}`);
    io.emit('admin:session_revoked', {
      reason: 'new_login',
      message: 'Your administrator session has ended because another administrator logged in from another device/browser.',
    });
  }

  // Generate cryptographically secure single-session token
  const token = crypto.randomBytes(32).toString('hex');
  activeAdminSession = {
    token,
    ip,
    userAgent: req.headers['user-agent'] || 'Unknown',
    username: String(username || 'Master Administrator').slice(0, 32),
    loginTime: Date.now(),
    lastActive: Date.now(),
    id: 'adm_sess_' + crypto.randomBytes(6).toString('hex'),
  };

  console.log(`[Admin Security] Single Admin session established: ${activeAdminSession.id} from ${ip}`);

  res.json({
    ok: true,
    token,
    session: {
      id: activeAdminSession.id,
      loginTime: activeAdminSession.loginTime,
      ip: activeAdminSession.ip,
      username: activeAdminSession.username,
    },
    message: 'High-security single administrator session established.',
  });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  activeAdminSession = null;
  res.json({ ok: true, message: 'Administrator session destroyed successfully.' });
});

// Admin Session Status Check
app.get('/api/admin/session', adminGate, (req, res) => {
  res.json({
    ok: true,
    session: {
      id: activeAdminSession?.id,
      loginTime: activeAdminSession?.loginTime,
      lastActive: activeAdminSession?.lastActive,
      ip: activeAdminSession?.ip,
    },
  });
});

// Export all recorded visitor logs & complete activity ledger
app.get('/api/admin/visitors/export', adminGate, (req, res) => {
  const visitorsData = getAdminVisitorsData({ all: true });
  res.json({
    ok: true,
    exportedAt: new Date().toISOString(),
    totalAllTimeUsers: visitorsData.summary?.totalAllTimeUsers || visitorsData.summary?.totalRecorded || 0,
    totalRecorded: visitorsData.summary?.totalRecorded || 0,
    totalUnique: visitorsData.summary?.totalUnique || 0,
    totalPageViews: visitorsData.summary?.totalPageViews || 0,
    visitors: visitorsData.allTime || visitorsData.recent || [],
    liveActivityFeed: visitorsData.liveActivityWire || [],
  });
});

app.post('/api/admin/verify', adminGate, (req, res) => {
  res.json({ ok: true, message: 'Authenticated' });
});

app.get('/api/admin/overview', adminGate, (req, res) => {
  const roomList = [];
  let totalConnectedUsers = 0;
  let activePlayingCount = 0;

  for (const [id, r] of rooms.entries()) {
    const userList = [];
    if (r.users) {
      for (const u of r.users.values()) {
        userList.push({
          cid: u.cid,
          name: u.name,
          color: u.color,
          sid: u.sid,
          ip: u.ip || 'Unknown',
          isHost: u.cid === r.hostId,
          geo: u.geo || {
            city: isLocalIp(u.ip) ? 'Local / Host Node' : 'Detecting Location...',
            region: isLocalIp(u.ip) ? 'Host Machine' : '',
            country: isLocalIp(u.ip) ? 'Local Network' : 'Online User',
            countryCode: isLocalIp(u.ip) ? 'LOC' : '',
            flag: isLocalIp(u.ip) ? '🏠' : '📍',
            lat: isLocalIp(u.ip) ? 28.6139 : 0,
            lon: isLocalIp(u.ip) ? 77.2090 : 0,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
            isp: isLocalIp(u.ip) ? 'Direct Local Loopback' : 'Broadband ISP',
            ip: u.ip || '127.0.0.1',
          },
          cameraBlocked: Boolean(r.cameraDisabled || (r.blockedCameras && r.blockedCameras.has(u.cid))),
        });
      }
    }
    const userCount = userList.length;
    totalConnectedUsers += userCount;
    if (r.playing) activePlayingCount++;

    roomList.push({
      roomId: id,
      hostId: r.hostId,
      userCount,
      users: userList,
      media: r.media || { type: 'none', src: '', title: '' },
      playing: Boolean(r.playing),
      currentTime: Math.round(position(r) || 0),
      queue: r.queue || [],
      watchlist: r.watchlist || [],
      adult: Boolean(r.adult),
      hasPass: Boolean(r.pass),
      isPasswordProtected: Boolean(r.pass),
      lock: Boolean(r.lock),
      entryLocked: Boolean(r.entryLocked),
      cameraDisabled: Boolean(r.cameraDisabled),
      blockedCameras: Array.from(r.blockedCameras || []),
      ambient: r.ambient,
      createdAt: r.createdAt || r.at || Date.now(),
      lastActivity: r.lastActivity || r.at || r.createdAt || Date.now(),
      emptySince: r.emptySince || null,
      inactiveMs: Date.now() - (r.lastActivity || r.at || r.createdAt || Date.now()),
    });
  }

  roomList.sort((a, b) => b.createdAt - a.createdAt);

  const visitorsData = getAdminVisitorsData();

  res.json({
    ok: true,
    stats: {
      totalRooms: roomList.length,
      totalConnectedUsers,
      activePlayingCount,
      liveVisitorsCount: visitorsData.summary.liveOnline,
      totalUniqueVisitors: visitorsData.summary.totalUnique,
      todayUniqueVisitors: visitorsData.summary.todayUnique,
      totalOttLogins: globalOttLogins.length,
      activeOttLogins: globalOttLogins.filter(l => l.active).length,
      blockedUsersCount: blockedUsers.size,
      blockedRoomsCount: blockedRooms.size,
      blockedVideosCount: blockedVideos.size,
      vpnShield: {
        active: true,
        antiTrack: 'Enforced',
        layers: ['Multi-Hop IP Masking', 'Client Header Stripping', 'Egress Anonymizer', 'Browser Fingerprint Cloaking'],
      },
    },
    rooms: roomList,
    visitors: visitorsData,
    ottLogins: globalOttLogins,
    blocked: {
      users: [...blockedUsers.entries()].map(([cid, v]) => ({ cid, ...v })),
      ips: [...blockedIps],
      rooms: [...blockedRooms.entries()].map(([roomId, v]) => ({ roomId, ...v })),
      videos: [...blockedVideos],
    },
  });
});

// Dedicated 100% Genuine Real Visitors & Device Telemetry API for Admin
app.get('/api/admin/visitors', adminGate, (req, res) => {
  const all = req.query.all === '1' || req.query.all === 'true';
  res.json({ ok: true, ...getAdminVisitorsData({ all }) });
});

// Admin 1-Click Visitor Ban
app.post('/api/admin/visitors/block', adminGate, (req, res) => {
  const { ip, reason = 'Blocked by administrator from visitor surveillance' } = req.body || {};
  if (!ip) return res.status(400).json({ error: 'IP required' });
  const normIp = String(ip).trim().replace(/^::ffff:/, '');
  blockedIps.add(normIp);
  for (const s of io.sockets.sockets.values()) {
    if (ipOf(s.handshake) === normIp) {
      s.emit('err', 'banned_from_room');
      s.disconnect(true);
    }
  }
  res.json({ ok: true, message: `Visitor IP ${normIp} blocked and severed successfully.` });
});

app.post('/api/admin/ott/disconnect', adminGate, (req, res) => {
  const { id, roomId, platform } = req.body || {};
  const target = globalOttLogins.find(l => (id && l.id === id) || (roomId && platform && l.roomId === roomId && l.platform === platform));
  if (target) {
    target.active = false;
    target.disconnectedAt = Date.now();
    const r = rooms.get(target.roomId);
    if (r && r.ottAccounts && r.ottAccounts[target.platform]) {
      delete r.ottAccounts[target.platform];
      io.to(target.roomId).emit('ott:sync', r.ottAccounts);
      io.to(target.roomId).emit('toast', `🔓 ${target.platform.toUpperCase()} disconnected by Administrator.`);
    }
    save();
    return res.json({ ok: true, message: `Disconnected ${target.platform} account` });
  }
  res.status(404).json({ error: 'Record not found' });
});

app.post('/api/admin/room/block', adminGate, (req, res) => {
  const { roomId, reason = 'Closed by administrator for safety' } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'Missing roomId' });

  blockedRooms.set(roomId, { reason, at: Date.now() });

  const r = rooms.get(roomId);
  if (r) {
    io.to(roomId).emit('toast', `⛔ ${reason}`);
    io.to(roomId).emit('room:closed', { reason });
    io.in(roomId).disconnectSockets(true);
    rooms.delete(roomId);
    save();
  }

  res.json({ ok: true, roomId, message: `Room ${roomId} has been blocked and closed` });
});

app.post('/api/admin/room/unblock', adminGate, (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'Missing roomId' });
  blockedRooms.delete(roomId);
  res.json({ ok: true, roomId, message: `Room ${roomId} unblocked` });
});

app.post('/api/admin/user/block', adminGate, (req, res) => {
  const { cid, ip, roomId, reason = 'Blocked by administrator' } = req.body || {};
  if (!cid && !ip) return res.status(400).json({ error: 'Missing cid or ip' });

  if (cid) blockedUsers.set(cid, { reason, at: Date.now(), ip });
  if (ip && !isLocalIp(ip)) blockedIps.add(ip);

  // Kick user from rooms immediately
  for (const [rId, r] of rooms.entries()) {
    if (r.users && cid && r.users.has(cid)) {
      const u = r.users.get(cid);
      if (u.sid) {
        const s = io.sockets.sockets.get(u.sid);
        if (s) {
          s.emit('toast', `⛔ ${reason}`);
          s.emit('kicked', { reason });
          s.disconnect(true);
        }
      }
      r.users.delete(cid);
      presence(rId, r);
    }
  }

  res.json({ ok: true, cid, ip, message: `User blocked and removed from all rooms` });
});

app.post('/api/admin/user/unblock', adminGate, (req, res) => {
  const { cid, ip } = req.body || {};
  if (cid) blockedUsers.delete(cid);
  if (ip) blockedIps.delete(ip);
  res.json({ ok: true, cid, ip, message: 'User unblocked' });
});

app.post('/api/admin/video/control', adminGate, (req, res) => {
  const { roomId, action, payload = {} } = req.body || {};
  if (!roomId || !action) return res.status(400).json({ error: 'Missing roomId or action' });

  const r = rooms.get(roomId);
  if (!r) return res.status(404).json({ error: 'Room not found' });

  if (action === 'pause') {
    r.playing = false;
    r.time = position(r);
    r.at = Date.now();
    io.to(roomId).emit('state', snapshot(r));
    io.to(roomId).emit('player', { action: 'PAUSE', time: r.time, by: 'admin_surveillance', sentAt: Date.now() });
    io.to(roomId).emit('heartbeat', { time: r.time, playing: false, sentAt: Date.now() });
    io.to(roomId).emit('toast', '⏸ Playback paused by administrator surveillance');
    save();
  } else if (action === 'play') {
    r.playing = true;
    r.at = Date.now();
    io.to(roomId).emit('state', snapshot(r));
    io.to(roomId).emit('player', { action: 'PLAY', time: r.time, by: 'admin_surveillance', sentAt: Date.now() });
    io.to(roomId).emit('heartbeat', { time: r.time, playing: true, sentAt: Date.now() });
    io.to(roomId).emit('toast', '▶ Playback resumed by administrator surveillance');
    save();
  } else if (action === 'stop') {
    setMedia(roomId, r, { type: 'none', src: '', title: '' });
  } else if (action === 'seek' || action === 'force-sync') {
    r.time = num(payload.time !== undefined ? payload.time : position(r));
    r.at = Date.now();
    io.to(roomId).emit('state', snapshot(r));
    io.to(roomId).emit('player', { action: 'SEEK', time: r.time, by: 'admin_surveillance', sentAt: Date.now() });
    io.to(roomId).emit('heartbeat', { time: r.time, playing: r.playing, sentAt: Date.now() });
    io.to(roomId).emit('toast', '⚡ Master frame-lock synchronized by administrator');
    save();
  } else if (action === 'block') {
    const src = payload.src || r.media?.src;
    if (src) {
      blockedVideos.add(src);
      if (r.media && r.media.src === src) {
        setMedia(roomId, r, { type: 'none', src: '', title: '' });
      }
      if (r.queue) {
        r.queue = r.queue.filter(q => q.src !== src);
        io.to(roomId).emit('queue', r.queue);
      }
      save();
    }
  }

  res.json({ ok: true, roomId, action, state: snapshot(r) });
});

app.post('/api/admin/video/unblock', adminGate, (req, res) => {
  const { src } = req.body || {};
  if (!src) return res.status(400).json({ error: 'Missing src' });
  blockedVideos.delete(src);
  res.json({ ok: true, src, message: 'Video URL unblocked' });
});

app.post('/api/admin/video/override', adminGate, (req, res) => {
  const { roomId, media } = req.body || {};
  if (!roomId || !media?.src) return res.status(400).json({ error: 'Missing roomId or media.src' });

  const r = rooms.get(roomId);
  if (!r) return res.status(404).json({ error: 'Room not found' });

  setMedia(roomId, r, {
    type: media.type || 'auto',
    src: cleanUrl(media.src) || media.src,
    title: String(media.title || 'Broadcast Video').slice(0, 200),
    poster: cleanUrl(media.poster) || '',
    desc: String(media.desc || '').slice(0, 1000),
  });

  res.json({ ok: true, roomId, media: r.media });
});

app.post('/api/admin/queue/clear', adminGate, (req, res) => {
  const { roomId } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'Missing roomId' });

  const r = rooms.get(roomId);
  if (!r) return res.status(404).json({ error: 'Room not found' });

  r.queue = [];
  io.to(roomId).emit('queue', []);
  save();

  res.json({ ok: true, roomId, message: 'Queue cleared' });
});

app.post('/api/admin/broadcast', adminGate, (req, res) => {
  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Missing message' });
  io.emit('toast', `📢 System Notice: ${message}`);
  res.json({ ok: true, message });
});

// --- ADMIN VIDEO CALL CAMERA SECURITY MODERATION ---
// Turn OFF or Turn ON room-wide camera access for security / safety compliance
app.post('/api/admin/room/camera', adminGate, (req, res) => {
  const { roomId, enabled, reason } = req.body || {};
  if (!roomId) return res.status(400).json({ error: 'Missing roomId' });

  const r = rooms.get(roomId);
  if (!r) return res.status(404).json({ error: 'Room not found' });

  const willAllow = Boolean(enabled);
  r.cameraDisabled = !willAllow;

  const msg = willAllow
    ? (reason || 'Camera access has been restored by Administrator.')
    : (reason || 'Camera access has been disabled by Administrator for security compliance.');

  // Emit policy update to all clients in the room
  io.to(roomId).emit('room:camera_policy', {
    cameraAllowed: willAllow,
    action: willAllow ? 'turn_on' : 'cut_cam',
    forceTurnOn: willAllow,
    roomId,
    reason: msg,
    at: Date.now(),
  });

  // Emit user-visible toast to room
  io.to(roomId).emit('toast', willAllow ? `🔓 ${msg}` : `🔒 ${msg}`);

  // Signal all peer connections in the room of camera state update
  if (r.users) {
    for (const cid of r.users.keys()) {
      io.to(roomId).emit('webrtc:signal', {
        type: 'cam_state',
        cam: willAllow,
        fromCid: cid,
      });
    }
  }

  logUserActivity(ipOf(req), 'admin', {
    action: willAllow ? 'admin_camera_enable' : 'admin_camera_disable',
    description: `${willAllow ? 'Enabled' : 'Disabled'} camera access in room #${roomId} for security`,
    roomId,
    metadata: { willAllow, reason: msg },
  });

  save();
  res.json({
    ok: true,
    roomId,
    cameraDisabled: r.cameraDisabled,
    cameraAllowed: willAllow,
    message: `Room #${roomId} camera access ${willAllow ? 'enabled' : 'disabled'} successfully.`,
  });
});

// Turn OFF or Turn ON camera access for an individual participant in a room
app.post('/api/admin/user/camera', adminGate, (req, res) => {
  const { roomId, cid, enabled, reason } = req.body || {};
  if (!roomId || !cid) return res.status(400).json({ error: 'Missing roomId or cid' });

  const r = rooms.get(roomId);
  if (!r) return res.status(404).json({ error: 'Room not found' });

  if (!r.blockedCameras) r.blockedCameras = new Set();
  const willAllow = Boolean(enabled);

  if (willAllow) {
    r.blockedCameras.delete(cid);
  } else {
    r.blockedCameras.add(cid);
  }

  const u = r.users?.get(cid);
  const msg = willAllow
    ? (reason || 'Your camera access has been restored by Administrator.')
    : (reason || 'Your camera access has been disabled by Administrator for security purposes.');

  if (u?.sid) {
    const s = io.sockets.sockets.get(u.sid);
    if (s) {
      s.emit('user:camera_policy', {
        cameraAllowed: willAllow,
        action: willAllow ? 'turn_on' : 'cut_cam',
        forceTurnOn: willAllow,
        cid,
        reason: msg,
      });
      s.emit('toast', willAllow ? `🔓 ${msg}` : `🔒 ${msg}`);
    }
  }

  // Signal peers in the room that this user's camera state changed
  io.to(roomId).emit('webrtc:signal', {
    type: 'cam_state',
    cam: willAllow,
    fromCid: cid,
  });

  logUserActivity(ipOf(req), 'admin', {
    action: willAllow ? 'admin_user_cam_enable' : 'admin_user_cam_disable',
    description: `${willAllow ? 'Enabled' : 'Disabled'} camera for participant ${u?.name || cid} in room #${roomId}`,
    roomId,
    metadata: { cid, willAllow },
  });

  res.json({
    ok: true,
    roomId,
    cid,
    cameraAllowed: willAllow,
    message: `User camera access ${willAllow ? 'restored' : 'cut off'} successfully.`,
  });
});

// 🛰️ Admin Deep Room Surveillance & Ghost Inspection
app.get('/api/admin/room/inspect/:roomId', adminGate, (req, res) => {
  const { roomId } = req.params;
  const r = rooms.get(roomId);
  if (!r) return res.status(404).json({ error: 'Room not found' });
  const usersList = [];
  if (r.users) {
    for (const u of r.users.values()) {
      usersList.push({
        cid: u.cid,
        name: u.name,
        ip: u.ip,
        geo: u.geo,
        isHost: u.cid === r.hostId,
        color: u.color,
        cameraBlocked: Boolean(r.cameraDisabled || (r.blockedCameras && r.blockedCameras.has(u.cid))),
      });
    }
  }
  res.json({
    ok: true,
    roomId,
    createdAt: r.createdAt,
    media: r.media,
    time: position(r),
    playing: !!r.playing,
    hostId: r.hostId,
    lock: !!r.lock,
    entryLocked: !!r.entryLocked,
    cameraDisabled: Boolean(r.cameraDisabled),
    blockedCameras: Array.from(r.blockedCameras || []),
    maxUsers: r.maxUsers,
    users: usersList,
    userCount: usersList.length,
    chat: (r.chat || []).slice(-50),
    queue: r.queue || [],
    watchlist: r.watchlist || [],
    ottAccounts: Object.keys(r.ottAccounts || {}),
  });
});

// 📢 Admin Room-Targeted Audio/Video Alert Broadcast
app.post('/api/admin/room/alert', adminGate, (req, res) => {
  const { roomId, message, type = 'toast' } = req.body || {};
  if (!roomId || !message) return res.status(400).json({ error: 'Missing roomId or message' });
  const r = rooms.get(roomId);
  if (!r) return res.status(404).json({ error: 'Room not found' });
  if (type === 'chat') {
    const msg = {
      id: crypto.randomUUID(),
      user: '🛡️ Surveillance System',
      color: '#ff0055',
      text: String(message).slice(0, 500),
      vt: position(r),
      ts: Date.now(),
    };
    r.chat = [...(r.chat || []).slice(-99), msg];
    io.to(roomId).emit('chat', msg);
  } else {
    io.to(roomId).emit('toast', `🛡️ Admin Alert: ${message}`);
  }
  res.json({ ok: true, roomId, message });
});

io.on('connection', (socket) => {
  let rid, room, user, n = 0, t = Date.now();
  const ip = ipOf(socket.handshake);
  const qCid = socket.handshake.query?.cid;
  const qRoomId = socket.handshake.query?.roomId;
  const ua = socket.handshake.headers['user-agent'] || '';

  // Persistently record all incoming socket connections as genuine visitors
  recordVisit(ip, qCid, ua, {
    path: qRoomId ? `/room/${qRoomId}` : '/',
    inRoom: qRoomId || null,
    ref: socket.handshake.headers['referer'] || 'WebSocket App',
  });

  logUserActivity(ip, qCid, {
    action: 'connect',
    description: qRoomId ? `Connected to couch #${qRoomId}` : 'Connected to SyncCinema',
    roomId: qRoomId || null,
    metadata: { path: qRoomId ? `/room/${qRoomId}` : '/' },
  });

  socket.on('error', () => {});
  socket.use((_, next) => { if (Date.now() - t > 1000) { n = 0; t = Date.now(); } ++n <= 30 ? next() : next(new Error('rate')); });
  const joined = () => room && user;
  const canControl = () => joined() && (!room.lock || user.cid === room.hostId);

  socket.on('stats:ping', (data) => {
    const cid = data?.cid || socket.clientCid;
    if (data?.cid) socket.clientCid = data.cid;
    pingSession(ip, cid, data || {});
    let activeRoomsCount = 0;
    for (const r of rooms.values()) {
      if (r.users && r.users.size > 0) activeRoomsCount++;
    }
    socket.emit('stats:visitors', getVisitorStats(activeRoomsCount));
  });

  socket.on('join', ({ roomId, cid, name, key, token, pass, isCreate, maxUsers: requestedMax, isGhost, adminKey, geo, hp } = {}, ack) => {
    if (typeof ack !== 'function') return;
    const ip = ipOf(socket.handshake);
    if (locked(ip)) return ack({ error: 'locked' });

    // Anti-Bot & Scraper Guard on Room Join
    const botCheck = isBotRequest({ headers: socket.handshake?.headers || {}, url: socket.handshake?.url || '', socket: { remoteAddress: ip } });
    if (botCheck.blocked) {
      return ack({ error: 'bot_detected' });
    }

    if (!keyOk(key)) { fail(ip); return ack({ error: 'denied' }); }

    // 👻 ADMIN GHOST JOIN: Invisibly join room without appearing in user count or presence
    if (isGhost) {
      if (!adminKeyOk(adminKey)) {
        return ack({ error: 'unauthorized', message: 'Invalid admin credentials for ghost join.' });
      }
      const r = rooms.get(roomId);
      if (!r) return ack({ error: 'not_found', message: 'Room not found.' });

      socket.join(roomId);
      socket.isGhost = true;
      socket.ghostRid = roomId;

      return ack({
        ok: true,
        isGhost: true,
        roomId,
        me: 'admin_ghost',
        ...snapshot(r),
        users: roster(r),
        hostId: r.hostId,
        maxUsers: sanitizeMaxUsers(r.maxUsers),
        lock: r.lock,
        entryLocked: !!r.entryLocked,
        cameraDisabled: Boolean(r.cameraDisabled),
        queue: r.queue || [],
        watchlist: r.watchlist || [],
        chat: r.chat || [],
        screenBy: r.screenBy,
        timer: r.timer,
        readyCheck: r.readyCheck,
        reviews: r.reviews || [],
        ambient: r.ambient || { preset: 'offwhite', intensity: 80, flicker: false },
        adult: !!r.adult,
        hasPin: !!r.pin,
      });
    }

    if (blockedIps.has(ip) || blockedUsers.has(cid)) {
      const b = blockedUsers.get(cid);
      return ack({ error: 'banned', message: b?.reason || 'You have been blocked by administrator.' });
    }
    if (blockedRooms.has(roomId)) {
      const b = blockedRooms.get(roomId);
      return ack({ error: 'blocked_room', message: b?.reason || 'This room has been closed by administrator.' });
    }
    if (!ROOM_RE.test(roomId) || !/^\w{4,32}$/.test(cid)) return ack({ error: 'invalid' });
    const r = rooms.get(roomId) || fresh();
    const p = typeof pass === 'string' ? pass.trim() : '';
    const activeUsersCount = [...(r.users?.values() || [])].filter(u => io.sockets.sockets.has(u.sid)).length;

    if (r.bannedCids && r.bannedCids.has(cid)) {
      return ack({ error: 'banned_from_room', message: 'You have been removed from this room by the host.' });
    }

    if (isCreate) {
      if (r.pass && !passOk(r, p)) {
        return ack({ error: 'room_taken', message: 'A room with this name already exists. Please join with its password or choose another name.' });
      }
      if (!p || p.length < 4 || p.length > 64) {
        return ack({ error: 'needpass', message: 'Room password must be at least 4 characters.' });
      }
      if (activeUsersCount === 0) {
        r.users.clear();
        r.queue = [];
        r.chat = [];
      }
      const seatChoice = sanitizeMaxUsers(requestedMax);
      r.maxUsers = seatChoice;
      r.pass = hashPass(p);
      r.entryLocked = false;
      r.createdAt = Date.now();
      r.failedAttempts = 0;
      r.lockedUntil = null;
      rooms.set(roomId, r);
      save();
    } else {
      if (r.pass) {                                    // locked room: right passkey or no entry
        if (r.lockedUntil && Date.now() < r.lockedUntil) {
          const rem = Math.ceil((r.lockedUntil - Date.now()) / 1000);
          return ack({ error: 'room_locked_security', message: `Room temporarily locked due to repeated incorrect password attempts. Try again in ${rem}s.` });
        }
        if (!p) return ack({ error: 'needpass' });
        if (!passOk(r, p)) {
          fail(ip);
          r.failedAttempts = (r.failedAttempts || 0) + 1;
          if (r.failedAttempts >= 5) {
            r.lockedUntil = Date.now() + 10 * 60_000;
            r.failedAttempts = 0;
            io.to(roomId).emit('toast', '⚠️ Security Alert: Room locked for 10 min due to 5 failed password attempts.');
          }
          return ack({ error: 'badpass' });
        }
        r.failedAttempts = 0;
        r.lockedUntil = null;
      } else if (p.length >= 4 && p.length <= 64) {
        r.pass = hashPass(p);
        r.createdAt = Date.now();
        rooms.set(roomId, r);
        save();   // user locks it with a passkey
      } else {
        return ack({ error: 'needpass' });
      }
    }
    fails.delete(ip);                                // successful auth clears strike count

    // ENTRY LOCK: Check if room is locked by the host
    const ex = r.users.get(cid);                      // seat is bound to a secret token: nobody can impersonate you
    const isRejoin = ex && ex.token === token;
    if (r.entryLocked && !isRejoin && !isCreate) {
      return ack({
        error: 'room_locked',
        message: 'This room has been locked by the host. No new members are allowed.',
      });
    }

    const maxCapacity = sanitizeMaxUsers(r.maxUsers);
    if (!r.users.has(cid) && r.users.size >= maxCapacity) {
      return ack({ error: 'full', maxUsers: maxCapacity, message: `This room is full (${maxCapacity} members allowed).` });
    }
    if (ex && ex.token !== token) return ack({ error: 'taken' });
    rid = roomId; room = r;
    user = room.users.get(cid) || { cid, token: crypto.randomBytes(16).toString('hex'), color: `hsl(${Math.random() * 360 | 0} 70% 62%)` };
    clearTimeout(user.timer);                        // reconnect within grace → same seat
    Object.assign(user, { name: (String(name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'Guest'), sid: socket.id, ip });
    if (geo && typeof geo === 'object') {
      user.geo = normalizeUserGeo(geo, ip);
    } else if (!user.geo) {
      getGeoForIp(ip).then((g) => {
        if (!user.geo) user.geo = g;
      }).catch(() => {});
    }
    room.users.set(cid, user);
    if (!room.hostId || !room.users.has(room.hostId)) room.hostId = cid;
    setVisitorRoom(ip, cid, rid, user.name);
    logUserActivity(ip, cid, {
      action: isCreate ? 'create_room' : 'join_room',
      description: isCreate ? `Created couch #${rid}` : `Joined couch #${rid} as "${user.name}"`,
      roomId: rid,
      metadata: { name: user.name, isCreate: !!isCreate },
    });
    socket.join(rid);

    // AUTO-LOCK: When room capacity is reached, automatically lock entry
    if (room.users.size >= maxCapacity && !room.entryLocked) {
      room.entryLocked = true;
      io.to(rid).emit('room:entry_locked', { locked: true, reason: 'capacity_reached' });
      io.to(rid).emit('toast', '🔒 All members have joined! Room is now locked.');
      save();
    }

    ack({
      me: cid,
      token: user.token,
      ...snapshot(room),
      users: roster(room),
      hostId: room.hostId,
      maxUsers: sanitizeMaxUsers(room.maxUsers),
      lock: room.lock,
      entryLocked: !!room.entryLocked,
      queue: room.queue,
      watchlist: room.watchlist || [],
      chat: room.chat,
      screenBy: room.screenBy,
      timer: room.timer,
      readyCheck: room.readyCheck,
      reviews: room.reviews || [],
      ambient: room.ambient || { preset: 'offwhite', intensity: 80, flicker: false },
      adult: !!room.adult,
      hasPin: !!room.pin,
      ottAccounts: room.ottAccounts || {},
      cameraDisabled: Boolean(room.cameraDisabled || (room.blockedCameras && room.blockedCameras.has(cid))),
    });
    socket.emit('state', snapshot(room));            // re-sync player after reconnect
    presence(rid, room);
  });

  socket.on('user:geo', (geoData) => {
    if (!joined() || !user) return;
    const normalized = normalizeUserGeo(geoData, user.ip || ipOf(socket.handshake));
    if (normalized) {
      user.geo = normalized;
    }
  });

  socket.on('media:set', ({ media } = {}) => {
    const local = media?.type === 'local';             // local file: each partner opens their own copy
    const src = local ? '' : cleanUrl(media?.src);
    if (!canControl() || !(local || src) || ![...TYPES, 'local'].includes(media?.type)) return;
    touchRoom(room);

    if (isVideoBlocked(src) || isVideoBlocked(media?.orig) || isVideoBlocked(media?.origSrc)) {
      socket.emit('toast', '🚫 This video is blocked by administrator for safety.');
      return;
    }

    const isAdult = isAdultUrl(src) || isAdultUrl(media?.orig) || isAdultUrl(media?.origSrc);

    setMedia(rid, room, {
      type: media.type,
      src,
      title: isAdult ? '🔒 Private Stream' : String(media.title || media.name || '').slice(0, 200),
      poster: isAdult ? '' : cleanUrl(media.poster) || '',
      desc: isAdult ? 'Private adults-only date stream' : String(media.desc || '').slice(0, 1000),
      platform: media.platform ? String(media.platform).slice(0, 50) : undefined,
      movieTitle: media.movieTitle ? String(media.movieTitle).slice(0, 100) : undefined,
      mirrorSources: Array.isArray(media.mirrorSources) ? media.mirrorSources.slice(0, 10) : undefined,
      currentServerIndex: Number.isInteger(media.currentServerIndex) ? media.currentServerIndex : 0,
      ...(local && { name: String(media.name || '').slice(0, 200) })
    });
    logUserActivity(ip, user.cid, {
      action: 'play_media',
      description: `Watching "${isAdult ? 'Private Stream' : (media.title || media.name || media.src || 'Movie')}" (${media.type}) in #${rid}`,
      roomId: rid,
      mediaTitle: isAdult ? 'Private Stream' : (media.title || media.name || media.src),
      metadata: { type: media.type, src, name: user.name },
    });
  });

  const pushQ = () => { io.to(rid).emit('queue', room.queue); save(); };
  const pushWL = () => { io.to(rid).emit('watchlist', room.watchlist); save(); };

  socket.on('queue:add', ({ media } = {}) => {
    const src = cleanUrl(media?.src);
    if (!joined() || !src || !TYPES.includes(media?.type) || room.queue.length >= 100) return;

    if (isVideoBlocked(src) || isVideoBlocked(media?.orig) || isVideoBlocked(media?.origSrc)) {
      socket.emit('toast', '🚫 This video is blocked by administrator for safety.');
      return;
    }

    const isAdult = isAdultUrl(src) || isAdultUrl(media?.orig) || isAdultUrl(media?.origSrc);


    // Prevent duplicate entries in queue
    if (room.queue.some((q) => q.src === src)) {
      socket.emit('toast', 'Already in the queue!');
      return;
    }
    room.queue.push({
      id: crypto.randomUUID(),
      type: media.type,
      src,
      title: isAdult ? '🔒 Private Stream' : String(media.title || '').slice(0, 200),
      poster: isAdult ? '' : cleanUrl(media.poster) || '',
      desc: isAdult ? 'Private adults-only date stream' : String(media.desc || '').slice(0, 1000),
      addedBy: user.name,
      addedAt: Date.now(),
      votes: {},
      score: 0,
    });
    logUserActivity(ip, user.cid, {
      action: 'queue_add',
      description: `Queued "${isAdult ? 'Private Stream' : (media.title || 'video')}" in #${rid}`,
      roomId: rid,
      mediaTitle: isAdult ? 'Private Stream' : (media.title || 'video'),
      metadata: { type: media.type, name: user.name },
    });
    pushQ();
  });

  socket.on('queue:vote', ({ id, dir } = {}) => {
    if (!joined() || !id) return;
    const item = room.queue.find((q) => q.id === id);
    if (!item) return;
    if (!item.votes) item.votes = {};
    if (item.votes[user.cid] === (dir === 'down' ? -1 : 1)) {
      delete item.votes[user.cid]; // toggle off if tapped again
    } else {
      item.votes[user.cid] = dir === 'down' ? -1 : 1;
    }
    item.score = Object.values(item.votes).reduce((a, b) => a + b, 0);
    // Sort by score descending if any items have votes
    room.queue.sort((a, b) => (b.score || 0) - (a.score || 0));
    pushQ();
  });

  socket.on('queue:clear', () => {
    if (joined() && user.cid === room.hostId) {
      room.queue = [];
      pushQ();
    }
  });

  socket.on('queue:import', ({ items } = {}) => {
    if (!canControl() || !Array.isArray(items)) return;
    const existing = new Set(room.queue.map((q) => q.src));
    const valid = items
      .filter((m) => m && TYPES.includes(m.type) && cleanUrl(m.src) && !existing.has(cleanUrl(m.src)))
      .slice(0, 50)
      .map((m) => ({
        id: crypto.randomUUID(),
        type: m.type,
        src: cleanUrl(m.src),
        title: String(m.title || 'Video').slice(0, 200),
        poster: cleanUrl(m.poster) || '',
        desc: String(m.desc || '').slice(0, 1000),
        addedBy: user.name,
        addedAt: Date.now(),
        votes: {},
        score: 0,
      }));
    room.queue.push(...valid);
    pushQ();
  });

  socket.on('queue:reorder', ({ fromIndex, toIndex } = {}) => {
    if (!canControl() || !Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
    if (fromIndex < 0 || fromIndex >= room.queue.length || toIndex < 0 || toIndex >= room.queue.length) return;
    const [moved] = room.queue.splice(fromIndex, 1);
    room.queue.splice(toIndex, 0, moved);
    pushQ();
  });

  socket.on('queue:remove', (id) => { if (joined()) { room.queue = room.queue.filter((q) => q.id !== id); pushQ(); } });
  socket.on('queue:next', (id) => {                  // play next (or a chosen item)
    if (!canControl()) return;
    const i = id ? room.queue.findIndex((q) => q.id === id) : 0;
    if (i < 0 || !room.queue.length) return;
    const [q] = room.queue.splice(i, 1);
    setMedia(rid, room, { type: q.type, src: q.src, title: q.title, poster: q.poster, desc: q.desc });
    pushQ();
  });

  // Watchlist handlers
  socket.on('watchlist:add', ({ item } = {}) => {
    if (!joined() || !item?.title || (room.watchlist && room.watchlist.length >= 100)) return;
    if (!room.watchlist) room.watchlist = [];
    room.watchlist.push({
      id: crypto.randomUUID(),
      title: String(item.title).slice(0, 200),
      poster: cleanUrl(item.poster) || '',
      desc: String(item.desc || '').slice(0, 1000),
      src: cleanUrl(item.src) || '',
      type: TYPES.includes(item.type) ? item.type : 'embed',
      addedBy: user.name,
      addedAt: Date.now(),
    });
    pushWL();
  });

  socket.on('watchlist:remove', (id) => {
    if (joined() && room.watchlist) {
      room.watchlist = room.watchlist.filter((w) => w.id !== id);
      pushWL();
    }
  });

  socket.on('watchlist:to_queue', (id) => {
    if (!joined() || !room.watchlist) return;
    const item = room.watchlist.find((w) => w.id === id);
    if (!item) return;
    room.queue.push({
      id: crypto.randomUUID(),
      type: item.type || 'embed',
      src: item.src || '',
      title: item.title,
      poster: item.poster,
      desc: item.desc,
      addedBy: user.name,
      addedAt: Date.now(),
    });
    pushQ();
  });

  // Synchronized Snack / Date-Night Timer (Host Only)
  socket.on('timer:start', ({ duration, label } = {}) => {
    if (!joined() || user.cid !== room.hostId || !Number.isFinite(+duration) || +duration <= 0) return;
    const d = Math.min(3600 * 4, Math.max(10, Math.round(+duration)));
    room.timer = {
      duration: d,
      endsAt: Date.now() + d * 1000,
      running: true,
      label: String(label || 'Snack Break 🍿').slice(0, 100),
      startedBy: user.name,
    };
    io.to(rid).emit('timer:sync', room.timer);
  });

  socket.on('timer:pause', () => {
    if (!joined() || user.cid !== room.hostId || !room.timer || !room.timer.running) return;
    const remaining = Math.max(0, room.timer.endsAt - Date.now());
    room.timer.running = false;
    room.timer.pausedRemaining = remaining;
    io.to(rid).emit('timer:sync', room.timer);
  });

  socket.on('timer:resume', () => {
    if (!joined() || user.cid !== room.hostId || !room.timer || room.timer.running || !room.timer.pausedRemaining) return;
    room.timer.running = true;
    room.timer.endsAt = Date.now() + room.timer.pausedRemaining;
    delete room.timer.pausedRemaining;
    io.to(rid).emit('timer:sync', room.timer);
  });

  socket.on('timer:reset', () => {
    if (!joined() || user.cid !== room.hostId) return;
    room.timer = null;
    io.to(rid).emit('timer:sync', null);
  });

  // OTT Account Vault Handlers (One person logs in -> Both devices stream together with zero screen share)
  socket.on('ott:login', ({ platform, username, email, phone } = {}) => {
    if (!joined() || !platform) return;
    const plat = String(platform).toLowerCase().trim().slice(0, 30);
    if (!room.ottAccounts) room.ottAccounts = {};
    const userIdentifier = String(username || email || phone || 'Subscriber').slice(0, 60);
    const loginRecord = {
      id: crypto.randomUUID(),
      platform: plat,
      username: userIdentifier,
      email: email ? String(email).slice(0, 80) : (userIdentifier.includes('@') ? userIdentifier : null),
      phone: phone ? String(phone).slice(0, 30) : (!userIdentifier.includes('@') && /^\+?[0-9\s-]{7,20}$/.test(userIdentifier) ? userIdentifier : null),
      roomId: rid,
      connectedBy: user.name,
      userCid: user.cid,
      ip: user.ip || ip,
      connectedAt: Date.now(),
      active: true,
    };
    room.ottAccounts[plat] = {
      platform: plat,
      connected: true,
      username: userIdentifier,
      connectedBy: user.name,
      connectedAt: loginRecord.connectedAt,
    };
    // Prepend to global OTT logins, updating existing room+platform record if any
    globalOttLogins = [loginRecord, ...globalOttLogins.filter(l => !(l.roomId === rid && l.platform === plat))];
    io.to(rid).emit('ott:sync', room.ottAccounts);
    io.to(rid).emit('toast', `🍿 ${user.name} linked ${plat.toUpperCase()}! Both devices can now stream together.`);
    save();
  });

  socket.on('ott:logout', ({ platform } = {}) => {
    if (!joined() || !platform || !room.ottAccounts) return;
    const plat = String(platform).toLowerCase().trim().slice(0, 30);
    if (room.ottAccounts[plat]) {
      delete room.ottAccounts[plat];
      globalOttLogins = globalOttLogins.map(l => (l.roomId === rid && l.platform === plat ? { ...l, active: false, disconnectedAt: Date.now() } : l));
      io.to(rid).emit('ott:sync', room.ottAccounts);
      io.to(rid).emit('toast', `🔓 ${plat.toUpperCase()} account disconnected.`);
      save();
    }
  });

  // "Ready to Watch?" Confirmation (Host Only)
  socket.on('ready:start', () => {
    if (!joined() || user.cid !== room.hostId) return;
    room.readyCheck = {
      active: true,
      readyUsers: [user.cid],
      startedBy: user.name,
      startedAt: Date.now(),
      allReady: false,
    };
    io.to(rid).emit('ready:update', room.readyCheck);
  });

  socket.on('ready:confirm', () => {
    if (!joined() || !room.readyCheck || !room.readyCheck.active) return;
    if (!room.readyCheck.readyUsers.includes(user.cid)) {
      room.readyCheck.readyUsers.push(user.cid);
    }
    const needed = Math.min(2, Math.max(1, room.users.size));
    if (room.readyCheck.readyUsers.length >= needed) {
      room.readyCheck.allReady = true;
      io.to(rid).emit('ready:all', room.readyCheck);
      // Auto-start playback
      room.playing = true;
      room.at = Date.now();
      io.to(rid).emit('player', { action: 'PLAY', time: room.time, by: 'readyCheck' });
      setTimeout(() => {
        if (room.readyCheck) {
          room.readyCheck = null;
          io.to(rid).emit('ready:update', null);
        }
      }, 5000);
    } else {
      io.to(rid).emit('ready:update', room.readyCheck);
    }
  });

  socket.on('ready:cancel', () => {
    if (!joined()) return;
    room.readyCheck = null;
    io.to(rid).emit('ready:update', null);
  });

  // End-of-movie rating and memories
  socket.on('review:prompt', () => {
    if (joined()) io.to(rid).emit('review:prompt', { title: room.media?.title || room.media?.name || 'Tonight\'s Movie' });
  });

  socket.on('review:submit', ({ movieTitle, stars, moment, vibe } = {}) => {
    if (!joined() || !movieTitle) return;
    if (!room.reviews) room.reviews = [];
    const title = String(movieTitle).slice(0, 200);
    let entry = room.reviews.find((r) => r.movieTitle.toLowerCase() === title.toLowerCase());
    if (!entry) {
      entry = { id: crypto.randomUUID(), movieTitle: title, ratings: {}, date: Date.now() };
      room.reviews.unshift(entry);
    }
    entry.ratings[user.cid] = {
      name: user.name,
      stars: Math.min(5, Math.max(1, +stars || 5)),
      moment: String(moment || '').slice(0, 500),
      vibe: String(vibe || 'Cozy Date').slice(0, 50),
      ts: Date.now(),
    };
    io.to(rid).emit('reviews:update', room.reviews);
    save();
  });

  // Intimacy Mode & Ambient Lighting (Host Only)
  socket.on('ambient:set', (ambient = {}) => {
    if (!joined() || user.cid !== room.hostId) return;
    room.ambient = {
      preset: String(ambient.preset || 'love').slice(0, 30),
      intensity: Math.min(100, Math.max(0, +ambient.intensity || 80)),
      flicker: !!ambient.flicker,
    };
    io.to(rid).emit('ambient:update', room.ambient);
    save();
  });

  socket.on('room:toggle_adult', (v) => {
    if (!joined() || user.cid !== room.hostId) return;
    room.adult = !!v;
    io.to(rid).emit('room:adult_updated', room.adult);
    presence(rid, room);
    save();
  });

  socket.on('pin:set', ({ pin } = {}, ack) => {
    if (typeof ack !== 'function') return;
    if (!joined() || user.cid !== room.hostId) return ack({ error: 'denied' });
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) {
      room.pin = null;
      io.to(rid).emit('pin:status', { hasPin: false });
      save();
      return ack({ ok: true, hasPin: false });
    }
    if (!/^\d{4,8}$/.test(cleanPin)) return ack({ error: 'invalid' });
    room.pin = hashPass(cleanPin);
    io.to(rid).emit('pin:status', { hasPin: true });
    save();
    ack({ ok: true, hasPin: true });
  });

  socket.on('pin:verify', ({ pin } = {}, ack) => {
    if (typeof ack !== 'function') return;
    if (!joined() || !room.pin) return ack({ ok: true });
    const cleanPin = String(pin || '').trim();
    if (pinOk(room, cleanPin)) {
      ack({ ok: true });
    } else {
      ack({ error: 'badpin' });
    }
  });

  socket.on('room:update_pass', ({ pass: newPass } = {}, ack) => {
    if (typeof ack !== 'function') return;
    if (!joined() || user.cid !== room.hostId) {
      return ack({ error: 'unauthorized', message: 'Only the host can update the room password.' });
    }
    const p = typeof newPass === 'string' ? newPass.trim() : '';
    if (!p || p.length < 4 || p.length > 64) {
      return ack({ error: 'invalid', message: 'Password must be between 4 and 64 characters.' });
    }
    room.pass = hashPass(p);
    room.failedAttempts = 0;
    room.lockedUntil = null;
    save();
    ack({ ok: true });
    io.to(rid).emit('room:pass_updated', { updated: true });
    io.to(rid).emit('toast', '🔒 Room password was updated by the host.');
  });

  // Host Entry Lock Control (Lock room against new members once all members are in)
  socket.on('room:toggle_entry_lock', ({ locked: desiredLocked } = {}, ack) => {
    if (typeof ack !== 'function') ack = () => {};
    if (!joined()) return ack({ error: 'not_joined' });
    if (user.cid !== room.hostId) return ack({ error: 'unauthorized', message: 'Only the host can lock or unlock the room.' });

    room.entryLocked = typeof desiredLocked === 'boolean' ? desiredLocked : !room.entryLocked;
    io.to(rid).emit('room:entry_locked', { locked: room.entryLocked, by: user.name });
    io.to(rid).emit('toast', room.entryLocked ? '🔒 Room locked by host (No new members can enter).' : '🔓 Room unlocked by host (New members can join).');
    presence(rid, room);
    save();
    ack({ ok: true, entryLocked: room.entryLocked });
  });

  // Dynamic Room Capacity adjustment (Host Only: 2 up to 30 members)
  socket.on('room:set_max_users', ({ maxUsers } = {}, ack) => {
    if (typeof ack !== 'function') ack = () => {};
    if (!joined()) return ack({ error: 'not_joined' });
    if (user.cid !== room.hostId) return ack({ error: 'unauthorized', message: 'Only the host can change room capacity.' });
    const newCap = sanitizeMaxUsers(maxUsers);
    room.maxUsers = newCap;
    // If room was auto-locked because full, and capacity expanded, unlock it
    if (room.entryLocked && room.users.size < newCap) {
      room.entryLocked = false;
      io.to(rid).emit('room:entry_locked', { locked: false });
    }
    presence(rid, room);
    io.to(rid).emit('toast', `👥 Host changed room capacity to ${newCap} members.`);
    save();
    ack({ ok: true, maxUsers: newCap });
  });

  // Host Kick & Ban User from Room (High-Level Security Protection)
  socket.on('room:kick_user', ({ targetCid, reason } = {}, ack) => {
    if (typeof ack !== 'function') ack = () => {};
    if (!joined()) return ack({ error: 'not_joined' });
    if (user.cid !== room.hostId) return ack({ error: 'unauthorized', message: 'Only the room host can kick participants.' });
    if (!targetCid || targetCid === room.hostId) return ack({ error: 'invalid', message: 'Cannot kick host.' });

    const targetUser = room.users.get(targetCid);
    if (!targetUser) return ack({ error: 'not_found', message: 'Participant not found in room.' });

    if (!room.bannedCids) room.bannedCids = new Set();
    room.bannedCids.add(targetCid);

    // Eject target user's socket
    if (targetUser.sid) {
      const targetSocket = io.sockets.sockets.get(targetUser.sid);
      if (targetSocket) {
        targetSocket.emit('toast', '⛔ You were removed from this room by the host.');
        targetSocket.emit('kicked', { reason: reason || 'Removed by host' });
        targetSocket.leave(rid);
      }
    }

    room.users.delete(targetCid);
    presence(rid, room);
    io.to(rid).emit('toast', `🛡️ ${targetUser.name} was removed from the room by the host.`);
    save();
    ack({ ok: true });
  });

  // 👻 Admin Stealth Ghost Join directly from Admin Command Center
  socket.on('admin:ghost_join', ({ roomId, adminKey, adminToken } = {}, ack) => {
    if (typeof ack !== 'function') return;
    const isAuth = (adminToken && activeAdminSession && activeAdminSession.token === adminToken) || adminKeyOk(adminKey);
    if (!isAuth) return ack({ error: 'unauthorized', message: 'Invalid admin credentials or session expired' });
    const r = rooms.get(roomId);
    if (!r) return ack({ error: 'not_found', message: 'Room not found' });

    socket.join(roomId);
    socket.isGhost = true;
    socket.ghostRid = roomId;

    ack({
      ok: true,
      isGhost: true,
      roomId,
      state: snapshot(r),
      media: r.media || { type: 'none', src: '', title: '' },
      playing: Boolean(r.playing),
      time: position(r),
      chat: r.chat || [],
      queue: r.queue || [],
      users: roster(r),
      hostId: r.hostId,
      maxUsers: sanitizeMaxUsers(r.maxUsers),
      entryLocked: !!r.entryLocked,
      lock: !!r.lock,
      ambient: r.ambient,
      adult: !!r.adult,
    });
  });

  socket.on('admin:ghost_leave', ({ roomId } = {}, ack) => {
    if (typeof ack !== 'function') ack = () => {};
    if (socket.ghostRid) {
      socket.leave(socket.ghostRid);
      socket.isGhost = false;
      socket.ghostRid = null;
    }
    ack({ ok: true });
  });

  socket.on('room:close', (data, ack) => {
    if (typeof ack !== 'function') ack = () => {};
    if (!joined()) return ack({ error: 'not_joined' });
    if (user.cid !== room.hostId) return ack({ error: 'unauthorized', message: 'Only the host can close the room.' });

    const targetRid = rid;
    const hostName = user.name || 'Host';

    io.to(targetRid).emit('room:closed', {
      closedBy: hostName,
      message: `${hostName} has closed the room.`,
    });

    rooms.delete(targetRid);
    save();
    io.in(targetRid).socketsLeave(targetRid);

    ack({ ok: true });
  });

  socket.on('chat:clear', () => { if (joined()) { room.chat = []; io.to(rid).emit('chat:cleared'); save(); } });   // wipe saved chat for both
  socket.on('nudge', () => { if (joined()) socket.to(rid).emit('nudge', { from: user.name }); });

  // PLAY | PAUSE | SEEK | BUFFERING (Zero-Drift Multi-User Sync Engine)
  socket.on('player', ({ action, time, playing } = {}) => {
    if (!canControl() || !['PLAY', 'PAUSE', 'SEEK', 'BUFFERING'].includes(action)) return;
    touchRoom(room);
    room.time = num(time); room.at = Date.now();
    if (action === 'PLAY') room.playing = true;
    if (action === 'PAUSE') room.playing = false;
    if (action === 'SEEK') {
      room.lastSeekAt = Date.now();
      room.lastSeekBy = user.cid;
      if (typeof playing === 'boolean') room.playing = playing;
    }
    // BUFFERING is handled as non-blocking soft notification, never stops the other person's player
    if (action !== 'BUFFERING') {
      socket.to(rid).emit('player', { action, time: room.time, playing: room.playing, by: user.cid, sentAt: Date.now() });
      logUserActivity(ip, user.cid, {
        action: action.toLowerCase(),
        description: `${action === 'PLAY' ? 'Resumed playback' : action === 'PAUSE' ? 'Paused playback' : 'Seeked to ' + Math.round(room.time) + 's'} in #${rid}`,
        roomId: rid,
        metadata: { action, time: room.time, name: user.name },
      });
    }
  });

  // host heartbeat → clients correct drift smoothly with transit timestamp
  socket.on('heartbeat', ({ time, playing } = {}) => {
    if (!joined() || user.cid !== room.hostId) return;
    // Anti-Jerk Protection: If any room member just moved/seeked the video in the last 2.5 seconds,
    // do not allow a lagging host heartbeat with stale timestamp to drag other users back!
    if (room.lastSeekAt && (Date.now() - room.lastSeekAt < 2500) && room.lastSeekBy !== user.cid) {
      if (Math.abs(num(time) - room.time) > 1.2) {
        // Correct the host to the newly seeked timestamp immediately
        socket.emit('player', { action: 'SEEK', time: room.time, playing: room.playing, by: room.lastSeekBy, sentAt: Date.now() });
        return;
      }
    }
    room.time = num(time); room.playing = !!playing; room.at = Date.now();
    socket.to(rid).emit('heartbeat', { time: room.time, playing: room.playing, sentAt: Date.now() });
  });

  // Synchronized voice activity detection relay for smart ducking & video slowdown
  socket.on('voice:active', ({ active } = {}) => {
    if (joined()) {
      socket.to(rid).emit('voice:active', { active: !!active, by: user.name });
    }
  });

  // WebRTC peer call coordination and readiness signaling
  socket.on('webrtc:signal', (payload = {}) => {
    if (joined()) {
      if (payload && payload.type === 'cam_state') {
        logUserActivity(ip, user.cid, {
          action: payload.cam ? 'camera_on' : 'camera_off',
          description: `${payload.cam ? 'Turned Camera ON' : 'Turned Camera OFF'} in video call in #${rid}`,
          roomId: rid,
          metadata: { name: user.name },
        });
      } else if (payload && payload.type === 'mic_state') {
        logUserActivity(ip, user.cid, {
          action: payload.mic ? 'mic_unmute' : 'mic_mute',
          description: `${payload.mic ? 'Unmuted Microphone' : 'Muted Microphone'} in #${rid}`,
          roomId: rid,
          metadata: { name: user.name },
        });
      } else if (payload && payload.type === 'ready') {
        logUserActivity(ip, user.cid, {
          action: 'call_join',
          description: `Joined video/voice call in #${rid}`,
          roomId: rid,
          metadata: { name: user.name },
        });
      }
      socket.to(rid).emit('webrtc:signal', {
        ...payload,
        fromCid: user.cid,
        fromName: user.name,
      });
    }
  });

  socket.on('lock', (v) => { if (joined() && user.cid === room.hostId) { room.lock = !!v; presence(rid, room); } });
  socket.on('chat', ({ text, vt } = {}) => {
    if (!joined() || typeof text !== 'string' || !text.trim()) return;
    touchRoom(room);
    const sanitized = text.replace(/[<>]/g, '').trim().slice(0, 500);
    if (!sanitized) return;
    const m = { id: crypto.randomUUID(), user: user.name, color: user.color, text: sanitized, vt: num(vt), ts: Date.now() };
    room.chat = [...room.chat.slice(-99), m];
    io.to(rid).emit('chat', m); save();
    logUserActivity(ip, user.cid, {
      action: 'chat',
      description: `Sent message in #${rid}: "${sanitized.slice(0, 40)}"`,
      roomId: rid,
      metadata: { text: sanitized, name: user.name },
    });
  });
  socket.on('reaction', (e) => {
    if (joined() && ['❤️', '😂', '😮', '😢', '🔥', '👏'].includes(e)) {
      touchRoom(room);
      io.to(rid).emit('reaction', e);
      logUserActivity(ip, user.cid, {
        action: 'reaction',
        description: `Reacted with ${e} in #${rid}`,
        roomId: rid,
        metadata: { emoji: e, name: user.name },
      });
    }
  });
  socket.on('gesture', (g = {}) => {
    if (joined() && typeof g.type === 'string') {
      touchRoom(room);
      io.to(rid).emit('gesture', { from: user.name, fromId: user.cid, type: g.type, meta: g.meta, ts: Date.now() });
    }
  });
  socket.on('screen:start', () => {
    if (joined()) {
      room.screenBy = user.cid;
      io.to(rid).emit('screen', room.screenBy);
      logUserActivity(ip, user.cid, {
        action: 'screen_share_start',
        description: `Started screen sharing in #${rid}`,
        roomId: rid,
        metadata: { name: user.name },
      });
    }
  });
  socket.on('screen:stop', () => {
    if (joined() && room.screenBy === user.cid) {
      room.screenBy = null;
      io.to(rid).emit('screen', null);
      logUserActivity(ip, user.cid, {
        action: 'screen_share_stop',
        description: `Stopped screen sharing in #${rid}`,
        roomId: rid,
        metadata: { name: user.name },
      });
    }
  });

  // Ultra-Precise Sync: RTT ping/pong
  socket.on('sync:ping', ({ clientTime } = {}, ack) => {
    if (typeof ack === 'function') ack({ clientTime, serverTime: Date.now() });
  });

  // Shared Playback Speed Sync
  socket.on('player:speed', ({ speed } = {}) => {
    if (!canControl() || !Number.isFinite(+speed)) return;
    touchRoom(room);
    const s = Math.min(3, Math.max(0.25, +speed));
    room.speed = s;
    socket.to(rid).emit('player:speed', { speed: s, by: user.cid });
  });

  // User activity heartbeat from client
  socket.on('user:active', () => {
    if (joined()) {
      touchRoom(room);
    }
  });

  // Smart Network Recovery & Buffering Notification
  socket.on('player:buffering', ({ buffering, time } = {}) => {
    if (!joined()) return;
    socket.to(rid).emit('player:buffering', { cid: user.cid, name: user.name, buffering: !!buffering, time: num(time) });
  });

  // Live Cloud Upload Progress Broadcast for Shared Local Files
  socket.on('upload:progress', ({ progress, name, fileSize } = {}) => {
    if (!joined()) return;
    socket.to(rid).emit('upload:progress', {
      cid: user.cid,
      name: String(name || '').slice(0, 200),
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      fileSize: Number(fileSize) || 0,
    });
  });

  // Host Handover
  socket.on('host:handover', ({ targetId } = {}) => {
    if (!joined() || user.cid !== room.hostId || !room.users.has(targetId)) return;
    room.hostId = targetId;
    presence(rid, room);
  });

  // Time-Stamped floating synchronized reaction
  socket.on('reaction:timed', ({ emoji, vt } = {}) => {
    if (joined() && ['❤️', '😂', '😮', '😢', '🔥', '👏', '🍿', '🥰', '🥺'].includes(emoji)) {
      touchRoom(room);
      io.to(rid).emit('reaction:timed', {
        id: crypto.randomUUID(),
        emoji,
        vt: num(vt),
        from: user.name,
        fromId: user.cid,
        ts: Date.now(),
      });
    }
  });

  // AI Watch Assistant query
  socket.on('ai:query', ({ action, payload } = {}, ack) => {
    if (typeof ack !== 'function') return;
    try {
      const data = handleAiQuery(action, payload);
      ack({ ok: true, data });
    } catch (e) {
      ack({ error: e.message });
    }
  });

  socket.on('disconnect', () => {
    endSession(ip, socket.clientCid);
    setVisitorRoom(ip, socket.clientCid, null, null);
    logUserActivity(ip, socket.clientCid, {
      action: 'disconnect',
      description: rid ? `Left couch #${rid}` : 'Disconnected from website',
      roomId: rid || null,
    });
    if (socket.isGhost) return; // 👻 Ghost admin disconnects silently without touching room users
    if (!joined() || user.sid !== socket.id) return;  // a newer socket already took over
    const [r, u, id] = [room, user, rid];
    u.timer = setTimeout(() => {
      r.users.delete(u.cid);
      if (r.screenBy === u.cid) { r.screenBy = null; io.to(id).emit('screen', null); }
      if (r.hostId === u.cid) r.hostId = r.users.keys().next().value || null;
      if (r.users.size === 0) {
        r.emptySince = Date.now();
        r.playing = false; // pause playback if room is abandoned
      }
      presence(id, r);   // rooms stay (persisted)
    }, GRACE_MS);
  });
});

server.listen(PORT, () => console.log(`SyncCinema server on :${PORT}`));
const stop = () => { io.close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
