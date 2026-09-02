'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/shared/ToastProvider';
import { STORE_CONFIG } from '@/lib/store-config';
import { Sliders, Palette, Phone, ShieldCheck, Send } from 'lucide-react';

export default function AdminSettingsPage() {
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState<string>(STORE_CONFIG.name);
  const [tagline, setTagline] = useState<string>(STORE_CONFIG.tagline);
  const [email, setEmail] = useState<string>(STORE_CONFIG.contact.email);
  const [phone, setPhone] = useState<string>(STORE_CONFIG.contact.phone);
  const [insideDhakaFee, setInsideDhakaFee] = useState<number | string>(STORE_CONFIG.shipping.insideDhaka);
  const [outsideDhakaFee, setOutsideDhakaFee] = useState<number | string>(STORE_CONFIG.shipping.outsideDhaka);
  const [freeAbove, setFreeAbove] = useState<number | string>(STORE_CONFIG.shipping.freeAbove);
  const [bkashNumber, setBkashNumber] = useState<string>(STORE_CONFIG.payment.bkash.number);
  const [nagadNumber, setNagadNumber] = useState<string>(STORE_CONFIG.payment.nagad.number);
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
          if (s.bkash_number) setBkashNumber(s.bkash_number);
          if (s.nagad_number) setNagadNumber(s.nagad_number);
          if (s.telegram_bot_token) setTelegramToken(s.telegram_bot_token);
          if (s.telegram_chat_id) setTelegramChatId(s.telegram_chat_id);
          if (s.telegram_orders_topic_id) setOrdersTopicId(s.telegram_orders_topic_id);
          if (s.telegram_messages_topic_id) setMessagesTopicId(s.telegram_messages_topic_id);
          if (s.primary_color) setPrimaryColor(s.primary_color);
        }
      });
  }, []);

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
        bkash_number: bkashNumber,
        nagad_number: nagadNumber,
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

      // Apply dynamic CSS custom property live to test color
      document.documentElement.style.setProperty('--color-primary', primaryColor);

      showToast('Store settings saved successfully!', 'success');
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
          <h1 className="admin-page-title">Global Store Settings</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Store identity, contact phone, delivery charges, bKash numbers, and live color themes.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', maxWidth: '1000px' }}>
        {/* Brand & Theme Section */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Palette size={18} color="var(--color-primary-light)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Brand & Color Theme</h2>
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
              <label className="admin-label">Store Tagline</label>
              <input
                type="text"
                className="admin-input"
                value={tagline}
                onChange={e => setTagline(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Primary Brand Theme Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ width: '48px', height: '40px', padding: 0, border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  className="admin-input"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  style={{ maxWidth: '120px' }}
                />
                <div style={{ width: '24px', height: '24px', borderRadius: '9999px', background: primaryColor }} />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                Changing this updates the single central CSS token variable across the entire site.
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Section */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Phone size={18} color="var(--color-primary-light)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Shipping & Payment Details</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="admin-label">Inside Dhaka (৳)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={insideDhakaFee}
                  onChange={e => setInsideDhakaFee(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Outside Dhaka (৳)</label>
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
                <label className="admin-label">bKash Personal No.</label>
                <input
                  type="text"
                  className="admin-input"
                  value={bkashNumber}
                  onChange={e => setBkashNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Nagad Personal No.</label>
                <input
                  type="text"
                  className="admin-input"
                  value={nagadNumber}
                  onChange={e => setNagadNumber(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Bot Automation Card */}
        <div className="admin-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Send size={18} color="var(--color-primary-light)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Telegram Bot Live Order Notifications</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="admin-label">Telegram Bot Token (@BotFather)</label>
              <input
                type="text"
                className="admin-input"
                placeholder="123456789:ABCdefGHIjklMNO..."
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Telegram Admin Group/Chat ID</label>
              <input
                type="text"
                className="admin-input"
                placeholder="-1003795016891"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="admin-label">Orders Topic ID (Optional)</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. 2"
                value={ordersTopicId}
                onChange={e => setOrdersTopicId(e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Thread ID for new orders</span>
            </div>

            <div className="form-group">
              <label className="admin-label">Messages / Chat Topic ID (Optional)</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. 4"
                value={messagesTopicId}
                onChange={e => setMessagesTopicId(e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Thread ID for live customer chats</span>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
              id="save-settings-submit-btn"
            >
              {isSaving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
