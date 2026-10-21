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
    default: 'Syncinema (SyncCinema) — Official Watch Party & Virtual Cinema',
    template: '%s | Syncinema (SyncCinema)',
  },
  description: 'Syncinema (SyncCinema) is the official real-time virtual cinema and synchronized video streaming platform. Watch movies, YouTube, series, and web videos together in 0ms zero-drift sync with HD video calls, voice chat, and private encrypted rooms.',
  keywords: [
    'syncinema',
    'syncinema.site',
    'sync cinema',
    'synccinema',
    'watch party',
    'watch together',
    'sync video',
    'synced cinema',
    'virtual cinema',
    'watch movies together online',
    'virtual theater',
    'couples movie night',
    'synchronized stream',
    'video call watch party',
    'private cinema room',
    'Syncinema',
    'SyncCinema',
  ],
  authors: [{ name: 'Syncinema Team', url: 'https://www.syncinema.site' }],
  creator: 'Syncinema',
  publisher: 'Syncinema',
  applicationName: 'Syncinema',
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
    title: 'Syncinema (SyncCinema) — Official Watch Party & Virtual Cinema',
    description: 'Syncinema (SyncCinema) is the official real-time virtual cinema and synchronized video streaming platform. Watch movies and videos together in 0ms sync.',
    url: 'https://www.syncinema.site',
    siteName: 'Syncinema',
    images: [
      {
        url: '/ad-theater-experience.jpg',
        width: 1200,
        height: 630,
        alt: 'Syncinema (SyncCinema) — The Official Real-Time Virtual Cinema',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Syncinema (SyncCinema) — Official Watch Party & Virtual Cinema',
    description: 'Syncinema (SyncCinema) is the official real-time virtual cinema and synchronized video streaming platform.',
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
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.syncinema.site/#website',
      url: 'https://www.syncinema.site',
      name: 'Syncinema',
      alternateName: ['SyncCinema', 'Sync Cinema', 'Synccinema', 'syncinema.site'],
      description: 'Official real-time synchronized video streaming and virtual cinema platform.',
      publisher: {
        '@id': 'https://www.syncinema.site/#organization',
      },
      inLanguage: 'en-US',
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.syncinema.site/#organization',
      name: 'Syncinema',
      alternateName: ['SyncCinema', 'Synccinema'],
      url: 'https://www.syncinema.site',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.syncinema.site/icon-512.png',
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://twitter.com/synccinema',
      ],
    },
    {
      '@type': 'WebApplication',
      '@id': 'https://www.syncinema.site/#app',
      name: 'Syncinema',
      alternateName: ['SyncCinema', 'Syncinema Virtual Theater'],
      url: 'https://www.syncinema.site',
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires modern web browser with HTML5 and WebRTC support',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Zero-drift video synchronization (0ms delay)',
        'Integrated WebRTC HD video and voice calls',
        'End-to-end encrypted room passwords and vault keys',
        'Support for YouTube, MP4, HLS, WebM, and local cloud streaming',
        'Anti-distime buffer synchronization for low-end and mobile devices',
      ],
      image: 'https://www.syncinema.site/ad-theater-experience.jpg',
    },
  ],
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
