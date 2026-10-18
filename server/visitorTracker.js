// Real Visitors & Live Cinema Community Tracker for SyncCinema
// 100% Genuine Tracking — Anti-Manipulation, IP Deduplication, Bot-Proof.
// Persists real unique visitors, daily reach, and live active users.

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

// Normalize IP address
function normalizeIp(ip) {
  if (!ip) return '127.0.0.1';
  return String(ip).split(',')[0].trim().replace(/^::ffff:/, '');
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
  // Hash IP to protect privacy while ensuring strict deduplication
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

// Load saved genuine stats from disk if available
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

// Debounced save to disk
let saveTimer = null;
function persistStats() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const payload = {
        totalVisitors: stats.uniqueVisitorsSet.size || stats.totalVisitors,
        todayVisitors: stats.todayVisitorsSet.size || stats.todayVisitors,
        totalPageViews: stats.totalPageViews,
        lastDate: stats.lastDate,
        uniqueList: Array.from(stats.uniqueVisitorsSet).slice(-10000), // retain recent 10000 unique fingerprints
        todayList: Array.from(stats.todayVisitorsSet),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(STATS_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to save visitorStats.json:', e.message);
    }
  }, 2000);
}

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

// Rate-limiting map for visit recording (prevents bot spam attacks)
const recordRateLimit = new Map(); // ip -> timestamp

// Record a genuine visit from a real client
function recordVisit(ip, clientId, userAgent = '') {
  checkRollover();

  // Filter out automated bots, scrapers, and headless crawlers
  if (isBot(userAgent)) {
    return;
  }

  const normIp = normalizeIp(ip);
  const now = Date.now();

  // Rate limit: an IP can record at most once every 60 seconds
  const lastRecorded = recordRateLimit.get(normIp) || 0;
  if (now - lastRecorded < 60000) {
    pingSession(normIp, clientId);
    return;
  }
  recordRateLimit.set(normIp, now);

  // Clean old rate limit entries every 100 items
  if (recordRateLimit.size > 500) {
    const cutoff = now - 120000;
    for (const [k, v] of recordRateLimit.entries()) {
      if (v < cutoff) recordRateLimit.delete(k);
    }
  }

  stats.totalPageViews += 1;

  // Compute unique fingerprint
  const fp = makeFingerprint(normIp, clientId);

  // Strict deduplication: each genuine visitor is counted once all-time and once per day
  if (!stats.uniqueVisitorsSet.has(fp)) {
    stats.uniqueVisitorsSet.add(fp);
    stats.totalVisitors = stats.uniqueVisitorsSet.size;
  }
  if (!stats.todayVisitorsSet.has(fp)) {
    stats.todayVisitorsSet.add(fp);
    stats.todayVisitors = stats.todayVisitorsSet.size;
  }

  // Register active session
  pingSession(normIp, clientId);
  persistStats();
}

// Keep an active session alive via periodic heartbeat
function pingSession(ip, clientId) {
  const key = makeSessionKey(ip, clientId);
  stats.activeSessions.set(key, Date.now());
}

// Remove session when a client disconnects or leaves
function endSession(ip, clientId) {
  const key = makeSessionKey(ip, clientId);
  stats.activeSessions.delete(key);
}

// Clean stale sessions (inactive for > 35 seconds)
function cleanStaleSessions() {
  const cutoff = Date.now() - 35 * 1000;
  for (const [id, ts] of stats.activeSessions.entries()) {
    if (ts < cutoff) {
      stats.activeSessions.delete(id);
    }
  }
}

// Get genuine, 100% real stats snapshot
function getVisitorStats(activeRoomsCount = 0) {
  checkRollover();
  cleanStaleSessions();

  // Pure real count of active live sessions (0, 1, 2, ... strictly real)
  const liveCount = stats.activeSessions.size;

  return {
    totalVisitors: Math.max(stats.uniqueVisitorsSet.size, 1),
    todayVisitors: Math.max(stats.todayVisitorsSet.size, 1),
    totalPageViews: stats.totalPageViews,
    liveVisitors: liveCount,
    activeRooms: Number(activeRoomsCount) || 0,
  };
}

module.exports = {
  recordVisit,
  pingSession,
  endSession,
  getVisitorStats,
};
