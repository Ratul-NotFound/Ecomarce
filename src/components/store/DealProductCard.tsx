'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Zap, Flame, Check, Star, Layers } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency, calcDiscountPercent } from '@/lib/utils/format';
import { getOptimizedImageUrl } from '@/lib/utils/images';
import { useCart } from '@/hooks/useCart';
import { setDirectBuyItem } from '@/lib/cart';
import { useToast } from '@/components/shared/ToastProvider';

interface DealProductCardProps {
  product: Product;
}

export default function DealProductCard({ product }: DealProductCardProps) {
  const router = useRouter();
  const { add } = useCart();
  const { showToast } = useToast();
  const [addedAnim, setAddedAnim] = useState(false);

  const effectivePrice = product.sale_price ?? product.base_price;
  const hasDiscount = Boolean(product.sale_price && product.sale_price < product.base_price);
  const discountPercent = hasDiscount
    ? calcDiscountPercent(product.base_price, product.sale_price!)
    : 0;

  const savingsAmount = hasDiscount
    ? product.base_price - product.sale_price!
    : 0;

  const hasVariants = Boolean(product.has_variants || (product.variants && product.variants.length > 0));
  const hasPriceRange = Boolean(product.has_price_range);
  const minPrice = product.min_price ?? effectivePrice;
  const maxPrice = product.max_price ?? effectivePrice;
  const minReg = product.min_regular_price ?? product.base_price;
  const maxReg = product.max_regular_price ?? product.base_price;
  const maxDisc = product.max_discount_percent ?? discountPercent;

  // 1. Exact Rating strictly synced from actual database reviews
  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  const validRatings = reviews
    .map((r: any) => (typeof r === 'number' ? r : Number(r?.rating)))
    .filter((r: number) => !isNaN(r) && r > 0);

  const reviewCount = product.review_count ?? validRatings.length;
  const exactRating = product.avg_rating !== undefined && product.avg_rating !== null && product.avg_rating > 0
    ? Number(product.avg_rating)
    : reviewCount > 0
    ? Number((validRatings.reduce((sum: number, r: number) => sum + r, 0) / reviewCount).toFixed(1))
    : null;

  // 2. Exact Total Sold & Stock strictly synced with database columns
  const totalSold = typeof product.total_sold === 'number' ? product.total_sold : (Number(product.total_sold) || 0);
  const stockQuantity = typeof product.stock_quantity === 'number' ? product.stock_quantity : 0;
  const totalUnits = totalSold + stockQuantity;
  const percentClaimed = totalUnits > 0
    ? Math.min(100, Math.round((totalSold / totalUnits) * 100))
    : 0;

  const rawImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const imageUrl = getOptimizedImageUrl(rawImage, 'thumb');

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      router.push(`/products/${product.slug}`);
      return;
    }
    add(product, null, 1);
    setAddedAnim(true);
    showToast(`Added "${product.name_en}" to cart!`, 'success');
    setTimeout(() => setAddedAnim(false), 1500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants) {
      router.push(`/products/${product.slug}`);
      return;
    }
    setDirectBuyItem(product, null, 1);
    router.push('/checkout?direct=1');
  };

  return (
    <div className="deal-card">
      <Link href={`/products/${product.slug}`} className="deal-card__image-link">
        <div className="deal-card__image-wrap">
          <Image
            src={imageUrl}
            alt={product.name_en}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="deal-card__image"
          />

          {/* Deal Discount Flame Badge */}
          {(hasPriceRange ? maxDisc > 0 : hasDiscount) && (
            <div className="deal-card__badge">
              <Flame size={12} fill="#ffffff" color="#ffffff" />
              <span>{hasPriceRange ? `Up to ${maxDisc}% OFF` : `-${discountPercent}% OFF`}</span>
            </div>
          )}

          {/* Savings Pill */}
          {savingsAmount > 0 && (
            <div className="deal-card__savings-pill">
              Save {formatCurrency(savingsAmount)}
            </div>
          )}
        </div>
      </Link>

      <div className="deal-card__content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 700 }}>
            {product.category?.name_en || 'Flash Deal'}
          </span>
          {exactRating !== null && reviewCount > 0 ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                background: '#fef3c7',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
              title={`${exactRating.toFixed(1)} out of 5 stars (${reviewCount} verified reviews)`}
            >
              <Star size={10} fill="#f59e0b" color="#f59e0b" />
              <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 800 }}>
                {exactRating.toFixed(1)}
              </span>
              <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 600 }}>
                ({reviewCount})
              </span>
            </div>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                background: 'var(--color-surface-2)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
              title="No reviews yet"
            >
              <Star size={10} color="var(--color-text-muted)" />
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                0.0 (0)
              </span>
            </div>
          )}
        </div>

        <Link href={`/products/${product.slug}`} className="deal-card__title">
          {product.name_en}
        </Link>

        {/* Pricing */}
        <div className="deal-card__price-row" style={{ flexWrap: 'wrap', gap: '4px' }}>
          <span className="deal-card__price">
            {hasPriceRange
              ? `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`
              : formatCurrency(effectivePrice)}
          </span>
          {hasPriceRange ? (
            minReg > minPrice && (
              <span className="deal-card__original-price">
                {minReg === maxReg
                  ? formatCurrency(minReg)
                  : `${formatCurrency(minReg)} – ${formatCurrency(maxReg)}`}
              </span>
            )
          ) : (
            (hasDiscount || product.base_price > effectivePrice) && (
              <span className="deal-card__original-price">
                {formatCurrency(product.base_price)}
              </span>
            )
          )}
        </div>

        {/* Deal Stock Urgency Progress Bar */}
        <div className="deal-card__stock-progress">
          <div className="deal-card__stock-label">
            <span>🔥 {totalSold} sold</span>
            <span className="deal-card__stock-left">Stock: {stockQuantity}</span>
          </div>
          <div className="deal-card__progress-rail">
            <div
              className="deal-card__progress-fill"
              style={{ width: `${percentClaimed}%` }}
            />
          </div>
        </div>

        {/* Dual Actions */}
        <div className="deal-card__actions">
          <button
            type="button"
            onClick={handleAddToCart}
            className="deal-card__btn deal-card__btn--cart"
            title={hasVariants ? 'Choose Options' : 'Add to Cart'}
          >
            {addedAnim ? (
              <Check size={14} color="var(--color-success)" />
            ) : hasVariants ? (
              <Layers size={14} />
            ) : (
              <ShoppingBag size={14} />
            )}
            <span>{hasVariants ? 'Options' : 'Cart'}</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="deal-card__btn deal-card__btn--buy"
            title="Buy Now"
          >
            <Zap size={14} fill="currentColor" />
            <span>{hasVariants ? 'Options' : 'Buy Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
