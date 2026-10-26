// Real Visitors & Live Cinema Community Tracker for SyncCinema
// 100% Genuine Real-Time Tracking — Device Telemetry, Geolocation, Anti-Manipulation.
// Persists real unique visitors, daily reach, device breakdown, and active sessions.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve persistent storage path (works in Docker volume /app/data and local dev)
const dataDir = process.env.DATA_FILE
  ? path.dirname(path.resolve(process.env.DATA_FILE))
  : path.join(__dirname, 'data');

try {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
} catch (e) {}

const STATS_FILE = path.join(dataDir, 'visitorStats.json');
const VISITORS_LOG_FILE = path.join(dataDir, 'visitorsLog.json');
const ALL_TIME_FILE = path.join(dataDir, 'allTimeVisitors.json');
const ACTIVITY_FEED_FILE = path.join(dataDir, 'activityFeed.json');

// In-memory telemetry state
const stats = {
  totalVisitors: 0,
  todayVisitors: 0,
  totalPageViews: 0,
  lastDate: new Date().toISOString().slice(0, 10),
  uniqueVisitorsSet: new Set(), // Set of unique IP/fingerprint hashes
  todayVisitorsSet: new Set(),  // Set of today's unique IP/fingerprint hashes
  activeSessions: new Map(),    // sessionKey -> timestamp
  dailyHistory: {},             // date (YYYY-MM-DD) -> { date, uniqueVisitors, pageViews, peakLive, mobile, desktop, tablet, countries, topCountry }
};

// Map of currently active visitors: sessionKey -> visitorObject
const activeVisitors = new Map();
// Permanent All-Time Users Store: sessionKey -> visitorObject
const allTimeVisitors = new Map();
// Array of recent genuine website visitors
let recentVisitors = [];
// Real-time live activity wire (what users are doing right now)
let liveActivityWire = [];

// Geolocation memory cache
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

// Normalize IP address
function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  return String(ip).split(',')[0].trim().replace(/^::ffff:/, '');
}

function isLocalIp(ip) {
  if (!ip) return true;
  const n = String(ip).trim().replace(/^::ffff:/, '');
  return (
    n === '127.0.0.1' ||
    n === '::1' ||
    n === 'localhost' ||
    n.startsWith('192.168.') ||
    n.startsWith('10.') ||
    n.startsWith('172.16.') ||
    n.startsWith('172.31.')
  );
}

function maskIp(ip) {
  if (!ip) return '127.0.0.1';
  if (isLocalIp(ip)) return ip;
  const parts = String(ip).split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.${parts[3]}`;
  }
  return ip.slice(0, 8) + '***';
}

// Bot and automated scraper filter
const BOT_REGEX = /bot|crawl|spider|slurp|facebookexternalhit|lighthouse|headless|curl|wget|python|postman|go-http-client|apache-httpclient|node-fetch/i;
let isBotRequestHelper = null;
try {
  isBotRequestHelper = require('./botShield').isBotRequest;
} catch (e) {}

function isBot(userAgent) {
  if (!userAgent) return true; // Empty user-agents are rejected as automated
  if (BOT_REGEX.test(userAgent)) return true;
  if (isBotRequestHelper) {
    try {
      const res = isBotRequestHelper({ headers: { 'user-agent': userAgent }, url: '/' });
      if (res && res.blocked) return true;
    } catch {}
  }
  return false;
}

// Compute deterministic visitor fingerprint
function makeFingerprint(ip, clientId) {
  const normIp = normalizeIp(ip);
  const cleanCid = String(clientId || '').trim();
  return crypto.createHash('sha256').update(`${normIp}::${cleanCid.slice(0, 32)}`).digest('hex').slice(0, 24);
}

// Generate unified session key (1 human = 1 key across tabs, HTTP, and WebSocket)
function makeSessionKey(ip, clientId) {
  const normIp = normalizeIp(ip);
  const cleanCid = String(clientId || '').trim();
  if (cleanCid && cleanCid !== 'anon' && cleanCid !== 'guest') {
    return `${normIp}::${cleanCid}`;
  }
  return normIp;
}

// High-fidelity User-Agent and client telemetry device parser
function parseDeviceDetails(uaString, clientMeta = {}) {
  const ua = String(uaString || '').trim();
  let deviceType = 'Desktop';
  let deviceName = 'PC / Workstation';
  let deviceIcon = '💻';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  // 1. Tablet & Mobile Checks
  if (/iPad/i.test(ua) || clientMeta.platform === 'iPad' || (/Macintosh/i.test(ua) && clientMeta.maxTouchPoints > 1)) {
    deviceType = 'Tablet';
    deviceName = 'Apple iPad';
    deviceIcon = '📟';
    const v = ua.match(/OS (\d+[_\.]\d+)/i);
    os = v ? `iPadOS ${v[1].replace(/_/g, '.')}` : 'iPadOS';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'Mobile';
    deviceName = 'Apple iPhone';
    deviceIcon = '📱';
    const v = ua.match(/OS (\d+[_\.]\d+)/i);
    os = v ? `iOS ${v[1].replace(/_/g, '.')}` : 'iOS';
    // iPhone model heuristics from screen width
    if (clientMeta.screen && clientMeta.screen.width) {
      const sw = clientMeta.screen.width;
      const sh = clientMeta.screen.height;
      if ((sw === 393 && sh === 852) || (sw === 852 && sh === 393)) deviceName = 'Apple iPhone 15 / 14 Pro';
      else if ((sw === 430 && sh === 932) || (sw === 932 && sh === 430)) deviceName = 'Apple iPhone 15 / 14 Pro Max';
      else if ((sw === 390 && sh === 844) || (sw === 844 && sh === 390)) deviceName = 'Apple iPhone 14 / 13 / 12';
      else if ((sw === 414 && sh === 896) || (sw === 896 && sh === 414)) deviceName = 'Apple iPhone 11 / XR';
      else if ((sw === 375 && sh === 667) || (sw === 667 && sh === 375)) deviceName = 'Apple iPhone SE / 8';
    }
  } else if (/Android/i.test(ua)) {
    const isTab = /Tablet|SM-T|GT-P/i.test(ua) || (clientMeta.screen && clientMeta.screen.width >= 768 && clientMeta.screen.height >= 1024);
    deviceType = isTab ? 'Tablet' : 'Mobile';
    deviceName = isTab ? 'Android Tablet' : 'Android Smartphone';
    deviceIcon = isTab ? '📟' : '🤖';
    const v = ua.match(/Android (\d+(\.\d+)?)/i);
    os = v ? `Android ${v[1]}` : 'Android';
    if (/Samsung|SM-|GT-/i.test(ua)) deviceName = isTab ? 'Samsung Galaxy Tab' : 'Samsung Galaxy';
    else if (/Pixel/i.test(ua)) deviceName = 'Google Pixel';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) deviceName = 'Xiaomi / Redmi';
    else if (/OnePlus/i.test(ua)) deviceName = 'OnePlus';
    else if (/Oppo/i.test(ua)) deviceName = 'Oppo';
    else if (/Vivo/i.test(ua)) deviceName = 'Vivo';
    else if (/Realme/i.test(ua)) deviceName = 'Realme';
  } else if (/Windows/i.test(ua)) {
    deviceType = 'Desktop';
    deviceName = 'Windows PC';
    deviceIcon = '🖥️';
    if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10 / 11';
    else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.1/i.test(ua)) os = 'Windows 7';
    else os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'Desktop';
    deviceName = 'Apple Mac';
    deviceIcon = '🍏';
    const v = ua.match(/Mac OS X (\d+[_\.]\d+)/i);
    os = v ? `macOS ${v[1].replace(/_/g, '.')}` : 'macOS';
  } else if (/Linux/i.test(ua)) {
    deviceType = 'Desktop';
    deviceName = 'Linux PC';
    deviceIcon = '🐧';
    os = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    deviceType = 'Desktop';
    deviceName = 'Google Chromebook';
    deviceIcon = '💻';
    os = 'ChromeOS';
  }

  // 2. Browser detection
  if (/SamsungBrowser\/(\d+(\.\d+)?)/i.test(ua)) {
    const v = ua.match(/SamsungBrowser\/(\d+(\.\d+)?)/i);
    browser = `Samsung Internet ${v ? v[1] : ''}`;
  } else if (/Edg\/(\d+(\.\d+)?)/i.test(ua)) {
    const v = ua.match(/Edg\/(\d+(\.\d+)?)/i);
    browser = `Microsoft Edge ${v ? v[1] : ''}`;
  } else if (/Chrome\/(\d+(\.\d+)?)/i.test(ua) && !/Edg|OPR|Brave/i.test(ua)) {
    const v = ua.match(/Chrome\/(\d+(\.\d+)?)/i);
    browser = `Google Chrome ${v ? v[1] : ''}`;
  } else if (/Firefox\/(\d+(\.\d+)?)/i.test(ua)) {
    const v = ua.match(/Firefox\/(\d+(\.\d+)?)/i);
    browser = `Mozilla Firefox ${v ? v[1] : ''}`;
  } else if (/Safari\/(\d+(\.\d+)?)/i.test(ua) && !/Chrome/i.test(ua)) {
    const v = ua.match(/Version\/(\d+(\.\d+)?)/i);
    browser = `Apple Safari ${v ? v[1] : ''}`;
  } else if (/OPR\/(\d+(\.\d+)?)|Opera/i.test(ua)) {
    const v = ua.match(/OPR\/(\d+(\.\d+)?)/i);
    browser = `Opera ${v ? v[1] : ''}`;
  }

  // 3. Screen Resolution formatting
  let screenResolution = 'Responsive Display';
  if (clientMeta.screen && clientMeta.screen.width) {
    const sw = clientMeta.screen.width;
    const sh = clientMeta.screen.height;
    const dpr = clientMeta.screen.dpr || 1;
    screenResolution = `${sw} × ${sh}${dpr > 1 ? ` (@${dpr}x)` : ''}`;
  }

  return {
    deviceType,
    deviceName,
    deviceIcon,
    os,
    browser,
    screenResolution,
    isMobile: deviceType === 'Mobile',
    isTablet: deviceType === 'Tablet',
    isDesktop: deviceType === 'Desktop',
    model: deviceName,
    screen: screenResolution,
    dpr: clientMeta.screen?.dpr || 1,
    rawUa: String(ua).slice(0, 300),
  };
}

// IP Geolocation Resolver with memory caching
async function getGeoForIp(ip) {
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
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city,lat,lon,timezone,isp,query`,
      { signal: controller.signal }
    );
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
}

// Load saved genuine stats from disk
try {
  if (fs.existsSync(STATS_FILE)) {
    const raw = fs.readFileSync(STATS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);

    const savedUnique = Array.isArray(parsed.uniqueList) ? parsed.uniqueList : [];
    savedUnique.forEach((id) => stats.uniqueVisitorsSet.add(id));

    stats.totalVisitors = stats.uniqueVisitorsSet.size || Number(parsed.totalVisitors) || 0;
    stats.totalPageViews = Number(parsed.totalPageViews) || stats.totalVisitors || 0;
    stats.lastDate = parsed.lastDate || today;

    if (stats.lastDate === today) {
      const savedToday = Array.isArray(parsed.todayList) ? parsed.todayList : [];
      savedToday.forEach((id) => stats.todayVisitorsSet.add(id));
      stats.todayVisitors = stats.todayVisitorsSet.size || Number(parsed.todayVisitors) || 0;
    } else {
      stats.todayVisitors = 0;
      stats.todayVisitorsSet.clear();
      stats.lastDate = today;
    }

    if (parsed.dailyHistory && typeof parsed.dailyHistory === 'object') {
      // Filter out any legacy synthetic seed entries (only keep records with genuine telemetry)
      const cleanHistory = {};
      for (const [k, v] of Object.entries(parsed.dailyHistory)) {
        if (v && v.date && !v._synthetic) {
          cleanHistory[k] = v;
        }
      }
      stats.dailyHistory = cleanHistory;
    }
  }
} catch (e) {
  console.warn('visitorStats.json not found or corrupt, starting fresh real tracking:', e.message);
}

// 100% Genuine tracking - ZERO synthetic seeded history!
// Only authentic incoming visitors recorded from live clients.

// Load all-time visitors and activity log from disk
const sanitizeVisitorRecord = (v) => {
  if (!v) return null;
  const key = v.sessionKey || v.id;
  if (!key) return null;
  return {
    ...v,
    isOnline: false,
    pageViews: Number(v.pageViews || 1),
    totalVisits: Number(v.totalVisits || 1),
    roomsVisited: Array.isArray(v.roomsVisited) ? v.roomsVisited : (v.inRoom ? [v.inRoom] : []),
    mediaWatched: Array.isArray(v.mediaWatched) ? v.mediaWatched : [],
    activityLog: Array.isArray(v.activityLog) ? v.activityLog : [],
    allNicknames: Array.isArray(v.allNicknames) ? v.allNicknames : (v.nickname ? [v.nickname] : []),
  };
};

try {
  if (fs.existsSync(ALL_TIME_FILE)) {
    const raw = fs.readFileSync(ALL_TIME_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        const clean = sanitizeVisitorRecord(item);
        if (clean) allTimeVisitors.set(clean.sessionKey || clean.id, clean);
      });
    }
  }
} catch (e) {}

try {
  if (fs.existsSync(VISITORS_LOG_FILE)) {
    const raw = fs.readFileSync(VISITORS_LOG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => {
        const clean = sanitizeVisitorRecord(item);
        if (clean) {
          const k = clean.sessionKey || clean.id;
          if (!allTimeVisitors.has(k)) {
            allTimeVisitors.set(k, clean);
          } else {
            // Merge existing data
            const existing = allTimeVisitors.get(k);
            if (!existing.roomsVisited?.length && clean.roomsVisited?.length) existing.roomsVisited = clean.roomsVisited;
            if (!existing.mediaWatched?.length && clean.mediaWatched?.length) existing.mediaWatched = clean.mediaWatched;
            if (!existing.activityLog?.length && clean.activityLog?.length) existing.activityLog = clean.activityLog;
          }
        }
      });
    }
  }
} catch (e) {}

try {
  if (fs.existsSync(ACTIVITY_FEED_FILE)) {
    const raw = fs.readFileSync(ACTIVITY_FEED_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      liveActivityWire = parsed.slice(0, 300);
    }
  }
} catch (e) {}

// Populate recentVisitors and activeVisitors from allTimeVisitors
recentVisitors = Array.from(allTimeVisitors.values())
  .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
  .slice(0, 10000);
recentVisitors.forEach((v) => {
  if (v && v.sessionKey) {
    activeVisitors.set(v.sessionKey, v);
  }
});

// Debounced asynchronous save to disk (Non-blocking I/O)
let saveTimer = null;
let isSaving = false;
function persistStats() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    if (isSaving) return;
    isSaving = true;
    try {
      const payload = {
        totalVisitors: Math.max(stats.uniqueVisitorsSet.size, allTimeVisitors.size, stats.totalVisitors),
        todayVisitors: stats.todayVisitorsSet.size || stats.todayVisitors,
        totalPageViews: stats.totalPageViews,
        lastDate: stats.lastDate,
        uniqueList: Array.from(stats.uniqueVisitorsSet).slice(-50000),
        todayList: Array.from(stats.todayVisitorsSet),
        dailyHistory: stats.dailyHistory,
        updatedAt: new Date().toISOString(),
      };
      await fs.promises.writeFile(STATS_FILE, JSON.stringify(payload), 'utf8');

      // Persist all-time visitors (sorted by lastActive desc, up to 50,000 users)
      const allTimeArr = Array.from(allTimeVisitors.values())
        .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0))
        .slice(0, 50000);
      await fs.promises.writeFile(ALL_TIME_FILE, JSON.stringify(allTimeArr), 'utf8');

      // Persist recent visitors log for backwards compatibility (up to 10,000)
      const logsPayload = allTimeArr.slice(0, 10000);
      await fs.promises.writeFile(VISITORS_LOG_FILE, JSON.stringify(logsPayload), 'utf8');

      // Persist live activity stream (up to 300 entries)
      await fs.promises.writeFile(ACTIVITY_FEED_FILE, JSON.stringify(liveActivityWire.slice(0, 300)), 'utf8');
    } catch (e) {
      console.warn('Failed to save visitor logs:', e.message);
    } finally {
      isSaving = false;
    }
  }, 2500);
}

// Automated background stale session cleanup (cleans after 45s of silence)
setInterval(() => {
  cleanStaleSessions();
}, 20000).unref();

// Check date rollover at midnight UTC
function checkRollover() {
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastDate !== today) {
    stats.todayVisitors = 0;
    stats.todayVisitorsSet.clear();
    stats.lastDate = today;
    if (!stats.dailyHistory[today]) {
      stats.dailyHistory[today] = {
        date: today,
        uniqueVisitors: 0,
        pageViews: 0,
        peakLive: stats.activeSessions.size || 0,
        mobile: 0,
        desktop: 0,
        tablet: 0,
        countries: {},
        topCountry: 'Global',
      };
    }
    persistStats();
  }
}

// Rate-limiting map for visit recording
const recordRateLimit = new Map();

// Record a genuine visit from a real client with full device telemetry
async function recordVisit(ip, clientId, userAgent = '', clientMeta = {}) {
  checkRollover();

  // Filter out automated bots, scrapers, and headless crawlers
  if (isBot(userAgent)) {
    return;
  }

  const normIp = normalizeIp(ip);
  const now = Date.now();
  const sessionKey = makeSessionKey(normIp, clientId);

  // 1. Parse real device details
  const device = parseDeviceDetails(userAgent, clientMeta);

  // 2. Resolve real geolocation
  let location = clientMeta.geo;
  if (!location || !location.city || location.city.includes('Detecting')) {
    location = await getGeoForIp(normIp);
  }

  // 3. Rate limit: an IP can record at most once every 60 seconds
  const lastRecorded = recordRateLimit.get(normIp) || 0;
  if (now - lastRecorded < 60000) {
    pingSession(normIp, clientId, clientMeta);
    return;
  }
  recordRateLimit.set(normIp, now);

  // Clean old rate limit entries
  if (recordRateLimit.size > 500) {
    const cutoff = now - 120000;
    for (const [k, v] of recordRateLimit.entries()) {
      if (v < cutoff) recordRateLimit.delete(k);
    }
  }

  // 4. Update in allTimeVisitors & activeVisitors
  let visitor = allTimeVisitors.get(sessionKey) || activeVisitors.get(sessionKey);
  if (!visitor) {
    const prev = recentVisitors.find((v) => v.sessionKey === sessionKey);
    visitor = {
      id: prev?.id || 'vis_' + crypto.randomBytes(6).toString('hex'),
      sessionKey,
      ip: normIp,
      maskedIp: maskIp(normIp),
      clientId: clientId || 'anon',
      userAgent: String(userAgent).slice(0, 220),
      device,
      location,
      currentPath: clientMeta.path || '/',
      referrer: clientMeta.referrer || clientMeta.ref || 'Direct Visit',
      firstSeen: prev?.firstSeen || now,
      lastActive: now,
      pageViews: (prev?.pageViews || 0) + 1,
      totalVisits: (prev?.totalVisits || 0) + 1,
      isOnline: true,
      inRoom: clientMeta.inRoom || null,
      nickname: clientMeta.name || prev?.nickname || null,
      screen: device.screenResolution,
      roomsVisited: clientMeta.inRoom ? [clientMeta.inRoom] : (prev?.roomsVisited || []),
      mediaWatched: prev?.mediaWatched || [],
      activityLog: prev?.activityLog || [],
      allNicknames: clientMeta.name ? [clientMeta.name] : (prev?.allNicknames || []),
    };
  } else {
    visitor.lastActive = now;
    visitor.isOnline = true;
    visitor.pageViews = (visitor.pageViews || 0) + 1;
    visitor.totalVisits = (visitor.totalVisits || 1) + 1;
    if (clientMeta.path) visitor.currentPath = clientMeta.path;
    if (clientMeta.ref) visitor.referrer = clientMeta.ref;
    if (clientMeta.inRoom) {
      visitor.inRoom = clientMeta.inRoom;
      if (!Array.isArray(visitor.roomsVisited)) visitor.roomsVisited = [];
      if (!visitor.roomsVisited.includes(clientMeta.inRoom)) {
        visitor.roomsVisited.push(clientMeta.inRoom);
      }
    }
    if (clientMeta.name) {
      visitor.nickname = clientMeta.name;
      if (!Array.isArray(visitor.allNicknames)) visitor.allNicknames = [];
      if (!visitor.allNicknames.includes(clientMeta.name)) {
        visitor.allNicknames.push(clientMeta.name);
      }
    }
    if (device && device.deviceName) visitor.device = device;
    if (location && location.countryCode && !location.country.includes('Detecting')) {
      visitor.location = location;
    }
  }

  // Record initial page visit action
  const act = {
    id: 'act_' + crypto.randomBytes(4).toString('hex'),
    time: now,
    action: 'page_visit',
    description: `Visited ${visitor.currentPath || '/'}`,
    roomId: visitor.inRoom || null,
    target: visitor.currentPath || '/',
  };
  visitor.lastAction = act;
  if (!Array.isArray(visitor.activityLog)) visitor.activityLog = [];
  visitor.activityLog.unshift(act);
  if (visitor.activityLog.length > 50) visitor.activityLog.pop();

  allTimeVisitors.set(sessionKey, visitor);
  activeVisitors.set(sessionKey, visitor);

  // Add to site-wide real-time activity wire
  const wireItem = {
    ...act,
    sessionKey,
    ip: visitor.maskedIp || maskIp(normIp),
    fullIp: normIp,
    clientId: visitor.clientId,
    nickname: visitor.nickname || 'Guest',
    flag: visitor.location?.flag || '🌐',
    city: visitor.location?.city || 'Local',
    country: visitor.location?.country || 'Global',
    deviceIcon: visitor.device?.deviceIcon || '💻',
    deviceName: visitor.device?.deviceName || 'Device',
    path: visitor.currentPath || '/',
  };
  liveActivityWire.unshift(wireItem);
  if (liveActivityWire.length > 300) liveActivityWire.pop();

  // 5. Update recentVisitors list
  const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
  if (existingIdx !== -1) {
    recentVisitors[existingIdx] = visitor;
  } else {
    recentVisitors.unshift(visitor);
    if (recentVisitors.length > 10000) recentVisitors.pop();
  }

  // 6. Record all-time and daily counters
  const fp = makeFingerprint(normIp, clientId);
  if (!stats.uniqueVisitorsSet.has(fp)) {
    if (stats.uniqueVisitorsSet.size >= 100000) {
      const arr = Array.from(stats.uniqueVisitorsSet).slice(-60000);
      stats.uniqueVisitorsSet = new Set(arr);
    }
    stats.uniqueVisitorsSet.add(fp);
    stats.totalVisitors = Math.max(stats.totalVisitors + 1, stats.uniqueVisitorsSet.size, allTimeVisitors.size);
  }
  if (!stats.todayVisitorsSet.has(fp)) {
    stats.todayVisitorsSet.add(fp);
    stats.todayVisitors = stats.todayVisitorsSet.size;
  }
  stats.totalPageViews += 1;

  // 7. Update 100% Real Per-Day Audience Ledger
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!stats.dailyHistory[todayStr]) {
    stats.dailyHistory[todayStr] = {
      date: todayStr,
      uniqueVisitors: 0,
      pageViews: 0,
      peakLive: stats.activeSessions.size || 0,
      mobile: 0,
      desktop: 0,
      tablet: 0,
      countries: {},
      topCountry: location?.country && !location.country.includes('Detecting') ? location.country : 'Pending Geo',
    };
  }
  const dayRecord = stats.dailyHistory[todayStr];
  dayRecord.uniqueVisitors = stats.todayVisitorsSet.size;
  dayRecord.pageViews = (dayRecord.pageViews || 0) + 1;
  const currentLive = stats.activeSessions.size;
  if (currentLive > (dayRecord.peakLive || 0)) {
    dayRecord.peakLive = currentLive;
  }
  if (device.deviceType === 'Mobile') dayRecord.mobile = (dayRecord.mobile || 0) + 1;
  else if (device.deviceType === 'Tablet') dayRecord.tablet = (dayRecord.tablet || 0) + 1;
  else dayRecord.desktop = (dayRecord.desktop || 0) + 1;

  if (location && location.country && !location.country.includes('Detecting')) {
    const c = location.country;
    dayRecord.countries[c] = (dayRecord.countries[c] || 0) + 1;
    let topC = dayRecord.topCountry || c;
    let maxC = 0;
    for (const [k, v] of Object.entries(dayRecord.countries)) {
      if (v > maxC) {
        maxC = v;
        topC = k;
      }
    }
    dayRecord.topCountry = topC;
  }

  pingSession(normIp, clientId, clientMeta);
  persistStats();
}

// Keep an active session alive via periodic heartbeat
function pingSession(ip, clientId, clientMeta = {}) {
  const normIp = normalizeIp(ip);
  const sessionKey = makeSessionKey(normIp, clientId);
  const now = Date.now();
  stats.activeSessions.set(sessionKey, now);

  const visitor = allTimeVisitors.get(sessionKey) || activeVisitors.get(sessionKey);
  if (visitor) {
    visitor.lastActive = now;
    visitor.isOnline = true;
    if (clientMeta.path) visitor.currentPath = clientMeta.path;
    if (clientMeta.inRoom) {
      visitor.inRoom = clientMeta.inRoom;
      if (!Array.isArray(visitor.roomsVisited)) visitor.roomsVisited = [];
      if (!visitor.roomsVisited.includes(clientMeta.inRoom)) visitor.roomsVisited.push(clientMeta.inRoom);
    }
    if (clientMeta.name) {
      visitor.nickname = clientMeta.name;
      if (!Array.isArray(visitor.allNicknames)) visitor.allNicknames = [];
      if (!visitor.allNicknames.includes(clientMeta.name)) visitor.allNicknames.push(clientMeta.name);
    }
    if (clientMeta.screen && !visitor.screen) visitor.screen = clientMeta.screen;

    allTimeVisitors.set(sessionKey, visitor);
    activeVisitors.set(sessionKey, visitor);

    const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
    if (existingIdx !== -1) {
      recentVisitors[existingIdx] = visitor;
    }
  }
}

// Log authentic real-time user action to visitor's audit trail and global activity wire
function logUserActivity(ip, clientId, { action, description, roomId, mediaTitle, metadata } = {}) {
  const normIp = normalizeIp(ip);
  const sessionKey = makeSessionKey(normIp, clientId);
  const now = Date.now();

  let visitor = allTimeVisitors.get(sessionKey) || activeVisitors.get(sessionKey);
  if (!visitor) {
    visitor = {
      id: 'vis_' + crypto.randomBytes(6).toString('hex'),
      sessionKey,
      ip: normIp,
      maskedIp: maskIp(normIp),
      clientId: clientId || 'anon',
      userAgent: '',
      device: { deviceType: 'Desktop', deviceName: 'Connected Device', deviceIcon: '💻' },
      location: null,
      currentPath: roomId ? `/room/${roomId}` : '/',
      referrer: 'Direct Visit',
      firstSeen: now,
      lastActive: now,
      pageViews: 1,
      totalVisits: 1,
      isOnline: true,
      inRoom: roomId || null,
      nickname: metadata?.name || null,
      screen: 'Responsive Display',
      roomsVisited: roomId ? [roomId] : [],
      mediaWatched: [],
      activityLog: [],
      allNicknames: metadata?.name ? [metadata.name] : [],
    };
  }

  visitor.lastActive = now;
  visitor.isOnline = true;
  stats.activeSessions.set(sessionKey, now);

  if (roomId) {
    visitor.inRoom = roomId;
    if (!Array.isArray(visitor.roomsVisited)) visitor.roomsVisited = [];
    if (!visitor.roomsVisited.includes(roomId)) {
      visitor.roomsVisited.push(roomId);
    }
  }

  if (metadata?.name || metadata?.nickname) {
    const nick = metadata.name || metadata.nickname;
    visitor.nickname = nick;
    if (!Array.isArray(visitor.allNicknames)) visitor.allNicknames = [];
    if (!visitor.allNicknames.includes(nick)) {
      visitor.allNicknames.push(nick);
    }
  }

  if (mediaTitle) {
    if (!Array.isArray(visitor.mediaWatched)) visitor.mediaWatched = [];
    const exists = visitor.mediaWatched.some((m) => m.title === mediaTitle);
    if (!exists) {
      visitor.mediaWatched.unshift({
        title: String(mediaTitle).slice(0, 150),
        type: metadata?.type || 'media',
        src: metadata?.src ? String(metadata.src).slice(0, 200) : '',
        at: now,
      });
      if (visitor.mediaWatched.length > 30) visitor.mediaWatched.pop();
    }
  }

  const act = {
    id: 'act_' + crypto.randomBytes(4).toString('hex'),
    time: now,
    action: action || 'activity',
    description: description || 'User activity',
    roomId: roomId || visitor.inRoom || null,
    target: mediaTitle || metadata?.target || metadata?.path || null,
  };

  visitor.lastAction = act;
  if (!Array.isArray(visitor.activityLog)) visitor.activityLog = [];
  visitor.activityLog.unshift(act);
  if (visitor.activityLog.length > 50) visitor.activityLog.pop();

  allTimeVisitors.set(sessionKey, visitor);
  activeVisitors.set(sessionKey, visitor);

  const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
  if (existingIdx !== -1) {
    recentVisitors[existingIdx] = visitor;
  } else {
    recentVisitors.unshift(visitor);
    if (recentVisitors.length > 10000) recentVisitors.pop();
  }

  const wireItem = {
    id: act.id,
    time: now,
    action: act.action,
    description: act.description,
    roomId: act.roomId,
    target: act.target,
    sessionKey,
    ip: visitor.maskedIp || maskIp(normIp),
    fullIp: normIp,
    clientId: visitor.clientId,
    nickname: visitor.nickname || 'Guest',
    flag: visitor.location?.flag || '🌐',
    city: visitor.location?.city || 'Connected Peer',
    country: visitor.location?.country || 'Global',
    deviceIcon: visitor.device?.deviceIcon || '💻',
    deviceName: visitor.device?.deviceName || 'Device',
    path: visitor.currentPath || '/',
  };

  liveActivityWire.unshift(wireItem);
  if (liveActivityWire.length > 300) liveActivityWire.pop();

  persistStats();
  return wireItem;
}

// Associate visitor with active cinema room and nickname
function setVisitorRoom(ip, clientId, roomId, nickname = null) {
  const normIp = normalizeIp(ip);
  const sessionKey = makeSessionKey(normIp, clientId);
  const visitor = allTimeVisitors.get(sessionKey) || activeVisitors.get(sessionKey);
  if (visitor) {
    visitor.inRoom = roomId || null;
    if (nickname) {
      visitor.nickname = nickname;
      if (!Array.isArray(visitor.allNicknames)) visitor.allNicknames = [];
      if (!visitor.allNicknames.includes(nickname)) visitor.allNicknames.push(nickname);
    }
    if (roomId) {
      if (!Array.isArray(visitor.roomsVisited)) visitor.roomsVisited = [];
      if (!visitor.roomsVisited.includes(roomId)) visitor.roomsVisited.push(roomId);
    }
    visitor.lastActive = Date.now();
    visitor.isOnline = true;

    allTimeVisitors.set(sessionKey, visitor);
    activeVisitors.set(sessionKey, visitor);

    const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
    if (existingIdx !== -1) {
      recentVisitors[existingIdx] = visitor;
    }
  }
}

// Remove session when a client disconnects or leaves
function endSession(ip, clientId) {
  const normIp = normalizeIp(ip);
  const sessionKey = makeSessionKey(normIp, clientId);
  stats.activeSessions.delete(sessionKey);

  const visitor = allTimeVisitors.get(sessionKey) || activeVisitors.get(sessionKey);
  if (visitor) {
    visitor.isOnline = false;
    visitor.lastActive = Date.now();
    allTimeVisitors.set(sessionKey, visitor);
    const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
    if (existingIdx !== -1) {
      recentVisitors[existingIdx].isOnline = false;
    }
  }
}

// Clean stale sessions (inactive for > 45 seconds)
function cleanStaleSessions() {
  const now = Date.now();
  const cutoff = now - 45 * 1000;
  for (const [id, ts] of stats.activeSessions.entries()) {
    if (ts < cutoff) {
      stats.activeSessions.delete(id);
      const v = activeVisitors.get(id);
      if (v) v.isOnline = false;
      const atV = allTimeVisitors.get(id);
      if (atV) atV.isOnline = false;
    }
  }

  // Prune long-inactive visitors from activeVisitors map to prevent unbounded memory growth
  if (activeVisitors.size > 1000) {
    const offlineCutoff = now - 24 * 60 * 60 * 1000; // 24 hours
    for (const [key, v] of activeVisitors.entries()) {
      if ((v.lastActive || 0) < offlineCutoff && !stats.activeSessions.has(key)) {
        activeVisitors.delete(key);
      }
    }
    if (activeVisitors.size > 2000) {
      const excess = activeVisitors.size - 2000;
      let removed = 0;
      for (const [key] of activeVisitors.entries()) {
        if (!stats.activeSessions.has(key)) {
          activeVisitors.delete(key);
          removed++;
          if (removed >= excess) break;
        }
      }
    }
  }
}

// Get genuine, 100% real stats snapshot for homepage badge
function getVisitorStats(activeRoomsCount = 0) {
  checkRollover();
  cleanStaleSessions();

  return {
    totalVisitors: Math.max(stats.uniqueVisitorsSet.size, allTimeVisitors.size),
    todayVisitors: stats.todayVisitorsSet.size,
    totalPageViews: stats.totalPageViews,
    liveVisitors: stats.activeSessions.size,
    activeRooms: Number(activeRoomsCount) || 0,
  };
}

// Get full 100% genuine real telemetry for the Admin Panel
function getAdminVisitorsData(options = {}) {
  checkRollover();
  cleanStaleSessions();

  const now = Date.now();
  const liveList = [];
  for (const v of activeVisitors.values()) {
    if (now - (v.lastActive || 0) <= 50000) {
      v.isOnline = true;
      liveList.push(v);
    } else {
      v.isOnline = false;
    }
  }

  for (const v of allTimeVisitors.values()) {
    v.isOnline = now - (v.lastActive || 0) <= 50000;
  }

  // Calculate real device distribution across all-time records
  let mobileCount = 0;
  let desktopCount = 0;
  let tabletCount = 0;
  const deviceModelMap = {};
  const browserMap = {};
  const countryMap = {};
  const osMap = {};

  const sourceVisitors = allTimeVisitors.size > 0 ? Array.from(allTimeVisitors.values()) : recentVisitors;

  sourceVisitors.forEach((v) => {
    const t = v.device?.deviceType || 'Desktop';
    if (t === 'Mobile') mobileCount++;
    else if (t === 'Tablet') tabletCount++;
    else desktopCount++;

    const dName = v.device?.deviceName || 'Desktop PC';
    deviceModelMap[dName] = (deviceModelMap[dName] || 0) + 1;

    const bName = v.device?.browser || 'Browser';
    browserMap[bName] = (browserMap[bName] || 0) + 1;

    const osName = v.device?.os || 'Other OS';
    osMap[osName] = (osMap[osName] || 0) + 1;

    const cName = v.location?.country || 'Unknown';
    if (!countryMap[cName]) {
      countryMap[cName] = {
        country: cName,
        code: v.location?.countryCode || '',
        flag: v.location?.flag || '🌐',
        count: 0,
      };
    }
    countryMap[cName].count++;
  });

  const topDeviceModels = Object.entries(deviceModelMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topBrowsers = Object.entries(browserMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topCountries = Object.values(countryMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Format all-time visitors list (sorted by lastActive desc)
  const allTimeSorted = Array.from(allTimeVisitors.values())
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

  const formatVisitor = (v) => ({
    ...v,
    cid: v.clientId,
    geo: v.location,
    currentRoom: v.inRoom,
    hits: v.pageViews || 1,
    visits: v.totalVisits || 1,
    lastSeen: v.lastActive,
    online: Boolean(v.isOnline),
    roomsVisited: v.roomsVisited || [],
    mediaWatched: v.mediaWatched || [],
    activityLog: v.activityLog || [],
    lastAction: v.lastAction || null,
  });

  const maxToReturn = options.all ? allTimeSorted.length : Math.min(1000, allTimeSorted.length);
  const formattedAllTime = allTimeSorted.slice(0, maxToReturn).map(formatVisitor);
  const formattedLive = liveList.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0)).map(formatVisitor);

  // Format 100% Real Daily Audience Ledger
  const sortedDailyHistory = Object.values(stats.dailyHistory || {})
    .sort((a, b) => b.date.localeCompare(a.date));

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

  const todayRecord = stats.dailyHistory?.[todayStr] || {
    date: todayStr,
    uniqueVisitors: stats.todayVisitorsSet.size,
    pageViews: stats.totalPageViews,
    peakLive: stats.activeSessions.size,
    mobile: mobileCount,
    desktop: desktopCount,
    tablet: tabletCount,
    topCountry: topCountries[0]?.country || (sourceVisitors.length > 0 ? 'Detecting' : 'No Visitors Yet'),
  };

  const yesterdayRecord = stats.dailyHistory?.[yesterdayStr] || null;

  const past7Days = sortedDailyHistory.slice(0, 7);
  const sevenDayUnique = past7Days.reduce((acc, d) => acc + (d.uniqueVisitors || 0), 0);
  const sevenDayPageViews = past7Days.reduce((acc, d) => acc + (d.pageViews || 0), 0);
  const peakDayRecord = sortedDailyHistory.reduce((peak, d) => {
    return (!peak || (d.uniqueVisitors || 0) > (peak.uniqueVisitors || 0)) ? d : peak;
  }, null);

  const totalDev = mobileCount + desktopCount + tabletCount;

  return {
    summary: {
      totalAllTime: allTimeVisitors.size,
      totalAllTimeUsers: allTimeVisitors.size,
      liveOnline: stats.activeSessions.size,
      onlineNow: stats.activeSessions.size,
      todayUnique: stats.todayVisitorsSet.size,
      totalUnique: Math.max(stats.uniqueVisitorsSet.size, allTimeVisitors.size),
      totalPageViews: stats.totalPageViews,
      totalRecorded: allTimeVisitors.size,
      mobileCount,
      desktopCount,
      tabletCount,
      devices: {
        mobile: mobileCount,
        desktop: desktopCount,
        tablet: tabletCount,
        total: totalDev,
      },
      topDeviceModels,
      topBrowsers,
      topCountries,
      dailyGrowth: {
        today: todayRecord,
        yesterday: yesterdayRecord,
        sevenDayUnique,
        sevenDayPageViews,
        sevenDayAverage: past7Days.length > 0 ? Math.round(sevenDayUnique / past7Days.length) : 0,
        peakDay: peakDayRecord,
      },
    },
    dailyHistory: sortedDailyHistory.slice(0, 30),
    breakdown: {
      os: osMap,
      browsers: browserMap,
      countries: Object.fromEntries(Object.values(countryMap).map((c) => [c.country, c.count])),
    },
    liveVisitors: formattedLive,
    online: formattedLive,
    allTimeVisitors: formattedAllTime,
    allTime: formattedAllTime,
    recentVisitors: formattedAllTime,
    recent: formattedAllTime,
    liveActivityWire: liveActivityWire.slice(0, 100),
    activityFeed: liveActivityWire.slice(0, 100),
  };
}

module.exports = {
  recordVisit,
  pingSession,
  setVisitorRoom,
  endSession,
  getVisitorStats,
  getAdminVisitorsData,
  logUserActivity,
  parseDeviceDetails,
  getGeoForIp,
};
