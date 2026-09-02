'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/format';
import { DISTRICTS, getShippingFee } from '@/lib/utils/bangladesh-districts';
import { STORE_CONFIG } from '@/lib/store-config';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, ShieldCheck, Truck, CreditCard, ArrowRight } from 'lucide-react';
import type { Address, PaymentMethod } from '@/types';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get('coupon') || '';
  const { cart, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [transactionId, setTransactionId] = useState('');
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  // Load existing user profile addresses if signed in
  useEffect(() => {
    if (user) {
      if (profile?.full_name && !fullName) setFullName(profile.full_name);
      if (profile?.phone && !phone) setPhone(profile.phone);

      const supabase = createClient();
      supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSavedAddresses(data as Address[]);
            const def = data[0] as Address;
            setFullName(def.full_name);
            setPhone(def.phone);
            setDistrict(def.district);
            setUpazila(def.upazila);
            setStreetAddress(def.street_address);
          }
        });
    }
  }, [user, profile]);

  // Check initial coupon if passed from cart
  useEffect(() => {
    if (initialCoupon && subtotal > 0 && cart.length > 0) {
      const itemsPayload = cart.map(i => ({
        product_id: i.product_id,
        price: i.variant ? (i.product.sale_price ?? i.product.base_price) + i.variant.price_modifier : (i.product.sale_price ?? i.product.base_price),
        quantity: i.quantity,
      }));

      fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: initialCoupon, total: subtotal, items: itemsPayload }),
      })
        .then(r => r.json())
        .then(res => {
          if (res.valid) {
            setDiscountAmount(res.discount);
          }
        });
    }
  }, [initialCoupon, subtotal, cart]);

  const shippingFee = subtotal >= STORE_CONFIG.shipping.freeAbove ? 0 : getShippingFee(district);
  const grandTotal = Math.max(0, subtotal + shippingFee - discountAmount);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      showToast('Your cart is empty', 'error');
      router.push('/');
      return;
    }

    if (!fullName.trim() || !phone.trim() || !district || !streetAddress.trim()) {
      showToast('Please fill in all mandatory delivery address fields', 'error');
      return;
    }

    if ((paymentMethod === 'bkash' || paymentMethod === 'nagad') && !transactionId.trim()) {
      showToast(`Please enter the ${paymentMethod.toUpperCase()} Transaction ID (TrxID)`, 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const orderPayload = {
        cart,
        address: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          district,
          upazila: upazila.trim() || district,
          street_address: streetAddress.trim(),
        },
        paymentMethod,
        paymentTransactionId: transactionId.trim() || undefined,
        couponCode: couponCode.trim() || undefined,
      };

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Order placement failed');
      }

      showToast('Order placed successfully!', 'success');
      clear(); // Empty the cart
      router.push(`/orders/${data.order_id || data.order_number}`);
    } catch (err: any) {
      showToast(err.message || 'Something went wrong placing your order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '24px 16px 120px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '16px' }}>Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="checkout-layout">
        {/* Left Column: Address & Payment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Shipping Address Section */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Truck size={20} color="var(--color-primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>1. Delivery Address</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="full-name-field">Full Name *</label>
                    <input
                      id="full-name-field"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Shakib Al Hasan"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="phone-field">Mobile Phone Number *</label>
                    <input
                      id="phone-field"
                      type="tel"
                      className="form-input"
                      placeholder="017XXXXXXXX"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="district-select">District / জেলা *</label>
                    <select
                      id="district-select"
                      className="form-input"
                      value={district}
                      onChange={e => setDistrict(e.target.value)}
                      required
                    >
                      {DISTRICTS.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="upazila-field">Thana / Upazila / এরিয়া</label>
                    <input
                      id="upazila-field"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Dhanmondi / Mirpur"
                      value={upazila}
                      onChange={e => setUpazila(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="street-address-field">Street Address / বাসা ও রাস্তার ঠিকানা *</label>
                  <textarea
                    id="street-address-field"
                    className="form-input"
                    rows={2}
                    placeholder="House No, Road No, Area, Landmark"
                    value={streetAddress}
                    onChange={e => setStreetAddress(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method Section */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CreditCard size={20} color="var(--color-primary)" />
                <h2 style={{ fontSize: '18px', fontWeight: 700 }}>2. Payment Method</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Cash on Delivery */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    border: `2px solid ${paymentMethod === 'cod' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    background: paymentMethod === 'cod' ? 'var(--color-primary-10)' : '#ffffff',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>Cash on Delivery (ক্যাশ অন ডেলিভারি)</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Pay when you receive the product at your door</div>
                  </div>
                </label>

                {/* bKash */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    border: `2px solid ${paymentMethod === 'bkash' ? '#e2136e' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    background: paymentMethod === 'bkash' ? 'rgba(226, 19, 110, 0.05)' : '#ffffff',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="bkash"
                    checked={paymentMethod === 'bkash'}
                    onChange={() => setPaymentMethod('bkash')}
                    style={{ marginTop: '3px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#e2136e' }}>bKash Personal / বিকাশ সেন্ড মানি</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Send <strong>{formatCurrency(grandTotal)}</strong> to <strong>{STORE_CONFIG.payment.bkash.number}</strong> (Personal)
                    </div>

                    {paymentMethod === 'bkash' && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="form-label" style={{ fontSize: '12px' }} htmlFor="bkash-trx-id">
                          Enter bKash TrxID (ট্রানজেকশন আইডি) *
                        </label>
                        <input
                          id="bkash-trx-id"
                          type="text"
                          className="form-input"
                          placeholder="e.g. 9J87AKL12"
                          value={transactionId}
                          onChange={e => setTransactionId(e.target.value)}
                          style={{ textTransform: 'uppercase' }}
                          required
                        />
                      </div>
                    )}
                  </div>
                </label>

                {/* Nagad */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    border: `2px solid ${paymentMethod === 'nagad' ? '#f7941d' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    background: paymentMethod === 'nagad' ? 'rgba(247, 148, 29, 0.05)' : '#ffffff',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="nagad"
                    checked={paymentMethod === 'nagad'}
                    onChange={() => setPaymentMethod('nagad')}
                    style={{ marginTop: '3px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#f7941d' }}>Nagad Personal / নগদ সেন্ড মানি</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      Send <strong>{formatCurrency(grandTotal)}</strong> to <strong>{STORE_CONFIG.payment.nagad.number}</strong> (Personal)
                    </div>

                    {paymentMethod === 'nagad' && (
                      <div style={{ marginTop: '12px' }}>
                        <label className="form-label" style={{ fontSize: '12px' }} htmlFor="nagad-trx-id">
                          Enter Nagad TrxID (ট্রানজেকশন আইডি) *
                        </label>
                        <input
                          id="nagad-trx-id"
                          type="text"
                          className="form-input"
                          placeholder="e.g. 7X32LM89"
                          value={transactionId}
                          onChange={e => setTransactionId(e.target.value)}
                          style={{ textTransform: 'uppercase' }}
                          required
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary Review & Final CTA */}
          <div className="checkout-summary-sticky">
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Order Summary</h2>

              {/* Items preview list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '240px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                {cart.map(item => {
                  const unitPrice = item.variant
                    ? (item.product.sale_price ?? item.product.base_price) + item.variant.price_modifier
                    : item.product.sale_price ?? item.product.base_price;
                  return (
                    <div key={`${item.product_id}_${item.variant_id || 'base'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <div style={{ flex: 1, paddingRight: '12px' }}>
                        <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name_en}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Qty: {item.quantity} {item.variant ? `• ${[item.variant.size, item.variant.color].filter(Boolean).join(' / ')}` : ''}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{formatCurrency(unitPrice * item.quantity)}</div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginBottom: '20px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatCurrency(subtotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Delivery ({district})</span>
                  <span>{shippingFee === 0 ? <strong style={{ color: 'var(--color-success)' }}>FREE</strong> : formatCurrency(shippingFee)}</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                    <span>Coupon Discount</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>

              {/* Grand Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginBottom: '24px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Grand Total</span>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', borderRadius: 'var(--radius-xl)', fontSize: '15px' }}
                id="place-order-submit-btn"
              >
                <span>{isSubmitting ? 'Placing Order...' : 'Place Order / অর্ডার কনফার্ম করুন'}</span>
                <ArrowRight size={18} />
              </button>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                <ShieldCheck size={16} color="var(--color-success)" />
                <span>SSL / End-to-End Secure Transaction</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>Loading checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
