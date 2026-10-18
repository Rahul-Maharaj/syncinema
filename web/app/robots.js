export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/aurelia', // Stealth admin panel - strictly excluded from search crawlers
          '/aurelia/',
          '/api/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/aurelia', '/aurelia/', '/api/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: ['/aurelia', '/aurelia/', '/api/'],
      },
    ],
    sitemap: 'https://www.syncinema.site/sitemap.xml',
    host: 'https://www.syncinema.site',
  };
}
