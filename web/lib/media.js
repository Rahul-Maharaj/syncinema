export const ytId = (u) => u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1];
export const vimeoId = (u) => u.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];

export const isAdultMedia = (u) => {
  if (!u) return false;
  return /pornhub\.|xhamster|xvideos|xnxx|eporner\.|spankbang\.|redtube\.|youporn\.|tnaflix\./i.test(String(u));
};

export const sanitizeDisplayTitle = (titleOrUrl) => {
  if (!titleOrUrl) return '';
  const s = String(titleOrUrl);
  if (isAdultMedia(s)) return '🔒 Private Stream';
  return s.replace(/^https?:\/\/(www\.)?/, '');
};

export const isTubeOrEmbedHost = (u) => {
  return /pornhub\.|xhamster|xvideos|xnxx|eporner\.|spankbang\.|redtube\.|youporn\.|tnaflix\.|dood\.|d000d\.|do0od\.|streamtape\.|streamwish\.|wishembed\.|filemoon\.|vidmoly\.|voe\.|mixdrop\.|hdstream4u\.|filefly\./i.test(u);
};

export const OTT_PLATFORMS = [
  { id: 'hotstar', name: 'Disney+ Hotstar', pattern: /(?:hotstar\.com|disneyplus\.com)/i, icon: '🌟', color: '#123962' },
  { id: 'netflix', name: 'Netflix', pattern: /netflix\.com/i, icon: '🔴', color: '#E50914' },
  { id: 'prime', name: 'Amazon Prime Video', pattern: /(?:primevideo\.com|amazon\.[a-z.]+\/(?:gp\/video|Amazon-Video))/i, icon: '🔵', color: '#00A8E1' },
  { id: 'jiocinema', name: 'JioCinema', pattern: /jiocinema\.com/i, icon: '🟣', color: '#D40078' },
  { id: 'zee5', name: 'Zee5', pattern: /zee5\.com/i, icon: '🟠', color: '#7E3AF2' },
  { id: 'sonyliv', name: 'SonyLIV', pattern: /sonyliv\.com/i, icon: '🔷', color: '#0066FF' },
  { id: 'hulu', name: 'Hulu', pattern: /hulu\.com/i, icon: '🟢', color: '#1CE783' },
  { id: 'max', name: 'Max (HBO)', pattern: /(?:max\.com|hbomax\.com)/i, icon: '💜', color: '#001D4A' },
  { id: 'crunchyroll', name: 'Crunchyroll', pattern: /crunchyroll\.com/i, icon: '🟧', color: '#F47521' },
  { id: 'apple', name: 'Apple TV+', pattern: /tv\.apple\.com/i, icon: '🍎', color: '#333333' },
];

export const getOttPlatform = (u) => {
  if (!u) return null;
  const s = String(u);
  return OTT_PLATFORMS.find((p) => p.pattern.test(s)) || null;
};

export const isOttPlatform = (u) => Boolean(getOttPlatform(u));

export const extractOttTitle = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  try {
    // 1. Disney+ Hotstar: /movies/chhaava/12345 or /shows/title/12345
    const hotstarMatch = s.match(/hotstar\.com\/[^/]+\/(?:movies|shows|clips)\/([^/]+)/i);
    if (hotstarMatch && hotstarMatch[1]) {
      return decodeURIComponent(hotstarMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }
    // 2. Amazon Prime Video: /detail/The-Boys/... or /gp/video/detail/B0...
    const primeMatch = s.match(/primevideo\.com\/detail\/([^/?#]+)/i) || s.match(/amazon\.[a-z.]+\/gp\/video\/detail\/([^/?#]+)/i);
    if (primeMatch && primeMatch[1]) {
      return decodeURIComponent(primeMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }
    // 3. JioCinema: /movies/title/123 or /tv-shows/title/123
    const jioMatch = s.match(/jiocinema\.com\/(?:movies|tv-shows)\/([^/?#]+)/i);
    if (jioMatch && jioMatch[1]) {
      return decodeURIComponent(jioMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }
    // 4. Zee5: /movies/details/title/123
    const zeeMatch = s.match(/zee5\.com\/(?:movies|tv-shows)\/details\/([^/?#]+)/i);
    if (zeeMatch && zeeMatch[1]) {
      return decodeURIComponent(zeeMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }
    // 5. Netflix: /title/123456 or /watch/123456
    const netflixMatch = s.match(/netflix\.com\/(?:title|watch)\/(\d+)/i);
    if (netflixMatch) {
      return `Netflix Movie (${netflixMatch[1]})`;
    }
  } catch {}
  return '';
};

// any link works: known platforms get full sync, media files/streams get full sync, tube/blocked hosts get proxy bypass, OTT gets hybrid
export const detect = (u) => {
  if (ytId(u)) return 'youtube';
  if (vimeoId(u)) return 'vimeo';
  if (isOttPlatform(u)) return 'hybrid';
  const p = u.split('?')[0].split('#')[0].toLowerCase();
  if (p.endsWith('.m3u8')) return 'hls';
  if (p.endsWith('.mpd')) return 'dash';
  if (/\.(mp4|webm|ogv|ogg|mov|m4v|mkv|mp3|m4a|wav|flac|aac|opus|weba|m4b)$/.test(p)) return 'file';
  if (isTubeOrEmbedHost(u)) return 'proxy';
  return 'embed';
};

const cache = {};
export const loadScript = (src) => (cache[src] ||= new Promise((res, rej) => {
  const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s);
}));
export const ytReady = () => window.YT?.Player ? Promise.resolve()
  : new Promise((r) => { window.onYouTubeIframeAPIReady = r; loadScript('https://www.youtube.com/iframe_api'); });

export const toProxyUrl = (src) => `/api/proxy?url=${encodeURIComponent(src)}`;
export const toStreamProxyUrl = (src) => `/api/stream?url=${encodeURIComponent(src)}`;

// Turn share links into unblocked proxy-embedded players (bypasses ISP blocks & X-Frame-Options)
export const toEmbed = (src) => {
  try {
    const s = src.trim();
    const u = new URL(s);
    // Music
    if (u.hostname === 'open.spotify.com' && !u.pathname.startsWith('/embed')) return 'https://open.spotify.com/embed' + u.pathname;
    if (u.hostname.endsWith('soundcloud.com') && !u.hostname.startsWith('w.')) return 'https://w.soundcloud.com/player/?auto_play=true&url=' + encodeURIComponent(src);
    if (/dailymotion\.com$/.test(u.hostname) && u.pathname.startsWith('/video/')) return 'https://www.dailymotion.com/embed' + u.pathname;

    // Adult & Tube sites (Proxied through /api/proxy to bypass ISP blocks and X-Frame-Options)
    // 1. Pornhub (all domains, mobile, www, international)
    let m = s.match(/pornhub\.(?:com|org|net|premium)\/(?:(?:[a-z]{2}\/)?view_video\.php\?(?:.*&)?viewkey=|embed\/|video\/)([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://www.pornhub.com/embed/${m[1]}`);

    // 2. xHamster (all domains: xhamster.com, xhamster.desi, xhamster19.com, mobile, etc.)
    m = s.match(/xhamster[a-z0-9]*\.(?:com|desi|org|net|one)\/(?:videos\/|movies\/)[^\s"']*?(xh[a-zA-Z0-9]+|\d+)/i)
      || s.match(/xhamster[a-z0-9]*\.(?:com|desi|org|net|one)\/xembed\.php\?video=([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://xhamster.com/xembed.php?video=${m[1]}`);

    // 3. XVideos
    m = s.match(/xvideos[a-z0-9]*\.(?:com|es|in|net)\/(?:video\.?|embedframe\/)([a-zA-Z0-9_-]+)/i);
    if (m) return toProxyUrl(`https://www.xvideos.com/embedframe/${m[1]}`);

    // 4. XNXX
    m = s.match(/xnxx[a-z0-9]*\.(?:com|tv|in|health)\/(?:video-?|embedframe\/)([a-zA-Z0-9_-]+)/i);
    if (m) return toProxyUrl(`https://www.xnxx.com/embedframe/${m[1]}`);

    // 5. EPorner
    m = s.match(/eporner\.(?:com|org)\/(?:video-|embed\/)([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://www.eporner.com/embed/${m[1]}/`);

    // 6. SpankBang
    m = s.match(/spankbang\.(?:com|party)\/(?:video\/|embed\/)?([a-zA-Z0-9]+)(?:\/(?:video|embed))?/i);
    if (m && m[1] !== 'video' && m[1] !== 'embed') return toProxyUrl(`https://spankbang.com/${m[1]}/embed/`);

    // 7. RedTube
    m = s.match(/redtube\.(?:com|net)\/(?:embed\/|\?id=)?(\d+)/i);
    if (m) return toProxyUrl(`https://embed.redtube.com/?id=${m[1]}`);

    // 8. YouPorn
    m = s.match(/youporn\.(?:com|org)\/(?:watch|embed)\/(\d+)/i);
    if (m) return toProxyUrl(`https://www.youporn.com/embed/${m[1]}`);

    // 9. DoodStream / D000d
    m = s.match(/(?:dood|d000d|do0od|ds2play)\.[a-z0-9]+\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://d000d.com/e/${m[1]}`);

    // 10. Streamtape
    m = s.match(/streamtape\.[a-z0-9]+\/(?:v|e)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://streamtape.com/e/${m[1]}`);

    // 11. Streamwish
    m = s.match(/(?:streamwish|wishembed)\.[a-z0-9]+\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://streamwish.to/e/${m[1]}`);

    // 12. Filemoon
    m = s.match(/filemoon\.[a-z0-9]+\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://filemoon.sx/e/${m[1]}`);

    // 13. Vidmoly
    m = s.match(/vidmoly\.[a-z0-9]+\/(?:w\/|embed-)([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://vidmoly.to/embed-${m[1]}.html`);

    // 14. Voe
    m = s.match(/voe[a-z0-9-]*\.[a-z0-9]+\/(?:e\/)?([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://voe.sx/e/${m[1]}`);

    // 15. Mixdrop
    m = s.match(/mixdrop\.[a-z0-9]+\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://mixdrop.co/e/${m[1]}`);

    // 16. Tnaflix
    m = s.match(/tnaflix\.(?:com|net)\/(?:video|embedded)(\d+)/i);
    if (m) return toProxyUrl(`https://player.tnaflix.com/video/${m[1]}`);

    // Movie & third party hosts
    m = s.match(/hdstream4u\.[a-z]+\/(?:file|embed)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://hdstream4u.com/embed/${m[1]}`);
    m = s.match(/filefly\.[a-z]+\/(?:file|embed|v|d)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://filefly.xyz/embed/${m[1]}`);

    return u.href;
  } catch { return src; }
};

export const resolveMedia = async (src) => {
  try {
    const res = await fetch(`/api/resolve?url=${encodeURIComponent(src)}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
};

export const getCloudMirrorSources = (query) => {
  if (!query) return [];
  const clean = encodeURIComponent(query.trim());
  return [
    { name: 'Server 1 (VidSrc)', url: toProxyUrl(`https://vidsrc.to/embed/movie/${clean}`) },
    { name: 'Server 2 (EmbedSU)', url: toProxyUrl(`https://embed.su/embed/movie/${clean}`) },
    { name: 'Server 3 (2Embed)', url: toProxyUrl(`https://www.2embed.cc/embed/${clean}`) },
  ];
};
