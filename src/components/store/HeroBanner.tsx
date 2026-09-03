'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SpecialOffer } from '@/types';

interface HeroBannerProps {
  banners?: SpecialOffer[];
}

export default function HeroBanner({ banners = [] }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fallback defaults if no custom banners are configured by admin yet
  const defaultBanners = [
    {
      id: 'default-1',
      title_en: 'Exclusive Trend Collection',
      title_bn: 'বিশেষ ট্রেন্ড কালেকশন',
      subtitle: '⚡ FLAT 25% OFF THIS SEASON',
      image_url: '',
      link_url: '/search',
      type: 'hero_banner' as const,
      display_order: 1,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
    {
      id: 'default-2',
      title_en: 'Next-Gen Smart Gadgets',
      title_bn: 'নতুন প্রজন্মের গ্যাজেটস',
      subtitle: '🔥 BEST PRICES IN BANGLADESH',
      image_url: '',
      link_url: '/category/electronics',
      type: 'hero_banner' as const,
      display_order: 2,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
  ];

  const activeBanners = banners.length > 0 ? banners : defaultBanners;

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const current = activeBanners[currentIndex] || activeBanners[0];

  return (
    <div
      className="hero-container"
      style={{
        backgroundImage: current.image_url ? `linear-gradient(to right, rgba(15,23,42,0.85) 30%, rgba(15,23,42,0.4)), url(${current.image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      suppressHydrationWarning
    >
      <div className="hero-slide fade-in" key={current.id} suppressHydrationWarning>
        {current.subtitle && (
          <span className="hero-subtitle">{current.subtitle}</span>
        )}
        <h1 className="hero-title">{current.title_en}</h1>
        {current.title_bn && (
          <p className="hero-desc" style={{ fontSize: '18px', fontWeight: 600 }}>{current.title_bn}</p>
        )}
        <p className="hero-desc">
          Shop the best deals with fast home delivery and cash on delivery or bKash across Bangladesh.
        </p>
        <Link href={current.link_url || '/search'} className="hero-cta" id="hero-cta-btn">
          Explore Collection →
        </Link>
      </div>

      {activeBanners.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px',
          zIndex: 3
        }}>
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: idx === currentIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '9999px',
                background: idx === currentIndex ? '#ffffff' : 'rgba(255,255,255,0.4)',
                border: 'none',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
