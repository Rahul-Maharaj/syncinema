import './globals.css';
import { Fraunces, DM_Sans } from 'next/font/google';
import Floaters from '@/components/Floaters';
import AutoFixWatchdog from '@/components/AutoFixWatchdog';
import AntiInspectShield from '@/components/AntiInspectShield';
import RealAudienceTracker from '@/components/RealAudienceTracker';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display' });
const body = DM_Sans({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  metadataBase: new URL('https://www.syncinema.site'),
  title: {
    default: 'SyncCinema — Real-Time Watch Party & Private Virtual Cinema',
    template: '%s | SyncCinema',
  },
  description: 'SyncCinema is a free, real-time synchronized video streaming platform and private virtual theater. Watch movies, YouTube, anime, and web videos together with friends and partners in zero-latency sync with crystal-clear video calls, voice chat, and end-to-end encrypted rooms.',
  keywords: [
    'sync cinema',
    'syncinema',
    'syncinema.site',
    'watch party',
    'watch together',
    'sync video',
    'synced cinema',
    'watch movies together online',
    'virtual theater',
    'couples movie night',
    'synchronized stream',
    'video call watch party',
    'private cinema room',
    'SyncCinema',
  ],
  authors: [{ name: 'SyncCinema Team', url: 'https://www.syncinema.site' }],
  creator: 'SyncCinema',
  publisher: 'SyncCinema',
  applicationName: 'SyncCinema',
  category: 'Entertainment',
  classification: 'Media & Streaming',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://www.syncinema.site',
  },
  openGraph: {
    title: 'SyncCinema — Real-Time Watch Party & Private Virtual Cinema',
    description: 'Stream movies and videos in real-time sync with friends and loved ones. Zero-latency playback, HD video calls, and encrypted rooms.',
    url: 'https://www.syncinema.site',
    siteName: 'SyncCinema',
    images: [
      {
        url: '/ad-theater-experience.jpg',
        width: 1200,
        height: 630,
        alt: 'SyncCinema — The Ultimate Virtual Theater Experience',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SyncCinema — Real-Time Watch Party & Private Virtual Cinema',
    description: 'Stream movies and videos in real-time sync with friends and loved ones.',
    images: ['/ad-theater-experience.jpg'],
    creator: '@synccinema',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-48.png', type: 'image/png', sizes: '48x48' },
      { url: '/icon-96.png', type: 'image/png', sizes: '96x96' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SyncCinema',
  url: 'https://www.syncinema.site',
  description: 'Free real-time synchronized video streaming and virtual cinema platform with integrated video calls and private rooms.',
  applicationCategory: 'EntertainmentApplication',
  operatingSystem: 'All',
  browserRequirements: 'Requires modern web browser with HTML5 and WebRTC support',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Zero-latency video synchronization',
    'Integrated WebRTC HD video and voice calls',
    'End-to-end encrypted room passwords and vault keys',
    'Support for YouTube, MP4, HLS, WebM, and third-party media sources',
    'Interactive couple gestures, intimacy modes, and cinema color palettes',
  ],
  image: 'https://www.syncinema.site/ad-theater-experience.jpg',
};

const pwaInit = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})};`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${display.variable} ${body.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/icon-48.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icon-96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preload" as="image" href="/home-bg.jpg" fetchPriority="high" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: pwaInit }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="bg-[#222222] text-pink-100 min-h-screen">
        <RealAudienceTracker />
        <AntiInspectShield />
        <AutoFixWatchdog />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
