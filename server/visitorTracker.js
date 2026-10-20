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

// In-memory telemetry state
const stats = {
  totalVisitors: 0,
  todayVisitors: 0,
  totalPageViews: 0,
  lastDate: new Date().toISOString().slice(0, 10),
  uniqueVisitorsSet: new Set(), // Set of unique IP/fingerprint hashes
  todayVisitorsSet: new Set(),  // Set of today's unique IP/fingerprint hashes
  activeSessions: new Map(),    // sessionKey -> timestamp
};

// Map of currently active visitors: sessionKey -> visitorObject
const activeVisitors = new Map();
// Array of recent genuine website visitors (capped at 300)
let recentVisitors = [];

// Geolocation memory cache
const geoCache = new Map();

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
        geoCache.set(ip, geo);
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
  geoCache.set(ip, fallback);
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
  }
} catch (e) {
  console.warn('visitorStats.json not found or corrupt, starting fresh real tracking:', e.message);
}

// Load recent visitors log
try {
  if (fs.existsSync(VISITORS_LOG_FILE)) {
    const raw = fs.readFileSync(VISITORS_LOG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      recentVisitors = parsed.slice(0, 300);
      // Pre-fill activeVisitors map from recent visitors
      recentVisitors.forEach((v) => {
        if (v && v.sessionKey) {
          activeVisitors.set(v.sessionKey, v);
        }
      });
    }
  }
} catch (e) {}

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
        totalVisitors: stats.uniqueVisitorsSet.size || stats.totalVisitors,
        todayVisitors: stats.todayVisitorsSet.size || stats.todayVisitors,
        totalPageViews: stats.totalPageViews,
        lastDate: stats.lastDate,
        uniqueList: Array.from(stats.uniqueVisitorsSet).slice(-10000),
        todayList: Array.from(stats.todayVisitorsSet),
        updatedAt: new Date().toISOString(),
      };
      await fs.promises.writeFile(STATS_FILE, JSON.stringify(payload), 'utf8');

      // Persist recent visitors log (capped at 300)
      const logsPayload = recentVisitors.slice(0, 300);
      await fs.promises.writeFile(VISITORS_LOG_FILE, JSON.stringify(logsPayload), 'utf8');
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

  // 4. Update in activeVisitors map
  let visitor = activeVisitors.get(sessionKey);
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
      isOnline: true,
      inRoom: clientMeta.inRoom || null,
      nickname: clientMeta.name || null,
      screen: device.screenResolution,
    };
    activeVisitors.set(sessionKey, visitor);
  } else {
    visitor.lastActive = now;
    visitor.isOnline = true;
    visitor.pageViews = (visitor.pageViews || 1) + 1;
    if (clientMeta.path) visitor.currentPath = clientMeta.path;
    if (clientMeta.ref) visitor.referrer = clientMeta.ref;
    if (clientMeta.inRoom) visitor.inRoom = clientMeta.inRoom;
    if (clientMeta.name) visitor.nickname = clientMeta.name;
    if (device && device.deviceName) visitor.device = device;
    if (location && location.countryCode) visitor.location = location;
  }

  // 5. Update recentVisitors list (capped at 300)
  const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
  if (existingIdx !== -1) {
    recentVisitors[existingIdx] = { ...visitor };
  } else {
    recentVisitors.unshift({ ...visitor });
    if (recentVisitors.length > 300) recentVisitors.pop();
  }

  // 6. Record all-time and daily counters
  const fp = makeFingerprint(normIp, clientId);
  if (!stats.uniqueVisitorsSet.has(fp)) {
    stats.uniqueVisitorsSet.add(fp);
    stats.totalVisitors = stats.uniqueVisitorsSet.size;
  }
  if (!stats.todayVisitorsSet.has(fp)) {
    stats.todayVisitorsSet.add(fp);
    stats.todayVisitors = stats.todayVisitorsSet.size;
  }
  stats.totalPageViews += 1;

  pingSession(normIp, clientId, clientMeta);
  persistStats();
}

// Keep an active session alive via periodic heartbeat
function pingSession(ip, clientId, clientMeta = {}) {
  const normIp = normalizeIp(ip);
  const sessionKey = makeSessionKey(normIp, clientId);
  const now = Date.now();
  stats.activeSessions.set(sessionKey, now);

  const visitor = activeVisitors.get(sessionKey);
  if (visitor) {
    visitor.lastActive = now;
    visitor.isOnline = true;
    if (clientMeta.path) visitor.currentPath = clientMeta.path;
    if (clientMeta.inRoom) visitor.inRoom = clientMeta.inRoom;
    if (clientMeta.name) visitor.nickname = clientMeta.name;
    if (clientMeta.screen && !visitor.screen) visitor.screen = clientMeta.screen;

    const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
    if (existingIdx !== -1) {
      recentVisitors[existingIdx] = { ...visitor };
    }
  }
}

// Associate visitor with active cinema room and nickname
function setVisitorRoom(ip, clientId, roomId, nickname = null) {
  const normIp = normalizeIp(ip);
  const sessionKey = makeSessionKey(normIp, clientId);
  const visitor = activeVisitors.get(sessionKey);
  if (visitor) {
    visitor.inRoom = roomId || null;
    if (nickname) visitor.nickname = nickname;
    visitor.lastActive = Date.now();
    visitor.isOnline = true;

    const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
    if (existingIdx !== -1) {
      recentVisitors[existingIdx] = { ...visitor };
    }
  }
}

// Remove session when a client disconnects or leaves
function endSession(ip, clientId) {
  const normIp = normalizeIp(ip);
  const sessionKey = makeSessionKey(normIp, clientId);
  stats.activeSessions.delete(sessionKey);

  const visitor = activeVisitors.get(sessionKey);
  if (visitor) {
    visitor.isOnline = false;
    const existingIdx = recentVisitors.findIndex((v) => v.sessionKey === sessionKey);
    if (existingIdx !== -1) {
      recentVisitors[existingIdx].isOnline = false;
    }
  }
}

// Clean stale sessions (inactive for > 45 seconds)
function cleanStaleSessions() {
  const cutoff = Date.now() - 45 * 1000;
  for (const [id, ts] of stats.activeSessions.entries()) {
    if (ts < cutoff) {
      stats.activeSessions.delete(id);
      const v = activeVisitors.get(id);
      if (v) v.isOnline = false;
    }
  }
}

// Get genuine, 100% real stats snapshot for homepage badge
function getVisitorStats(activeRoomsCount = 0) {
  checkRollover();
  cleanStaleSessions();

  return {
    totalVisitors: Math.max(stats.uniqueVisitorsSet.size, 1),
    todayVisitors: Math.max(stats.todayVisitorsSet.size, 1),
    totalPageViews: stats.totalPageViews,
    liveVisitors: stats.activeSessions.size,
    activeRooms: Number(activeRoomsCount) || 0,
  };
}

// Get full 100% genuine real telemetry for the Admin Panel
function getAdminVisitorsData() {
  checkRollover();
  cleanStaleSessions();

  const now = Date.now();
  const liveList = [];
  for (const v of activeVisitors.values()) {
    if (now - v.lastActive <= 50000) {
      v.isOnline = true;
      liveList.push(v);
    } else {
      v.isOnline = false;
    }
  }

  // Calculate real device distribution
  let mobileCount = 0;
  let desktopCount = 0;
  let tabletCount = 0;
  const deviceModelMap = {};
  const browserMap = {};
  const countryMap = {};

  const allKnown = recentVisitors.length > 0 ? recentVisitors : liveList;

  allKnown.forEach((v) => {
    const t = v.device?.deviceType || 'Desktop';
    if (t === 'Mobile') mobileCount++;
    else if (t === 'Tablet') tabletCount++;
    else desktopCount++;

    const dName = v.device?.deviceName || 'Desktop PC';
    deviceModelMap[dName] = (deviceModelMap[dName] || 0) + 1;

    const bName = v.device?.browser || 'Browser';
    browserMap[bName] = (browserMap[bName] || 0) + 1;

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

  const osMap = {};
  allKnown.forEach((v) => {
    const osName = v.device?.os || 'Other OS';
    osMap[osName] = (osMap[osName] || 0) + 1;
  });

  const formattedVisitors = recentVisitors.slice(0, 150).map((v) => ({
    ...v,
    cid: v.clientId,
    geo: v.location,
    currentRoom: v.inRoom,
    hits: v.pageViews,
    lastSeen: v.lastActive,
    online: v.isOnline,
  }));

  const formattedLive = liveList.sort((a, b) => b.lastActive - a.lastActive).map((v) => ({
    ...v,
    cid: v.clientId,
    geo: v.location,
    currentRoom: v.inRoom,
    hits: v.pageViews,
    lastSeen: v.lastActive,
    online: v.isOnline,
  }));

  return {
    summary: {
      liveOnline: stats.activeSessions.size,
      onlineNow: stats.activeSessions.size,
      todayUnique: Math.max(stats.todayVisitorsSet.size, 1),
      totalUnique: Math.max(stats.uniqueVisitorsSet.size, 1),
      totalPageViews: stats.totalPageViews,
      totalRecorded: recentVisitors.length,
      mobileCount,
      desktopCount,
      tabletCount,
      devices: {
        mobile: mobileCount,
        desktop: desktopCount,
        tablet: tabletCount,
        total: mobileCount + desktopCount + tabletCount || 1,
      },
      topDeviceModels,
      topBrowsers,
      topCountries,
    },
    breakdown: {
      os: osMap,
      browsers: browserMap,
      countries: Object.fromEntries(Object.values(countryMap).map((c) => [c.country, c.count])),
    },
    liveVisitors: formattedLive,
    online: formattedLive,
    recentVisitors: formattedVisitors,
    recent: formattedVisitors,
  };
}

module.exports = {
  recordVisit,
  pingSession,
  setVisitorRoom,
  endSession,
  getVisitorStats,
  getAdminVisitorsData,
  parseDeviceDetails,
  getGeoForIp,
};
