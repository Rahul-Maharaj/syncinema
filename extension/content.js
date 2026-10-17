/**
 * SyncCinema Content Script
 * Injects a 1-click floating "Watch Together" button on supported streaming sites.
 */

(function () {
  if (window.__syncCinemaInjected) return;
  window.__syncCinemaInjected = true;

  // Don't inject inside SyncCinema's own pages
  if (location.hostname === 'localhost' && location.port === '8080') return;
  if (location.hostname.includes('synccinema')) return;

  const OTT_REGEX = /(?:hotstar\.com|disneyplus\.com|netflix\.com|primevideo\.com|amazon\.[a-z.]+\/gp\/video|jiocinema\.com|zee5\.com|sonyliv\.com|crunchyroll\.com|hulu\.com|max\.com|hbomax\.com)/i;

  function findVideoTime() {
    const v = document.querySelector('video');
    return v && !isNaN(v.currentTime) ? Math.floor(v.currentTime) : 0;
  }

  function injectButton() {
    if (document.getElementById('sync-cinema-floating-btn')) return;

    const isOtt = OTT_REGEX.test(location.hostname);
    const isYouTube = location.hostname.includes('youtube.com') || location.hostname.includes('youtu.be');
    const isVimeo = location.hostname.includes('vimeo.com');
    const hasVideo = !!document.querySelector('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="stream"]');

    if (!hasVideo && !isOtt && !isYouTube && !isVimeo) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'sync-cinema-floating-btn';
    container.className = 'sync-cinema-pill';
    container.innerHTML = `
      <div class="sync-cinema-pill-inner" title="Start a synchronized couple watch party on SyncCinema">
        <span class="sync-cinema-icon">🍿</span>
        <span class="sync-cinema-text">${isOtt ? 'SyncCinema OTT 🍿' : 'Watch Together'}</span>
      </div>
      <button class="sync-cinema-close" title="Dismiss">✕</button>
    `;

    document.body.appendChild(container);

    const inner = container.querySelector('.sync-cinema-pill-inner');
    const close = container.querySelector('.sync-cinema-close');

    close.addEventListener('click', (e) => {
      e.stopPropagation();
      container.remove();
    });

    inner.addEventListener('click', () => {
      chrome.storage?.local?.get(['serverUrl'], (res) => {
        const server = (res?.serverUrl || 'http://localhost:8080').replace(/\/+$/, '');
        const roomId = 'sc-' + Math.random().toString(36).substring(2, 8);
        const curTime = findVideoTime();
        const url = `${server}/room/${roomId}#video=${encodeURIComponent(location.href)}&time=${curTime}${isOtt ? '&hybrid=true' : ''}`;
        window.open(url, '_blank');
      });
    });
  }

  // Run on load and on DOM updates
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  // Observer for dynamically loaded single-page apps (YouTube, Netflix, etc.)
  const observer = new MutationObserver(() => {
    if (!document.getElementById('sync-cinema-floating-btn')) {
      injectButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
