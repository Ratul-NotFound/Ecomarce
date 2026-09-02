import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/store-config';

export default function Footer() {
  return (
    <footer className="store-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Info */}
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '12px' }}>
              {STORE_CONFIG.name}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px', maxWidth: '300px' }}>
              {STORE_CONFIG.tagline}. Quality products, fast doorstep delivery, and secure bKash/Nagad payment.
            </p>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              📞 {STORE_CONFIG.contact.phone}<br />
              ✉️ {STORE_CONFIG.contact.email}<br />
              📍 {STORE_CONFIG.contact.address}
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
              <span>Inside Dhaka: ৳{STORE_CONFIG.shipping.insideDhaka}</span>
              <span>Outside Dhaka: ৳{STORE_CONFIG.shipping.outsideDhaka}</span>
              <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                Free Delivery on ৳{STORE_CONFIG.shipping.freeAbove}+
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
            © {new Date().getFullYear()} {STORE_CONFIG.name}. All rights reserved.
          </div>
          <div>
            English & বাংলা Supported • Mobile PWA Ready
          </div>
        </div>
      </div>
    </footer>
  );
}
