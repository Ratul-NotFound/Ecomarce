'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Zap, Flame, Check } from 'lucide-react';
import type { Product } from '@/types';
import { formatCurrency, calcDiscountPercent } from '@/lib/utils/format';
import { useCart } from '@/hooks/useCart';
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
    : Math.max(15, Math.floor(((product.id.charCodeAt(0) % 30) + 15)));

  const savingsAmount = hasDiscount
    ? product.base_price - product.sale_price!
    : Math.round(product.base_price * (discountPercent / 100));

  // Dynamic stock claim percentage for deal urgency
  const soldCount = product.total_sold || Math.max(8, (product.id.charCodeAt(1) % 45) + 10);
  const stockLeft = Math.max(2, (product.id.charCodeAt(2) % 12) + 2);
  const percentClaimed = Math.min(95, Math.max(65, Math.round((soldCount / (soldCount + stockLeft)) * 100)));

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
          <div className="deal-card__badge">
            <Flame size={12} fill="#ffffff" color="#ffffff" />
            <span>-{discountPercent}% OFF</span>
          </div>

          {/* Savings Pill */}
          <div className="deal-card__savings-pill">
            Save {formatCurrency(savingsAmount)}
          </div>
        </div>
      </Link>

      <div className="deal-card__content">
        <Link href={`/products/${product.slug}`} className="deal-card__title">
          {product.name_en}
        </Link>

        {/* Pricing */}
        <div className="deal-card__price-row">
          <span className="deal-card__price">{formatCurrency(effectivePrice)}</span>
          {(hasDiscount || product.base_price > effectivePrice) && (
            <span className="deal-card__original-price">
              {formatCurrency(product.base_price)}
            </span>
          )}
        </div>

        {/* Deal Stock Urgency Progress Bar */}
        <div className="deal-card__stock-progress">
          <div className="deal-card__stock-label">
            <span>🔥 {soldCount} sold</span>
            <span className="deal-card__stock-left">Only {stockLeft} left!</span>
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
            title="Add to Cart"
          >
            {addedAnim ? <Check size={14} color="var(--color-success)" /> : <ShoppingBag size={14} />}
            <span>Cart</span>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            className="deal-card__btn deal-card__btn--buy"
            title="Claim Deal Now"
          >
            <Zap size={14} fill="#ffffff" />
            <span>Claim Deal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
