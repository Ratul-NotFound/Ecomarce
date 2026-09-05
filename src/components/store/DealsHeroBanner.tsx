'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Zap, ArrowRight, Flame } from 'lucide-react';
import DealCountdownTimer from '@/components/store/DealCountdownTimer';
import type { SpecialOffer } from '@/types';

interface DealsHeroBannerProps {
  banners?: SpecialOffer[];
  settings: {
    deals_badge_text?: string;
    deals_hero_title?: string;
    deals_hero_subtitle?: string;
    deals_timer_hours?: number;
  };
  flashSaleEndTime: string;
}

export default function DealsHeroBanner({
  banners = [],
  settings,
  flashSaleEndTime,
}: DealsHeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Auto-slide rotation with pause on hover
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [banners.length, isPaused]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % banners.length);
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
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // If no deals banners are configured in admin, show default hero banner
  if (!banners || banners.length === 0) {
    return (
      <div className="deals-hero-banner">
        <div className="deals-hero-content">
          <div className="deals-hero-badge">
            <Zap size={15} fill="#facc15" color="#facc15" />
            <span>{settings.deals_badge_text || 'EXCLUSIVE FLASH PROMOTIONS'}</span>
          </div>

          <h1 className="deals-hero-title">
            {settings.deals_hero_title || '🔥 Super Flash Deals & Discounts'}
          </h1>

          <p className="deals-hero-subtitle">
            {settings.deals_hero_subtitle || 'Discover limited-time markdowns, mega coupon savings, and high-demand product drops.'}
          </p>
        </div>

        {/* Live Countdown Timer */}
        <DealCountdownTimer targetDate={flashSaleEndTime} targetHours={settings.deals_timer_hours} />
      </div>
    );
  }

  const currentBanner = banners[currentIndex];

  return (
    <div
      className="deals-carousel-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        marginBottom: '24px',
        overflow: 'hidden',
        background: '#0f172a',
      }}
    >
      {/* Banner Slides */}
      <div style={{ position: 'relative', minHeight: '360px', width: '100%' }}>
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={banner.id}
              style={{
                position: isActive ? 'relative' : 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                minHeight: '360px',
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Background Image */}
              {banner.image_url && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
                  <Image
                    src={banner.image_url}
                    alt={banner.title_en || 'Deals Banner'}
                    fill
                    priority={index === 0}
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                    sizes="100vw"
                  />
                  {/* High contrast visual overlays */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0.78) 45%, rgba(15,23,42,0.4) 100%)',
                    }}
                  />
                </div>
              )}

              {/* Slide Content Container */}
              <div
                className="container"
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '36px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '24px',
                  }}
                >
                  {/* Left Column: Text and CTA */}
                  <div style={{ maxWidth: '580px', color: '#ffffff' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#f87171',
                        letterSpacing: '1px',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <Flame size={13} fill="#f87171" color="#f87171" />
                      <span>{banner.subtitle || settings.deals_badge_text || 'FEATURED FLASH PROMOTION'}</span>
                    </div>

                    <h2
                      style={{
                        fontSize: 'clamp(22px, 3.5vw, 34px)',
                        fontWeight: 900,
                        lineHeight: 1.2,
                        margin: '0 0 10px',
                        color: '#ffffff',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                      }}
                    >
                      {banner.title_en}
                    </h2>

                    {banner.title_bn && (
                      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', margin: '0 0 16px' }}>
                        {banner.title_bn}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                      <Link
                        href={banner.link_url || '/deals'}
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 22px',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 800,
                          fontSize: '14px',
                          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                        }}
                      >
                        <span>Grab Deal Now</span>
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Live Countdown Timer Box */}
                  <div
                    style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '16px 20px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                      minWidth: '280px',
                    }}
                  >
                    <DealCountdownTimer
                      targetDate={flashSaleEndTime}
                      targetHours={settings.deals_timer_hours}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (if > 1 banner) */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous Deals Banner"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="Next Deals Banner"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex',
              gap: '6px',
            }}
          >
            {banners.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                style={{
                  width: dotIdx === currentIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: 'var(--radius-full)',
                  background: dotIdx === currentIndex ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
