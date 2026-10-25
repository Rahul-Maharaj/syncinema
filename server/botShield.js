// Anti-Bot Shield & Threat Defense Engine for SyncCinema
// 100% Bot-Free Enforcement: Blocks malicious scrapers, automated headless exploit tools, and scanners
// while 100% preserving access for mobile devices, social media invite previews (WhatsApp, Telegram, Discord, etc.), and human users across CGNAT networks.

const BOT_UA_PATTERNS = [
  // HTTP Libraries & Script Scrapers (NOTE: okhttp is explicitly excluded as Android WebViews & apps rely on it)
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
  /scrapy/i,
  /mechanize/i,
  /java\/\d/i,
  /apache-httpclient/i,
  /php\/\d/i,

  // Headless Automation Browsers (Unless on real mobile / social webview)
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

  // AI Harvesters & Aggressive Commercial Scrapers
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

// Social Messaging Preview Fetchers (MUST ALWAYS BE ALLOWED to render rich cinema invite cards)
const SOCIAL_PREVIEW_PATTERNS = [
  /whatsapp/i,
  /telegrambot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /discordbot/i,
  /applebot/i,
  /slackbot/i,
  /skypeuripreview/i,
  /linkedinbot/i,
  /vkshare/i,
  /redditbot/i,
  /pinterest/i,
  /quora\s+link\s+preview/i,
  /bingpreview/i,
  /google-read-aloud/i,
];

// Dangerous file probes and exploit scanning patterns
const PROBE_PATTERNS = [
  /\.(env|git|svn|htaccess|aws|sql|bak|old|swp|tar|gz|zip|conf|ini|yaml|yml)($|\/|\?)/i,
  /(wp-login|wp-admin|phpmyadmin|pma|actuator|xmlrpc|setup\.php|shell\.php|eval-stdin|solr|cgi-bin|autodiscover|remote\/login)/i,
];

// Legitimate search engines (only allowed on static public roots for SEO indexing)
const LEGIT_SEARCH_ENGINES = /googlebot|bingbot|duckduckbot/i;

// In-memory auto-banned bot IPs with expiration (5-minute cooldown, avoids permanent mobile CGNAT lockouts)
const bannedIpMap = new Map();
const BAN_DURATION_MS = 5 * 60 * 1000;

function isPrivateIp(ip) {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '');
  return (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)
  );
}

function cleanExpiredBans() {
  const now = Date.now();
  for (const [ip, until] of bannedIpMap.entries()) {
    if (now >= until) {
      bannedIpMap.delete(ip);
    }
  }
}
setInterval(cleanExpiredBans, 60000).unref();

function extractClientIp(req) {
  const cfIp = req.headers?.['cf-connecting-ip'];
  const realIp = req.headers?.['x-real-ip'];
  const xf = String(req.headers?.['x-forwarded-for'] || '').split(',').map((v) => v.trim()).filter(Boolean);
  return cfIp || realIp || (xf.length ? xf[0] : req.socket?.remoteAddress || '');
}

function isBotRequest(req) {
  const ua = String(req.headers?.['user-agent'] || '').trim();
  const url = String(req.url || '');
  const ip = extractClientIp(req);

  // 1. Exploit Probe Detection (Always block regardless of user-agent)
  for (const pattern of PROBE_PATTERNS) {
    if (pattern.test(url)) {
      if (!isPrivateIp(ip)) {
        bannedIpMap.set(ip, Date.now() + BAN_DURATION_MS);
      }
      return { blocked: true, reason: 'Exploit probe attempt detected', ban: true };
    }
  }

  // 2. Social Preview Crawlers (WhatsApp, Telegram, Discord, etc. for room invite cards)
  if (SOCIAL_PREVIEW_PATTERNS.some((p) => p.test(ua))) {
    // Social previewers are allowed on public pages, invite links, room pages, and assets
    if (url === '/' || url.startsWith('/room/') || url.startsWith('/_next/') || url.includes('.')) {
      return { blocked: false, isSocialPreview: true };
    }
  }

  // 3. Search Engine Indexers (Googlebot / Bingbot) on public discovery routes
  if (LEGIT_SEARCH_ENGINES.test(ua)) {
    const isPublicDiscovery = url === '/' || url.startsWith('/sitemap') || url.startsWith('/robots') || url.startsWith('/_next/');
    if (!isPublicDiscovery) {
      return { blocked: true, reason: 'Bots prohibited from private rooms and interactive APIs' };
    }
    return { blocked: false };
  }

  // 4. Temporary IP penalty check (Protect human browsers on mobile CGNAT)
  const isHumanBrowser = ua.includes('Mozilla/') &&
    /safari|chrome|firefox|mobile|android|iphone|ipad|edg/i.test(ua) &&
    !BOT_UA_PATTERNS.some((p) => p.test(ua));

  if (!isPrivateIp(ip) && bannedIpMap.has(ip)) {
    const banUntil = bannedIpMap.get(ip);
    if (Date.now() < banUntil) {
      // If it's a legitimate human browser navigating to a room or home page, forgive the shared CGNAT IP
      const isRoomOrHome = url === '/' || url.startsWith('/room/') || url.includes('/socket.io') || req.headers?.upgrade === 'websocket';
      if (isHumanBrowser && isRoomOrHome) {
        bannedIpMap.delete(ip);
      } else {
        return { blocked: true, reason: 'Temporarily rate-limited probe IP' };
      }
    } else {
      bannedIpMap.delete(ip);
    }
  }

  // 5. Missing User-Agent check (Block completely empty UAs)
  if (!ua || ua.length < 4) {
    return { blocked: true, reason: 'Missing or empty browser User-Agent' };
  }

  // 6. Check for known malicious bot signatures (Allow localhost / private network for local automated testing)
  if (!isPrivateIp(ip)) {
    for (const pattern of BOT_UA_PATTERNS) {
      if (pattern.test(ua)) {
        return { blocked: true, reason: 'Automated bot or scraper detected' };
      }
    }

    // 7. Generic crawler catch-all (Exclude social previews and legit search engines)
    if (/\b(bot|crawler|spider|scraper)\b/i.test(ua)) {
      return { blocked: true, reason: 'Generic crawler or bot detected' };
    }
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
    const ip = extractClientIp(req);
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
  bannedBotIps: bannedIpMap,
};
