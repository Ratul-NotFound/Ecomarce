import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/store-config';
import type { StorefrontCustomSettings } from '@/lib/store-settings-shared';
import { BkashLogo, NagadLogo } from '@/components/shared/PaymentLogos';
import { ShieldCheck, Truck, Banknote } from 'lucide-react';

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
              {tagline}. Quality products, fast doorstep delivery, and 100% verified payment security.
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
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
              We accept official mobile payments and Cash on Delivery across all 64 districts in Bangladesh.
            </p>

            {/* Official Payment Logos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {/* bKash */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid rgba(226, 19, 110, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 10px 4px 6px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <BkashLogo size={28} style={{ border: 'none', boxShadow: 'none', padding: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#e2136e' }}>bKash</span>
              </div>

              {/* Nagad */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px 10px 4px 6px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                <NagadLogo size={28} style={{ border: 'none', boxShadow: 'none', padding: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#f97316' }}>Nagad</span>
              </div>

              {/* Cash on Delivery */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 10px',
                }}
              >
                <Banknote size={16} color="var(--color-primary)" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)' }}>Cash on Delivery</span>
              </div>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-success)', fontWeight: 700 }}>
              <ShieldCheck size={16} />
              <span>100% Safe & Verified Transactions</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          <div>
            © {new Date().getFullYear()} {storeName}. All rights reserved.
          </div>
          <div>
            English & বাংলা Supported • Fast Islandwide Delivery
          </div>
        </div>
      </div>
    </footer>
  );
}
