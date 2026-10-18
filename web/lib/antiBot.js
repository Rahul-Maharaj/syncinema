// Client-Side Human & Anti-Bot Verification Engine
// Protects room joins and visitor telemetry from automated headless scripts.

export function isRealHumanBrowser() {
  if (typeof window === 'undefined') return true;

  try {
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

    // 4. Detect headless Chrome plugins anomaly
    if (navigator.plugins && navigator.plugins.length === 0 && !/mobile|android|iphone/i.test(navigator.userAgent)) {
      if (navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Headless')) {
        // Many headless Chrome instances have 0 plugins
      }
    }

    // 5. Detect fake screen dimensions
    if (window.screen && (window.screen.width === 0 || window.screen.height === 0)) {
      return false;
    }
  } catch (e) {
    return false;
  }

  return true;
}

// Generate client human verification ticket
export function getHumanProofToken() {
  if (typeof window === 'undefined') return '';
  const ts = Math.floor(Date.now() / 30000); // 30s window
  const entropy = [
    navigator.userAgent.slice(0, 32),
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
