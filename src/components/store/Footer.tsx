import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/store-config';
import type { StorefrontCustomSettings } from '@/lib/store-settings-shared';
import { BkashLogo, NagadLogo } from '@/components/shared/PaymentLogos';
import { ShieldCheck, Banknote } from 'lucide-react';

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

  // Social media links from Admin Settings or default fallback
  const socialLinks = [
    {
      id: 'facebook',
      name: 'Facebook',
      url: settings?.social_facebook !== undefined ? settings.social_facebook : STORE_CONFIG.social.facebook,
      className: 'footer-social-link--facebook',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      id: 'instagram',
      name: 'Instagram',
      url: settings?.social_instagram !== undefined ? settings.social_instagram : STORE_CONFIG.social.instagram,
      className: 'footer-social-link--instagram',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
    },
    {
      id: 'youtube',
      name: 'YouTube',
      url: settings?.social_youtube !== undefined ? settings.social_youtube : STORE_CONFIG.social.youtube,
      className: 'footer-social-link--youtube',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      url: settings?.social_tiktok !== undefined ? settings.social_tiktok : '',
      className: 'footer-social-link--tiktok',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      url: settings?.social_whatsapp !== undefined ? settings.social_whatsapp : (STORE_CONFIG.contact.whatsapp ? `https://wa.me/${STORE_CONFIG.contact.whatsapp.replace(/[^0-9]/g, '')}` : ''),
      className: 'footer-social-link--whatsapp',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      ),
    },
    {
      id: 'telegram',
      name: 'Telegram',
      url: settings?.social_telegram !== undefined ? settings.social_telegram : STORE_CONFIG.social.telegram,
      className: 'footer-social-link--telegram',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.942z" />
        </svg>
      ),
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      url: settings?.social_twitter !== undefined ? settings.social_twitter : '',
      className: 'footer-social-link--twitter',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      url: settings?.social_linkedin !== undefined ? settings.social_linkedin : '',
      className: 'footer-social-link--linkedin',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
  ].filter(item => Boolean(item.url && item.url.trim()));

  return (
    <footer className="store-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Info & Social Media Links */}
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '12px' }}>
              {storeName}
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: '14px', maxWidth: '300px' }}>
              {tagline}. Quality products, fast doorstep delivery, and 100% verified payment security.
            </p>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
              {phone && <div>📞 {phone}</div>}
              {email && <div>✉️ {email}</div>}
              {address && <div>📍 {address}</div>}
            </div>

            {/* Social Media Links (Admin Controllable) */}
            {socialLinks.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Connect With Us / সোশ্যাল মিডিয়া
                </div>
                <div className="footer-social-wrap">
                  {socialLinks.map(social => (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`footer-social-link ${social.className}`}
                      title={`Follow us on ${social.name}`}
                      aria-label={`Follow ${storeName} on ${social.name}`}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
            )}
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
