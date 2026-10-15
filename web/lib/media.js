export const ytId = (u) => u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/)?.[1];
export const vimeoId = (u) => u.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1];
// any link works: known platforms get full sync, media files/streams get full sync, everything else embeds
export const detect = (u) => {
  if (ytId(u)) return 'youtube';
  if (vimeoId(u)) return 'vimeo';
  const p = u.split('?')[0].split('#')[0].toLowerCase();
  if (p.endsWith('.m3u8')) return 'hls';
  if (p.endsWith('.mpd')) return 'dash';
  if (/\.(mp4|webm|ogv|ogg|mov|m4v|mkv|mp3|m4a|wav|flac|aac|opus|weba|m4b)$/.test(p)) return 'file';
  return 'embed';
};
const cache = {};
export const loadScript = (src) => (cache[src] ||= new Promise((res, rej) => {
  const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s);
}));
export const ytReady = () => window.YT?.Player ? Promise.resolve()
  : new Promise((r) => { window.onYouTubeIframeAPIReady = r; loadScript('https://www.youtube.com/iframe_api'); });
// turn share links into embeddable players (unsynced embeds)
export const toEmbed = (src) => {
  try {
    const u = new URL(src);
    // Music
    if (u.hostname === 'open.spotify.com' && !u.pathname.startsWith('/embed')) u.pathname = '/embed' + u.pathname;
    else if (u.hostname.endsWith('soundcloud.com') && !u.hostname.startsWith('w.')) return 'https://w.soundcloud.com/player/?auto_play=true&url=' + encodeURIComponent(src);
    else if (/dailymotion\.com$/.test(u.hostname) && u.pathname.startsWith('/video/')) u.pathname = '/embed' + u.pathname;
    // 18+ and Tube
    let m = src.match(/eporner\.com\/video-([a-zA-Z0-9]+)/i);
    if (m) return `https://www.eporner.com/embed/${m[1]}/`;
    m = src.match(/pornhub\.com\/(?:view_video\.php\?(?:.*&)?viewkey=|embed\/)([a-zA-Z0-9]+)/i);
    if (m) return `https://www.pornhub.com/embed/${m[1]}`;
    m = src.match(/xvideos\.com\/video\.?([a-zA-Z0-9_-]+)/i);
    if (m) return `https://www.xvideos.com/embedframe/${m[1]}`;
    m = src.match(/xnxx\.com\/video-?([a-zA-Z0-9_-]+)/i);
    if (m) return `https://www.xnxx.com/embedframe/${m[1]}`;
    m = src.match(/spankbang\.com\/([a-zA-Z0-9]+)\/(?:video|embed)/i);
    if (m) return `https://spankbang.com/${m[1]}/embed/`;
    m = src.match(/redtube\.com\/(\d+)/i);
    if (m) return `https://embed.redtube.com/?id=${m[1]}`;
    m = src.match(/youporn\.com\/watch\/(\d+)/i);
    if (m) return `https://www.youporn.com/embed/${m[1]}`;
    m = src.match(/xhamster\.com\/videos\/[^\s\"']*?(xh[a-zA-Z0-9]+|\d+)/i);
    if (m) return `https://xhamster.com/xembed.php?video=${m[1]}`;
    m = src.match(/dood\.(?:to|watch|so|ws|cx|la|pm|re|sh)\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://dood.to/e/${m[1]}`;
    m = src.match(/streamtape\.com\/(?:v|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://streamtape.com/e/${m[1]}`;
    m = src.match(/streamwish\.(?:to|com)\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://streamwish.to/e/${m[1]}`;
    m = src.match(/filemoon\.sx\/(?:d|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://filemoon.sx/e/${m[1]}`;
    m = src.match(/vidmoly\.to\/(?:w\/|embed-)([a-zA-Z0-9]+)/i);
    if (m) return `https://vidmoly.to/embed-${m[1]}.html`;
    m = src.match(/voe\.sx\/(?:e\/)?([a-zA-Z0-9]+)/i);
    if (m) return `https://voe.sx/e/${m[1]}`;
    m = src.match(/mixdrop\.(?:co|to)\/(?:f|e)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://mixdrop.co/e/${m[1]}`;
    // Movie & third party hosts
    m = src.match(/hdstream4u\.com\/(?:file|embed)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://hdstream4u.com/embed/${m[1]}`;
    m = src.match(/filefly\.[a-z]+\/(?:file|embed|v|d)\/([a-zA-Z0-9]+)/i);
    if (m) return `https://filefly.xyz/embed/${m[1]}`;
    return u.href;
  } catch { return src; }
};export const toProxyUrl = (src) => `/api/proxy?url=${encodeURIComponent(src)}`;
export const toStreamProxyUrl = (src) => `/api/stream?url=${encodeURIComponent(src)}`;
export const resolveMedia = async (src) => {
  try {
    const res = await fetch(`/api/resolve?url=${encodeURIComponent(src)}`);
    if (res.ok) return await res.json();
  } catch {}
  return null;
};
