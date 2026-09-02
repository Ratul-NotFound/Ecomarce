'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/shared/ToastProvider';
import { STORE_CONFIG } from '@/lib/store-config';
import { Sliders, Palette, Phone, ShieldCheck, Send, CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { DEFAULT_PAYMENT_SETTINGS, getMergedPaymentSettings, PaymentSettings, PaymentMethodConfig } from '@/lib/utils/payment-config';

export default function AdminSettingsPage() {
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState<string>(STORE_CONFIG.name);
  const [tagline, setTagline] = useState<string>(STORE_CONFIG.tagline);
  const [email, setEmail] = useState<string>(STORE_CONFIG.contact.email);
  const [phone, setPhone] = useState<string>(STORE_CONFIG.contact.phone);
  const [insideDhakaFee, setInsideDhakaFee] = useState<number | string>(STORE_CONFIG.shipping.insideDhaka);
  const [outsideDhakaFee, setOutsideDhakaFee] = useState<number | string>(STORE_CONFIG.shipping.outsideDhaka);
  const [freeAbove, setFreeAbove] = useState<number | string>(STORE_CONFIG.shipping.freeAbove);

  // Payment Customization Settings (Hide / Unhide & Numbers)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);

  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [ordersTopicId, setOrdersTopicId] = useState('');
  const [messagesTopicId, setMessagesTopicId] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(res => {
        if (res.settings) {
          const s = res.settings;
          if (s.store_name) setStoreName(s.store_name);
          if (s.store_tagline) setTagline(s.store_tagline);
          if (s.contact_email) setEmail(s.contact_email);
          if (s.contact_phone) setPhone(s.contact_phone);
          if (s.shipping_inside_dhaka) setInsideDhakaFee(s.shipping_inside_dhaka);
          if (s.shipping_outside_dhaka) setOutsideDhakaFee(s.shipping_outside_dhaka);
          if (s.free_shipping_above) setFreeAbove(s.free_shipping_above);

          if (s.payment_methods) {
            setPaymentSettings(getMergedPaymentSettings(s.payment_methods));
          } else {
            // Check legacy keys
            const merged = getMergedPaymentSettings();
            if (s.bkash_number) merged.bkash.number = s.bkash_number;
            if (s.nagad_number) merged.nagad.number = s.nagad_number;
            setPaymentSettings(merged);
          }

          if (s.telegram_bot_token) setTelegramToken(s.telegram_bot_token);
          if (s.telegram_chat_id) setTelegramChatId(s.telegram_chat_id);
          if (s.telegram_orders_topic_id) setOrdersTopicId(s.telegram_orders_topic_id);
          if (s.telegram_messages_topic_id) setMessagesTopicId(s.telegram_messages_topic_id);
          if (s.primary_color) setPrimaryColor(s.primary_color);
        }
      });
  }, []);

  const handleUpdatePaymentMethod = (key: keyof PaymentSettings, updates: Partial<PaymentMethodConfig>) => {
    setPaymentSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...updates,
      },
    }));
  };

  const handleTogglePaymentMethod = (key: keyof PaymentSettings) => {
    const nextState = !paymentSettings[key].enabled;
    handleUpdatePaymentMethod(key, { enabled: nextState });
    showToast(
      `${paymentSettings[key].title_en} is now ${nextState ? 'VISIBLE at checkout' : 'HIDDEN from checkout'}`,
      'info'
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const payload = {
        store_name: storeName,
        store_tagline: tagline,
        contact_email: email,
        contact_phone: phone,
        shipping_inside_dhaka: Number(insideDhakaFee),
        shipping_outside_dhaka: Number(outsideDhakaFee),
        free_shipping_above: Number(freeAbove),
        payment_methods: paymentSettings,
        // Legacy fallback support
        bkash_number: paymentSettings.bkash.number,
        nagad_number: paymentSettings.nagad.number,
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
        telegram_orders_topic_id: ordersTopicId,
        telegram_messages_topic_id: messagesTopicId,
        primary_color: primaryColor,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Apply dynamic CSS custom property live
      document.documentElement.style.setProperty('--color-primary', primaryColor);

      showToast('Store settings & payment methods saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Global Store Settings & Payment Methods</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Customize payment methods (Hide / Unhide with 1 click), delivery rates, and brand identities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="btn btn-primary"
          id="admin-settings-save-btn"
        >
          {isSaving ? 'Saving Changes...' : 'Save All Settings'}
        </button>
      </div>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ────────────────────────────────────────────────────────────
           PAYMENT METHODS CUSTOMIZATION (HIDE / UNHIDE)
           ──────────────────────────────────────────────────────────── */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="var(--color-primary)" />
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Payment Method Customization (Hide / Unhide)
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                  Enable or disable payment options. Hidden options will immediately disappear from the checkout page.
                </p>
              </div>
            </div>

            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {Object.values(paymentSettings).filter(m => m.enabled).length} Active Gateways
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* 1. Cash on Delivery (COD) */}
            <div
              style={{
                border: paymentSettings.cod.enabled ? '2px solid var(--color-primary)' : '1px dashed var(--color-admin-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: paymentSettings.cod.enabled ? '#ffffff' : 'var(--color-admin-surface-2)',
                opacity: paymentSettings.cod.enabled ? 1 : 0.65,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: paymentSettings.cod.enabled ? 'var(--color-success)' : 'var(--color-admin-muted)' }} />
                  <strong style={{ fontSize: '15px', color: 'var(--color-admin-text)' }}>Cash on Delivery (COD)</strong>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('cod')}
                  className={`btn btn-sm ${paymentSettings.cod.enabled ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {paymentSettings.cod.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{paymentSettings.cod.enabled ? 'Visible (Active)' : 'Hidden (Disabled)'}</span>
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="admin-label">Title (English / Bengali)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={paymentSettings.cod.title_en}
                  onChange={e => handleUpdatePaymentMethod('cod', { title_en: e.target.value })}
                  placeholder="Cash on Delivery"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Checkout Description</label>
                <input
                  type="text"
                  className="admin-input"
                  value={paymentSettings.cod.description_en}
                  onChange={e => handleUpdatePaymentMethod('cod', { description_en: e.target.value })}
                  placeholder="Pay in cash upon doorstep delivery"
                />
              </div>
            </div>

            {/* 2. bKash */}
            <div
              style={{
                border: paymentSettings.bkash.enabled ? '2px solid #e2136e' : '1px dashed var(--color-admin-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: paymentSettings.bkash.enabled ? '#ffffff' : 'var(--color-admin-surface-2)',
                opacity: paymentSettings.bkash.enabled ? 1 : 0.65,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: paymentSettings.bkash.enabled ? '#e2136e' : 'var(--color-admin-muted)' }} />
                  <strong style={{ fontSize: '15px', color: '#e2136e' }}>bKash Send Money</strong>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('bkash')}
                  className={`btn btn-sm ${paymentSettings.bkash.enabled ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    background: paymentSettings.bkash.enabled ? '#e2136e' : undefined,
                    borderColor: paymentSettings.bkash.enabled ? '#e2136e' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {paymentSettings.bkash.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{paymentSettings.bkash.enabled ? 'Visible (Active)' : 'Hidden (Disabled)'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div className="form-group">
                  <label className="admin-label">bKash Account Number *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={paymentSettings.bkash.number}
                    onChange={e => handleUpdatePaymentMethod('bkash', { number: e.target.value })}
                    placeholder="017XXXXXXXX"
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label">Account Type</label>
                  <select
                    className="admin-input"
                    value={paymentSettings.bkash.account_type || 'Personal'}
                    onChange={e => handleUpdatePaymentMethod('bkash', { account_type: e.target.value as any })}
                  >
                    <option value="Personal">Personal</option>
                    <option value="Merchant">Merchant</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="admin-label">Checkout Instructions</label>
                <input
                  type="text"
                  className="admin-input"
                  value={paymentSettings.bkash.description_en}
                  onChange={e => handleUpdatePaymentMethod('bkash', { description_en: e.target.value })}
                  placeholder="Send money and submit TrxID"
                />
              </div>
            </div>

            {/* 3. Nagad */}
            <div
              style={{
                border: paymentSettings.nagad.enabled ? '2px solid #f97316' : '1px dashed var(--color-admin-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: paymentSettings.nagad.enabled ? '#ffffff' : 'var(--color-admin-surface-2)',
                opacity: paymentSettings.nagad.enabled ? 1 : 0.65,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: paymentSettings.nagad.enabled ? '#f97316' : 'var(--color-admin-muted)' }} />
                  <strong style={{ fontSize: '15px', color: '#ea580c' }}>Nagad Send Money</strong>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('nagad')}
                  className={`btn btn-sm ${paymentSettings.nagad.enabled ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    background: paymentSettings.nagad.enabled ? '#ea580c' : undefined,
                    borderColor: paymentSettings.nagad.enabled ? '#ea580c' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {paymentSettings.nagad.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{paymentSettings.nagad.enabled ? 'Visible (Active)' : 'Hidden (Disabled)'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div className="form-group">
                  <label className="admin-label">Nagad Account Number *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={paymentSettings.nagad.number}
                    onChange={e => handleUpdatePaymentMethod('nagad', { number: e.target.value })}
                    placeholder="018XXXXXXXX"
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label">Account Type</label>
                  <select
                    className="admin-input"
                    value={paymentSettings.nagad.account_type || 'Personal'}
                    onChange={e => handleUpdatePaymentMethod('nagad', { account_type: e.target.value as any })}
                  >
                    <option value="Personal">Personal</option>
                    <option value="Merchant">Merchant</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="admin-label">Checkout Instructions</label>
                <input
                  type="text"
                  className="admin-input"
                  value={paymentSettings.nagad.description_en}
                  onChange={e => handleUpdatePaymentMethod('nagad', { description_en: e.target.value })}
                  placeholder="Send money and submit TrxID"
                />
              </div>
            </div>

            {/* 4. Rocket / DBBL */}
            <div
              style={{
                border: paymentSettings.rocket.enabled ? '2px solid #8b5cf6' : '1px dashed var(--color-admin-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                background: paymentSettings.rocket.enabled ? '#ffffff' : 'var(--color-admin-surface-2)',
                opacity: paymentSettings.rocket.enabled ? 1 : 0.65,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: paymentSettings.rocket.enabled ? '#8b5cf6' : 'var(--color-admin-muted)' }} />
                  <strong style={{ fontSize: '15px', color: '#8b5cf6' }}>Rocket (DBBL)</strong>
                </div>

                <button
                  type="button"
                  onClick={() => handleTogglePaymentMethod('rocket')}
                  className={`btn btn-sm ${paymentSettings.rocket.enabled ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    background: paymentSettings.rocket.enabled ? '#8b5cf6' : undefined,
                    borderColor: paymentSettings.rocket.enabled ? '#8b5cf6' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {paymentSettings.rocket.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{paymentSettings.rocket.enabled ? 'Visible (Active)' : 'Hidden (Disabled)'}</span>
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: '10px' }}>
                <label className="admin-label">Rocket 12-digit Number</label>
                <input
                  type="text"
                  className="admin-input"
                  value={paymentSettings.rocket.number}
                  onChange={e => handleUpdatePaymentMethod('rocket', { number: e.target.value })}
                  placeholder="019XXXXXXXX9"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Checkout Instructions</label>
                <input
                  type="text"
                  className="admin-input"
                  value={paymentSettings.rocket.description_en}
                  onChange={e => handleUpdatePaymentMethod('rocket', { description_en: e.target.value })}
                  placeholder="Send DBBL Rocket payment"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
           GENERAL STORE IDENTITY & DELIVERY CHARGES
           ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Identity & Theme */}
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Palette size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Store Identity & Color Theme</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="admin-label">Store Brand Name</label>
                <input
                  type="text"
                  className="admin-input"
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Tagline (Slogan)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Brand Primary Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
                  />
                  <input
                    type="text"
                    className="admin-input"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Charges & Contact */}
          <div className="admin-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Phone size={18} color="var(--color-primary)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Delivery Charges & Support</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label">Inside Dhaka Fee (৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={insideDhakaFee}
                    onChange={e => setInsideDhakaFee(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label">Outside Dhaka Fee (৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={outsideDhakaFee}
                    onChange={e => setOutsideDhakaFee(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="admin-label">Free Shipping Above (৳)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={freeAbove}
                  onChange={e => setFreeAbove(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label">Customer Support Phone</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label">Support Email</label>
                  <input
                    type="email"
                    className="admin-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Automation */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Send size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Telegram Order Notifications</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            <div className="form-group">
              <label className="admin-label">Bot Token (@BotFather)</label>
              <input
                type="text"
                className="admin-input"
                placeholder="123456789:ABCdef..."
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Target Chat / Channel ID</label>
              <input
                type="text"
                className="admin-input"
                placeholder="-100123456789"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Orders Topic Thread ID</label>
              <input
                type="text"
                className="admin-input"
                placeholder="Optional"
                value={ordersTopicId}
                onChange={e => setOrdersTopicId(e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
