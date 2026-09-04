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
import { CheckCircle2, ShieldCheck, Truck, CreditCard, ArrowRight, Copy, Check, Smartphone, Banknote, Hash, Phone, Sparkles } from 'lucide-react';
import type { Address, PaymentMethod } from '@/types';
import { DEFAULT_PAYMENT_SETTINGS, getMergedPaymentSettings, PaymentSettings } from '@/lib/utils/payment-config';
import { NagadLogo, BkashLogo } from '@/components/shared/PaymentLogos';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get('coupon') || '';
  const { cart, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [shippingInsideDhaka, setShippingInsideDhaka] = useState<number>(STORE_CONFIG.shipping.insideDhaka);
  const [shippingOutsideDhaka, setShippingOutsideDhaka] = useState<number>(STORE_CONFIG.shipping.outsideDhaka);
  const [freeShippingAbove, setFreeShippingAbove] = useState<number>(STORE_CONFIG.shipping.freeAbove);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [transactionId, setTransactionId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const handleCopyNumber = (num: string, providerName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      showToast(`Copied ${providerName} number (${num}) to clipboard!`, 'success');
      setTimeout(() => setCopiedNumber(null), 2500);
    }
  };

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

  // Load dynamic store settings (delivery rates, free shipping threshold & payment methods)
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(res => {
        if (res.settings) {
          if (res.settings.shipping_inside_dhaka !== undefined) {
            setShippingInsideDhaka(Number(res.settings.shipping_inside_dhaka));
          }
          if (res.settings.shipping_outside_dhaka !== undefined) {
            setShippingOutsideDhaka(Number(res.settings.shipping_outside_dhaka));
          }
          if (res.settings.free_shipping_above !== undefined) {
            setFreeShippingAbove(Number(res.settings.free_shipping_above));
          }
          if (res.settings.payment_methods) {
            const merged = getMergedPaymentSettings(res.settings.payment_methods);
            setPaymentSettings(merged);
            // If current selected payment method is disabled/hidden, switch to first active method
            if (!merged[paymentMethod]?.enabled) {
              const firstActive = (['cod', 'bkash', 'nagad'] as const).find(k => merged[k]?.enabled);
              if (firstActive) setPaymentMethod(firstActive);
            }
          }
        }
      })
      .catch(() => {});
  }, [paymentMethod]);

  // Check initial coupon or claimed coupon from deals page
  useEffect(() => {
    let effectiveCoupon = initialCoupon;
    if (!effectiveCoupon && typeof window !== 'undefined') {
      const saved = localStorage.getItem('shopbd_claimed_coupon');
      if (saved) {
        effectiveCoupon = saved;
        setCouponCode(saved);
      }
    }

    if (effectiveCoupon && subtotal > 0 && cart.length > 0) {
      const itemsPayload = cart.map(i => ({
        product_id: i.product_id,
        price: i.variant ? (i.product.sale_price ?? i.product.base_price) + i.variant.price_modifier : (i.product.sale_price ?? i.product.base_price),
        quantity: i.quantity,
      }));

      fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: effectiveCoupon, total: subtotal, items: itemsPayload }),
      })
        .then(r => r.json())
        .then(res => {
          if (res.valid) {
            setDiscountAmount(res.discount);
          }
        });
    }
  }, [initialCoupon, subtotal, cart]);

  const isFreeShipping = subtotal >= freeShippingAbove;
  const shippingFee = isFreeShipping ? 0 : getShippingFee(district, shippingInsideDhaka, shippingOutsideDhaka);
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

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      showToast('Please enter a valid 11-digit Bangladesh mobile number (e.g. 01700000000)', 'error');
      return;
    }

    if (paymentMethod !== 'cod') {
      const cleanSender = senderPhone.replace(/[^0-9]/g, '');
      if (cleanSender.length !== 11 || !cleanSender.startsWith('01')) {
        showToast('Please enter the 11-digit mobile number from which you sent the money (e.g. 017XXXXXXXX)', 'error');
        return;
      }
      if (!transactionId.trim()) {
        showToast(`Please enter the ${paymentMethod.toUpperCase()} Transaction ID (TrxID)`, 'error');
        return;
      }
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
          sender_phone: paymentMethod !== 'cod' ? senderPhone.trim() : undefined,
        },
        paymentMethod,
        paymentSenderPhone: paymentMethod !== 'cod' ? senderPhone.trim() : undefined,
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
      try {
        localStorage.removeItem('shopbd_claimed_coupon');
      } catch {}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={20} color="var(--color-primary)" />
                  <h2 style={{ fontSize: '18px', fontWeight: 700 }}>2. Payment Method / পেমেন্ট পদ্ধতি</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-success)', fontWeight: 600 }}>
                  <ShieldCheck size={16} />
                  <span>100% Secure & Verified</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Cash on Delivery */}
                {paymentSettings.cod.enabled && (
                  <div
                    onClick={() => setPaymentMethod('cod')}
                    style={{
                      border: `2px solid ${paymentMethod === 'cod' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '16px',
                      cursor: 'pointer',
                      background: paymentMethod === 'cod' ? 'rgba(37, 99, 235, 0.04)' : '#ffffff',
                      transition: 'all 0.2s ease',
                      boxShadow: paymentMethod === 'cod' ? '0 4px 12px rgba(37, 99, 235, 0.08)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                      />
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Banknote size={22} color="var(--color-primary)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '15px' }}>
                            {paymentSettings.cod.title_en}
                          </span>
                          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            ({paymentSettings.cod.title_bn || 'ক্যাশ অন ডেলিভারি'})
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--color-primary)' }}>
                            POPULAR
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {paymentSettings.cod.description_en}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* bKash */}
                {paymentSettings.bkash.enabled && (() => {
                  const bkashNumber = paymentSettings.bkash.number || STORE_CONFIG.payment.bkash.number || '01700000000';
                  const isSelected = paymentMethod === 'bkash';
                  return (
                    <div
                      onClick={() => setPaymentMethod('bkash')}
                      style={{
                        border: `2px solid ${isSelected ? '#e2136e' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(226, 19, 110, 0.03)' : '#ffffff',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 14px rgba(226, 19, 110, 0.12)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="radio"
                          name="payment_method"
                          value="bkash"
                          checked={isSelected}
                          onChange={() => setPaymentMethod('bkash')}
                          style={{ width: '18px', height: '18px', accentColor: '#e2136e', cursor: 'pointer' }}
                        />
                        <BkashLogo size={42} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px', color: '#e2136e' }}>
                              bKash Send Money
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                              (বিকাশ)
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(226, 19, 110, 0.12)', color: '#e2136e' }}>
                              {paymentSettings.bkash.account_type || 'Personal'}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(34, 197, 94, 0.12)', color: 'var(--color-success)' }}>
                              INSTANT
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Send <strong>{formatCurrency(grandTotal)}</strong> to our bKash number & submit details below.
                          </div>
                        </div>
                      </div>

                      {/* Expanded verification inputs */}
                      {isSelected && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            marginTop: '16px',
                            padding: '16px',
                            background: '#ffffff',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(226, 19, 110, 0.2)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                          }}
                        >
                          {/* Recipient Number Box with 1-click Copy */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: 'rgba(226, 19, 110, 0.06)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#e2136e', letterSpacing: '0.5px' }}>
                                OUR BKASH ACCOUNT NUMBER ({paymentSettings.bkash.account_type || 'Personal'})
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827', letterSpacing: '1px', marginTop: '2px', fontFamily: 'monospace' }}>
                                {bkashNumber}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                Exact Payable: <strong style={{ color: '#e2136e' }}>{formatCurrency(grandTotal)}</strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyNumber(bkashNumber, 'bKash')}
                              className="btn btn-sm"
                              style={{
                                background: copiedNumber === bkashNumber ? 'var(--color-success)' : '#e2136e',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-full)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'background 0.2s ease',
                              }}
                            >
                              {copiedNumber === bkashNumber ? (
                                <>
                                  <Check size={14} />
                                  <span>Copied! ✓</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  <span>Copy Number</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Instructions bullet */}
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px', lineHeight: 1.5, background: 'var(--color-surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>ধাপসমূহ / Steps to pay:</div>
                            <div>১. আপনার bKash অ্যাপ থেকে উপরের নম্বরে <strong>Send Money</strong> করুন।</div>
                            <div>২. আপনি যে নম্বর থেকে টাকা পাঠিয়েছেন এবং TrxID নিচের ঘরে বসান।</div>
                          </div>

                          {/* Dual inputs: Sender Phone Number + Transaction ID */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }} htmlFor="bkash-sender-phone">
                                <Phone size={13} color="#e2136e" />
                                <span>Sender Phone Number (টাকা পাঠানোর নম্বর) *</span>
                              </label>
                              <input
                                id="bkash-sender-phone"
                                type="tel"
                                className="form-input"
                                placeholder="01XXXXXXXXX"
                                maxLength={11}
                                value={senderPhone}
                                onChange={e => setSenderPhone(e.target.value)}
                                style={{ borderColor: isSelected && !senderPhone ? '#fda4af' : undefined }}
                                required
                              />
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                যে বিকাশ নম্বর থেকে টাকা পাঠিয়েছেন
                              </span>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }} htmlFor="bkash-trx-id">
                                <Hash size={13} color="#e2136e" />
                                <span>bKash TrxID (ট্রানজেকশন আইডি) *</span>
                              </label>
                              <input
                                id="bkash-trx-id"
                                type="text"
                                className="form-input"
                                placeholder="e.g. 9J87AKL12"
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value.toUpperCase())}
                                style={{ textTransform: 'uppercase', borderColor: isSelected && !transactionId ? '#fda4af' : undefined }}
                                required
                              />
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                এসএমএস-এ আসা TrxID কোড
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Nagad */}
                {paymentSettings.nagad.enabled && (() => {
                  const nagadNumber = paymentSettings.nagad.number || STORE_CONFIG.payment.nagad.number || '01800000000';
                  const isSelected = paymentMethod === 'nagad';
                  return (
                    <div
                      onClick={() => setPaymentMethod('nagad')}
                      style={{
                        border: `2px solid ${isSelected ? '#f97316' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(249, 115, 22, 0.03)' : '#ffffff',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 14px rgba(249, 115, 22, 0.12)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="radio"
                          name="payment_method"
                          value="nagad"
                          checked={isSelected}
                          onChange={() => setPaymentMethod('nagad')}
                          style={{ width: '18px', height: '18px', accentColor: '#f97316', cursor: 'pointer' }}
                        />
                        <NagadLogo size={42} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px', color: '#f97316' }}>
                              Nagad Send Money
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                              (নগদ)
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(249, 115, 22, 0.12)', color: '#f97316' }}>
                              {paymentSettings.nagad.account_type || 'Personal'}
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(34, 197, 94, 0.12)', color: 'var(--color-success)' }}>
                              INSTANT
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Send <strong>{formatCurrency(grandTotal)}</strong> to our Nagad number & submit details below.
                          </div>
                        </div>
                      </div>

                      {/* Expanded verification inputs */}
                      {isSelected && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            marginTop: '16px',
                            padding: '16px',
                            background: '#ffffff',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(249, 115, 22, 0.25)',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                          }}
                        >
                          {/* Recipient Number Box with 1-click Copy */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: 'rgba(249, 115, 22, 0.06)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#f97316', letterSpacing: '0.5px' }}>
                                OUR NAGAD ACCOUNT NUMBER ({paymentSettings.nagad.account_type || 'Personal'})
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: 900, color: '#111827', letterSpacing: '1px', marginTop: '2px', fontFamily: 'monospace' }}>
                                {nagadNumber}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                Exact Payable: <strong style={{ color: '#f97316' }}>{formatCurrency(grandTotal)}</strong>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopyNumber(nagadNumber, 'Nagad')}
                              className="btn btn-sm"
                              style={{
                                background: copiedNumber === nagadNumber ? 'var(--color-success)' : '#f97316',
                                color: '#ffffff',
                                border: 'none',
                                padding: '8px 14px',
                                borderRadius: 'var(--radius-full)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'background 0.2s ease',
                              }}
                            >
                              {copiedNumber === nagadNumber ? (
                                <>
                                  <Check size={14} />
                                  <span>Copied! ✓</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  <span>Copy Number</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Instructions bullet */}
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px', lineHeight: 1.5, background: 'var(--color-surface-2)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>ধাপসমূহ / Steps to pay:</div>
                            <div>১. আপনার নগদ অ্যাপ থেকে উপরের নম্বরে <strong>Send Money</strong> করুন।</div>
                            <div>২. আপনি যে নম্বর থেকে টাকা পাঠিয়েছেন এবং TrxID নিচের ঘরে বসান।</div>
                          </div>

                          {/* Dual inputs: Sender Phone Number + Transaction ID */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }} htmlFor="nagad-sender-phone">
                                <Phone size={13} color="#f97316" />
                                <span>Sender Phone Number (টাকা পাঠানোর নম্বর) *</span>
                              </label>
                              <input
                                id="nagad-sender-phone"
                                type="tel"
                                className="form-input"
                                placeholder="01XXXXXXXXX"
                                maxLength={11}
                                value={senderPhone}
                                onChange={e => setSenderPhone(e.target.value)}
                                style={{ borderColor: isSelected && !senderPhone ? '#fed7aa' : undefined }}
                                required
                              />
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                যে নগদ নম্বর থেকে টাকা পাঠিয়েছেন
                              </span>
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }} htmlFor="nagad-trx-id">
                                <Hash size={13} color="#f97316" />
                                <span>Nagad TrxID (ট্রানজেকশন আইডি) *</span>
                              </label>
                              <input
                                id="nagad-trx-id"
                                type="text"
                                className="form-input"
                                placeholder="e.g. 7X32LM89"
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value.toUpperCase())}
                                style={{ textTransform: 'uppercase', borderColor: isSelected && !transactionId ? '#fed7aa' : undefined }}
                                required
                              />
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                এসএমএস-এ আসা TrxID কোড
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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

                {!isFreeShipping && (
                  <div style={{ fontSize: '11px', color: 'var(--color-primary)', background: 'rgba(37, 99, 235, 0.08)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 600 }}>
                    ⚡ Add {formatCurrency(freeShippingAbove - subtotal)} more for FREE Delivery!
                  </div>
                )}

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
