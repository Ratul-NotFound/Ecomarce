'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play, Image as ImageIcon, Video, Star } from 'lucide-react';
import { parseVideoEmbedUrl } from '@/lib/utils/video';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  videoUrl?: string | null;
}

export default function ProductGallery({ images = [], productName, videoUrl }: ProductGalleryProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';
  const cleanImages = images.filter(img => Boolean(img && img.trim()));
  const displayImages = cleanImages.length > 0 ? cleanImages : [defaultImage];

  // Active view: number index for images, or -1 for video
  const [activeView, setActiveView] = useState<number | 'video'>(0);

  const videoData = parseVideoEmbedUrl(videoUrl);
  const hasVideo = videoData.type !== 'invalid' && Boolean(videoData.embedUrl);

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
          <>
            <Image
              src={displayImages[typeof activeView === 'number' ? activeView : 0] || defaultImage}
              alt={productName}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ objectFit: 'cover' }}
            />

            {/* Quick 1-click Watch Video floating pill if video exists */}
            {hasVideo && (
              <button
                type="button"
                onClick={() => setActiveView('video')}
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
            {activeView === 0 && (
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
                }}
              >
                <Star size={10} fill="#eab308" color="#eab308" />
                MAIN COVER
              </div>
            )}
          </>
        )}
      </div>

      {/* Thumbnails Strip (Up to 4 Pictures + Video Thumbnail) */}
      {(displayImages.length > 1 || hasVideo) && (
        <div className="pdp-gallery-thumbs" style={{ display: 'flex', gap: '8px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {/* Photo Thumbnails */}
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveView(idx)}
              className={`pdp-thumb ${activeView === idx ? 'pdp-thumb--active' : ''}`}
              aria-label={`View photo ${idx + 1}`}
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: activeView === idx ? '2px solid var(--color-primary)' : '2px solid transparent',
                opacity: activeView === idx ? 1 : 0.7,
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <Image src={img} alt={`${productName} photo ${idx + 1}`} width={70} height={70} style={{ objectFit: 'cover' }} />
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
          ))}

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
    </div>
  );
}
