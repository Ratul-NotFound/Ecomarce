'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, Tag, ShieldCheck } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils/format';
import { STORE_CONFIG } from '@/lib/store-config';
import { useToast } from '@/components/shared/ToastProvider';

export default function CartPage() {
  const { cart, itemCount, subtotal, updateQuantity, remove, clear } = useCart();
  const { showToast } = useToast();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const estimatedShipping = subtotal >= STORE_CONFIG.shipping.freeAbove ? 0 : STORE_CONFIG.shipping.insideDhaka;
  const finalTotal = Math.max(0, subtotal + estimatedShipping - discountAmount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    try {
      setIsValidatingCoupon(true);
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), total: subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        showToast(data.error || 'Invalid coupon code', 'error');
      } else {
        setAppliedCoupon({ code: data.coupon.code, discount: data.discount });
        showToast(`Coupon applied! Saved ৳${data.discount}`, 'success');
      }
    } catch {
      showToast('Failed to validate coupon', 'error');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '9999px', background: 'var(--color-primary-10)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <ShoppingBag size={40} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Your Cart is Empty</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Explore our collections and add trending products to your cart.
          </p>
          <Link href="/" className="btn btn-primary" id="empty-cart-shop-btn">
            Start Shopping →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '24px 16px 80px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}>
        Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h1>

      <div className="cart-layout">
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {cart.map(item => {
              const unitPrice = item.variant
                ? (item.product.sale_price ?? item.product.base_price) + item.variant.price_modifier
                : item.product.sale_price ?? item.product.base_price;
              const imgUrl = item.product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80';

              return (
                <div
                  key={`${item.product_id}_${item.variant_id || 'base'}`}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    padding: '16px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-surface-2)' }}>
                    <Image src={imgUrl} alt={item.product.name_en} fill style={{ objectFit: 'cover' }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/products/${item.product.slug}`} style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-text-primary)' }}>
                      <div className="truncate">{item.product.name_en}</div>
                    </Link>
                    {item.variant && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Variant: {item.variant.size || item.variant.color}
                      </div>
                    )}
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '15px', marginTop: '6px' }}>
                      {formatCurrency(unitPrice)}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                      style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}
                      aria-label="Decrease"
                    >
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                      style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}
                      aria-label="Increase"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Delete Item */}
                  <button
                    type="button"
                    onClick={() => remove(item.product_id, item.variant_id)}
                    style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}
                    aria-label="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <button
                type="button"
                onClick={clear}
                style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear Cart
              </button>
              <Link href="/" style={{ fontSize: '13px', color: 'var(--color-primary)', fontWeight: 600 }}>
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary & Checkout Card */}
          <div style={{ height: 'fit-content' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px' }}>Order Summary</h2>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Coupon code (e.g. SAVE10)"
                  className="form-input"
                  style={{ height: '40px', textTransform: 'uppercase' }}
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isValidatingCoupon || !couponInput.trim()}
                  className="btn btn-secondary btn-sm"
                  id="cart-apply-coupon-btn"
                >
                  {isValidatingCoupon ? '...' : 'Apply'}
                </button>
              </form>

              {appliedCoupon && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-success-light)', color: 'var(--color-success)', padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 700, marginBottom: '16px' }}>
                  <span>Code {appliedCoupon.code} Applied</span>
                  <button type="button" onClick={() => setAppliedCoupon(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>×</button>
                </div>
              )}

              {/* Subtotal, Shipping, Discount Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatCurrency(subtotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Estimated Delivery</span>
                  <span>{estimatedShipping === 0 ? <strong style={{ color: 'var(--color-success)' }}>FREE</strong> : formatCurrency(estimatedShipping)}</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Total</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {formatCurrency(finalTotal)}
                </span>
              </div>

              {/* Checkout Link */}
              <Link
                href={{
                  pathname: '/checkout',
                  query: appliedCoupon ? { coupon: appliedCoupon.code } : undefined,
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-xl)', fontSize: '15px' }}
                id="cart-proceed-checkout-btn"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={18} />
              </Link>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <ShieldCheck size={16} color="var(--color-success)" />
                <span>bKash, Nagad & Cash on Delivery supported</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
