export default function manifest() {
  return {
    name: 'SyncCinema - Watch Together',
    short_name: 'SyncCinema',
    description: 'Watch movies together in sync with video, voice and chat.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#0d0714',
    theme_color: '#d9467a',
    categories: ['entertainment', 'video', 'social'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
