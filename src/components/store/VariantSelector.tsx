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

  // Extract unique attributes
  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[];
  const colors = Array.from(new Set(variants.map(v => v.color).filter(Boolean))) as string[];
  const materials = Array.from(new Set(variants.map(v => v.material).filter(Boolean))) as string[];

  const dimensionsCount = [sizes.length > 0, colors.length > 0, materials.length > 0].filter(Boolean).length;

  // Single-dimension list (e.g. only sizes, or direct combined list)
  if (dimensionsCount <= 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '12px 0' }}>
        <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700 }}>
          {sizes.length > 0
            ? 'Select Option / Size:'
            : colors.length > 0
            ? 'Select Color:'
            : materials.length > 0
            ? 'Select Edition:'
            : 'Select Variant:'}
        </div>
        <div className="variant-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {variants.map(v => {
            const isSelected = selectedVariant?.id === v.id;
            const label = v.size || v.color || v.material || v.sku;
            const isOut = v.stock_quantity <= 0;

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectVariant(isSelected ? null : v)}
                className={`variant-chip ${isSelected ? 'variant-chip--active' : ''}`}
                style={{
                  opacity: isOut ? 0.6 : 1,
                  textDecoration: isOut ? 'line-through' : 'none',
                }}
                title={isOut ? 'Out of stock' : undefined}
              >
                <span>{label}</span>
                {v.price_modifier !== 0 && (
                  <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '4px' }}>
                    ({v.price_modifier > 0 ? '+' : ''}
                    {formatCurrency(v.price_modifier)})
                  </span>
                )}
                {isOut && (
                  <span style={{ fontSize: '10px', color: 'var(--color-danger)', marginLeft: '4px' }}>
                    (Out of stock)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Multi-dimensional selector (e.g. Size AND Color)
  const handlePick = (attr: 'size' | 'color' | 'material', val: string) => {
    const nextSize = attr === 'size' ? val : selectedVariant?.size || sizes[0];
    const nextColor = attr === 'color' ? val : selectedVariant?.color || colors[0];
    const nextMaterial = attr === 'material' ? val : selectedVariant?.material || materials[0];

    // Find matching combination
    let match = variants.find(
      v =>
        (!sizes.length || v.size === nextSize) &&
        (!colors.length || v.color === nextColor) &&
        (!materials.length || v.material === nextMaterial)
    );

    // Fallback: pick any variant with this attribute value
    if (!match) {
      match = variants.find(v => (attr === 'size' ? v.size === val : v.color === val));
    }

    onSelectVariant(match || null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '12px 0' }}>
      {/* Dimension 1: Size / Storage / Volume */}
      {sizes.length > 0 && (
        <div>
          <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            Select Option / Size:
            {selectedVariant?.size && (
              <span style={{ color: 'var(--color-primary)', marginLeft: '6px', fontWeight: 800 }}>
                {selectedVariant.size}
              </span>
            )}
          </div>
          <div className="variant-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sizes.map(s => {
              const isSelected = selectedVariant?.size === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handlePick('size', s)}
                  className={`variant-chip ${isSelected ? 'variant-chip--active' : ''}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimension 2: Colors */}
      {colors.length > 0 && (
        <div>
          <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            Select Color:
            {selectedVariant?.color && (
              <span style={{ color: 'var(--color-primary)', marginLeft: '6px', fontWeight: 800 }}>
                {selectedVariant.color}
              </span>
            )}
          </div>
          <div className="variant-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {colors.map(c => {
              const isSelected = selectedVariant?.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handlePick('color', c)}
                  className={`variant-chip ${isSelected ? 'variant-chip--active' : ''}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimension 3: Material / Edition */}
      {materials.length > 0 && (
        <div>
          <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            Select Edition / Material:
            {selectedVariant?.material && (
              <span style={{ color: 'var(--color-primary)', marginLeft: '6px', fontWeight: 800 }}>
                {selectedVariant.material}
              </span>
            )}
          </div>
          <div className="variant-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {materials.map(m => {
              const isSelected = selectedVariant?.material === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handlePick('material', m)}
                  className={`variant-chip ${isSelected ? 'variant-chip--active' : ''}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
