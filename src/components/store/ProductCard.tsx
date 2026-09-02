'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, ShoppingBag, Star, Check, Zap } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency, calcDiscountPercent } from '@/lib/utils/format';
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

  const imageUrl =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add(product, null, 1);
    setAddedAnim(true);
    showToast(`Added "${product.name_en}" to cart!`, 'success');
    setTimeout(() => setAddedAnim(false), 1500);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

        {/* Badges Container */}
        <div className="product-card__badge-container">
          {product.is_flash_sale && (
            <span className="badge badge-danger">⚡ Flash Sale</span>
          )}
          {hasDiscount && (
            <span className="badge badge-warning">-{discountPercent}% OFF</span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className={`product-card__wishlist-btn ${isWishlisted ? 'product-card__wishlist-btn--active' : ''}`}
          aria-label="Add to Wishlist"
        >
          <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </Link>

      {/* Content */}
      <div className="product-card__content">
        {product.category && (
          <div className="product-card__category">{product.category.name_en}</div>
        )}

        <Link href={`/products/${product.slug}`}>
          <h3 className="product-card__title">{product.name_en}</h3>
        </Link>

        {/* Rating preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <div className="stars">
            <Star size={13} fill="currentColor" />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            {product.total_sold > 0 ? `${product.total_sold} sold` : 'New'}
          </span>
        </div>

        {/* Price Row */}
        <div className="product-card__price-row">
          <span className="product-card__sale-price">{formatCurrency(effectivePrice)}</span>
          {hasDiscount && (
            <span className="product-card__base-price">{formatCurrency(product.base_price)}</span>
          )}
        </div>

        {/* Dual Actions: Add to Cart + Buy Now */}
        <div className="product-card__btn-group">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.stock_quantity <= 0}
            className="product-card__btn product-card__btn--cart"
            title="Add to Cart"
            id={`add-btn-${product.id}`}
          >
            {addedAnim ? (
              <>
                <Check size={14} />
                <span>Added</span>
              </>
            ) : product.stock_quantity <= 0 ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <ShoppingBag size={14} />
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
            <Zap size={14} fill="currentColor" />
            <span>Buy Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
