// Client-Side Human & Anti-Bot Verification Engine
// Protects room joins and visitor telemetry from automated headless scripts and search engine crawlers.

export function isSearchBot() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /googlebot|bingbot|bravebot|duckduckbot|baiduspider|yandexbot|slurp|google-inspectiontool|googleother|google-favicon|bot|crawler|spider|robot|headless/i.test(ua);
}

export function isRealHumanBrowser() {
  if (typeof window === 'undefined') return true;

  // Search engine crawlers (Googlebot, Bingbot, etc.) are strictly excluded from human visitor tracking
  if (isSearchBot()) {
    return false;
  }

  try {
    // 0. Real mobile and tablet devices are always permitted (WhatsApp webview, mobile Chrome, Safari, etc.)
    if (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '')) {
      return true;
    }

    // 1. Detect standard WebDriver automation (Selenium, Puppeteer, Playwright)
    if (navigator.webdriver) {
      return false;
    }

    // 2. Detect PhantomJS / NightmareJS globals
    if (window._phantom || window.callPhantom || window.__nightmare) {
      return false;
    }

    // 3. Detect missing languages array (common headless artifact)
    if (navigator.languages && navigator.languages.length === 0) {
      return false;
    }

    // 4. Detect fake screen dimensions
    if (window.screen && (window.screen.width === 0 || window.screen.height === 0)) {
      return false;
    }
  } catch (e) {
    // Fail-open: Never block real mobile devices on unexpected environment differences
    return true;
  }

  return true;
}

// Generate client human verification ticket
export function getHumanProofToken() {
  if (typeof window === 'undefined') return '';
  const ts = Math.floor(Date.now() / 30000); // 30s window
  const entropy = [
    (navigator.userAgent || '').slice(0, 32),
    window.screen?.width || 1920,
    window.screen?.height || 1080,
    ts,
  ].join('::');

  let hash = 0;
  for (let i = 0; i < entropy.length; i++) {
    hash = (hash << 5) - hash + entropy.charCodeAt(i);
    hash |= 0;
  }
  return 'hp_' + Math.abs(hash).toString(36) + '_' + ts.toString(36);
}
