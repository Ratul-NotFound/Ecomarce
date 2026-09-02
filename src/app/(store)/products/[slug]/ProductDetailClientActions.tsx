'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Zap, Heart, Check, Minus, Plus } from 'lucide-react';
import type { Product, ProductVariant } from '@/types';
import { formatCurrency, calcDiscountPercent } from '@/lib/utils/format';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import VariantSelector from '@/components/store/VariantSelector';

interface ProductDetailClientActionsProps {
  product: Product;
}

export default function ProductDetailClientActions({ product }: ProductDetailClientActionsProps) {
  const router = useRouter();
  const { add } = useCart();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const baseEffectivePrice = product.sale_price ?? product.base_price;
  const currentPrice = selectedVariant
    ? baseEffectivePrice + selectedVariant.price_modifier
    : baseEffectivePrice;

  const hasDiscount = product.sale_price && product.sale_price < product.base_price;
  const discountPercent = hasDiscount
    ? calcDiscountPercent(product.base_price, product.sale_price!)
    : 0;

  const handleAddToCart = () => {
    if (product.has_variants && product.variants && product.variants.length > 0 && !selectedVariant) {
      showToast('Please choose a variant/size option before adding to cart', 'info');
      return;
    }
    add(product, selectedVariant, quantity);
    setIsAdded(true);
    showToast(`Added ${quantity} item(s) to cart!`, 'success');
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (product.has_variants && product.variants && product.variants.length > 0 && !selectedVariant) {
      showToast('Please select your preferred size/variant', 'info');
      return;
    }
    add(product, selectedVariant, quantity);
    router.push('/checkout');
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      showToast('Please sign in to add items to your wishlist', 'info');
      return;
    }
    try {
      const supabase = createClient();
      if (isWishlisted) {
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', product.id);
        setIsWishlisted(false);
        showToast('Removed from wishlist', 'info');
      } else {
        await supabase.from('wishlists').insert({ user_id: user.id, product_id: product.id });
        setIsWishlisted(true);
        showToast('Saved to wishlist!', 'success');
      }
    } catch {
      setIsWishlisted(!isWishlisted);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Price Box */}
      <div className="pdp-price-box">
        <span className="pdp-price">{formatCurrency(currentPrice)}</span>
        {hasDiscount && (
          <span className="pdp-original-price">
            {formatCurrency(
              product.base_price + (selectedVariant ? selectedVariant.price_modifier : 0)
            )}
          </span>
        )}
        {hasDiscount && (
          <span className="badge badge-danger">-{discountPercent}% OFF</span>
        )}
      </div>

      {/* Variant Selector */}
      {product.variants && product.variants.length > 0 && (
        <VariantSelector
          variants={product.variants}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
        />
      )}

      {/* Stock Availability */}
      <div>
        {product.stock_quantity > 0 ? (
          <span className="badge badge-success">
            In Stock ({product.stock_quantity} available)
          </span>
        ) : (
          <span className="badge badge-danger">Currently Out of Stock</span>
        )}
      </div>

      {/* Quantity Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Quantity:</span>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus size={14} />
          </button>
          <span style={{ width: '36px', textAlign: 'center', fontWeight: 700, fontSize: '14px' }}>
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}
            disabled={quantity >= product.stock_quantity}
            aria-label="Increase quantity"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={product.stock_quantity <= 0}
          className="btn btn-secondary"
          style={{ flex: 1, minWidth: '150px', padding: '14px 20px', borderRadius: 'var(--radius-xl)' }}
          id="pdp-add-to-cart-btn"
        >
          {isAdded ? <Check size={18} /> : <ShoppingBag size={18} />}
          <span>{isAdded ? 'Added to Cart!' : 'Add to Cart'}</span>
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={product.stock_quantity <= 0}
          className="btn btn-primary"
          style={{ flex: 1, minWidth: '150px', padding: '14px 20px', borderRadius: 'var(--radius-xl)' }}
          id="pdp-buy-now-btn"
        >
          <Zap size={18} fill="currentColor" />
          <span>Buy Now / অর্ডার করুন</span>
        </button>

        <button
          type="button"
          onClick={handleToggleWishlist}
          className="btn btn-secondary"
          style={{ width: '48px', padding: 0, borderRadius: 'var(--radius-xl)' }}
          aria-label="Save to Wishlist"
          id="pdp-wishlist-toggle-btn"
        >
          <Heart size={20} fill={isWishlisted ? 'var(--color-danger)' : 'none'} color={isWishlisted ? 'var(--color-danger)' : 'currentColor'} />
        </button>
      </div>
    </div>
  );
}
