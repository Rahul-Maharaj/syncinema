import { serverUrl } from './socket';

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
  { id: 'hotstar', name: 'Disney+ Hotstar', webUrl: 'https://www.hotstar.com', pattern: /(?:hotstar\.com|disneyplus\.com)/i, icon: '🌟', color: '#0f172a' },
  { id: 'netflix', name: 'Netflix', webUrl: 'https://www.netflix.com', pattern: /netflix\.com/i, icon: '🔴', color: '#18181b' },
  { id: 'prime', name: 'Amazon Prime Video', webUrl: 'https://www.primevideo.com', pattern: /(?:primevideo\.com|amazon\.[a-z.]+\/(?:gp\/video|Amazon-Video))/i, icon: '🔵', color: '#0c4a6e' },
  { id: 'jiocinema', name: 'JioCinema', webUrl: 'https://www.jiocinema.com', pattern: /jiocinema\.com/i, icon: '🟣', color: '#4a044e' },
  { id: 'zee5', name: 'Zee5', webUrl: 'https://www.zee5.com', pattern: /zee5\.com/i, icon: '🟠', color: '#3b0764' },
  { id: 'sonyliv', name: 'SonyLIV', webUrl: 'https://www.sonyliv.com', pattern: /sonyliv\.com/i, icon: '🔷', color: '#1e3a8a' },
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

    // 1. Disney+ Hotstar: /movies/chhaava/12345 or /shows/title/12345
    const hotstarMatch = s.match(/hotstar\.com\/[^/]+\/(?:movies|shows|clips)\/([^/]+)/i);
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
  const base = typeof window !== 'undefined' ? serverUrl() : '';
  return `${base}/api/proxy?url=${encodeURIComponent(src)}`;
};
export const toStreamProxyUrl = (src) => {
  const base = typeof window !== 'undefined' ? serverUrl() : '';
  return `${base}/api/stream?url=${encodeURIComponent(src)}`;
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
    const base = typeof window !== 'undefined' ? serverUrl() : '';
    const res = await fetch(`${base}/api/resolve?url=${encodeURIComponent(src)}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
};

export const getCloudMirrorSources = (query) => {
  if (!query) return [];
  const clean = query.trim();
  const encoded = encodeURIComponent(clean);
  const isImdb = /^tt\d+$/i.test(clean);

  return [
    {
      name: 'Server 1 (VidSrc 1080p Ultra HD)',
      quality: '1080p Ultra',
      tag: 'Fast',
      url: isImdb
        ? `https://vidsrc.to/embed/movie/${clean}`
        : `https://vidsrc.to/embed/movie/${encoded}`,
    },
    {
      name: 'Server 2 (AutoEmbed Multi-Source 1080p)',
      quality: '1080p HD',
      tag: 'Multi-Lang',
      url: `https://autoembed.cc/embed/player.php?id=${encoded}`,
    },
    {
      name: 'Server 3 (EmbedSU Multi-Audio HD)',
      quality: '1080p HD',
      tag: 'Dual Audio',
      url: `https://embed.su/embed/movie/${encoded}`,
    },
    {
      name: 'Server 4 (VidSrc.me Crystal HD)',
      quality: '1080p HD',
      tag: 'Crystal',
      url: isImdb
        ? `https://vidsrc.me/embed/movie?imdb=${clean}`
        : `https://vidsrc.me/embed/movie?title=${encoded}`,
    },
    {
      name: 'Server 5 (2Embed Cinema 1080p)',
      quality: '1080p HD',
      tag: 'HQ',
      url: `https://www.2embed.cc/embed/${encoded}`,
    },
    {
      name: 'Server 6 (SmashyStream HD)',
      quality: 'HD',
      tag: 'Stable',
      url: `https://player.smashy.stream/movie/${encoded}`,
    },
    {
      name: 'Server 7 (MoviesAPI Full HD)',
      quality: '1080p',
      tag: 'Backup',
      url: `https://moviesapi.club/movie/${encoded}`,
    },
    {
      name: 'Server 8 (SuperEmbed Global VIP)',
      quality: '1080p VIP',
      tag: 'Worldwide',
      url: `https://multiembed.mov/?video_id=${encoded}`,
    },
  ];
};

export const OTT_CATALOGS = {
  hotstar: [
    { title: 'Chhaava', year: '2025', genre: 'Action / History', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Blockbuster' },
    { title: 'Brahmāstra: Part One – Shiva', year: '2022', genre: 'Fantasy / Action', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Superhit' },
    { title: '12th Fail', year: '2023', genre: 'Drama / Inspirational', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Top Rated' },
    { title: 'Shōgun', year: '2024', genre: 'Drama / History', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Emmy Winner' },
    { title: 'Lokah Chapter 1', year: '2025', genre: 'Sci-Fi / Thriller', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Trending' },
    { title: 'Aarya', year: '2023', genre: 'Crime / Drama', ott: 'Disney+ Hotstar', icon: '🌟', badge: 'Popular' },
  ],
  netflix: [
    { title: 'Stranger Things', year: '2024', genre: 'Sci-Fi / Horror', ott: 'Netflix', icon: '🔴', badge: 'Global #1' },
    { title: 'Squid Game', year: '2024', genre: 'Thriller / Survival', ott: 'Netflix', icon: '🔴', badge: 'Trending' },
    { title: 'Animal', year: '2023', genre: 'Action / Crime', ott: 'Netflix', icon: '🔴', badge: 'Blockbuster' },
    { title: 'Money Heist', year: '2021', genre: 'Heist / Thriller', ott: 'Netflix', icon: '🔴', badge: 'Fan Favorite' },
    { title: 'Wednesday', year: '2023', genre: 'Fantasy / Mystery', ott: 'Netflix', icon: '🔴', badge: 'Viral Hit' },
    { title: 'Leo', year: '2023', genre: 'Action / Thriller', ott: 'Netflix', icon: '🔴', badge: 'Action Hit' },
  ],
  prime: [
    { title: 'The Boys', year: '2024', genre: 'Action / Superhero', ott: 'Prime Video', icon: '🔵', badge: 'Top Hit' },
    { title: 'Mirzapur', year: '2024', genre: 'Crime / Drama', ott: 'Prime Video', icon: '🔵', badge: 'Mass Hit' },
    { title: 'Panchayat', year: '2024', genre: 'Comedy / Drama', ott: 'Prime Video', icon: '🔵', badge: 'All-Time Fav' },
    { title: 'Fallout', year: '2024', genre: 'Sci-Fi / Adventure', ott: 'Prime Video', icon: '🔵', badge: 'Critically Acclaimed' },
    { title: 'Farzi', year: '2023', genre: 'Thriller / Con', ott: 'Prime Video', icon: '🔵', badge: 'Popular' },
    { title: 'Citadel', year: '2023', genre: 'Action / Spy', ott: 'Prime Video', icon: '🔵', badge: 'High Octane' },
  ],
  jiocinema: [
    { title: 'Stree 2', year: '2024', genre: 'Comedy / Horror', ott: 'JioCinema', icon: '🟣', badge: '₹800 Cr Mega Hit' },
    { title: 'Asur', year: '2023', genre: 'Crime / Mythology', ott: 'JioCinema', icon: '🟣', badge: 'Masterpiece' },
    { title: 'Bloody Daddy', year: '2023', genre: 'Action / Thriller', ott: 'JioCinema', icon: '🟣', badge: 'Non-stop Action' },
    { title: 'Bhediya', year: '2022', genre: 'Comedy / Creature', ott: 'JioCinema', icon: '🟣', badge: 'Superhit' },
  ],
  zee5: [
    { title: 'Gadar 2', year: '2023', genre: 'Action / Drama', ott: 'Zee5', icon: '🟠', badge: '₹600 Cr Hit' },
    { title: 'Sirf Ek Bandaa Kaafi Hai', year: '2023', genre: 'Courtroom / Drama', ott: 'Zee5', icon: '🟠', badge: 'Award Winner' },
    { title: 'Sam Bahadur', year: '2023', genre: 'Biopic / War', ott: 'Zee5', icon: '🟠', badge: 'Must Watch' },
    { title: 'Silence 2', year: '2024', genre: 'Crime / Mystery', ott: 'Zee5', icon: '🟠', badge: 'Edge of Seat' },
  ],
};
