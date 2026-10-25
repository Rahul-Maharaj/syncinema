import { serverUrl } from './socket';

export const ytId = (u) => u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1];
export const vimeoId = (u) => u.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];

export const isAdultMedia = (u) => {
  if (!u) return false;
  return /pornhub\.|xhamster|xvideos|xnxx|eporner\.|spankbang\.|redtube\.|youporn\.|tnaflix\.|ullu\.|beeg\.|hqporner\.|tube8\.|motherless\.|xbabe\.|stripchat\.|chaturbate\.|bongacams\./i.test(String(u));
};

export const sanitizeDisplayTitle = (titleOrUrl) => {
  if (!titleOrUrl) return '';
  const s = String(titleOrUrl);
  if (isAdultMedia(s)) return '🔒 Private Stream';
  return s.replace(/^https?:\/\/(www\.)?/, '');
};

export const isTubeOrEmbedHost = (u) => {
  return /pornhub\.|xhamster|xvideos|xnxx|eporner\.|spankbang\.|redtube\.|youporn\.|tnaflix\.|dood\.|d000d\.|do0od\.|streamtape\.|streamwish\.|wishembed\.|filemoon\.|vidmoly\.|voe\.|mixdrop\.|hdstream4u\.|filefly\.|ullu\.|beeg\.|hqporner\.|tube8\.|motherless\.|xbabe\.|stripchat\.|chaturbate\.|bongacams\./i.test(u);
};

export const OTT_PLATFORMS = [
  { id: 'hotstar', name: 'Disney+ Hotstar', webUrl: 'https://www.hotstar.com', pattern: /(?:hotstar\.com|disneyplus\.com)/i, icon: '🌟', color: '#0f172a' },
  { id: 'netflix', name: 'Netflix', webUrl: 'https://www.netflix.com', pattern: /netflix\.com/i, icon: '🔴', color: '#18181b' },
  { id: 'prime', name: 'Amazon Prime Video', webUrl: 'https://www.primevideo.com', pattern: /(?:primevideo\.com|amazon\.[a-z.]+\/(?:gp\/video|Amazon-Video))/i, icon: '🔵', color: '#0c4a6e' },
  { id: 'jiocinema', name: 'JioCinema', webUrl: 'https://www.jiocinema.com', pattern: /jiocinema\.com/i, icon: '🟣', color: '#4a044e' },
  { id: 'mxplayer', name: 'MX Player', webUrl: 'https://www.mxplayer.in', pattern: /(?:mxplayer\.in|mxplayer\.com)/i, icon: '🎬', color: '#0284c7' },
  { id: 'zee5', name: 'Zee5', webUrl: 'https://www.zee5.com', pattern: /zee5\.com/i, icon: '🟠', color: '#3b0764' },
  { id: 'sonyliv', name: 'SonyLIV', webUrl: 'https://www.sonyliv.com', pattern: /sonyliv\.com/i, icon: '🔷', color: '#1e3a8a' },
  { id: 'ullu', name: 'Ullu', webUrl: 'https://ullu.app', pattern: /(?:ullu\.app|ullu\.club|ullu\.in)/i, icon: '🦉', color: '#dc2626' },
  { id: 'hulu', name: 'Hulu', webUrl: 'https://www.hulu.com', pattern: /hulu\.com/i, icon: '🟢', color: '#064e3b' },
  { id: 'max', name: 'Max (HBO)', webUrl: 'https://www.max.com', pattern: /(?:max\.com|hbomax\.com)/i, icon: '💜', color: '#172554' },
  { id: 'crunchyroll', name: 'Crunchyroll', webUrl: 'https://www.crunchyroll.com', pattern: /crunchyroll\.com/i, icon: '🟧', color: '#7c2d12' },
  { id: 'apple', name: 'Apple TV+', webUrl: 'https://tv.apple.com', pattern: /tv\.apple\.com/i, icon: '🍎', color: '#18181b' },
];

export const POPULAR_NETFLIX_TITLES = {
  '80057281': 'Stranger Things',
  '81040344': 'Squid Game',
  '80192098': 'Money Heist',
  '81231974': 'Wednesday',
  '81616659': 'Animal',
  '81673895': 'Leo',
  '81726434': 'The Railway Men',
  '80189221': 'The Haunting of Hill House',
  '80077368': 'Dark',
  '80117470': '13 Reasons Why',
  '80200942': 'Elite',
  '80100172': 'Dark',
  '70143836': 'Breaking Bad',
  '70153404': 'Friends',
  '80025678': 'The Crown',
  '80057918': 'Lucifer',
  '80186863': 'The Witcher',
  '80234304': 'Bridgerton',
  '81435684': 'All of Us Are Dead',
  '80197526': 'Sex Education',
  '80241239': 'Locke and Key',
  '81026700': 'D.P.',
  '81215567': 'Vincenzo',
  '81436209': 'Doctor Cha',
};

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
    // 0. IMDb Direct ID: imdb.com/title/tt0903747/
    const imdbMatch = s.match(/imdb\.com\/title\/(tt\d+)/i);
    if (imdbMatch && imdbMatch[1]) {
      return imdbMatch[1];
    }

    // 0.1 TMDB Direct: themoviedb.org/movie/693134-dune-part-two or /tv/76479-the-boys
    const tmdbMatch = s.match(/themoviedb\.org\/(?:movie|tv)\/\d+-?([^/?#]*)/i);
    if (tmdbMatch && tmdbMatch[1]) {
      return decodeURIComponent(tmdbMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 1. Disney+ Hotstar: /movies/chhaava/12345 or /shows/title/12345 or /sports/cricket/12345
    const hotstarMatch = s.match(/hotstar\.com\/[^/]+\/(?:movies|shows|clips|sports|live|channels|cricket|video)\/([^/?#]+)/i)
      || s.match(/hotstar\.com\/(?:in|us|gb|ca)?\/(?:movies|shows|clips|sports|live|channels|cricket|video)\/([^/?#]+)/i);
    if (hotstarMatch && hotstarMatch[1]) {
      return decodeURIComponent(hotstarMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 2. Amazon Prime Video: /detail/The-Boys/... or /gp/video/detail/The-Boys/...
    const primeMatch = s.match(/primevideo\.com\/(?:[a-z]{2,5}\/)?detail\/([^/?#]+)/i) || s.match(/amazon\.[a-z.]+\/gp\/video\/detail\/([^/?#]+)/i);
    if (primeMatch && primeMatch[1]) {
      return decodeURIComponent(primeMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 3. JioCinema: /movies/title/123 or /tv-shows/title/123
    const jioMatch = s.match(/jiocinema\.com\/(?:movies|tv-shows)\/([^/?#]+)/i);
    if (jioMatch && jioMatch[1]) {
      return decodeURIComponent(jioMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 4. Zee5: /movies/details/title/123 or /tv-shows/details/title/123
    const zeeMatch = s.match(/zee5\.com\/(?:movies|tv-shows)\/details\/([^/?#]+)/i);
    if (zeeMatch && zeeMatch[1]) {
      return decodeURIComponent(zeeMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 5. SonyLIV: /shows/scam-1992-... or /movies/title-...
    const sonyMatch = s.match(/sonyliv\.com\/(?:shows|movies)\/([^/?#]+)/i);
    if (sonyMatch && sonyMatch[1]) {
      return decodeURIComponent(sonyMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 6. Apple TV+: tv.apple.com/us/movie/napoleon/... or /show/ted-lasso/...
    const appleMatch = s.match(/tv\.apple\.com\/[^/]+\/(?:movie|show)\/([^/?#]+)/i);
    if (appleMatch && appleMatch[1]) {
      return decodeURIComponent(appleMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 7. Hulu: hulu.com/movie/poor-things-... or /series/shogun-...
    const huluMatch = s.match(/hulu\.com\/(?:movie|series)\/([^/?#]+)/i);
    if (huluMatch && huluMatch[1]) {
      return decodeURIComponent(huluMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 8. Max / HBO: max.com/movies/dune-part-two/... or /shows/house-of-the-dragon/...
    const maxMatch = s.match(/(?:max\.com|hbomax\.com)\/(?:movies|shows)\/([^/?#]+)/i);
    if (maxMatch && maxMatch[1]) {
      return decodeURIComponent(maxMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 9. Crunchyroll: crunchyroll.com/series/.../jujutsu-kaisen
    const crunchyMatch = s.match(/crunchyroll\.com\/series\/[^/]+\/([^/?#]+)/i);
    if (crunchyMatch && crunchyMatch[1]) {
      return decodeURIComponent(crunchyMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 10. Netflix: /title/123456 or /watch/123456
    const netflixMatch = s.match(/netflix\.com\/(?:[a-z]{2,5}\/)?(?:title|watch)\/(\d+)/i) || s.match(/jbv=(\d+)/i);
    if (netflixMatch && netflixMatch[1]) {
      const nid = netflixMatch[1];
      if (POPULAR_NETFLIX_TITLES[nid]) {
        return POPULAR_NETFLIX_TITLES[nid];
      }
      return `Netflix Movie (${nid})`;
    }
    const netflixSlugMatch = s.match(/netflix\.com\/(?:[a-z]{2,5}\/)?title\/([a-zA-Z0-9-_]+)/i);
    if (netflixSlugMatch && netflixSlugMatch[1] && isNaN(Number(netflixSlugMatch[1]))) {
      return decodeURIComponent(netflixSlugMatch[1]).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // 11. MX Player: mxplayer.in/movie/watch-chhaava-movie-online-12345 or /show/...
    const mxMatch = s.match(/mxplayer\.(?:in|com)\/(?:movie|show|detail)\/(?:watch-)?([^/?#]+)/i);
    if (mxMatch && mxMatch[1]) {
      return decodeURIComponent(mxMatch[1])
        .replace(/-(?:movie|series|online|full-movie|episode|show).*$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }

    // 12. Ullu: ullu.app/post/1234/watch-title or /video/...
    const ulluMatch = s.match(/ullu\.(?:app|club|in|media)\/(?:post|video|detail)\/(?:\d+\/)?([^/?#]+)/i);
    if (ulluMatch && ulluMatch[1]) {
      return decodeURIComponent(ulluMatch[1])
        .replace(/-(?:web-series|full-video|part-\d+|episode-\d+).*$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }
  } catch {}
  return '';
};

// any link works: known platforms get full sync, media files/streams get full sync, tube/blocked hosts get proxy bypass, OTT gets cloud mirror direct stream
export const detect = (u) => {
  if (ytId(u)) return 'youtube';
  if (vimeoId(u)) return 'vimeo';
  if (isOttPlatform(u)) return 'proxy';
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

export const toProxyUrl = (src) => {
  if (!src || typeof src !== 'string') return '';
  const s = src.trim();
  if (s.startsWith('/api/proxy?') || s.startsWith('blob:') || s.startsWith('data:')) return s;
  return `/api/proxy?url=${encodeURIComponent(s)}`;
};
export const toStreamProxyUrl = (src) => {
  if (!src || typeof src !== 'string') return '';
  const s = src.trim();
  if (s.startsWith('/api/stream?') || s.startsWith('blob:') || s.startsWith('data:')) return s;
  return `/api/stream?url=${encodeURIComponent(s)}`;
};

// Turn share links into unblocked proxy-embedded players (bypasses ISP blocks & X-Frame-Options)
export const toEmbed = (src) => {
  try {
    const s = src.trim();
    const u = new URL(s);
    // Music
    if (u.hostname === 'open.spotify.com' && !u.pathname.startsWith('/embed')) return 'https://open.spotify.com/embed' + u.pathname;
    if (u.hostname.endsWith('soundcloud.com') && !u.hostname.startsWith('w.')) return 'https://w.soundcloud.com/player/?auto_play=true&url=' + encodeURIComponent(src);
    if (/dailymotion\.com$/.test(u.hostname) && u.pathname.startsWith('/video/')) return 'https://www.dailymotion.com/embed' + u.pathname;

    // Live Streaming platforms (Twitch, Kick)
    if (/twitch\.tv$/i.test(u.hostname)) {
      const channelMatch = u.pathname.match(/^\/([a-zA-Z0-9_]+)/);
      if (channelMatch && channelMatch[1] && !['directory', 'videos', 'settings', 'p'].includes(channelMatch[1])) {
        const parentHost = typeof window !== 'undefined' ? window.location.hostname : 'syncinema.site';
        return `https://player.twitch.tv/?channel=${channelMatch[1]}&parent=${parentHost}&muted=false`;
      }
    }
    if (/kick\.com$/i.test(u.hostname)) {
      const channelMatch = u.pathname.match(/^\/([a-zA-Z0-9_]+)/);
      if (channelMatch && channelMatch[1] && !['categories', 'video', 'search'].includes(channelMatch[1])) {
        return `https://player.kick.com/${channelMatch[1]}`;
      }
    }

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

    // 17. Beeg
    m = s.match(/beeg\.(?:com|adult)\/(?:video\/)?([a-zA-Z0-9_-]+)/i);
    if (m) return toProxyUrl(`https://beeg.com/${m[1]}`);

    // 18. HQPorner
    m = s.match(/hqporner\.(?:com|co)\/hdpost\/([a-zA-Z0-9_-]+)/i);
    if (m) return toProxyUrl(`https://hqporner.com/embed/${m[1]}`);

    // 19. Tube8
    m = s.match(/tube8\.(?:com|es)\/(?:embed\/|\?id=)?([a-zA-Z0-9_-]+)/i);
    if (m) return toProxyUrl(`https://www.tube8.com/embed/${m[1]}`);

    // 20. Motherless
    m = s.match(/motherless\.com\/(?:g\/)?([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://motherless.com/embed/${m[1]}`);

    // 21. Live cams (Chaturbate, Stripchat, Bongacams)
    m = s.match(/chaturbate\.com\/(?:in\/)?([a-zA-Z0-9_-]+)/i);
    if (m && !['b', 'tags', 'auth', 'terms', 'privacy'].includes(m[1].toLowerCase())) return toProxyUrl(`https://chaturbate.com/in/?tour=SHmA&campaign=embed&track=default&room=${m[1]}`);

    m = s.match(/stripchat\.com\/(?:[a-z]{2}\/)?([a-zA-Z0-9_-]+)/i);
    if (m && !['explore', 'tags', 'login', 'terms', 'privacy'].includes(m[1].toLowerCase())) return toProxyUrl(`https://stripchat.com/${m[1]}?auto_play=1`);

    m = s.match(/bongacams\.[a-z]+\/([a-zA-Z0-9_-]+)/i);
    if (m && !['chat', 'terms', 'tags', 'login'].includes(m[1].toLowerCase())) return toProxyUrl(`https://bongacams.com/track?c=embed&room=${m[1]}`);

    // Movie & third party hosts
    m = s.match(/hdstream4u\.[a-z]+\/(?:file|embed)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://hdstream4u.com/embed/${m[1]}`);
    m = s.match(/filefly\.[a-z]+\/(?:file|embed|v|d)\/([a-zA-Z0-9]+)/i);
    if (m) return toProxyUrl(`https://filefly.xyz/embed/${m[1]}`);

    // If already routed through our server proxy, return as is
    if (u.pathname.startsWith('/api/proxy') || u.pathname.startsWith('/api/stream')) {
      return u.href;
    }

    // Default: Route all generic 3rd-party video/embed links through /api/proxy to strip ads, prevent popups & bypass X-Frame-Options
    return toProxyUrl(u.href);
  } catch {
    return (src && src.startsWith('http')) ? toProxyUrl(src) : src;
  }
};

export const resolveMedia = async (src) => {
  try {
    const base = typeof window !== 'undefined' ? serverUrl() : '';
    const res = await fetch(`${base}/api/resolve?url=${encodeURIComponent(src)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.src && data.src.startsWith('/api/')) {
        data.src = `${base}${data.src}`;
      }
      return data;
    }
  } catch {}
  return null;
};

export const KNOWN_TITLES_MAP = {
  // Hotstar Hits
  'chhaava': { imdbId: 'tt27922706', isTv: false, title: 'Chhaava', year: '2025' },
  'brahmastra': { imdbId: 'tt6277462', isTv: false, title: 'Brahmāstra: Part One – Shiva', year: '2022' },
  'brahmastra part one shiva': { imdbId: 'tt6277462', isTv: false, title: 'Brahmāstra: Part One – Shiva', year: '2022' },
  '12th fail': { imdbId: 'tt23849204', isTv: false, title: '12th Fail', year: '2023' },
  'shogun': { imdbId: 'tt2788316', isTv: true, title: 'Shōgun', year: '2024' },
  'lokah chapter 1': { imdbId: 'tt32420456', isTv: false, title: 'Lokah Chapter 1', year: '2025' },
  'aarya': { imdbId: 'tt12439546', isTv: true, title: 'Aarya', year: '2020' },

  // Netflix Blockbusters
  'stranger things': { imdbId: 'tt4574334', isTv: true, title: 'Stranger Things', year: '2016' },
  'squid game': { imdbId: 'tt10919420', isTv: true, title: 'Squid Game', year: '2021' },
  'animal': { imdbId: 'tt13751694', isTv: false, title: 'Animal', year: '2023' },
  'money heist': { imdbId: 'tt6468322', isTv: true, title: 'Money Heist', year: '2017' },
  'wednesday': { imdbId: 'tt13443470', isTv: true, title: 'Wednesday', year: '2022' },
  'leo': { imdbId: 'tt15654328', isTv: false, title: 'Leo', year: '2023' },
  'the railway men': { imdbId: 'tt16278804', isTv: true, title: 'The Railway Men', year: '2023' },
  'the haunting of hill house': { imdbId: 'tt6763664', isTv: true, title: 'The Haunting of Hill House', year: '2018' },
  'dark': { imdbId: 'tt5753856', isTv: true, title: 'Dark', year: '2017' },
  'breaking bad': { imdbId: 'tt0903747', isTv: true, title: 'Breaking Bad', year: '2008' },
  'friends': { imdbId: 'tt0108778', isTv: true, title: 'Friends', year: '1994' },
  'the crown': { imdbId: 'tt4786824', isTv: true, title: 'The Crown', year: '2016' },
  'lucifer': { imdbId: 'tt4052886', isTv: true, title: 'Lucifer', year: '2016' },
  'the witcher': { imdbId: 'tt5180504', isTv: true, title: 'The Witcher', year: '2019' },
  'all of us are dead': { imdbId: 'tt14169960', isTv: true, title: 'All of Us Are Dead', year: '2022' },

  // Prime Video
  'the boys': { imdbId: 'tt1190634', isTv: true, title: 'The Boys', year: '2019' },
  'mirzapur': { imdbId: 'tt6473300', isTv: true, title: 'Mirzapur', year: '2018' },
  'panchayat': { imdbId: 'tt12004706', isTv: true, title: 'Panchayat', year: '2020' },
  'fallout': { imdbId: 'tt12637874', isTv: true, title: 'Fallout', year: '2024' },
  'farzi': { imdbId: 'tt14234472', isTv: true, title: 'Farzi', year: '2023' },
  'citadel': { imdbId: 'tt11640018', isTv: true, title: 'Citadel', year: '2023' },

  // JioCinema
  'stree 2': { imdbId: 'tt27510174', isTv: false, title: 'Stree 2', year: '2024' },
  'asur': { imdbId: 'tt11912196', isTv: true, title: 'Asur', year: '2020' },
  'bloody daddy': { imdbId: 'tt16075936', isTv: false, title: 'Bloody Daddy', year: '2023' },
  'bhediya': { imdbId: 'tt14081092', isTv: false, title: 'Bhediya', year: '2022' },

  // Zee5
  'gadar 2': { imdbId: 'tt15441054', isTv: false, title: 'Gadar 2', year: '2023' },
  'sirf ek bandaa kaafi hai': { imdbId: 'tt22695536', isTv: false, title: 'Sirf Ek Bandaa Kaafi Hai', year: '2023' },
  'sam bahadur': { imdbId: 'tt10406854', isTv: false, title: 'Sam Bahadur', year: '2023' },
  'silence 2': { imdbId: 'tt31846503', isTv: false, title: 'Silence 2', year: '2024' },

  // Global All-Time Blockbusters
  'inception': { imdbId: 'tt1375666', isTv: false, title: 'Inception', year: '2010' },
  'interstellar': { imdbId: 'tt0816692', isTv: false, title: 'Interstellar', year: '2014' },
  'oppenheimer': { imdbId: 'tt15398776', isTv: false, title: 'Oppenheimer', year: '2023' },
  'dune': { imdbId: 'tt1160419', isTv: false, title: 'Dune: Part One', year: '2021' },
  'dune part two': { imdbId: 'tt15239678', isTv: false, title: 'Dune: Part Two', year: '2024' },
  'game of thrones': { imdbId: 'tt0944947', isTv: true, title: 'Game of Thrones', year: '2011' },
  'house of the dragon': { imdbId: 'tt11198330', isTv: true, title: 'House of the Dragon', year: '2022' },
  'deadpool & wolverine': { imdbId: 'tt6263850', isTv: false, title: 'Deadpool & Wolverine', year: '2024' },
};

export const lookupKnownTitle = (query) => {
  if (!query) return null;
  const clean = String(query).trim().toLowerCase();
  const normalized = clean.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  if (KNOWN_TITLES_MAP[clean]) return KNOWN_TITLES_MAP[clean];
  if (KNOWN_TITLES_MAP[normalized]) return KNOWN_TITLES_MAP[normalized];

  for (const [k, v] of Object.entries(KNOWN_TITLES_MAP)) {
    if (normalized === k || normalized.includes(k) || k.includes(normalized)) {
      return v;
    }
  }

  // Also search through all catalog items
  if (typeof OTT_CATALOGS !== 'undefined') {
    for (const items of Object.values(OTT_CATALOGS)) {
      for (const item of items) {
        const itemNorm = item.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        if (itemNorm === normalized || normalized.includes(itemNorm) || itemNorm.includes(normalized)) {
          return {
            imdbId: item.imdbId,
            isTv: item.isTv,
            title: item.title,
            year: item.year,
          };
        }
      }
    }
  }
  return null;
};

export const resolveTitleToMetadata = async (query) => {
  if (!query) return null;
  if (typeof query === 'object' && query.imdbId) return query;

  const clean = String(query).trim();
  if (/^tt\d+$/i.test(clean)) {
    return { imdbId: clean, isTv: false, title: clean };
  }

  const known = lookupKnownTitle(clean);
  if (known) return known;

  // 1. Try server resolver
  try {
    const base = typeof window !== 'undefined' ? serverUrl() : '';
    const res = await fetch(`${base}/api/ott/resolve?q=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.imdbId) {
        return data;
      }
    }
  } catch {}

  // 2. Direct client fallback: Cinemeta catalog (TV Series & Movies)
  try {
    const encoded = encodeURIComponent(clean);
    // Try TV series first
    const sRes = await fetch(`https://v3-cinemeta.strem.io/catalog/series/top/search=${encoded}.json`);
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData?.metas?.length > 0) {
        const top = sData.metas[0];
        return {
          imdbId: top.imdb_id || top.id,
          title: top.name || clean,
          year: top.releaseInfo || top.year || '',
          isTv: true,
          poster: top.poster || '',
        };
      }
    }

    // Try Movies next
    const mRes = await fetch(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encoded}.json`);
    if (mRes.ok) {
      const mData = await mRes.json();
      if (mData?.metas?.length > 0) {
        const top = mData.metas[0];
        return {
          imdbId: top.imdb_id || top.id,
          title: top.name || clean,
          year: top.releaseInfo || top.year || '',
          isTv: false,
          poster: top.poster || '',
        };
      }
    }
  } catch {}

  // 3. Fallback to IMDb suggestions
  try {
    const first = clean.charAt(0).toLowerCase() || 'a';
    const slug = clean.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    const imdbUrl = `https://v3.sg.media-imdb.com/suggestion/${first}/${encodeURIComponent(slug)}.json`;
    const res = await fetch(imdbUrl);
    if (res.ok) {
      const data = await res.json();
      const match = data?.d?.find((item) => item.id?.startsWith('tt'));
      if (match) {
        return {
          imdbId: match.id,
          title: match.l || clean,
          year: match.y || match.tl || '',
          isTv: Boolean(match.q?.includes('TV') || match.qid?.includes('tv') || match.yr),
          poster: match.i?.imageUrl || '',
        };
      }
    }
  } catch {}

  return { imdbId: '', isTv: false, title: clean };
};

export const getCloudMirrorSources = (queryOrMeta, isTvParam = false, titleParam = '') => {
  if (!queryOrMeta) return [];
  let imdbId = '';
  let isTv = Boolean(isTvParam);
  let title = titleParam;

  if (typeof queryOrMeta === 'object' && queryOrMeta !== null) {
    imdbId = queryOrMeta.imdbId || '';
    if (queryOrMeta.isTv !== undefined) isTv = Boolean(queryOrMeta.isTv);
    title = queryOrMeta.title || title;
  } else if (typeof queryOrMeta === 'string') {
    const clean = queryOrMeta.trim();
    if (/^tt\d+$/i.test(clean)) {
      imdbId = clean;
    } else {
      const known = lookupKnownTitle(clean);
      if (known) {
        imdbId = known.imdbId;
        isTv = Boolean(known.isTv);
        title = known.title || clean;
      } else {
        title = clean;
      }
    }
  }

  const encodedTitle = encodeURIComponent(title || 'movie');

  // If a verified IMDb ID is available, generate working 1080p stream mirrors
  if (imdbId) {
    return [
      {
        name: 'Server 1 (Crystal Stream 1080p Ad-Free)',
        quality: '1080p Crystal',
        tag: 'Ad-Free',
        url: isTv
          ? `https://www.2embed.skin/embedtv/${imdbId}&s=1&e=1`
          : `https://www.2embed.skin/embed/${imdbId}`,
      },
      {
        name: 'Server 2 (VidSrc SU Clean HD)',
        quality: '1080p HD',
        tag: 'Clean 1080p',
        url: isTv
          ? `https://vidsrc.su/embed/tv/${imdbId}`
          : `https://vidsrc.su/embed/movie/${imdbId}`,
      },
      {
        name: 'Server 3 (AutoEmbed Multi-Source HD)',
        quality: '1080p HD',
        tag: 'Multi-Source',
        url: isTv
          ? `https://autoembed.co/tv/imdb/${imdbId}-1-1`
          : `https://autoembed.co/movie/imdb/${imdbId}`,
      },
      {
        name: 'Server 4 (2Embed Cinema VIP)',
        quality: '1080p VIP',
        tag: 'VIP Stream',
        url: isTv
          ? `https://www.2embed.cc/embedtv/${imdbId}&s=1&e=1`
          : `https://www.2embed.cc/embed/${imdbId}`,
      },
      {
        name: 'Server 5 (VidSrc Shield Ad-Free)',
        quality: '1080p',
        tag: 'Ad-Shield',
        url: toProxyUrl(
          isTv
            ? `https://vidsrc.pm/embed/tv/${imdbId}`
            : `https://vidsrc.pm/embed/movie/${imdbId}`
        ),
      },
      {
        name: 'Server 6 (VidSrc Classic)',
        quality: 'HD',
        tag: 'Backup',
        url: isTv
          ? `https://vidsrc.to/embed/tv/${imdbId}`
          : `https://vidsrc.to/embed/movie/${imdbId}`,
      },
    ];
  }

  // Fallback if no IMDb ID could be resolved
  return [
    {
      name: 'Server 1 (2Embed Skin Direct HD)',
      quality: '1080p Crystal',
      tag: 'Ad-Free',
      url: `https://www.2embed.skin/embed/${encodedTitle}`,
    },
    {
      name: 'Server 2 (AutoEmbed Multi-Source HD)',
      quality: '1080p HD',
      tag: 'Auto',
      url: `https://autoembed.co/movie/imdb/${encodedTitle}`,
    },
    {
      name: 'Server 3 (2Embed Cinema VIP)',
      quality: '1080p',
      tag: 'VIP',
      url: `https://www.2embed.cc/embed/${encodedTitle}`,
    },
  ];
};

export const OTT_CATALOGS = {
  hotstar: [
    { title: 'Chhaava', imdbId: 'tt27922706', isTv: false, year: '2025', genre: 'Action / History', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Blockbuster' },
    { title: 'Brahmāstra: Part One – Shiva', imdbId: 'tt6277462', isTv: false, year: '2022', genre: 'Fantasy / Action', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Superhit' },
    { title: '12th Fail', imdbId: 'tt23849204', isTv: false, year: '2023', genre: 'Drama / Inspirational', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Top Rated' },
    { title: 'Shōgun', imdbId: 'tt2788316', isTv: true, year: '2024', genre: 'Drama / History', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Emmy Winner' },
    { title: 'Lokah Chapter 1', imdbId: 'tt32420456', isTv: false, year: '2025', genre: 'Sci-Fi / Thriller', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Trending' },
    { title: 'Aarya', imdbId: 'tt12439546', isTv: true, year: '2023', genre: 'Crime / Drama', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Popular' },
  ],
  netflix: [
    { title: 'Stranger Things', imdbId: 'tt4574334', isTv: true, year: '2024', genre: 'Sci-Fi / Horror', ott: 'Netflix', icon: '🔴', badge: 'Global #1' },
    { title: 'Squid Game', imdbId: 'tt10919420', isTv: true, year: '2024', genre: 'Thriller / Survival', ott: 'Netflix', icon: '🔴', badge: 'Trending' },
    { title: 'Animal', imdbId: 'tt13751694', isTv: false, year: '2023', genre: 'Action / Crime', ott: 'Netflix', icon: '🔴', badge: 'Blockbuster' },
    { title: 'Money Heist', imdbId: 'tt6468322', isTv: true, year: '2021', genre: 'Heist / Thriller', ott: 'Netflix', icon: '🔴', badge: 'Fan Favorite' },
    { title: 'Wednesday', imdbId: 'tt13443470', isTv: true, year: '2023', genre: 'Fantasy / Mystery', ott: 'Netflix', icon: '🔴', badge: 'Viral Hit' },
    { title: 'Leo', imdbId: 'tt15654328', isTv: false, year: '2023', genre: 'Action / Thriller', ott: 'Netflix', icon: '🔴', badge: 'Action Hit' },
  ],
  prime: [
    { title: 'The Boys', imdbId: 'tt1190634', isTv: true, year: '2024', genre: 'Action / Superhero', ott: 'Prime Video', icon: '🔵', badge: 'Top Hit' },
    { title: 'Mirzapur', imdbId: 'tt6473300', isTv: true, year: '2024', genre: 'Crime / Drama', ott: 'Prime Video', icon: '🔵', badge: 'Mass Hit' },
    { title: 'Panchayat', imdbId: 'tt12004706', isTv: true, year: '2024', genre: 'Comedy / Drama', ott: 'Prime Video', icon: '🔵', badge: 'All-Time Fav' },
    { title: 'Fallout', imdbId: 'tt12637874', isTv: true, year: '2024', genre: 'Sci-Fi / Adventure', ott: 'Prime Video', icon: '🔵', badge: 'Critically Acclaimed' },
    { title: 'Farzi', imdbId: 'tt14234472', isTv: true, year: '2023', genre: 'Thriller / Con', ott: 'Prime Video', icon: '🔵', badge: 'Popular' },
    { title: 'Citadel', imdbId: 'tt11640018', isTv: true, year: '2023', genre: 'Action / Spy', ott: 'Prime Video', icon: '🔵', badge: 'High Octane' },
  ],
  jiocinema: [
    { title: 'Stree 2', imdbId: 'tt27510174', isTv: false, year: '2024', genre: 'Comedy / Horror', ott: 'JioCinema', icon: '🟣', badge: '₹800 Cr Mega Hit' },
    { title: 'Asur', imdbId: 'tt11912196', isTv: true, year: '2023', genre: 'Crime / Mythology', ott: 'JioCinema', icon: '🟣', badge: 'Masterpiece' },
    { title: 'Bloody Daddy', imdbId: 'tt16075936', isTv: false, year: '2023', genre: 'Action / Thriller', ott: 'JioCinema', icon: '🟣', badge: 'Non-stop Action' },
    { title: 'Bhediya', imdbId: 'tt14081092', isTv: false, year: '2022', genre: 'Comedy / Creature', ott: 'JioCinema', icon: '🟣', badge: 'Superhit' },
  ],
  zee5: [
    { title: 'Gadar 2', imdbId: 'tt15441054', isTv: false, year: '2023', genre: 'Action / Drama', ott: 'Zee5', icon: '🟠', badge: '₹600 Cr Hit' },
    { title: 'Sirf Ek Bandaa Kaafi Hai', imdbId: 'tt22695536', isTv: false, year: '2023', genre: 'Courtroom / Drama', ott: 'Zee5', icon: '🟠', badge: 'Award Winner' },
    { title: 'Sam Bahadur', imdbId: 'tt10406854', isTv: false, year: '2023', genre: 'Biopic / War', ott: 'Zee5', icon: '🟠', badge: 'Must Watch' },
    { title: 'Silence 2', imdbId: 'tt31846503', isTv: false, year: '2024', genre: 'Crime / Mystery', ott: 'Zee5', icon: '🟠', badge: 'Edge of Seat' },
  ],
};
