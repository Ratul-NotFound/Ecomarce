import React from 'react';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 16px', textAlign: 'center' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '9999px', background: 'var(--color-primary-10)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <WifiOff size={32} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>You are currently offline</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Please check your internet connection. Saved products and cached pages will be available once you reconnect.
        </p>
        <Link href="/" className="btn btn-primary btn-sm">
          Try Again
        </Link>
      </div>
    </div>
  );
}
