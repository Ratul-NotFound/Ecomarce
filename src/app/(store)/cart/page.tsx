'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus, Tag, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils/format';
import { getOptimizedImageUrl } from '@/lib/utils/images';
import { STORE_CONFIG } from '@/lib/store-config';
import { useToast } from '@/components/shared/ToastProvider';

export default function CartPage() {
  const { cart, itemCount, subtotal, updateQuantity, remove, clear } = useCart();
  const { showToast } = useToast();

  const [freeShippingAbove, setFreeShippingAbove] = useState<number>(STORE_CONFIG.shipping.freeAbove);
  const [shippingInsideDhaka, setShippingInsideDhaka] = useState<number>(STORE_CONFIG.shipping.insideDhaka);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(res => {
        if (res.settings) {
          if (res.settings.free_shipping_above !== undefined) {
            setFreeShippingAbove(Number(res.settings.free_shipping_above));
          }
          if (res.settings.shipping_inside_dhaka !== undefined) {
            setShippingInsideDhaka(Number(res.settings.shipping_inside_dhaka));
          }
        }
      })
      .catch(() => {});
  }, []);

  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const isFreeShipping = subtotal >= freeShippingAbove;
  const estimatedShipping = isFreeShipping ? 0 : shippingInsideDhaka;
  const finalTotal = Math.max(0, subtotal + estimatedShipping - discountAmount);
  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeShippingAbove) * 100));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    try {
      setIsValidatingCoupon(true);
      const itemsPayload = cart.map(i => ({
        product_id: i.product_id,
        price: i.variant ? (i.product.sale_price ?? i.product.base_price) + i.variant.price_modifier : (i.product.sale_price ?? i.product.base_price),
        quantity: i.quantity,
      }));

      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim(),
          total: subtotal,
          items: itemsPayload,
        }),
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
    <div className="container" style={{ padding: '24px 16px 120px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>
        Shopping Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h1>

      <div className="cart-layout">
        {/* Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cart.map(item => {
              const unitPrice = item.variant
                ? (item.product.sale_price ?? item.product.base_price) + item.variant.price_modifier
                : item.product.sale_price ?? item.product.base_price;
              const rawImg = item.variant?.images?.[0] || item.product.images?.[0];
              const imgUrl = getOptimizedImageUrl(rawImg, 'thumb');

              return (
                <div
                  key={`${item.product_id}_${item.variant_id || 'base'}`}
                  className="cart-item-card"
                >
                  <div className="cart-item-thumb">
                    <Image src={imgUrl} alt={item.product.name_en} fill style={{ objectFit: 'cover' }} />
                  </div>

                  <div className="cart-item-details">
                    <div className="cart-item-top-row">
                      <Link href={`/products/${item.product.slug}`} className="cart-item-title">
                        {item.product.name_en}
                      </Link>

                      {/* Delete Item */}
                      <button
                        type="button"
                        onClick={() => remove(item.product_id, item.variant_id)}
                        className="cart-item-trash-btn"
                        aria-label="Remove item"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {item.variant && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Variant: {item.variant.size || item.variant.color}
                      </div>
                    )}

                    <div className="cart-item-bottom-row">
                      <div className="cart-item-price">
                        {formatCurrency(unitPrice * item.quantity)}
                        {item.quantity > 1 && (
                          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', marginLeft: '4px' }}>
                            ({formatCurrency(unitPrice)}/ea)
                          </span>
                        )}
                      </div>

                      {/* Quantity Stepper */}
                      <div className="cart-item-stepper">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={11} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', padding: '0 4px' }}>
              <button
                type="button"
                onClick={clear}
                style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear Cart
              </button>
              <Link href="/" style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary & Checkout Card */}
          <div style={{ height: 'fit-content' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Order Summary</h2>

              {/* Dynamic Free Delivery Progress Bar */}
              <div
                style={{
                  background: isFreeShipping ? 'rgba(34, 197, 94, 0.08)' : 'rgba(37, 99, 235, 0.06)',
                  border: `1px solid ${isFreeShipping ? 'rgba(34, 197, 94, 0.25)' : 'rgba(37, 99, 235, 0.15)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isFreeShipping ? 'var(--color-success)' : 'var(--color-primary)' }}>
                    <Truck size={15} />
                    <span>
                      {isFreeShipping
                        ? '🎉 Congratulations! Free Delivery unlocked!'
                        : `Add ${formatCurrency(freeShippingAbove - subtotal)} more for FREE Delivery`}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>{freeShippingProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${freeShippingProgress}%`,
                      height: '100%',
                      background: isFreeShipping ? 'var(--color-success)' : 'var(--color-primary)',
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Coupon code (e.g. SAVE10)"
                  className="form-input"
                  style={{ height: '40px', textTransform: 'uppercase', flex: 1, minWidth: 0 }}
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={isValidatingCoupon || !couponInput.trim()}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0, padding: '0 16px', height: '40px' }}
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
