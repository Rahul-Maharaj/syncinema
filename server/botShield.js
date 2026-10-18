// Anti-Bot Shield & Threat Defense Engine for SyncCinema
// 100% Bot-Free Enforcement: Blocks scrapers, automated headless tools, scanners, exploit probes, and AI harvesters.

const BOT_UA_PATTERNS = [
  // HTTP Libraries & Script Scrapers
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /httpx/i,
  /libwww-perl/i,
  /go-http-client/i,
  /axios\//i,
  /node-fetch/i,
  /got\//i,
  /okhttp/i,
  /scrapy/i,
  /mechanize/i,
  /java\/\d/i,
  /apache-httpclient/i,
  /php\/\d/i,

  // Headless Browsers & Automation Frameworks
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /nightwatch/i,
  /cypress/i,
  /webdriver/i,
  /htmlunit/i,
  /slimerjs/i,

  // Vulnerability Scanners & Attack Tools
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /zgrab/i,
  /acunetix/i,
  /nessus/i,
  /burpcollaborator/i,
  /nuclei/i,
  /openvas/i,
  /wprecon/i,
  /censys/i,
  /shodan/i,
  /dirbuster/i,
  /gobuster/i,
  /ffuf/i,
  /hydra/i,
  /wpscan/i,
  /havij/i,
  /netsparker/i,

  // AI Scrapers & Commercial Aggressors
  /gptbot/i,
  /chatgpt-user/i,
  /ccbot/i,
  /anthropic-ai/i,
  /claude-web/i,
  /bytespider/i,
  /amazonbot/i,
  /cohere-ai/i,
  /perplexitybot/i,
  /diffbot/i,
  /omgili/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /megaindex/i,
  /blexbot/i,
  /petalbot/i,
  /yisouspider/i,
];

// Dangerous file probes and exploit scanning patterns
const PROBE_PATTERNS = [
  /\.(env|git|svn|htaccess|aws|sql|bak|old|swp|tar|gz|zip|conf|ini|yaml|yml)($|\/|\?)/i,
  /(wp-login|wp-admin|phpmyadmin|pma|actuator|xmlrpc|setup\.php|shell\.php|eval-stdin|solr|cgi-bin|autodiscover|remote\/login)/i,
];

// Legitimate search engines (only allowed on static public roots for SEO indexing)
const LEGIT_SEARCH_ENGINES = /googlebot|bingbot/i;

// In-memory auto-banned bot IPs
const bannedBotIps = new Set();

function isBotRequest(req) {
  const ua = String(req.headers['user-agent'] || '').trim();
  const url = String(req.url || '');
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();

  // 1. Immediately drop already banned bot IPs (except legitimate human browser WebSockets on shared mobile CGNAT)
  const isBrowserWs = (url.includes('/socket.io') || req.headers?.upgrade === 'websocket') &&
                      ua.includes('Mozilla/') &&
                      !BOT_UA_PATTERNS.some((p) => p.test(ua));

  if (bannedBotIps.has(ip) && !isBrowserWs) {
    return { blocked: true, reason: 'Permanently blocked bot IP' };
  }

  // 2. Block vulnerability / exploit probes
  for (const pattern of PROBE_PATTERNS) {
    if (pattern.test(url)) {
      bannedBotIps.add(ip);
      return { blocked: true, reason: 'Exploit probe attempt detected', ban: true };
    }
  }

  // 3. Reject missing or abnormally short User-Agents (< 8 chars)
  if (!ua || ua.length < 8) {
    return { blocked: true, reason: 'Missing or invalid browser User-Agent' };
  }

  // 4. Check for known bot signatures
  for (const pattern of BOT_UA_PATTERNS) {
    if (pattern.test(ua)) {
      return { blocked: true, reason: 'Automated bot or scraper detected' };
    }
  }

  // 5. Allow Googlebot and Bingbot ONLY on public discovery pages (/robots.txt, /sitemap.xml, /)
  if (LEGIT_SEARCH_ENGINES.test(ua)) {
    const isPublicDiscovery = url === '/' || url.startsWith('/sitemap') || url.startsWith('/robots') || url.startsWith('/_next/');
    if (!isPublicDiscovery) {
      return { blocked: true, reason: 'Bots prohibited from private rooms and interactive APIs' };
    }
    return { blocked: false };
  }

  // 6. Generic "bot" / "spider" / "crawler" catch-all
  if (/\b(bot|crawler|spider|scraper)\b/i.test(ua) && !LEGIT_SEARCH_ENGINES.test(ua)) {
    return { blocked: true, reason: 'Generic crawler or bot detected' };
  }

  return { blocked: false };
}

// Express / Gateway Middleware
function botShieldMiddleware(req, res, next) {
  // Always permit internal healthcheck
  if (req.url === '/health' || req.url === '/api/health') {
    return next();
  }

  const check = isBotRequest(req);
  if (check.blocked) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    console.warn(`[BotShield] Blocked bot from ${ip} - Path: ${req.url} - Reason: ${check.reason}`);
    res.setHeader('X-Bot-Shield', 'Access-Denied');
    res.setHeader('Connection', 'close');
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="utf-8"><title>403 Forbidden - Bot Access Denied</title></head>
      <body style="background:#090514;color:#f43f5e;font-family:sans-serif;text-align:center;padding:50px;">
        <h2>🛡️ SyncCinema Anti-Bot Shield</h2>
        <p>Access Denied: Automated bots, crawlers, and scrapers are strictly prohibited on this platform.</p>
        <p style="color:#888;font-size:12px;">Human verification required.</p>
      </body>
      </html>
    `.trim());
  }

  next();
}

module.exports = {
  isBotRequest,
  botShieldMiddleware,
  bannedBotIps,
};
