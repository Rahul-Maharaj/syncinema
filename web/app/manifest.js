export default function manifest() {
  return {
    name: 'SyncCinema — Watch Together & Virtual Cinema',
    short_name: 'SyncCinema',
    description: 'Watch movies, anime, and YouTube together in zero-latency sync with video calls and private rooms.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#090514',
    theme_color: '#f43f5e',
    categories: ['entertainment', 'video', 'social', 'music'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-48.png',
        sizes: '48x48',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Create Private Room',
        short_name: 'Create Room',
        description: 'Instant private watch party room with end-to-end encryption',
        url: '/#create',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Join Watch Party',
        short_name: 'Join Room',
        description: 'Enter a room code or partner link',
        url: '/#join',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
