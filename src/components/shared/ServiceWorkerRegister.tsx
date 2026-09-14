'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.update().catch(() => {});
        })
        .catch(() => {});
    }
  }, []);

  return null;
}
