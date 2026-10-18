const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://player.vimeo.com https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src * 'self' data: blob: https: http:",
  "media-src * 'self' blob: data: https: http:",
  "connect-src * 'self' https: wss: ws: http: https://www.syncinema.site https://syncinema.site",
  "frame-src * https: http: data: blob:",
  "worker-src 'self' blob:",
  "font-src 'self' data: https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

module.exports = {
  output: process.env.STANDALONE ? 'standalone' : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const commonHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(self), microphone=(self), display-capture=(self), autoplay=*, encrypted-media=*',
      },
    ];
    if (process.env.NODE_ENV === 'production') {
      commonHeaders.push({ key: 'Content-Security-Policy', value: csp });
    }

    return [
      // Protect stealth admin and internal API from search indexing
      {
        source: '/aurelia/:path*',
        headers: [
          ...commonHeaders,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          ...commonHeaders,
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
      // Allow search engine crawlers to discover and index all public site pages
      {
        source: '/((?!aurelia|api).*)',
        headers: [
          ...commonHeaders,
          { key: 'X-Robots-Tag', value: 'all, index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' },
        ],
      },
    ];
  },
};
