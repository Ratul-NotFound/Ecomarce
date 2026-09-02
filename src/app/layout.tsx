// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { STORE_CONFIG } from '@/lib/store-config';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default:  STORE_CONFIG.seo.defaultTitle,
    template: `%s | ${STORE_CONFIG.seo.siteName}`,
  },
  description: STORE_CONFIG.seo.defaultDescription,
  manifest:    '/manifest.json',
  applicationName: STORE_CONFIG.name,
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
  robots: {
    index:  true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor:   '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Neutralize Bitdefender extension attribute injections to ensure flawless hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var clean = function(el) {
                    if (el && el.removeAttribute) el.removeAttribute('bis_skin_checked');
                  };
                  document.querySelectorAll('[bis_skin_checked]').forEach(clean);
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.attributeName === 'bis_skin_checked') clean(m.target);
                    }
                  });
                  observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['bis_skin_checked'] });
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
