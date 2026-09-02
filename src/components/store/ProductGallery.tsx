'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images = [], productName }: ProductGalleryProps) {
  const defaultImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80';
  const displayImages = images.length > 0 ? images : [defaultImage];
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div>
      {/* Main Image View */}
      <div className="pdp-gallery-main">
        <Image
          src={displayImages[activeIdx] || defaultImage}
          alt={productName}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          style={{ objectFit: 'cover' }}
        />
      </div>

      {/* Thumbnails Strip */}
      {displayImages.length > 1 && (
        <div className="pdp-gallery-thumbs">
          {displayImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`pdp-thumb ${activeIdx === idx ? 'pdp-thumb--active' : ''}`}
              aria-label={`View image ${idx + 1}`}
            >
              <Image src={img} alt={`${productName} thumbnail ${idx + 1}`} width={70} height={70} style={{ objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
