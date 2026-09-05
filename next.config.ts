// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ── Security ────────────────────────────────────────────────
  // Remove X-Powered-By: Next.js header to prevent tech fingerprinting
  poweredByHeader: false,

  // Allowed development origins for LAN / Mobile Wi-Fi testing
  allowedDevOrigins: ['169.254.28.239', 'localhost', '127.0.0.1'],

  turbopack: undefined,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  compress: true,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security',  value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'X-DNS-Prefetch-Control',     value: 'off' },
          { key: 'X-Download-Options',         value: 'noopen' },
          // NOTE: Cross-Origin-Opener-Policy is intentionally NOT set here.
          // 'same-origin' breaks Google OAuth (both redirect and popup modes),
          // and causes PWA auth to silently fail by preventing cross-origin
          // window communication needed during OAuth code exchange.
        ],
      },
      {
        // Default API responses must never be cached by proxies or browsers (except search suggest)
        source: '/api/((?!search/suggest).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
          { key: 'Expires',       value: '0' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',          value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type',           value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/sw-push.js',
        headers: [
          { key: 'Cache-Control',          value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type',           value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
          { key: 'Content-Type',  value: 'application/manifest+json; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
          { key: 'Content-Type',  value: 'application/manifest+json; charset=utf-8' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
