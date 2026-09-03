'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TrafficTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      return;
    }

    const queryString = searchParams?.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;

    // Avoid duplicate triggers on the same route render
    if (lastTrackedPath.current === fullPath) {
      return;
    }
    lastTrackedPath.current = fullPath;

    // Retrieve or initialize session identifier
    let sid = '';
    try {
      sid = localStorage.getItem('shop_analytics_session_id') || '';
      if (!sid) {
        sid = 's_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('shop_analytics_session_id', sid);
      }
    } catch {}

    const payload = JSON.stringify({
      event_type: fullPath.startsWith('/products/') ? 'product_view' : 'page_view',
      page_url: fullPath,
      session_id: sid,
    });

    // Use sendBeacon for fastest, non-blocking delivery
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname, searchParams]);

  return null;
}
