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
  "frame-ancestors 'self' https://www.syncinema.site https://syncinema.site",
].join('; ');

module.exports = {
  output: process.env.STANDALONE ? 'standalone' : undefined,
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  webpack: (config, { dev }) => {
    if (!dev) {
      config.devtool = false;
    }
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  async headers() {
    const commonHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
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
      // Protect stealth admin and internal API from search indexing and framing attacks
      {
        source: '/aurelia/:path*',
        headers: [
          ...commonHeaders.filter((h) => h.key !== 'X-Frame-Options'),
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/aurelia',
        headers: [
          ...commonHeaders.filter((h) => h.key !== 'X-Frame-Options'),
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
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
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
    return [
      { source: '/socket.io/:path*', destination: `${backend}/socket.io/:path*` },
      { source: '/peerjs/:path*', destination: `${backend}/peerjs/:path*` },
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
    ];
  },
};
