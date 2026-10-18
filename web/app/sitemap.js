export default function sitemap() {
  const baseUrl = 'https://synccinema.onrender.com';

  return [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ];
}
