export default function robots() {
  return {
    rules: [
      {
        // Block all aggressive AI scrapers and automated content harvesters
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'Claude-Web',
          'Bytespider',
          'PerplexityBot',
          'Diffbot',
          'cohere-ai',
          'SemrushBot',
          'AhrefsBot',
          'MJ12bot',
          'DotBot',
          'BlexBot',
          'PetalBot',
        ],
        disallow: ['/'],
      },
      {
        // Legitimate search engines can index public pages, but strictly excluded from private rooms & internal APIs
        userAgent: ['Googlebot', 'Google-Favicon', 'Bingbot', 'Bravebot', 'DuckDuckBot', 'Applebot', 'YandexBot'],
        allow: '/',
        disallow: [
          '/api/',
          '/room/',
          '/room',
        ],
      },
      {
        // Default rule for all other crawlers
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/room/',
          '/room',
        ],
      },
    ],
    sitemap: 'https://www.syncinema.site/sitemap.xml',
    host: 'https://www.syncinema.site',
  };
}
