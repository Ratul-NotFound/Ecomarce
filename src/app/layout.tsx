// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { STORE_CONFIG } from '@/lib/store-config';
import '@/styles/globals.css';
import { Suspense } from 'react';
import TrafficTracker from '@/components/shared/TrafficTracker';
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default:  STORE_CONFIG.seo.defaultTitle,
    template: `%s | ${STORE_CONFIG.seo.siteName}`,
  },
  description: STORE_CONFIG.seo.defaultDescription,
  applicationName: STORE_CONFIG.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: STORE_CONFIG.name,
  },
  authors: [{ name: STORE_CONFIG.name }],
  keywords: ['online shopping', 'bangladesh', 'fashion', 'electronics', 'lifestyle'],
  openGraph: {
    type:        'website',
    siteName:    STORE_CONFIG.seo.siteName,
    title:       STORE_CONFIG.seo.defaultTitle,
    description: STORE_CONFIG.seo.defaultDescription,
    images:      [{ url: STORE_CONFIG.seo.ogImage }],
  },
  twitter: {
    card:        'summary_large_image',
    site:        STORE_CONFIG.seo.twitterHandle,
    title:       STORE_CONFIG.seo.defaultTitle,
    description: STORE_CONFIG.seo.defaultDescription,
  },
  icons: {
    icon:  '/favicon.ico',
    apple: '/icons/icon-180.png',
  },
  manifest: '/manifest.json',
  robots: {
    index:  true,
    follow: true,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit:  'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)',  color: '#6366f1' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* PWA Manifest & Icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        {/* Early-capture beforeinstallprompt BEFORE React hydrates — prevents race condition */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__pwaInstall = null;
          window.__pwaInstallPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaInstall = e;
            window.__pwaInstallPrompt = e;
            window.dispatchEvent(new CustomEvent('pwa-install-ready'));
            document.dispatchEvent(new CustomEvent('pwa-install-ready'));
          });
          window.addEventListener('appinstalled', function() {
            window.__pwaInstall = null;
            window.__pwaInstallPrompt = null;
            window.dispatchEvent(new CustomEvent('pwa-installed'));
            document.dispatchEvent(new CustomEvent('pwa-installed'));
          });
        ` }} />
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Hind+Siliguri:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={STORE_CONFIG.name} />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        <Suspense fallback={null}>
          <TrafficTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
