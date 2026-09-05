'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/shared/ToastProvider';
import { STORE_CONFIG } from '@/lib/store-config';
import { Sliders, Palette, Phone, ShieldCheck, Send, CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle, Zap, Share2, Globe } from 'lucide-react';
import { DEFAULT_PAYMENT_SETTINGS, getMergedPaymentSettings, PaymentSettings, PaymentMethodConfig } from '@/lib/utils/payment-config';

export default function AdminSettingsPage() {
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState<string>(STORE_CONFIG.name);
  const [tagline, setTagline] = useState<string>(STORE_CONFIG.tagline);
  const [email, setEmail] = useState<string>(STORE_CONFIG.contact.email);
  const [phone, setPhone] = useState<string>(STORE_CONFIG.contact.phone);
  const [address, setAddress] = useState<string>(STORE_CONFIG.contact.address);
  const [insideDhakaFee, setInsideDhakaFee] = useState<number | string>(STORE_CONFIG.shipping.insideDhaka);
  const [outsideDhakaFee, setOutsideDhakaFee] = useState<number | string>(STORE_CONFIG.shipping.outsideDhaka);
  const [freeAbove, setFreeAbove] = useState<number | string>(STORE_CONFIG.shipping.freeAbove);

  // Social Media Links (Admin Controllable)
  const [socialFacebook, setSocialFacebook] = useState<string>(STORE_CONFIG.social.facebook || '');
  const [socialInstagram, setSocialInstagram] = useState<string>(STORE_CONFIG.social.instagram || '');
  const [socialYoutube, setSocialYoutube] = useState<string>(STORE_CONFIG.social.youtube || '');
  const [socialTiktok, setSocialTiktok] = useState<string>('');
  const [socialWhatsapp, setSocialWhatsapp] = useState<string>(STORE_CONFIG.contact.whatsapp ? `https://wa.me/${STORE_CONFIG.contact.whatsapp.replace(/[^0-9]/g, '')}` : '');
  const [socialTelegram, setSocialTelegram] = useState<string>(STORE_CONFIG.social.telegram || '');
  const [socialTwitter, setSocialTwitter] = useState<string>('');
  const [socialLinkedin, setSocialLinkedin] = useState<string>('');

  // Flash Sale Synchronization State
  const [flashSaleEnabled, setFlashSaleEnabled] = useState(true);
  const [flashSaleTitle, setFlashSaleTitle] = useState('⚡ Flash Deals & Steals');
  const [flashSaleEndTime, setFlashSaleEndTime] = useState<string | null>(null);
  const [dealsTimerHours, setDealsTimerHours] = useState<number>(6);

  // Payment Customization Settings (Hide / Unhide & Numbers)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);

  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [ordersTopicId, setOrdersTopicId] = useState('');
  const [messagesTopicId, setMessagesTopicId] = useState('');
  
  // Brand & Theme Styling Customization
  const [logoUrl, setLogoUrl] = useState<string>(STORE_CONFIG.logo || '');
  const [faviconUrl, setFaviconUrl] = useState<string>(STORE_CONFIG.favicon || '');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [secondaryColor, setSecondaryColor] = useState('#1d4ed8');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [colorBg, setColorBg] = useState('#f8f7f4');
  const [colorText, setColorText] = useState('#1a1a1a');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(res => {
        if (res.settings) {
          const s = res.settings;
          if (s.store_name) setStoreName(s.store_name);
          if (s.store_tagline) setTagline(s.store_tagline);
          if (s.store_logo_url !== undefined) setLogoUrl(s.store_logo_url);
          if (s.store_favicon_url !== undefined) setFaviconUrl(s.store_favicon_url);
          if (s.contact_email) setEmail(s.contact_email);
          if (s.contact_phone) setPhone(s.contact_phone);
          if (s.contact_address) setAddress(s.contact_address);
          if (s.shipping_inside_dhaka) setInsideDhakaFee(s.shipping_inside_dhaka);
          if (s.shipping_outside_dhaka) setOutsideDhakaFee(s.shipping_outside_dhaka);
          if (s.free_shipping_above) setFreeAbove(s.free_shipping_above);

          // Hydrate Social Media Links
          if (s.social_facebook !== undefined) setSocialFacebook(s.social_facebook);
          if (s.social_instagram !== undefined) setSocialInstagram(s.social_instagram);
          if (s.social_youtube !== undefined) setSocialYoutube(s.social_youtube);
          if (s.social_tiktok !== undefined) setSocialTiktok(s.social_tiktok);
          if (s.social_whatsapp !== undefined) setSocialWhatsapp(s.social_whatsapp);
          if (s.social_telegram !== undefined) setSocialTelegram(s.social_telegram);
          if (s.social_twitter !== undefined) setSocialTwitter(s.social_twitter);
          if (s.social_linkedin !== undefined) setSocialLinkedin(s.social_linkedin);

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
          if (s.secondary_color) setSecondaryColor(s.secondary_color);
          if (s.accent_color) setAccentColor(s.accent_color);
          if (s.color_bg) setColorBg(s.color_bg);
          if (s.color_text) setColorText(s.color_text);

          if (s.homepage_flash_sale_enabled !== undefined) {
            setFlashSaleEnabled(String(s.homepage_flash_sale_enabled) === 'true' || s.homepage_flash_sale_enabled === true);
          }
          if (s.homepage_flash_sale_title) setFlashSaleTitle(s.homepage_flash_sale_title);
          const flashTarget = s.flash_sale_end_time || s.homepage_flash_sale_end;
          if (flashTarget) setFlashSaleEndTime(flashTarget);
          if (s.deals_timer_hours) setDealsTimerHours(Number(s.deals_timer_hours) || 6);
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
        store_logo_url: logoUrl,
        store_favicon_url: faviconUrl,
        contact_email: email,
        contact_phone: phone,
        contact_address: address,
        shipping_inside_dhaka: Number(insideDhakaFee),
        shipping_outside_dhaka: Number(outsideDhakaFee),
        free_shipping_above: Number(freeAbove),
        payment_methods: paymentSettings,
        // Social Media Links
        social_facebook: socialFacebook,
        social_instagram: socialInstagram,
        social_youtube: socialYoutube,
        social_tiktok: socialTiktok,
        social_whatsapp: socialWhatsapp,
        social_telegram: socialTelegram,
        social_twitter: socialTwitter,
        social_linkedin: socialLinkedin,
        // Legacy fallback support
        bkash_number: paymentSettings.bkash.number,
        nagad_number: paymentSettings.nagad.number,
        telegram_bot_token: telegramToken,
        telegram_chat_id: telegramChatId,
        telegram_orders_topic_id: ordersTopicId,
        telegram_messages_topic_id: messagesTopicId,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: accentColor,
        color_bg: colorBg,
        color_text: colorText,
        homepage_flash_sale_enabled: flashSaleEnabled,
        homepage_flash_sale_title: flashSaleTitle,
        homepage_flash_sale_end: flashSaleEndTime,
        flash_sale_end_time: flashSaleEndTime,
        deals_timer_hours: Number(dealsTimerHours) || 6,
      };

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Apply dynamic CSS custom properties live
      document.documentElement.style.setProperty('--color-primary', primaryColor);
      document.documentElement.style.setProperty('--color-primary-dark', secondaryColor);
      document.documentElement.style.setProperty('--color-accent', accentColor);
      document.documentElement.style.setProperty('--color-bg', colorBg);
      document.documentElement.style.setProperty('--color-text-primary', colorText);

      showToast('Store brand identity, theme & settings saved successfully!', 'success');
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
            Customize payment methods (Hide / Unhide with 1 click), delivery rates, social links, and brand identities.
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
           FLASH SALE & DAILY DEALS SYNCHRONIZATION (GLOBAL)
           ──────────────────────────────────────────────────────────── */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  ⚡ Flash Sale & Daily Deals Synchronization (Global)
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                  Controls the master live countdown timer displayed simultaneously across Homepage and Deals page (<code style={{ color: 'var(--color-primary-light)' }}>/deals</code>).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: flashSaleEndTime ? 'rgba(36, 231, 235, 0.15)' : 'rgba(34, 197, 94, 0.15)', color: flashSaleEndTime ? 'var(--color-primary-light)' : 'var(--color-success)' }}>
                {flashSaleEndTime ? '● Fixed Campaign Target' : '● Auto Daily Midnight (Zero Drift)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !flashSaleEnabled;
                  setFlashSaleEnabled(next);
                  showToast(`Flash Sale ${next ? 'enabled (ON)' : 'disabled (OFF)'}`, 'info');
                }}
                className={`btn btn-sm ${flashSaleEnabled ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                {flashSaleEnabled ? 'Flash Sale ON' : 'Flash Sale OFF'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="admin-label">Flash Sale Section Title</label>
              <input
                type="text"
                className="admin-input"
                value={flashSaleTitle}
                onChange={e => setFlashSaleTitle(e.target.value)}
                placeholder="e.g. ⚡ Flash Deals & Steals"
              />
            </div>

            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Campaign End Date & Time (UTC/BST)</span>
                {flashSaleEndTime && (
                  <button
                    type="button"
                    onClick={() => {
                      setFlashSaleEndTime(null);
                      showToast('Switched to Auto Daily Midnight (Midnight BST)', 'info');
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    ✕ Reset to Auto
                  </button>
                )}
              </label>
              <input
                type="datetime-local"
                className="admin-input"
                value={
                  flashSaleEndTime
                    ? (() => {
                        try {
                          const d = new Date(flashSaleEndTime);
                          return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                        } catch {
                          return '';
                        }
                      })()
                    : ''
                }
                onChange={e => {
                  const val = e.target.value;
                  setFlashSaleEndTime(val ? new Date(val).toISOString() : null);
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Quick Presets:</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => {
                setFlashSaleEndTime(null);
                showToast('Synchronized to Auto Daily Midnight', 'info');
              }}
            >
              ⚡ Auto Daily Midnight
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => {
                const t = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
                setFlashSaleEndTime(t);
                showToast('Flash sale timer set to +6 Hours from now', 'info');
              }}
            >
              +6 Hours
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => {
                const t = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
                setFlashSaleEndTime(t);
                showToast('Flash sale timer set to +12 Hours from now', 'info');
              }}
            >
              +12 Hours
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => {
                const t = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
                setFlashSaleEndTime(t);
                showToast('Flash sale timer set to +24 Hours from now', 'info');
              }}
            >
              +24 Hours
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => {
                const t = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
                setFlashSaleEndTime(t);
                showToast('Flash sale timer set to +48 Hours from now', 'info');
              }}
            >
              +48 Hours
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px' }}
              onClick={() => {
                const t = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
                setFlashSaleEndTime(t);
                showToast('Flash sale timer set to +7 Days from now', 'info');
              }}
            >
              +7 Days
            </button>
          </div>

          <div style={{ marginTop: '12px', background: 'var(--color-admin-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--color-admin-muted)', lineHeight: '1.5' }}>
            💡 <strong>100% Real-Time Synchronization:</strong> When saved, this timestamp is broadcasted live to both the Homepage (<code style={{ color: 'var(--color-primary-light)' }}>/</code>) and Deals page (<code style={{ color: 'var(--color-primary-light)' }}>/deals</code>). When set to Auto, it synchronizes to midnight Bangladesh Standard Time with zero client-side clock drift.
          </div>
        </div>

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
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
           SOCIAL MEDIA PROFILES & FOOTER LINKS (NEW)
           ──────────────────────────────────────────────────────────── */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Share2 size={20} color="var(--color-primary)" />
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Social Media Profiles & Footer Icons / সোশ্যাল মিডিয়া লিঙ্ক
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                  Manage links to your social channels. Icons will dynamically appear in the storefront footer. Leave empty to hide any icon.
                </p>
              </div>
            </div>

            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {[socialFacebook, socialInstagram, socialYoutube, socialTiktok, socialWhatsapp, socialTelegram, socialTwitter, socialLinkedin].filter(Boolean).length} Active Profiles
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Facebook */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1877f2' }} />
                <span>Facebook Page / Group URL</span>
              </label>
              <input
                type="url"
                className="admin-input"
                placeholder="https://facebook.com/yourbrand"
                value={socialFacebook}
                onChange={e => setSocialFacebook(e.target.value)}
              />
            </div>

            {/* Instagram */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e1306c' }} />
                <span>Instagram Profile URL</span>
              </label>
              <input
                type="url"
                className="admin-input"
                placeholder="https://instagram.com/yourbrand"
                value={socialInstagram}
                onChange={e => setSocialInstagram(e.target.value)}
              />
            </div>

            {/* YouTube */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff0000' }} />
                <span>YouTube Channel URL</span>
              </label>
              <input
                type="url"
                className="admin-input"
                placeholder="https://youtube.com/@yourchannel"
                value={socialYoutube}
                onChange={e => setSocialYoutube(e.target.value)}
              />
            </div>

            {/* TikTok */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe' }} />
                <span>TikTok Profile URL</span>
              </label>
              <input
                type="url"
                className="admin-input"
                placeholder="https://tiktok.com/@yourbrand"
                value={socialTiktok}
                onChange={e => setSocialTiktok(e.target.value)}
              />
            </div>

            {/* WhatsApp */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25d366' }} />
                <span>WhatsApp Chat Link / wa.me</span>
              </label>
              <input
                type="text"
                className="admin-input"
                placeholder="https://wa.me/8801700000000"
                value={socialWhatsapp}
                onChange={e => setSocialWhatsapp(e.target.value)}
              />
            </div>

            {/* Telegram */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#229ed9' }} />
                <span>Telegram Channel / Group Link</span>
              </label>
              <input
                type="text"
                className="admin-input"
                placeholder="https://t.me/yourbrand"
                value={socialTelegram}
                onChange={e => setSocialTelegram(e.target.value)}
              />
            </div>

            {/* Twitter / X */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#111827' }} />
                <span>X / Twitter URL</span>
              </label>
              <input
                type="url"
                className="admin-input"
                placeholder="https://x.com/yourbrand"
                value={socialTwitter}
                onChange={e => setSocialTwitter(e.target.value)}
              />
            </div>

            {/* LinkedIn */}
            <div className="form-group">
              <label className="admin-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0a66c2' }} />
                <span>LinkedIn Page URL</span>
              </label>
              <input
                type="url"
                className="admin-input"
                placeholder="https://linkedin.com/company/yourbrand"
                value={socialLinkedin}
                onChange={e => setSocialLinkedin(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────
           GENERAL STORE IDENTITY & DELIVERY CHARGES
           ──────────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Full Brand Identity & Live Theme Customizer */}
          <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--color-primary-10, rgba(37,99,235,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Palette size={20} color="var(--color-primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Store Brand Identity & Dynamic Theme</h2>
                  <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                    Easily rebrand your store name, upload logo/favicon, and switch color palettes anytime without editing code.
                  </p>
                </div>
              </div>

              {/* Quick Preset Selector Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-dim)' }}>Theme Presets:</span>
                {[
                  { name: 'Sapphire', primary: '#2563eb', secondary: '#1d4ed8', accent: '#f59e0b', bg: '#f8f7f4', text: '#1a1a1a' },
                  { name: 'Emerald', primary: '#059669', secondary: '#047857', accent: '#f59e0b', bg: '#f7fdf9', text: '#0f172a' },
                  { name: 'Purple', primary: '#7c3aed', secondary: '#6d28d9', accent: '#fbbf24', bg: '#faf5ff', text: '#1e1b4b' },
                  { name: 'Crimson', primary: '#e11d48', secondary: '#be123c', accent: '#f59e0b', bg: '#fff5f5', text: '#18181b' },
                  { name: 'Midnight', primary: '#0f172a', secondary: '#1e293b', accent: '#3b82f6', bg: '#f8fafc', text: '#020617' },
                  { name: 'Amber', primary: '#d97706', secondary: '#b45309', accent: '#2563eb', bg: '#fefdf8', text: '#1c1917' },
                ].map(preset => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setPrimaryColor(preset.primary);
                      setSecondaryColor(preset.secondary);
                      setAccentColor(preset.accent);
                      setColorBg(preset.bg);
                      setColorText(preset.text);
                      showToast(`Applied ${preset.name} color palette!`, 'info');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: primaryColor === preset.primary ? '2px solid var(--color-admin-text)' : '1px solid var(--color-admin-border)',
                      background: 'var(--color-admin-surface)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: preset.primary, display: 'inline-block' }} />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {/* Left Column: Brand Names & Logo Assets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="admin-label" style={{ fontWeight: 700 }}>Store Brand Name</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="e.g. ShopBD, BrandName"
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)', marginTop: '3px' }}>
                    Displays in website header, footer, invoices, and tab titles.
                  </span>
                </div>

                <div className="form-group">
                  <label className="admin-label" style={{ fontWeight: 700 }}>Tagline / Slogan</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="e.g. Your Trusted Online Shop"
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label" style={{ fontWeight: 700 }}>Logo Image URL</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="admin-input"
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      placeholder="e.g. /logo.svg or https://example.com/logo.png"
                    />
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        style={{ padding: '0 12px', background: 'transparent', border: '1px solid var(--color-admin-border)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)', marginTop: '3px' }}>
                    PNG, SVG, or WebP with transparent background recommended.
                  </span>
                </div>

                <div className="form-group">
                  <label className="admin-label" style={{ fontWeight: 700 }}>Favicon URL</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={faviconUrl}
                    onChange={e => setFaviconUrl(e.target.value)}
                    placeholder="e.g. /favicon.ico"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)', marginTop: '3px' }}>
                    Browser tab miniature icon (16x16 or 32x32 px).
                  </span>
                </div>
              </div>

              {/* Middle Column: 5-Token Color Palette Customizer */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-admin-text)', marginBottom: '4px' }}>
                  🎨 Color Palette Tokens
                </div>

                {/* Primary Color */}
                <div className="form-group">
                  <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Primary Brand Color</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-admin-dim)' }}>{primaryColor}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      style={{ width: '42px', height: '42px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                    />
                    <input
                      type="text"
                      className="admin-input"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="form-group">
                  <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Secondary / Hover Accent</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-admin-dim)' }}>{secondaryColor}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      style={{ width: '42px', height: '42px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                    />
                    <input
                      type="text"
                      className="admin-input"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="form-group">
                  <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sale / Flash Deal Accent</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-admin-dim)' }}>{accentColor}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      style={{ width: '42px', height: '42px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                    />
                    <input
                      type="text"
                      className="admin-input"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                {/* Background & Text Colors */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="admin-label">Page Background</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={colorBg}
                        onChange={e => setColorBg(e.target.value)}
                        style={{ width: '36px', height: '36px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        className="admin-input"
                        value={colorBg}
                        onChange={e => setColorBg(e.target.value)}
                        style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="admin-label">Text Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="color"
                        value={colorText}
                        onChange={e => setColorText(e.target.value)}
                        style={{ width: '36px', height: '36px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '6px' }}
                      />
                      <input
                        type="text"
                        className="admin-input"
                        value={colorText}
                        onChange={e => setColorText(e.target.value)}
                        style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Real-Time Live Preview Widget */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
                    👁️ Live Storefront Preview
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)' }}>Updates in real-time</span>
                </div>

                {/* Simulated Storefront Card */}
                <div
                  style={{
                    borderRadius: '12px',
                    border: '1px solid var(--color-admin-border)',
                    background: colorBg,
                    color: colorText,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Mock Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo Preview"
                          style={{ height: '24px', maxWidth: '80px', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: primaryColor }} />
                      )}
                      <span style={{ fontWeight: 800, fontSize: '15px', color: primaryColor }}>
                        {storeName || 'Your Store'}
                      </span>
                    </div>

                    <span style={{ fontSize: '10px', background: accentColor, color: '#fff', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      ⚡ FLASH SALE
                    </span>
                  </div>

                  {/* Mock Slogan */}
                  <p style={{ fontSize: '12px', opacity: 0.8, margin: 0, fontStyle: 'italic' }}>
                    &ldquo;{tagline || 'Your store tagline appears here.'}&rdquo;
                  </p>

                  {/* Mock Product Card */}
                  <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      🛍️
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: colorText }}>Sample Product Title</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: primaryColor }}>৳1,450</span>
                        <span style={{ fontSize: '11px', textDecoration: 'line-through', opacity: 0.5 }}>৳1,850</span>
                      </div>
                    </div>
                  </div>

                  {/* Mock Button & Badge */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      style={{
                        flex: 1,
                        background: primaryColor,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Add To Cart
                    </button>
                    <button
                      type="button"
                      style={{
                        background: secondaryColor,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
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

              <div className="form-group">
                <label className="admin-label">Store Physical Address</label>
                <input
                  type="text"
                  className="admin-input"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. House 12, Road 5, Dhanmondi, Dhaka"
                />
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

