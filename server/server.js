const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');
const { WebSocketServer } = require('ws');

const { PORT = 4000, CLIENT_ORIGIN, TURN_URL, TURN_SECRET, ACCESS_KEY, DATA_FILE = './data/rooms.json' } = process.env;
const MAX_USERS = +process.env.MAX_USERS_PER_ROOM || 4;     // couple mode: small rooms
const GRACE_MS = 10000;                              // keep a user's seat while their socket reconnects
const origin = CLIENT_ORIGIN ? CLIENT_ORIGIN.split(',') : true;
if (process.env.NODE_ENV === 'production' && (!ACCESS_KEY || ACCESS_KEY.length < 10)) {
  console.error('Refusing to start: set ACCESS_KEY (10+ chars) so strangers cannot enter.'); process.exit(1);
}
const PEER_KEY = ACCESS_KEY ? crypto.createHmac('sha256', ACCESS_KEY).update('peer').digest('hex').slice(0, 32) : 'peerjs';
const TYPES = ['youtube', 'vimeo', 'file', 'hls', 'dash', 'embed', 'proxy'];
const ROOM_RE = /^[\w-]{2,64}$/;

const keyOk = (k) => { // private mode: shared passphrase gates rooms + TURN creds
  if (!ACCESS_KEY) return true;
  const a = Buffer.from(String(k || '')), b = Buffer.from(ACCESS_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const fails = new Map();                             // brute-force lockout: 8 wrong tries → 15 min ban per IP
const ipOf = (r) => String(r.headers['x-forwarded-for'] || r.address || r.socket?.remoteAddress || '').split(',')[0].trim();
const isLocalIp = (ip) => !ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip === '::ffff:127.0.0.1';
const locked = (ip) => !isLocalIp(ip) && (fails.get(ip)?.until || 0) > Date.now();
const fail = (ip) => {
  if (isLocalIp(ip)) return;
  const f = fails.get(ip) || { n: 0 };
  if (++f.n >= 8) { f.until = Date.now() + 15 * 60_000; f.n = 0; }
  fails.set(ip, f);
};
const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({ origin }));
app.use('/api', rateLimit({ windowMs: 60_000, max: 240 }));
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
app.use('/api', (_, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const gate = (req, res, next) => {                   // every private asset needs the secret word (sent as a header, never in the URL)
  const ip = ipOf(req);
  if (locked(ip)) return res.status(429).json({ error: 'locked' });
  if (!keyOk(req.get('x-access-key'))) { fail(ip); return res.status(401).json({ error: 'denied' }); }
  next();
};
app.get('/api/verify', gate, (_, res) => res.json({ ok: true }));
app.get('/api/hero', gate, (_, res) => res.type('jpg').sendFile(path.join(__dirname, 'private', 'hero.jpg')));
app.post('/api/rooms', (_, res) => res.json({ roomId: crypto.randomBytes(4).toString('hex') }));
app.get('/api/ice', (req, res) => {
  if (locked(ipOf(req))) return res.status(429).json({});
  if (!keyOk(req.query.key)) { fail(ipOf(req)); return res.status(401).json({}); }                    // STUN + short-lived TURN credentials (coturn use-auth-secret)
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (TURN_URL && TURN_SECRET) {
    const username = `${Math.floor(Date.now() / 1000) + 86400}:sync`;
    const credential = crypto.createHmac('sha1', TURN_SECRET).update(username).digest('base64');
    iceServers.push({ urls: TURN_URL.split(','), username, credential });
  }
  try { iceServers.push(...JSON.parse(process.env.EXTRA_ICE || '[]')); } catch {}   // e.g. free Open Relay / Metered TURN
  res.json({ iceServers, peerKey: PEER_KEY });
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

app.post('/api/upload', (req, res) => {
  const fileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'video.mp4';
  const cleanExt = path.extname(fileName) || '.mp4';
  const fileId = `${crypto.randomUUID()}${cleanExt}`;
  const filePath = path.join(UPLOADS_DIR, fileId);

  const fileStream = fs.createWriteStream(filePath);
  req.pipe(fileStream);

  fileStream.on('finish', () => {
    res.json({
      url: `/api/uploads/${fileId}`,
      name: fileName,
    });
  });

  fileStream.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

app.get('/api/uploads/:fileId', (req, res) => {
  const fileId = path.basename(req.params.fileId);
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
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Content-Length': chunksize,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize });
    fs.createReadStream(filePath).pipe(res);
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

// Tube and adult site embed converters
function convertTubeUrl(target) {
  try {
    const u = new URL(target);
    // EPorner
    let m = target.match(/eporner\.com\/video-([a-zA-Z0-9]+)/i);
    if (m) return `https://www.eporner.com/embed/${m[1]}/`;
    // Pornhub
    m = target.match(/pornhub\.com\/(?:view_video\.php\?(?:.*&)?viewkey=|embed\/)([a-zA-Z0-9]+)/i);
    if (m) return `https://www.pornhub.com/embed/${m[1]}`;
    // XVideos
    m = target.match(/xvideos\.com\/video\.?([a-zA-Z0-9_-]+)/i);
    if (m) return `https://www.xvideos.com/embedframe/${m[1]}`;
    // XNXX
    m = target.match(/xnxx\.com\/video-?([a-zA-Z0-9_-]+)/i);
    if (m) return `https://www.xnxx.com/embedframe/${m[1]}`;
    // SpankBang
    m = target.match(/spankbang\.com\/([a-zA-Z0-9]+)\/(?:video|embed)/i);
    if (m) return `https://spankbang.com/${m[1]}/embed/`;
    // RedTube
    m = target.match(/redtube\.com\/(\d+)/i);
    if (m) return `https://embed.redtube.com/?id=${m[1]}`;
    // YouPorn
    m = target.match(/youporn\.com\/watch\/(\d+)/i);
    if (m) return `https://www.youporn.com/embed/${m[1]}`;
    // XHamster
    m = target.match(/xhamster\.com\/videos\/[^\s\"']*?(xh[a-zA-Z0-9]+|\d+)/i);
    if (m) return `https://xhamster.com/xembed.php?video=${m[1]}`;
    // Doodstream
    m = target.match(/dood\.(?:to|watch|so|ws|cx|la|pm|re|sh)\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://dood.to/e/${m[1]}`;
    // Streamtape
    m = target.match(/streamtape\.com\/(?:v|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://streamtape.com/e/${m[1]}`;
    // Streamwish
    m = target.match(/streamwish\.(?:to|com)\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://streamwish.to/e/${m[1]}`;
    // Filemoon
    m = target.match(/filemoon\.sx\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://filemoon.sx/e/${m[1]}`;
    // Vidmoly
    m = target.match(/vidmoly\.to\/(?:w\/|embed-)([a-zA-Z0-9]+)/i);
    if (m) return `https://vidmoly.to/embed-${m[1]}.html`;
    // Voe
    m = target.match(/voe\.sx\/(?:e\/)?([a-zA-Z0-9]+)/i);
    if (m) return `https://voe.sx/e/${m[1]}`;
    // Mixdrop
    m = target.match(/mixdrop\.(?:co|to)\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://mixdrop.co/e/${m[1]}`;
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

app.get('/api/resolve', async (req, res) => {
  const target = cleanUrl(req.query.url);
  if (!target) return res.status(400).json({ error: 'invalid' });
  if (target.includes('hubstream.art')) {
    const resolved = await resolveHubstream(target);
    if (resolved) return res.json(resolved);
  }
  const tubeEmbed = convertTubeUrl(target);
  if (tubeEmbed) {
    return res.json({ type: 'embed', src: tubeEmbed, origSrc: target });
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

  res.json({ type: 'embed', src: target });
});

// Stream proxy: bypasses CORS for direct media and HLS streams (.m3u8, .ts, .mp4, audio)
app.get('/api/stream', async (req, res) => {
  const target = cleanUrl(req.query.url);
  if (!target) return res.status(400).send('Invalid or private URL');
  try {
    const targetUrl = new URL(target);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      Referer: targetUrl.origin + '/',
    };
    let upstream = await fetch(target, { headers, redirect: 'follow' });
    if (!upstream.ok && (upstream.status === 403 || upstream.status === 401)) {
      const fallbackHeaders = { ...headers, Referer: target };
      const fallback = await fetch(target, { headers: fallbackHeaders, redirect: 'follow' });
      if (fallback.ok) upstream = fallback;
    }
    res.status(upstream.status);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(h);
      if (v) res.set(h, v);
    }
    const ct = upstream.headers.get('content-type') || '';
    if (ct.includes('mpegurl') || target.toLowerCase().includes('.m3u8')) {
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
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    res.status(502).send('Stream proxy error: ' + err.message);
  }
});

// Web embed proxy: strips X-Frame-Options & CSP frame-ancestors, injects <base> & ad blocker
app.get('/api/proxy', async (req, res) => {
  const target = cleanUrl(req.query.url);
  if (!target) return res.status(400).send('Invalid or private URL');
  try {
    const upstream = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: new URL(target).origin + '/',
      },
      redirect: 'follow',
    });
    res.status(upstream.status);
    res.set('Access-Control-Allow-Origin', '*');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    const ct = upstream.headers.get('content-type') || '';
    res.set('Content-Type', ct);
    if (ct.includes('text/html')) {
      let html = await upstream.text();
      const finalUrl = upstream.url || target;
      // Neutralize anti-sandbox redirects on movie sites
      html = html.replace(/\/sandboxed\.html[^\s"']*/g, 'javascript:void(0)');
      const baseTag = `<base href="${finalUrl}">`;
      const antiAd = `<style>
        div[style*="z-index: 2147483647"], div[style*="z-index:2147483647"],
        div[style*="z-index: 9999999"], div[style*="z-index:9999999"],
        .ad-overlay, .ads-banner, [id*="ad-overlay"] { display: none !important; pointer-events: none !important; }
      </style>
      <script>
        try {
          Object.defineProperty(window, 'top', { get: () => window.self });
          Object.defineProperty(window, 'parent', { get: () => window.self });
          window.open = function() { console.log('Ad popup blocked'); return null; };
          if (window.frameElement) {
            window.frameElement.hasAttribute = function(attr) {
              if (attr === 'sandbox') return false;
              return Element.prototype.hasAttribute.call(this, attr);
            };
          }
        } catch (e) {}
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
  cors: { origin }, maxHttpBufferSize: 1e5,
  allowRequest: (req, cb) => cb(null, !CLIENT_ORIGIN || !req.headers.origin || origin.includes(req.headers.origin)),  // block cross-site websockets
});
const rooms = new Map();
const fresh = () => ({
  pass: null,
  pin: null,
  users: new Map(),
  hostId: null,
  screenBy: null,
  lock: false,
  queue: [],
  watchlist: [],
  media: { type: 'none', src: '', title: '', poster: '', desc: '' },
  playing: false,
  time: 0,
  at: Date.now(),
  chat: [],
  timer: null,
  readyCheck: null,
  reviews: [],
  ambient: { preset: 'love', intensity: 80, flicker: false },
  adult: false,
});
try { for (const [id, v] of Object.entries(JSON.parse(fs.readFileSync(DATA_FILE)))) rooms.set(id, { ...fresh(), ...v }); } catch {}
let saveT;                                          // persist rooms so "our room" survives restarts
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(Object.fromEntries([...rooms].map(([id, r]) => [id, {
    pass: r.pass,
    pin: r.pin,
    media: r.media,
    queue: r.queue,
    watchlist: r.watchlist || [],
    chat: r.chat,
    lock: r.lock,
    reviews: r.reviews || [],
    ambient: r.ambient || { preset: 'love', intensity: 80, flicker: false },
    adult: !!r.adult,
  }]))));
} catch (e) { console.error('save failed', e.message); } }, 1000); };
// room passkey: stored only as a salted scrypt hash, so even the server file never holds it
const hashPass = (p) => { const salt = crypto.randomBytes(16); return salt.toString('hex') + ':' + crypto.scryptSync(p, salt, 32).toString('hex'); };
const passOk = (r, p) => {
  const [salt, h] = String(r.pass).split(':');
  const a = crypto.scryptSync(p, Buffer.from(salt, 'hex'), 32), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const position = (r) => r.time + (r.playing ? (Date.now() - r.at) / 1000 : 0);
const snapshot = (r) => ({ media: r.media, playing: r.playing, time: position(r) });
const roster = (r) => [...r.users.values()].map(({ cid, name, color, sid }) => ({ id: cid, name, color, sid }));
const presence = (id, r) => io.to(id).emit('presence', { users: roster(r), hostId: r.hostId, lock: r.lock, adult: !!r.adult });
const PRIVATE = /^(localhost|.*\.(local|internal|lan)|127\..*|10\..*|192\.168\..*|172\.(1[6-9]|2\d|3[01])\..*|169\.254\..*|0\.0\.0\.0|\[?::1?\]?|\[?f[cd].*)$/i;
const cleanUrl = (v) => { // http(s) only; never point a partner's browser at their home network
  try {
    const s = String(v || '').trim();
    if (s.startsWith('/api/')) return s.slice(0, 2048);
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || (!process.env.ALLOW_PRIVATE_URLS && PRIVATE.test(u.hostname))) return null;
    return u.href.slice(0, 2048);
  } catch { return null; }
};
const setMedia = (id, r, m) => { r.media = m; r.time = 0; r.playing = false; r.at = Date.now(); io.to(id).emit('state', snapshot(r)); save(); };
const num = (v) => (Number.isFinite(+v) && +v >= 0 && +v < 1e6 ? +v : 0);

io.on('connection', (socket) => {
  let rid, room, user, n = 0, t = Date.now();
  socket.on('error', () => {});
  socket.use((_, next) => { if (Date.now() - t > 1000) { n = 0; t = Date.now(); } ++n <= 30 ? next() : next(new Error('rate')); });
  const joined = () => room && user;
  const canControl = () => joined() && (!room.lock || user.cid === room.hostId);

  socket.on('join', ({ roomId, cid, name, key, token, pass } = {}, ack) => {
    if (typeof ack !== 'function') return;
    const ip = ipOf(socket.handshake);
    if (locked(ip)) return ack({ error: 'locked' });
    if (!keyOk(key)) { fail(ip); return ack({ error: 'denied' }); }
    if (!ROOM_RE.test(roomId) || !/^\w{4,32}$/.test(cid)) return ack({ error: 'invalid' });
    const r = rooms.get(roomId) || fresh();
    const p = typeof pass === 'string' ? pass.trim() : '';
    if (r.pass) {                                    // locked room: right passkey or no entry
      if (!p) return ack({ error: 'needpass' });
      if (!passOk(r, p)) { fail(ip); return ack({ error: 'badpass' }); }
    } else if (p.length >= 4 && p.length <= 64) {
      r.pass = hashPass(p); rooms.set(roomId, r); save();   // user locks it with a passkey
    } else if (p.length === 0) {
      rooms.set(roomId, r);                          // open room: no passkey required
    } else {
      return ack({ error: 'badpass' });
    }
    fails.delete(ip);                                // successful auth clears strike count
    if (!r.users.has(cid) && r.users.size >= MAX_USERS) return ack({ error: 'full' });
    const ex = r.users.get(cid);                      // seat is bound to a secret token: nobody can impersonate you
    if (ex && ex.token !== token) return ack({ error: 'taken' });
    rid = roomId; room = r;
    user = room.users.get(cid) || { cid, token: crypto.randomBytes(16).toString('hex'), color: `hsl(${Math.random() * 360 | 0} 70% 62%)` };
    clearTimeout(user.timer);                        // reconnect within grace → same seat
    Object.assign(user, { name: (String(name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'Guest'), sid: socket.id });
    room.users.set(cid, user);
    if (!room.hostId || !room.users.has(room.hostId)) room.hostId = cid;
    socket.join(rid);
    ack({
      me: cid,
      token: user.token,
      ...snapshot(room),
      users: roster(room),
      hostId: room.hostId,
      lock: room.lock,
      queue: room.queue,
      watchlist: room.watchlist || [],
      chat: room.chat,
      screenBy: room.screenBy,
      timer: room.timer,
      readyCheck: room.readyCheck,
      reviews: room.reviews || [],
      ambient: room.ambient || { preset: 'love', intensity: 80, flicker: false },
      adult: !!room.adult,
      hasPin: !!room.pin,
    });
    socket.emit('state', snapshot(room));            // re-sync player after reconnect
    presence(rid, room);
  });

  socket.on('media:set', ({ media } = {}) => {
    const local = media?.type === 'local';             // local file: each partner opens their own copy
    const src = local ? '' : cleanUrl(media?.src);
    if (!canControl() || !(local || src) || ![...TYPES, 'local'].includes(media?.type)) return;
    setMedia(rid, room, {
      type: media.type,
      src,
      title: String(media.title || media.name || '').slice(0, 200),
      poster: cleanUrl(media.poster) || '',
      desc: String(media.desc || '').slice(0, 1000),
      ...(local && { name: String(media.name || '').slice(0, 200) })
    });
  });

  const pushQ = () => { io.to(rid).emit('queue', room.queue); save(); };
  const pushWL = () => { io.to(rid).emit('watchlist', room.watchlist); save(); };

  socket.on('queue:add', ({ media } = {}) => {
    const src = cleanUrl(media?.src);
    if (!joined() || !src || !TYPES.includes(media?.type) || room.queue.length >= 100) return;
    room.queue.push({
      id: crypto.randomUUID(),
      type: media.type,
      src,
      title: String(media.title || '').slice(0, 200),
      poster: cleanUrl(media.poster) || '',
      desc: String(media.desc || '').slice(0, 1000),
      addedBy: user.name,
      addedAt: Date.now(),
    });
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

  // Synchronized Snack / Date-Night Timer
  socket.on('timer:start', ({ duration, label } = {}) => {
    if (!joined() || !Number.isFinite(+duration) || +duration <= 0) return;
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
    if (!joined() || !room.timer || !room.timer.running) return;
    const remaining = Math.max(0, room.timer.endsAt - Date.now());
    room.timer.running = false;
    room.timer.pausedRemaining = remaining;
    io.to(rid).emit('timer:sync', room.timer);
  });

  socket.on('timer:resume', () => {
    if (!joined() || !room.timer || room.timer.running || !room.timer.pausedRemaining) return;
    room.timer.running = true;
    room.timer.endsAt = Date.now() + room.timer.pausedRemaining;
    delete room.timer.pausedRemaining;
    io.to(rid).emit('timer:sync', room.timer);
  });

  socket.on('timer:reset', () => {
    if (!joined()) return;
    room.timer = null;
    io.to(rid).emit('timer:sync', null);
  });

  // "Ready to Watch?" Confirmation
  socket.on('ready:start', () => {
    if (!joined()) return;
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

  // Intimacy Mode & Ambient Lighting
  socket.on('ambient:set', (ambient = {}) => {
    if (!joined()) return;
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
    if (passOk(room, cleanPin)) {
      ack({ ok: true });
    } else {
      ack({ error: 'badpin' });
    }
  });

  socket.on('chat:clear', () => { if (joined()) { room.chat = []; io.to(rid).emit('chat:cleared'); save(); } });   // wipe saved chat for both
  socket.on('nudge', () => { if (joined()) socket.to(rid).emit('nudge', { from: user.name }); });

  // PLAY | PAUSE | SEEK | BUFFERING
  socket.on('player', ({ action, time } = {}) => {
    if (!canControl() || !['PLAY', 'PAUSE', 'SEEK', 'BUFFERING'].includes(action)) return;
    room.time = num(time); room.at = Date.now();
    if (action === 'PLAY') room.playing = true;
    if (action === 'PAUSE' || action === 'BUFFERING') room.playing = false;
    socket.to(rid).emit('player', { action, time: room.time, by: user.cid });
  });

  // host heartbeat → clients correct drift > 1.5s
  socket.on('heartbeat', ({ time, playing } = {}) => {
    if (!joined() || user.cid !== room.hostId) return;
    room.time = num(time); room.playing = !!playing; room.at = Date.now();
    socket.to(rid).emit('heartbeat', { time: room.time, playing: room.playing });
  });

  socket.on('lock', (v) => { if (joined() && user.cid === room.hostId) { room.lock = !!v; presence(rid, room); } });
  socket.on('chat', ({ text, vt } = {}) => {
    if (!joined() || typeof text !== 'string' || !text.trim()) return;
    const m = { id: crypto.randomUUID(), user: user.name, color: user.color, text: text.slice(0, 500), vt: num(vt), ts: Date.now() };
    room.chat = [...room.chat.slice(-99), m];
    io.to(rid).emit('chat', m); save();
  });
  socket.on('reaction', (e) => { if (joined() && ['❤️', '😂', '😮', '😢', '🔥', '👏'].includes(e)) io.to(rid).emit('reaction', e); });
  socket.on('gesture', (g = {}) => {
    if (joined() && typeof g.type === 'string') {
      io.to(rid).emit('gesture', { from: user.name, fromId: user.cid, type: g.type, meta: g.meta, ts: Date.now() });
    }
  });
  socket.on('screen:start', () => { if (joined()) { room.screenBy = user.cid; io.to(rid).emit('screen', room.screenBy); } });
  socket.on('screen:stop', () => { if (joined() && room.screenBy === user.cid) { room.screenBy = null; io.to(rid).emit('screen', null); } });

  socket.on('disconnect', () => {
    if (!joined() || user.sid !== socket.id) return;  // a newer socket already took over
    const [r, u, id] = [room, user, rid];
    u.timer = setTimeout(() => {
      r.users.delete(u.cid);
      if (r.screenBy === u.cid) { r.screenBy = null; io.to(id).emit('screen', null); }
      if (r.hostId === u.cid) r.hostId = r.users.keys().next().value || null;
      presence(id, r);   // rooms stay (persisted)
    }, GRACE_MS);
  });
});

server.listen(PORT, () => console.log(`SyncCinema server on :${PORT}`));
const stop = () => { io.close(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
