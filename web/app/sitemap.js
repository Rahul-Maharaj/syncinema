export default function sitemap() {
  const baseUrl = 'https://www.syncinema.site';

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
