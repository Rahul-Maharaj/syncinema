import { NextResponse } from 'next/server';

// Malicious and automated script scrapers (okhttp is excluded to preserve Android mobile webviews)
const BOT_UA_REGEX = /curl\/|wget\/|python-requests|aiohttp|httpx|libwww-perl|go-http-client|axios\/|node-fetch|got\/|scrapy|mechanize|java\/\d|apache-httpclient|php\/\d|headlesschrome|phantomjs|selenium|puppeteer|playwright|nightwatch|cypress|webdriver|sqlmap|nikto|masscan|nmap|zgrab|acunetix|nessus|burpcollaborator|nuclei|openvas|wprecon|censys|shodan|dirbuster|gobuster|ffuf|hydra|wpscan|gptbot|chatgpt-user|ccbot|anthropic-ai|claude-web|bytespider|amazonbot|cohere-ai|perplexitybot|diffbot|omgili|semrushbot|ahrefsbot|mj12bot|dotbot|megaindex|blexbot|petalbot|yisouspider/i;

// Social messaging preview crawlers (MUST be allowed to generate invite link preview cards)
const SOCIAL_PREVIEW_REGEX = /whatsapp|telegrambot|facebookexternalhit|twitterbot|discordbot|applebot|slackbot|skypeuripreview|linkedinbot|vkshare|redditbot|pinterest|quora\s+link\s+preview|bingpreview/i;

const PROBE_REGEX = /\.(env|git|svn|htaccess|aws|sql|bak|old|swp|tar|gz|zip|conf|ini|yaml|yml)($|\/|\?)|(wp-login|wp-admin|phpmyadmin|pma|actuator|xmlrpc|setup\.php|shell\.php|eval-stdin|solr|cgi-bin)/i;

const LEGIT_SEARCH_ENGINES = /googlebot|bingbot|msnbot|bingpreview|bravebot|duckduckbot|duckduckgo|applebot|yandex|qwant|seznam|yahoo|slurp|baiduspider|googleother|google-favicon|google-inspectiontool|google/i;

export function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;

  // 1. Allow Next.js internal files, favicon, manifest, static assets, health checks, service worker, IndexNow txt
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webmanifest') ||
    pathname.endsWith('.txt') ||
    pathname === '/sw.js' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/health'
  ) {
    return NextResponse.next();
  }

  // 2. Block exploit probes
  if (PROBE_REGEX.test(pathname) || PROBE_REGEX.test(request.nextUrl.search)) {
    return new NextResponse('Access Denied: Exploit probe blocked.', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Bot-Shield': 'Access-Denied',
      },
    });
  }

  // 3. Allow Social Messaging Previewers (WhatsApp, Telegram, Discord, etc.) on public roots and room pages
  if (SOCIAL_PREVIEW_REGEX.test(ua)) {
    if (pathname === '/' || pathname.startsWith('/room/') || pathname.startsWith('/robots') || pathname.startsWith('/sitemap')) {
      return NextResponse.next();
    }
  }

  // 4. Allow Googlebot and Bingbot strictly on public discovery routes
  if (LEGIT_SEARCH_ENGINES.test(ua)) {
    if (pathname === '/' || pathname === '/robots.txt' || pathname === '/sitemap.xml') {
      return NextResponse.next();
    }
    return new NextResponse('Access Denied: Search crawlers prohibited from interactive areas.', {
      status: 403,
      headers: { 'X-Bot-Shield': 'Access-Denied' },
    });
  }

  // 5. Reject missing or abnormally short User-Agents (< 4 chars)
  if (!ua || ua.trim().length < 4) {
    return new NextResponse('Access Denied: Missing or invalid browser User-Agent.', {
      status: 403,
      headers: { 'X-Bot-Shield': 'Access-Denied' },
    });
  }

  // 6. Block known malicious bot signatures (Allow local development & automated testing)
  const isLocal = request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
  if (!isLocal && BOT_UA_REGEX.test(ua)) {
    return new NextResponse('Access Denied: Automated bots, crawlers, and scrapers are strictly prohibited on SyncCinema.', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Bot-Shield': 'Access-Denied',
      },
    });
  }

  // 7. Generic crawler catch-all (excludes social preview crawlers and search indexers)
  if (!isLocal && /\b(bot|crawler|spider|scraper)\b/i.test(ua) && !SOCIAL_PREVIEW_REGEX.test(ua) && !LEGIT_SEARCH_ENGINES.test(ua)) {
    return new NextResponse('Access Denied: Automated bot detected.', {
      status: 403,
      headers: { 'X-Bot-Shield': 'Access-Denied' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
