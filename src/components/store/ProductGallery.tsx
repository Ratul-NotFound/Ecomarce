'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play, ZoomIn, X, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { parseVideoEmbedUrl } from '@/lib/utils/video';
import { getOptimizedImageUrl } from '@/lib/utils/images';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  videoUrl?: string | null;
}

export default function ProductGallery({ images = [], productName, videoUrl }: ProductGalleryProps) {
  const cleanImages = images.filter(img => Boolean(img && img.trim()));
  const displayImages = cleanImages.length > 0 ? cleanImages : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=85&auto=format'];

  // Active view: number index for images (0..3), or 'video'
  const [activeView, setActiveView] = useState<number | 'video'>(0);

  // Fullscreen HD Zoom Modal State
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(0);

  const videoData = parseVideoEmbedUrl(videoUrl);
  const hasVideo = videoData.type !== 'invalid' && Boolean(videoData.embedUrl);

  const activeImgIdx = typeof activeView === 'number' ? activeView : 0;
  const currentImgRaw = displayImages[activeImgIdx] || displayImages[0];

  // HD Image for main viewport
  const currentHdUrl = getOptimizedImageUrl(currentImgRaw, 'full');

  const openZoom = (idx: number) => {
    setZoomIdx(idx);
    setIsZoomOpen(true);
  };

  const closeZoom = () => setIsZoomOpen(false);

  const nextZoomImg = useCallback(() => {
    setZoomIdx(prev => (prev + 1) % displayImages.length);
  }, [displayImages.length]);

  const prevZoomImg = useCallback(() => {
    setZoomIdx(prev => (prev - 1 + displayImages.length) % displayImages.length);
  }, [displayImages.length]);

  // Keyboard navigation for zoom modal
  useEffect(() => {
    if (!isZoomOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeZoom();
      if (e.key === 'ArrowRight') nextZoomImg();
      if (e.key === 'ArrowLeft') prevZoomImg();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomOpen, nextZoomImg, prevZoomImg]);

  return (
    <div>
      {/* Main Media Stage */}
      <div className="pdp-gallery-main" style={{ position: 'relative', overflow: 'hidden' }}>
        {activeView === 'video' && hasVideo ? (
          <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000000' }}>
            {videoData.type === 'direct' ? (
              <video
                src={videoData.embedUrl!}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <iframe
                src={videoData.embedUrl!}
                title={`${productName} Video`}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        ) : (
          <div
            style={{ position: 'relative', width: '100%', height: '100%', cursor: 'zoom-in' }}
            onClick={() => openZoom(activeImgIdx)}
            title="Click to view full HD picture"
          >
            {/* High-Definition Main Image View */}
            <Image
              src={currentHdUrl}
              alt={productName}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              quality={88}
              style={{ objectFit: 'cover' }}
            />

            {/* Zoom HD Button Pill */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                openZoom(activeImgIdx);
              }}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-full)',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                backdropFilter: 'blur(6px)',
                zIndex: 4,
              }}
              title="Click to enlarge in Fullscreen HD"
            >
              <ZoomIn size={13} />
              <span>Zoom HD</span>
            </button>

            {/* Quick 1-click Watch Video floating pill if video exists */}
            {hasVideo && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setActiveView('video');
                }}
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '16px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 'var(--radius-full)',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease',
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Play size={10} fill="#ffffff" color="#ffffff" style={{ marginLeft: '1px' }} />
                </div>
                <span>Watch Product Video</span>
              </button>
            )}

            {/* Main Cover Pill (for image 0) */}
            {activeImgIdx === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backdropFilter: 'blur(4px)',
                  letterSpacing: '0.5px',
                  zIndex: 4,
                }}
              >
                <Star size={10} fill="#eab308" color="#eab308" />
                MAIN COVER
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnails Strip (Compressed Tier 1 Thumbnails ~20KB each) */}
      {(displayImages.length > 1 || hasVideo) && (
        <div className="pdp-gallery-thumbs" style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {/* Photo Thumbnails */}
          {displayImages.map((img, idx) => {
            const thumbUrl = getOptimizedImageUrl(img, 'thumb');
            const isActive = activeView === idx;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveView(idx)}
                className={`pdp-thumb ${isActive ? 'pdp-thumb--active' : ''}`}
                aria-label={`View photo ${idx + 1}`}
                style={{
                  position: 'relative',
                  width: '70px',
                  height: '70px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                  opacity: isActive ? 1 : 0.7,
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  padding: 0,
                  background: '#f1f5f9',
                }}
              >
                <Image
                  src={thumbUrl}
                  alt={`${productName} photo ${idx + 1}`}
                  fill
                  sizes="70px"
                  quality={70}
                  style={{ objectFit: 'cover' }}
                />
                {idx === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#ffffff',
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    COVER
                  </span>
                )}
              </button>
            );
          })}

          {/* Video Thumbnail Button */}
          {hasVideo && (
            <button
              type="button"
              onClick={() => setActiveView('video')}
              className={`pdp-thumb ${activeView === 'video' ? 'pdp-thumb--active' : ''}`}
              aria-label="Play product video"
              style={{
                position: 'relative',
                width: '70px',
                height: '70px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#0f172a',
                color: '#ffffff',
                border: activeView === 'video' ? '2px solid #ef4444' : '2px solid transparent',
                opacity: activeView === 'video' ? 1 : 0.85,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play size={12} fill="#ffffff" color="#ffffff" style={{ marginLeft: '1px' }} />
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.3px' }}>
                VIDEO
              </span>
            </button>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
         INTERACTIVE FULLSCREEN HD ZOOM LIGHTBOX MODAL
         ──────────────────────────────────────────────────────────── */}
      {isZoomOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
          }}
          onClick={closeZoom}
        >
          {/* Top Bar with Counter and Close Button */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '20px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#ffffff',
              zIndex: 10,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
                Photo {zoomIdx + 1} of {displayImages.length}
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>High-Definition Detail View</span>
            </div>

            <button
              type="button"
              onClick={closeZoom}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Large High-Res Picture Display */}
          <div
            style={{
              position: 'relative',
              width: '90vw',
              height: '80vh',
              maxWidth: '1200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={getOptimizedImageUrl(displayImages[zoomIdx], 'full')}
              alt={`${productName} HD Zoom`}
              fill
              sizes="90vw"
              quality={92}
              style={{ objectFit: 'contain' }}
            />
          </div>

          {/* Navigation Arrows if more than 1 image */}
          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  prevZoomImg();
                }}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
                title="Previous photo (←)"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  nextZoomImg();
                }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
                title="Next photo (→)"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Bottom Thumbnails in Zoom Modal */}
          {displayImages.length > 1 && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                display: 'flex',
                gap: '8px',
                background: 'rgba(0,0,0,0.6)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                backdropFilter: 'blur(6px)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setZoomIdx(idx)}
                  style={{
                    position: 'relative',
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    border: zoomIdx === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                    opacity: zoomIdx === idx ? 1 : 0.6,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <Image
                    src={getOptimizedImageUrl(img, 'thumb')}
                    alt={`Thumb ${idx + 1}`}
                    fill
                    sizes="40px"
                    style={{ objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
