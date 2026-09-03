'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Star, Check, Zap, Layers } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency, calcDiscountPercent } from '@/lib/utils/format';
import { getOptimizedImageUrl } from '@/lib/utils/images';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/shared/ToastProvider';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { add } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);

  const effectivePrice = product.sale_price ?? product.base_price;
  const hasDiscount = product.sale_price && product.sale_price < product.base_price;
  const discountPercent = hasDiscount
    ? calcDiscountPercent(product.base_price, product.sale_price!)
    : 0;

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

  // 2. Exact Total Sold strictly synced with database column
  const totalSold = typeof product.total_sold === 'number' ? product.total_sold : (Number(product.total_sold) || 0);
  const soldFormatted = totalSold >= 1000 ? `${(totalSold / 1000).toFixed(1)}k` : totalSold;

  // Ultra-optimized Tier 1 thumbnail (~20KB)
  const rawImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const imageUrl = getOptimizedImageUrl(rawImage, 'thumb');

  const hasVariants = Boolean(product.has_variants || (product.variants && product.variants.length > 0));
  const hasPriceRange = Boolean(product.has_price_range);
  const minPrice = product.min_price ?? effectivePrice;
  const maxPrice = product.max_price ?? effectivePrice;
  const minReg = product.min_regular_price ?? product.base_price;
  const maxReg = product.max_regular_price ?? product.base_price;
  const maxDisc = product.max_discount_percent ?? discountPercent;

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
    add(product, null, 1);
    router.push('/checkout');
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      showToast('Please sign in to save items to your wishlist', 'info');
      return;
    }

    try {
      const supabase = createClient();
      if (isWishlisted) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
        setIsWishlisted(false);
        showToast('Removed from wishlist', 'info');
      } else {
        await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: product.id });
        setIsWishlisted(true);
        showToast('Saved to wishlist!', 'success');
      }
    } catch {
      setIsWishlisted(!isWishlisted);
    }
  };

  return (
    <div className="product-card" id={`product-card-${product.id}`}>
      {/* Thumbnail */}
      <Link href={`/products/${product.slug}`} className="product-card__thumb">
        <Image
          src={imageUrl}
          alt={product.name_en}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
        />

        {/* Badges */}
        <div className="product-card__badges">
          {product.is_flash_sale && (
            <span className="badge badge-danger">Flash</span>
          )}
          {maxDisc > 0 && (
            <span className="badge badge-warning">
              {hasPriceRange ? `Up to ${maxDisc}% OFF` : `-${maxDisc}%`}
            </span>
          )}
          {hasVariants && (
            <span
              className="badge"
              style={{
                background: 'rgba(59, 130, 246, 0.9)',
                color: '#ffffff',
                backdropFilter: 'blur(4px)',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {product.variant_count || product.variants?.length} Options
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className={`product-card__wishlist-btn ${isWishlisted ? 'product-card__wishlist-btn--active' : ''}`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </Link>

      {/* Content */}
      <div className="product-card__content">
        {/* Category & Exact Rating Row */}
        <div className="product-card__meta-row">
          <span className="product-card__category">{product.category?.name_en || 'Top Pick'}</span>

          {/* Social Proof: Rating Badge */}
          {exactRating !== null && reviewCount > 0 ? (
            <div
              className="product-card__rating-badge product-card__rating-badge--rated"
              title={`${exactRating.toFixed(1)} out of 5 stars (${reviewCount} verified reviews)`}
            >
              <Star size={9} fill="#f59e0b" color="#f59e0b" />
              <span className="product-card__rating-num">{exactRating.toFixed(1)}</span>
              <span className="product-card__rating-count">({reviewCount})</span>
            </div>
          ) : (
            <div
              className="product-card__rating-badge"
              title="No reviews yet"
            >
              <Star size={9} color="var(--color-text-muted)" />
              <span className="product-card__rating-empty">0.0 (0)</span>
            </div>
          )}
        </div>

        <Link href={`/products/${product.slug}`} className="product-card__title-link">
          <h3 className="product-card__title">{product.name_en}</h3>
        </Link>

        {/* Price & Sold Row */}
        <div className="product-card__price-row">
          <div className="product-card__price-wrap">
            <span className="product-card__sale-price">
              {hasPriceRange
                ? `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`
                : formatCurrency(effectivePrice)}
            </span>
            {hasPriceRange ? (
              minReg > minPrice && (
                <span className="product-card__base-price">
                  {minReg === maxReg
                    ? formatCurrency(minReg)
                    : `${formatCurrency(minReg)} – ${formatCurrency(maxReg)}`}
                </span>
              )
            ) : (
              hasDiscount && (
                <span className="product-card__base-price">{formatCurrency(product.base_price)}</span>
              )
            )}
          </div>

          <span className="product-card__sold-count">
            {soldFormatted} sold
          </span>
        </div>

        {/* Dual Actions: Add to Cart + Buy Now */}
        <div className="product-card__btn-group">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock_quantity <= 0}
            className="product-card__btn product-card__btn--cart"
            title={hasVariants ? 'Choose Options' : 'Add to Cart'}
            id={`add-btn-${product.id}`}
          >
            {addedAnim ? (
              <>
                <Check size={11} />
                <span>Added</span>
              </>
            ) : product.stock_quantity <= 0 ? (
              <span>Out</span>
            ) : hasVariants ? (
              <>
                <Layers size={11} />
                <span>Options</span>
              </>
            ) : (
              <>
                <ShoppingBag size={11} />
                <span>Cart</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={product.stock_quantity <= 0}
            className="product-card__btn product-card__btn--buy"
            title="Buy Now"
            id={`buy-btn-${product.id}`}
          >
            <Zap size={11} fill="currentColor" />
            <span>{hasVariants ? 'Options' : 'Buy Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
