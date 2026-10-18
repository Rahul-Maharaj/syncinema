// Real Visitors & Live Cinema Community Tracker for SyncCinema
// 100% Genuine Tracking — Zero fake seeds, zero artificial floors.
// Persists real unique visitors, daily reach, total page loads, and live active users.

const fs = require('fs');
const path = require('path');

const STATS_FILE = path.join(__dirname, 'visitorStats.json');

// In-memory stats
const stats = {
  totalVisitors: 0,
  todayVisitors: 0,
  totalPageViews: 0,
  lastDate: new Date().toISOString().slice(0, 10),
  uniqueVisitorsSet: new Set(),
  todayVisitorsSet: new Set(),
  activeSessions: new Map(), // sessionId -> timestamp
};

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
        uniqueList: Array.from(stats.uniqueVisitorsSet).slice(-5000), // retain recent 5000 unique IDs to limit file size
        todayList: Array.from(stats.todayVisitorsSet),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(STATS_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      console.warn('Failed to save visitorStats.json:', e.message);
    }
  }, 2000);
}

// Check date rollover at midnight
function checkRollover() {
  const today = new Date().toISOString().slice(0, 10);
  if (stats.lastDate !== today) {
    stats.todayVisitors = 0;
    stats.todayVisitorsSet.clear();
    stats.lastDate = today;
    persistStats();
  }
}

// Record a genuine visit from a real client
function recordVisit(clientId) {
  checkRollover();
  stats.totalPageViews += 1;

  const id = String(clientId || 'anon').trim();
  if (id && id !== 'anon' && id !== 'guest') {
    if (!stats.uniqueVisitorsSet.has(id)) {
      stats.uniqueVisitorsSet.add(id);
      stats.totalVisitors = stats.uniqueVisitorsSet.size;
    }
    if (!stats.todayVisitorsSet.has(id)) {
      stats.todayVisitorsSet.add(id);
      stats.todayVisitors = stats.todayVisitorsSet.size;
    }
    stats.activeSessions.set(id, Date.now());
  } else {
    // Fallback for anonymous
    stats.totalVisitors = Math.max(stats.totalVisitors + 1, stats.uniqueVisitorsSet.size);
    stats.todayVisitors = Math.max(stats.todayVisitors + 1, stats.todayVisitorsSet.size);
  }

  persistStats();
}

// Keep an active session alive via periodic heartbeat
function pingSession(clientId) {
  if (clientId) {
    const id = String(clientId).trim();
    stats.activeSessions.set(id, Date.now());
  }
}

// Remove session when a client disconnects or leaves
function endSession(clientId) {
  if (clientId) {
    const id = String(clientId).trim();
    stats.activeSessions.delete(id);
  }
}

// Clean stale sessions (inactive for > 45 seconds)
function cleanStaleSessions() {
  const cutoff = Date.now() - 45 * 1000;
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
    totalVisitors: stats.uniqueVisitorsSet.size || stats.totalVisitors,
    todayVisitors: stats.todayVisitorsSet.size || stats.todayVisitors,
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
