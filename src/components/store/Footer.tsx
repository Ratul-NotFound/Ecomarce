import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/store-config';
import type { StorefrontCustomSettings } from '@/lib/store-settings-shared';

interface FooterProps {
  settings?: StorefrontCustomSettings;
}

export default function Footer({ settings }: FooterProps) {
  const storeName = settings?.store_name || STORE_CONFIG.name;
  const tagline = settings?.store_tagline || STORE_CONFIG.tagline;
  const phone = settings?.contact_phone || settings?.store_phone || STORE_CONFIG.contact.phone;
  const email = settings?.contact_email || STORE_CONFIG.contact.email;
  const address = settings?.contact_address || STORE_CONFIG.contact.address;

  const insideFee = settings?.shipping_inside_dhaka !== undefined ? settings.shipping_inside_dhaka : STORE_CONFIG.shipping.insideDhaka;
  const outsideFee = settings?.shipping_outside_dhaka !== undefined ? settings.shipping_outside_dhaka : STORE_CONFIG.shipping.outsideDhaka;
  const freeAbove = settings?.free_shipping_above !== undefined ? settings.free_shipping_above : STORE_CONFIG.shipping.freeAbove;

  return (
    <footer className="store-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Info */}
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '12px' }}>
              {storeName}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px', maxWidth: '300px' }}>
              {tagline}. Quality products, fast doorstep delivery, and secure bKash/Nagad payment.
            </p>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              {phone && <div>📞 {phone}</div>}
              {email && <div>✉️ {email}</div>}
              {address && <div>📍 {address}</div>}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div className="footer-col-title">Quick Links</div>
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/cart">Shopping Cart</Link>
              <Link href="/wishlist">My Wishlist</Link>
              <Link href="/orders">Track Orders</Link>
            </div>
          </div>

          {/* Customer Service */}
          <div>
            <div className="footer-col-title">Customer Care</div>
            <div className="footer-links">
              <Link href="/account">My Account</Link>
              <Link href="/auth">Sign In / Register</Link>
              <span>Inside Dhaka: ৳{insideFee}</span>
              <span>Outside Dhaka: ৳{outsideFee}</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                Free Delivery on ৳{freeAbove.toLocaleString()}+
              </span>
            </div>
          </div>

          {/* Payment & Security */}
          <div>
            <div className="footer-col-title">Payment & Trust</div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
              We support bKash Personal, Nagad Personal, and Cash on Delivery across all 64 districts in Bangladesh.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary">bKash</span>
              <span className="badge badge-warning">Nagad</span>
              <span className="badge badge-success">Cash on Delivery</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <div>
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </div>
          <div>
            English & বাংলা Supported • Mobile PWA Ready
          </div>
        </div>
      </div>
    </footer>
  );
}
