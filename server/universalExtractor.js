// Universal Video & Stream Extractor for SynCinema
// Extracts direct playable video streams (.mp4, .m3u8, webm, dash) from Vidmate,
// third-party movie websites, tube sites, cloud drives, and video hosters,
// preventing third-party websites from opening in place of the video.

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
];

const getRandomUa = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// Unpack Dean Edwards packed JavaScript: eval(function(p,a,c,k,e,d)...)
function unpackJS(p, a, c, k) {
  const toBase = (num) => {
    return (num < a ? '' : toBase(Math.floor(num / a))) +
      ((num = num % a) > 35 ? String.fromCharCode(num + 29) : num.toString(36));
  };
  while (c--) {
    const key = toBase(c);
    const val = k[c] || key;
    p = p.replace(new RegExp('\\b' + key + '\\b', 'g'), val);
  }
  return p;
}

// Fast content-type & Range probe to detect direct media streams
async function probeDirectMedia(url) {
  try {
    const targetUrl = new URL(url);
    const headers = {
      'User-Agent': getRandomUa(),
      'Referer': targetUrl.origin + '/',
      'Range': 'bytes=0-1024',
      'Accept': '*/*',
    };
    const res = await fetch(url, {
      method: 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok && res.status !== 206) return null;

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const finalUrl = res.url || url;
    const cleanFinal = finalUrl.split('?')[0].toLowerCase();

    if (ct.includes('mpegurl') || ct.includes('vnd.apple.mpegurl') || cleanFinal.endsWith('.m3u8')) {
      return { type: 'hls', stream: finalUrl };
    }
    if (ct.includes('dash+xml') || cleanFinal.endsWith('.mpd')) {
      return { type: 'dash', stream: finalUrl };
    }
    if (ct.startsWith('video/') || ct.startsWith('audio/') || ct.includes('octet-stream') || /\.(mp4|webm|mkv|mov|m4v|mp3|m4a|wav|aac|ogg|opus)$/.test(cleanFinal)) {
      return { type: 'file', stream: finalUrl };
    }
  } catch {}
  return null;
}

// Dailymotion Metadata Extractor -> Direct HLS master.m3u8
async function extractDailymotion(url) {
  try {
    const m = url.match(/(?:dailymotion\.com\/(?:video|embed\/video)\/|dai\.ly\/)([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const videoId = m[1];
    const metaRes = await fetch(`https://www.dailymotion.com/player/metadata/video/${videoId}`, {
      headers: { 'User-Agent': getRandomUa(), 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    if (metaRes.ok) {
      const data = await metaRes.json();
      const m3u8 = data.qualities?.auto?.[0]?.url;
      if (m3u8) {
        return {
          type: 'hls',
          stream: m3u8,
          title: data.title || 'Dailymotion Video',
          platform: 'Dailymotion',
        };
      }
    }
    // Fallback to clean isolated embed player
    return {
      type: 'embed',
      stream: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1`,
      platform: 'Dailymotion',
      isolated: true,
    };
  } catch {}
  return null;
}

// Google Drive Direct Stream Extractor
function extractGoogleDrive(url) {
  try {
    const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?(?:.*&)?id=)([a-zA-Z0-9_-]+)/i);
    if (m && m[1]) {
      const fileId = m[1];
      return {
        type: 'file',
        stream: `https://drive.google.com/uc?export=download&id=${fileId}`,
        platform: 'Google Drive',
        title: 'Google Drive Video',
      };
    }
  } catch {}
  return null;
}

// Dropbox Direct Stream Extractor
function extractDropbox(url) {
  try {
    if (/dropbox\.com\/(?:s|scl\/fi)\//i.test(url)) {
      const u = new URL(url);
      u.searchParams.set('raw', '1');
      u.searchParams.delete('dl');
      return {
        type: 'file',
        stream: u.href,
        platform: 'Dropbox',
        title: 'Dropbox Video',
      };
    }
  } catch {}
  return null;
}

// MediaFire Direct Download/Stream Extractor
async function extractMediafire(url) {
  try {
    if (/mediafire\.com\/file\//i.test(url)) {
      const res = await fetch(url, {
        headers: { 'User-Agent': getRandomUa() },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const text = await res.text();
        const m = text.match(/href=["'](https?:\/\/download\d+\.mediafire\.com\/[^\s"']+)["']/i);
        if (m && m[1]) {
          return {
            type: 'file',
            stream: m[1],
            platform: 'MediaFire',
            title: 'MediaFire Video',
          };
        }
      }
    }
  } catch {}
  return null;
}

// Streamtape Direct Stream Extractor
async function extractStreamtape(url) {
  try {
    const m = url.match(/streamtape\.[a-z0-9]+\/(?:v|e)\/([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const embedUrl = `https://streamtape.com/e/${m[1]}`;
    const res = await fetch(embedUrl, {
      headers: { 'User-Agent': getRandomUa(), 'Referer': 'https://streamtape.com/' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      // Streamtape pattern: document.getElementById('robotlink').innerHTML = '...' + ('...').substring(...)
      const match = text.match(/robotlink['"]\)\.innerHTML\s*=\s*['"]([^'"]+)['"]\s*\+\s*\(?['"]([^'"]+)['"]\)?\.substring\((\d+)\)/i);
      if (match) {
        const part1 = match[1];
        const part2 = match[2].substring(parseInt(match[3], 10));
        let direct = part1 + part2;
        if (!direct.startsWith('http')) direct = 'https:' + direct;
        return {
          type: 'file',
          stream: direct,
          platform: 'Streamtape',
        };
      }
      // Alternate pattern: id="norobotlink" or id="videolink"
      const altMatch = text.match(/id=["'](?:norobotlink|videolink|robotlink)["'][^>]*>([^<]+)</i);
      if (altMatch && altMatch[1]) {
        let direct = altMatch[1].trim();
        if (!direct.startsWith('http')) direct = 'https:' + direct;
        return {
          type: 'file',
          stream: direct,
          platform: 'Streamtape',
        };
      }
    }
    return {
      type: 'embed',
      stream: embedUrl,
      platform: 'Streamtape',
      isolated: true,
    };
  } catch {}
  return null;
}

// Streamwish / Wishembed Direct Stream Extractor
async function extractStreamwish(url) {
  try {
    const m = url.match(/(?:streamwish|wishembed|dwish|swish)\.[a-z0-9]+\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const embedUrl = `https://streamwish.to/e/${m[1]}`;
    const res = await fetch(embedUrl, {
      headers: { 'User-Agent': getRandomUa(), 'Referer': 'https://streamwish.to/' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const packed = text.match(/}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/);
      if (packed) {
        const un = unpackJS(packed[1], parseInt(packed[2], 10), parseInt(packed[3], 10), packed[4].split('|'));
        const sm = un.match(/(https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/i);
        if (sm) {
          return {
            type: 'hls',
            stream: sm[1].replace(/\\\//g, '/'),
            platform: 'Streamwish',
          };
        }
      }
    }
    return {
      type: 'embed',
      stream: embedUrl,
      platform: 'Streamwish',
      isolated: true,
    };
  } catch {}
  return null;
}

// DoodStream / D000d Direct Stream Extractor
async function extractDoodstream(url) {
  try {
    const m = url.match(/(?:dood|d000d|do0od|ds2play)\.[a-z0-9]+\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const embedUrl = `https://d000d.com/e/${m[1]}`;
    const res = await fetch(embedUrl, {
      headers: { 'User-Agent': getRandomUa(), 'Referer': 'https://d000d.com/' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const passMatch = text.match(/\/pass_md5\/([a-zA-Z0-9_-]+)/i);
      if (passMatch) {
        const tokenRes = await fetch(`https://d000d.com/pass_md5/${passMatch[1]}`, {
          headers: { 'User-Agent': getRandomUa(), 'Referer': embedUrl },
          signal: AbortSignal.timeout(4000),
        });
        if (tokenRes.ok) {
          const directPrefix = await tokenRes.text();
          if (directPrefix && directPrefix.startsWith('http')) {
            const randomStr = Math.random().toString(36).substring(2, 12);
            const direct = `${directPrefix.trim()}${randomStr}?token=${passMatch[1]}&expiry=${Date.now()}`;
            return {
              type: 'file',
              stream: direct,
              platform: 'DoodStream',
            };
          }
        }
      }
    }
    return {
      type: 'embed',
      stream: embedUrl,
      platform: 'DoodStream',
      isolated: true,
    };
  } catch {}
  return null;
}

// Filemoon Direct Stream Extractor
async function extractFilemoon(url) {
  try {
    const m = url.match(/filemoon\.[a-z0-9]+\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const embedUrl = `https://filemoon.sx/e/${m[1]}`;
    const res = await fetch(embedUrl, {
      headers: { 'User-Agent': getRandomUa(), 'Referer': 'https://filemoon.sx/' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const packed = text.match(/}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/);
      if (packed) {
        const un = unpackJS(packed[1], parseInt(packed[2], 10), parseInt(packed[3], 10), packed[4].split('|'));
        const sm = un.match(/(https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/i);
        if (sm) {
          return {
            type: 'hls',
            stream: sm[1].replace(/\\\//g, '/'),
            platform: 'Filemoon',
          };
        }
      }
    }
    return {
      type: 'embed',
      stream: embedUrl,
      platform: 'Filemoon',
      isolated: true,
    };
  } catch {}
  return null;
}

// Vidmoly Direct Stream Extractor
async function extractVidmoly(url) {
  try {
    const m = url.match(/vidmoly\.[a-z0-9]+\/(?:w\/|embed-)([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const embedUrl = `https://vidmoly.to/embed-${m[1]}.html`;
    const res = await fetch(embedUrl, {
      headers: { 'User-Agent': getRandomUa(), 'Referer': 'https://vidmoly.to/' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const sm = text.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
      if (sm) {
        return {
          type: 'hls',
          stream: sm[1].replace(/\\\//g, '/'),
          platform: 'Vidmoly',
        };
      }
    }
    return {
      type: 'embed',
      stream: embedUrl,
      platform: 'Vidmoly',
      isolated: true,
    };
  } catch {}
  return null;
}

// Voe.sx Direct Stream Extractor
async function extractVoe(url) {
  try {
    const m = url.match(/voe[a-z0-9-]*\.[a-z0-9]+\/(?:e\/)?([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const embedUrl = `https://voe.sx/e/${m[1]}`;
    const res = await fetch(embedUrl, {
      headers: { 'User-Agent': getRandomUa(), 'Referer': 'https://voe.sx/' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const sm = text.match(/(?:hls|file)\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
      if (sm) {
        return {
          type: 'hls',
          stream: sm[1].replace(/\\\//g, '/'),
          platform: 'Voe',
        };
      }
      // base64 source pattern in Voe
      const b64 = text.match(/prompt\(['"]([^'"]+)['"],\s*['"]([a-zA-Z0-9+/=]+)['"]\)/i);
      if (b64 && b64[2]) {
        try {
          const decoded = Buffer.from(b64[2], 'base64').toString('utf8');
          if (decoded.includes('.m3u8')) {
            return { type: 'hls', stream: decoded, platform: 'Voe' };
          }
        } catch {}
      }
    }
    return {
      type: 'embed',
      stream: embedUrl,
      platform: 'Voe',
      isolated: true,
    };
  } catch {}
  return null;
}

// Mixdrop Direct Stream Extractor
async function extractMixdrop(url) {
  try {
    const m = url.match(/mixdrop\.[a-z0-9]+\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (!m) return null;
    const embedUrl = `https://mixdrop.co/e/${m[1]}`;
    const res = await fetch(embedUrl, {
      headers: { 'User-Agent': getRandomUa(), 'Referer': 'https://mixdrop.co/' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      const packed = text.match(/}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/);
      if (packed) {
        const un = unpackJS(packed[1], parseInt(packed[2], 10), parseInt(packed[3], 10), packed[4].split('|'));
        const sm = un.match(/MDCore\.wurl\s*=\s*["']([^"']+)["']/i) || un.match(/(https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*)/i);
        if (sm) {
          let stream = sm[1].replace(/\\\//g, '/');
          if (stream.startsWith('//')) stream = 'https:' + stream;
          return {
            type: 'file',
            stream,
            platform: 'Mixdrop',
          };
        }
      }
    }
    return {
      type: 'embed',
      stream: embedUrl,
      platform: 'Mixdrop',
      isolated: true,
    };
  } catch {}
  return null;
}

// Deep HTML Content Scanner for Video Streams
function scanHtmlForStream(text, baseUrl) {
  if (!text) return null;
  const normalized = text.replace(/\\\//g, '/').replace(/\\u002F/gi, '/');

  // 1. Direct HLS or MP4 URLs
  let m = normalized.match(/(https?:\/\/[^"'\s<>\\]+\.m3u8[^"'\s<>\\]*)/i);
  if (m) return { type: 'hls', stream: m[1] };

  m = normalized.match(/(https?:\/\/[^"'\s<>\\]+\.(?:mp4|webm|mkv|mov)[^"'\s<>\\]*)/i);
  if (m && !m[1].includes('favicon') && !m[1].includes('logo') && !m[1].includes('preview') && !m[1].includes('poster')) {
    return { type: 'file', stream: m[1] };
  }

  // 2. HTML5 <video> and <source> elements
  m = normalized.match(/<(?:video|source)[^>]+src=["']([^"']+)["']/i);
  if (m && m[1]) {
    try {
      const resolved = new URL(m[1], baseUrl).href;
      return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
    } catch {}
  }

  // 3. OpenGraph & Twitter Meta Tags
  m = normalized.match(/<meta[^>]+property=["']og:video(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i)
    || normalized.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::secure_url|:url)?["']/i);
  if (m && m[1]) {
    try {
      const resolved = new URL(m[1], baseUrl).href;
      if (resolved.includes('.m3u8')) return { type: 'hls', stream: resolved };
      if (/\.(mp4|webm|mov|mkv)/i.test(resolved)) return { type: 'file', stream: resolved };
    } catch {}
  }

  // 4. JSON-LD VideoObject (contentUrl or embedUrl)
  m = normalized.match(/"@type"\s*:\s*"VideoObject"[\s\S]*?"contentUrl"\s*:\s*"([^"]+)"/i)
    || normalized.match(/"contentUrl"\s*:\s*"([^"]+\.(?:m3u8|mp4|webm)[^"]*)"/i);
  if (m && m[1]) {
    try {
      const resolved = new URL(m[1], baseUrl).href;
      return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
    } catch {}
  }

  // 5. Player configs: file: "...", source: "...", sources: [{file: "..."}], new Playerjs
  m = normalized.match(/(?:file|source|video_url|stream_url|src)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|webm)[^"']*)["']/i);
  if (m && m[1]) {
    try {
      const resolved = new URL(m[1], baseUrl).href;
      return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
    } catch {}
  }

  // 6. Dean Edwards Packed Javascript (eval(function(p,a,c,k,e,d)...))
  const packedMatches = normalized.matchAll(/}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/g);
  for (const match of packedMatches) {
    try {
      const [_, p, a, c, kStr] = match;
      const un = unpackJS(p, parseInt(a, 10), parseInt(c, 10), kStr.split('|'));
      let sm = un.match(/(https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*)/i);
      if (sm) return { type: 'hls', stream: sm[1] };
      sm = un.match(/(https?:\/\/[^"'\s\\]+\.(?:mp4|webm|mkv)[^"'\s\\]*)/i);
      if (sm && !sm[1].includes('favicon') && !sm[1].includes('logo')) {
        return { type: 'file', stream: sm[1] };
      }
      sm = un.match(/(?:file|sources?|src)\s*:\s*["']([^"']+)["']/i);
      if (sm && sm[1] && (sm[1].includes('http') || sm[1].startsWith('/'))) {
        const resolved = new URL(sm[1], baseUrl).href;
        return { type: resolved.includes('.m3u8') ? 'hls' : 'file', stream: resolved };
      }
    } catch {}
  }

  return null;
}

// Master Universal Video Resolver
async function resolveUniversalMedia(url) {
  if (!url) return null;
  const clean = String(url).trim();

  // 1. Check known video file extensions directly
  const pathOnly = clean.split('?')[0].split('#')[0].toLowerCase();
  if (pathOnly.endsWith('.m3u8')) {
    return { type: 'hls', stream: clean, platform: 'Direct HLS' };
  }
  if (pathOnly.endsWith('.mpd')) {
    return { type: 'dash', stream: clean, platform: 'Direct DASH' };
  }
  if (/\.(mp4|webm|mkv|mov|m4v|mp3|m4a|wav|aac|ogg|opus)$/.test(pathOnly)) {
    return { type: 'file', stream: clean, platform: 'Direct Media' };
  }

  // 2. Specific Platform Extractors
  if (/dailymotion\.com|dai\.ly/i.test(clean)) {
    const dm = await extractDailymotion(clean);
    if (dm) return dm;
  }
  if (/drive\.google\.com/i.test(clean)) {
    const gd = extractGoogleDrive(clean);
    if (gd) return gd;
  }
  if (/dropbox\.com/i.test(clean)) {
    const db = extractDropbox(clean);
    if (db) return db;
  }
  if (/mediafire\.com/i.test(clean)) {
    const mf = await extractMediafire(clean);
    if (mf) return mf;
  }
  if (/streamtape\.[a-z0-9]+/i.test(clean)) {
    const st = await extractStreamtape(clean);
    if (st) return st;
  }
  if (/(?:streamwish|wishembed|dwish|swish)\.[a-z0-9]+/i.test(clean)) {
    const sw = await extractStreamwish(clean);
    if (sw) return sw;
  }
  if (/(?:dood|d000d|do0od|ds2play)\.[a-z0-9]+/i.test(clean)) {
    const dd = await extractDoodstream(clean);
    if (dd) return dd;
  }
  if (/filemoon\.[a-z0-9]+/i.test(clean)) {
    const fm = await extractFilemoon(clean);
    if (fm) return fm;
  }
  if (/vidmoly\.[a-z0-9]+/i.test(clean)) {
    const vm = await extractVidmoly(clean);
    if (vm) return vm;
  }
  if (/voe[a-z0-9-]*\.[a-z0-9]+/i.test(clean)) {
    const voe = await extractVoe(clean);
    if (voe) return voe;
  }
  if (/mixdrop\.[a-z0-9]+/i.test(clean)) {
    const md = await extractMixdrop(clean);
    if (md) return md;
  }

  // 3. Fast Probe (HEAD / Range) in case the URL points directly to an unadorned video stream on a CDN
  const probe = await probeDirectMedia(clean);
  if (probe) {
    return { ...probe, platform: 'Direct CDN Stream' };
  }

  // 4. Handle Vidmate URLs or generic redirected URLs
  let targetUrl = clean;
  let pageHtml = '';
  try {
    const fetchRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': getRandomUa(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    });

    if (fetchRes.ok) {
      targetUrl = fetchRes.url || targetUrl;
      pageHtml = await fetchRes.text();
    }
  } catch {}

  // 5. Deep Scan the fetched page HTML
  if (pageHtml) {
    const stream = scanHtmlForStream(pageHtml, targetUrl);
    if (stream) return stream;

    // 6. IFRAME RECURSION: If no direct video was on the page, check for embedded video player iframes!
    // Third-party movie sites (like 123movies, anime sites, vidmate destination pages) embed video players in iframes.
    const iframeMatches = pageHtml.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi);
    for (const match of iframeMatches) {
      const rawIframeSrc = match[1];
      if (!rawIframeSrc) continue;

      // Ignore tracking, ads, and social widgets
      if (/doubleclick|google|facebook|disqus|recaptcha|analytics|chat/i.test(rawIframeSrc)) {
        continue;
      }

      try {
        const iframeUrl = new URL(rawIframeSrc, targetUrl).href;

        // Check if iframe matches one of our known host extractors
        if (/streamtape\.[a-z0-9]+/i.test(iframeUrl)) {
          const res = await extractStreamtape(iframeUrl);
          if (res) return res;
        }
        if (/(?:streamwish|wishembed|dwish|swish)\.[a-z0-9]+/i.test(iframeUrl)) {
          const res = await extractStreamwish(iframeUrl);
          if (res) return res;
        }
        if (/(?:dood|d000d|do0od|ds2play)\.[a-z0-9]+/i.test(iframeUrl)) {
          const res = await extractDoodstream(iframeUrl);
          if (res) return res;
        }
        if (/filemoon\.[a-z0-9]+/i.test(iframeUrl)) {
          const res = await extractFilemoon(iframeUrl);
          if (res) return res;
        }
        if (/vidmoly\.[a-z0-9]+/i.test(iframeUrl)) {
          const res = await extractVidmoly(iframeUrl);
          if (res) return res;
        }
        if (/voe[a-z0-9-]*\.[a-z0-9]+/i.test(iframeUrl)) {
          const res = await extractVoe(iframeUrl);
          if (res) return res;
        }
        if (/mixdrop\.[a-z0-9]+/i.test(iframeUrl)) {
          const res = await extractMixdrop(iframeUrl);
          if (res) return res;
        }

        // Fetch the iframe HTML and scan it for direct video stream
        const iframeRes = await fetch(iframeUrl, {
          headers: {
            'User-Agent': getRandomUa(),
            'Referer': targetUrl,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });

        if (iframeRes.ok) {
          const iframeHtml = await iframeRes.text();
          const iframeStream = scanHtmlForStream(iframeHtml, iframeUrl);
          if (iframeStream) return iframeStream;
        }

        // If direct stream wasn't found but this iframe is a dedicated player (e.g. embed, vidsrc, player, etc.)
        if (/(?:embed|player|video|stream|movie|watch|vidsrc|autoembed|2embed|superembed)/i.test(iframeUrl)) {
          return {
            type: 'embed',
            stream: iframeUrl,
            platform: 'Embedded Video Player',
            isolated: true,
          };
        }
      } catch {}
    }
  }

  return null;
}

module.exports = {
  unpackJS,
  probeDirectMedia,
  extractDailymotion,
  extractGoogleDrive,
  extractDropbox,
  extractMediafire,
  extractStreamtape,
  extractStreamwish,
  extractDoodstream,
  extractFilemoon,
  extractVidmoly,
  extractVoe,
  extractMixdrop,
  scanHtmlForStream,
  resolveUniversalMedia,
};
