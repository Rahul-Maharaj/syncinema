import { NextResponse } from 'next/server';

const BOT_UA_REGEX = /curl\/|wget\/|python-requests|aiohttp|httpx|libwww-perl|go-http-client|axios\/|node-fetch|got\/|okhttp|scrapy|mechanize|java\/\d|apache-httpclient|php\/\d|headlesschrome|phantomjs|selenium|puppeteer|playwright|nightwatch|cypress|webdriver|sqlmap|nikto|masscan|nmap|zgrab|acunetix|nessus|burpcollaborator|nuclei|openvas|wprecon|censys|shodan|dirbuster|gobuster|ffuf|hydra|wpscan|gptbot|chatgpt-user|ccbot|anthropic-ai|claude-web|bytespider|amazonbot|cohere-ai|perplexitybot|diffbot|omgili|semrushbot|ahrefsbot|mj12bot|dotbot|megaindex|blexbot|petalbot|yisouspider/i;

const PROBE_REGEX = /\.(env|git|svn|htaccess|aws|sql|bak|old|swp|tar|gz|zip|conf|ini|yaml|yml)($|\/|\?)|(wp-login|wp-admin|phpmyadmin|pma|actuator|xmlrpc|setup\.php|shell\.php|eval-stdin|solr|cgi-bin)/i;

const LEGIT_SEARCH_ENGINES = /googlebot|bingbot/i;

export function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  const pathname = request.nextUrl.pathname;

  // 1. Allow Next.js internal files, favicon, manifest, static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.webmanifest') ||
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

  // 3. Allow Googlebot and Bingbot strictly on public discovery routes
  if (LEGIT_SEARCH_ENGINES.test(ua)) {
    if (pathname === '/' || pathname === '/robots.txt' || pathname === '/sitemap.xml') {
      return NextResponse.next();
    }
    return new NextResponse('Access Denied: Search crawlers prohibited from interactive areas.', {
      status: 403,
      headers: { 'X-Bot-Shield': 'Access-Denied' },
    });
  }

  // 4. Reject missing or abnormally short User-Agents
  if (!ua || ua.trim().length < 8) {
    return new NextResponse('Access Denied: Missing or invalid browser User-Agent.', {
      status: 403,
      headers: { 'X-Bot-Shield': 'Access-Denied' },
    });
  }

  // 5. Block known bot signatures
  if (BOT_UA_REGEX.test(ua)) {
    return new NextResponse('Access Denied: Automated bots, crawlers, and scrapers are strictly prohibited on SyncCinema.', {
      status: 403,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Bot-Shield': 'Access-Denied',
      },
    });
  }

  // 6. Generic crawler catch-all
  if (/\b(bot|crawler|spider|scraper)\b/i.test(ua)) {
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
