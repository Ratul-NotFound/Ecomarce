'use client';

import React from 'react';
import type { ProductVariant } from '@/types';
import { formatCurrency } from '@/lib/utils/format';
import { extractOptionSchema } from '@/lib/utils/pricing';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelectVariant: (v: ProductVariant | null) => void;
  tags?: string[];
}

export default function VariantSelector({
  variants = [],
  selectedVariant,
  onSelectVariant,
  tags = [],
}: VariantSelectorProps) {
  if (variants.length === 0) return null;

  // Extract dynamic schema if defined in product tags
  const optionSchema = extractOptionSchema(tags);

  // Extract unique attributes
  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[];
  const colors = Array.from(new Set(variants.map(v => v.color).filter(Boolean))) as string[];
  const materials = Array.from(new Set(variants.map(v => v.material).filter(Boolean))) as string[];

  const dimensionsCount = [sizes.length > 0, colors.length > 0, materials.length > 0].filter(Boolean).length;

  const opt1Title = optionSchema[0]?.name || (sizes.length > 0 ? 'Select Option / Size' : 'Select Option 1');
  const opt2Title = optionSchema[1]?.name || (colors.length > 0 ? 'Select Color / Stand' : 'Select Option 2');
  const opt3Title = optionSchema[2]?.name || 'Select Edition';

  // Single-dimension list (e.g. only 1 option dimension defined)
  if (dimensionsCount <= 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '12px 0' }}>
        <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700 }}>
          {opt1Title}:
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
                  opacity: isOut ? 0.5 : 1,
                  textDecoration: isOut ? 'line-through' : 'none',
                }}
                title={isOut ? 'Out of stock' : undefined}
              >
                <span>{label}</span>
                {v.selling_price ? (
                  <span style={{ fontSize: '11px', opacity: 0.9, marginLeft: '6px', fontWeight: 700 }}>
                    {formatCurrency(v.selling_price)}
                  </span>
                ) : v.price_modifier !== 0 ? (
                  <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '4px' }}>
                    ({v.price_modifier > 0 ? '+' : ''}
                    {formatCurrency(v.price_modifier)})
                  </span>
                ) : null}
                {isOut && (
                  <span style={{ fontSize: '10px', color: 'var(--color-danger)', marginLeft: '4px', fontWeight: 700 }}>
                    (Sold out)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Multi-dimensional selector (e.g. Diameter AND Stand, or Size AND Color)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '12px 0' }}>
      {/* Dimension 1 */}
      {sizes.length > 0 && (
        <div>
          <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            {opt1Title}:
            {selectedVariant?.size && (
              <span style={{ color: 'var(--color-primary)', marginLeft: '6px', fontWeight: 800 }}>
                {selectedVariant.size}
              </span>
            )}
          </div>
          <div className="variant-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sizes.map(s => {
              const isSelected = selectedVariant?.size === s;
              // Check if all variants with this size are out of stock
              const matchingVariants = variants.filter(v => v.size === s);
              const allOut = matchingVariants.length > 0 && matchingVariants.every(v => v.stock_quantity <= 0);

              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handlePick('size', s)}
                  className={`variant-chip ${isSelected ? 'variant-chip--active' : ''}`}
                  style={{
                    opacity: allOut ? 0.5 : 1,
                    textDecoration: allOut ? 'line-through' : 'none',
                  }}
                  title={allOut ? 'Sold out' : undefined}
                >
                  <span>{s}</span>
                  {allOut && (
                    <span style={{ fontSize: '10px', color: 'var(--color-danger)', marginLeft: '4px' }}>
                      (Sold out)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimension 2 */}
      {colors.length > 0 && (
        <div>
          <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            {opt2Title}:
            {selectedVariant?.color && (
              <span style={{ color: 'var(--color-primary)', marginLeft: '6px', fontWeight: 800 }}>
                {selectedVariant.color}
              </span>
            )}
          </div>
          <div className="variant-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {colors.map(c => {
              const isSelected = selectedVariant?.color === c;
              // Check if specific combination of selected size + this color is out of stock
              const currentCombo = variants.find(
                v => (!selectedVariant?.size || v.size === selectedVariant.size) && v.color === c
              );
              const isComboOut = currentCombo ? currentCombo.stock_quantity <= 0 : false;

              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => handlePick('color', c)}
                  className={`variant-chip ${isSelected ? 'variant-chip--active' : ''}`}
                  style={{
                    opacity: isComboOut ? 0.5 : 1,
                    textDecoration: isComboOut ? 'line-through' : 'none',
                  }}
                  title={isComboOut ? 'Sold out in this size' : undefined}
                >
                  <span>{c}</span>
                  {currentCombo?.selling_price && (
                    <span style={{ fontSize: '10px', opacity: 0.85, marginLeft: '4px' }}>
                      {formatCurrency(currentCombo.selling_price)}
                    </span>
                  )}
                  {isComboOut && (
                    <span style={{ fontSize: '10px', color: 'var(--color-danger)', marginLeft: '4px' }}>
                      (Sold out)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimension 3 */}
      {materials.length > 0 && (
        <div>
          <div className="variant-group-title" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
            {opt3Title}:
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
