'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import type { SpecialOffer } from '@/types';

interface HeroBannerProps {
  banners?: SpecialOffer[];
}

export default function HeroBanner({ banners = [] }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Dynamic fallback banners matching newly generated hero assets
  const defaultBanners: SpecialOffer[] = [
    {
      id: 'default-tech',
      title_en: 'Next-Gen Flagship Audio & Wearables',
      title_bn: 'নেক্সট-জেন ফ্ল্যাগশিপ অডিও ও স্মার্ট গ্যাজেটস',
      subtitle: '🔥 SPECIAL LAUNCH · UP TO 35% OFF',
      image_url: '/images/banners/hero-tech.jpg',
      link_url: '/category/electronics',
      type: 'hero_banner',
      display_order: 1,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
    {
      id: 'default-fashion',
      title_en: 'Bespoke Menswear & Urban Luxury',
      title_bn: 'প্রিমিয়াম আরবান ফ্যাশন ও স্যুট কালেকশন',
      subtitle: '✨ DESIGNER STYLES · UP TO 40% OFF',
      image_url: '/images/banners/hero-fashion.jpg',
      link_url: '/category/fashion',
      type: 'hero_banner',
      display_order: 2,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
    {
      id: 'default-watches',
      title_en: 'Timeless Luxury & Handcrafted Leather',
      title_bn: 'টাইমলেস ক্রোনোগ্রাফ ঘড়ি ও লেদার এক্সেসরিজ',
      subtitle: '⚡ LUXURY SERIES · HANDCRAFTED',
      image_url: '/images/banners/hero-watches.jpg',
      link_url: '/category/watches',
      type: 'hero_banner',
      display_order: 3,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
    {
      id: 'default-gadgets',
      title_en: 'Magical Ambient Lights & Moon Decor',
      title_bn: 'ম্যাজিকাল ফেয়ারি লাইটস, মুন ল্যাম্পস ও গ্যালাক্সি প্রজেক্টর',
      subtitle: '✨ MOON LAMPS & GADGETS · 30% OFF',
      image_url: '/images/banners/hero-gadgets.jpg',
      link_url: '/category/electronics',
      type: 'hero_banner',
      display_order: 4,
      is_active: true,
      starts_at: null,
      ends_at: null,
    },
  ];

  const activeBanners = banners && banners.length > 0 ? banners : defaultBanners;

  // Auto-slide rotation with pause on hover
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeBanners.length, isPaused]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % activeBanners.length);
  };

  // Touch swipe support for mobile users
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) handleNext(); // swipe left
    if (distance < -50) handlePrev(); // swipe right
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const current = activeBanners[currentIndex] || activeBanners[0];

  return (
    <div
      className="hero-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      suppressHydrationWarning
    >
      {/* Background Image with Dark Left-to-Right Readable Gradient Overlay */}
      {current.image_url && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
          }}
        >
          <Image
            src={current.image_url}
            alt={current.title_en}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
            style={{
              objectFit: 'cover',
              objectPosition: 'center right',
              transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          {/* Multi-Stop Dark Gradient for readability */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.82) 45%, rgba(15,23,42,0.35) 80%, rgba(15,23,42,0.2) 100%)',
            }}
          />
        </div>
      )}

      {/* Hero Content Slide */}
      <div
        className="hero-slide fade-in"
        key={current.id || currentIndex}
        suppressHydrationWarning
      >
        {current.subtitle && (
          <div className="hero-badge">
            <Sparkles size={11} color="#f59e0b" />
            <span>{current.subtitle}</span>
          </div>
        )}

        <h1 className="hero-title">
          {current.title_en}
        </h1>

        {current.title_bn && (
          <p className="hero-subtitle-bn">
            {current.title_bn}
          </p>
        )}

        <p className="hero-desc">
          Fast home delivery with Cash on Delivery or bKash across 64 districts in Bangladesh.
        </p>

        <div className="hero-cta-group">
          <Link
            href={current.link_url || '/search'}
            id="hero-cta-btn"
            className="hero-cta-primary"
          >
            <span>Explore Collection</span>
            <ArrowRight size={14} />
          </Link>

          <Link
            href="/deals"
            className="hero-cta-secondary"
          >
            Flash Deals ⚡
          </Link>
        </div>
      </div>

      {/* Navigation Arrows (Desktop Only - strictly hidden on mobile devices) */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="hero-nav-arrow-btn"
            style={{ left: '16px' }}
          >
            <ChevronLeft size={22} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            className="hero-nav-arrow-btn"
            style={{ right: '16px' }}
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Slide Indicators at bottom */}
      {activeBanners.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 3,
            padding: '4px 8px',
            borderRadius: '9999px',
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {activeBanners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: idx === currentIndex ? '20px' : '5px',
                height: '5px',
                borderRadius: '9999px',
                background: idx === currentIndex ? '#ffffff' : 'rgba(255,255,255,0.45)',
                border: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
