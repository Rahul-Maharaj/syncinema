const csp = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://player.vimeo.com https:",
  "style-src 'self' 'unsafe-inline' https:", "img-src * 'self' data: blob: https: http:", "media-src * 'self' blob: data: https: http:",
  "connect-src * 'self' https: wss: ws: http:", "frame-src * https: http: data: blob:", "worker-src 'self' blob:", "font-src 'self' data: https:",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');
module.exports = {
  output: process.env.STANDALONE ? 'standalone' : undefined, reactStrictMode: true, poweredByHeader: false,
  async headers() {
    const h = [
      { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }, { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), display-capture=(self), autoplay=*, encrypted-media=*' },
    ];
    if (process.env.NODE_ENV === 'production') h.push({ key: 'Content-Security-Policy', value: csp });
    return [{ source: '/(.*)', headers: h }];
  },
};
