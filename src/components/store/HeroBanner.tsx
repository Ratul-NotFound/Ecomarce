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
      subtitle: '🔥 SPECIAL LAUNCH OFFER · UP TO 35% OFF',
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
      title_en: 'Premium Urban Autumn Collection',
      title_bn: 'প্রিমিয়াম আরবান অটাম ফ্যাশন কালেকশন',
      subtitle: '✨ EXCLUSIVE MINIMALIST STYLES',
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
      subtitle: '⚡ MASTER CRAFTSMANSHIP · LUXURY SERIES',
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
      title_en: 'Aesthetic Ambient Living & Smart Gadgets',
      title_bn: 'অ্যাস্থেটিক অ্যাম্বিয়েন্ট লাইটিং ও ফ্যান্সি গ্যাজেটস',
      subtitle: '✨ 3D MOOD LAMPS & DECOR · FLAT 30% OFF',
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
      style={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        margin: '20px 0 28px 0',
        minHeight: '340px',
        display: 'flex',
        alignItems: 'center',
        background: '#0f172a',
        boxShadow: '0 20px 45px -10px rgba(0,0,0,0.22)',
      }}
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
          {/* Dual Multi-Stop Gradient ensuring high contrast on all devices */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.3) 80%, rgba(15,23,42,0.15) 100%)',
            }}
          />
        </div>
      )}

      {/* Hero Content Slide */}
      <div
        className="hero-slide fade-in"
        key={current.id || currentIndex}
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '40px 32px',
          maxWidth: '680px',
          color: '#ffffff',
        }}
        suppressHydrationWarning
      >
        {current.subtitle && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11.5px',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '6px 14px',
              borderRadius: '9999px',
              marginBottom: '16px',
              color: '#ffffff',
            }}
          >
            <Sparkles size={13} color="#f59e0b" />
            <span>{current.subtitle}</span>
          </div>
        )}

        <h1
          style={{
            fontSize: 'clamp(26px, 4vw, 46px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '12px',
            color: '#ffffff',
            letterSpacing: '-0.5px',
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          {current.title_en}
        </h1>

        {current.title_bn && (
          <p
            style={{
              fontSize: 'clamp(15px, 2vw, 19px)',
              fontWeight: 600,
              color: '#cbd5e1',
              marginBottom: '14px',
            }}
          >
            {current.title_bn}
          </p>
        )}

        <p
          style={{
            fontSize: '13.5px',
            color: 'rgba(255, 255, 255, 0.82)',
            marginBottom: '26px',
            lineHeight: 1.6,
            maxWidth: '520px',
          }}
        >
          Fast home delivery with Cash on Delivery or bKash across 64 districts in Bangladesh.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link
            href={current.link_url || '/search'}
            id="hero-cta-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '14px',
              fontWeight: 800,
              padding: '12px 24px',
              borderRadius: '9999px',
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.35)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.25)';
            }}
          >
            <span>Explore Collection</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/deals"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '13.5px',
              fontWeight: 700,
              color: '#ffffff',
              textDecoration: 'none',
              padding: '10px 18px',
              borderRadius: '9999px',
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(6px)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Flash Deals ⚡
          </Link>
        </div>
      </div>

      {/* Navigation Arrows (Desktop & Tablet) */}
      {activeBanners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Slide"
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.55)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Slide"
            style={{
              position: 'absolute',
              right: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.55)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
            }}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Slide Indicators at bottom */}
      {activeBanners.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 3,
            padding: '6px 12px',
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
                width: idx === currentIndex ? '26px' : '8px',
                height: '7px',
                borderRadius: '9999px',
                background: idx === currentIndex ? '#ffffff' : 'rgba(255,255,255,0.4)',
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
