'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker explicitly for Next.js App Router
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Check for service worker updates
          registration.update().catch(() => {});
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration notice:', error);
        });
    }
  }, []);

  return null;
}
