'use client';

import React from 'react';
import type { ProductVariant } from '@/types';
import { formatCurrency } from '@/lib/utils/format';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelectVariant: (v: ProductVariant | null) => void;
}

export default function VariantSelector({
  variants = [],
  selectedVariant,
  onSelectVariant,
}: VariantSelectorProps) {
  if (variants.length === 0) return null;

  // Extract unique sizes, colors
  const hasSizes = variants.some(v => v.size);
  const hasColors = variants.some(v => v.color);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '12px 0' }}>
      {hasSizes && (
        <div>
          <div className="variant-group-title">Select Size</div>
          <div className="variant-chips">
            {variants
              .filter(v => v.size)
              .map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVariant(selectedVariant?.id === v.id ? null : v)}
                  className={`variant-chip ${selectedVariant?.id === v.id ? 'variant-chip--active' : ''}`}
                >
                  {v.size}
                  {v.price_modifier !== 0 && (
                    <span style={{ fontSize: '10px', opacity: 0.85, marginLeft: '4px' }}>
                      ({v.price_modifier > 0 ? '+' : ''}
                      {formatCurrency(v.price_modifier)})
                    </span>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {hasColors && (
        <div>
          <div className="variant-group-title">Select Color</div>
          <div className="variant-chips">
            {variants
              .filter(v => v.color)
              .map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVariant(selectedVariant?.id === v.id ? null : v)}
                  className={`variant-chip ${selectedVariant?.id === v.id ? 'variant-chip--active' : ''}`}
                >
                  {v.color}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
