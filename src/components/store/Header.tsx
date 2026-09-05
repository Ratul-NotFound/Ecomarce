'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag, Heart, User, Search, ShieldCheck, Package, Download } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import { useCart } from '@/hooks/useCart';
import { useAuth, extractAvatarUrl } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import NotificationBell from '@/components/store/NotificationBell';
import SearchBar from '@/components/store/SearchBar';

interface HeaderProps {
  categories?: Array<{ id: string; name_en: string; name_bn?: string | null; slug: string }>;
  storeName?: string;
  storeLogo?: string;
  announcement?: {
    enabled: boolean;
    text: string;
    link?: string;
  };
}

export default function Header({ categories = [], storeName, storeLogo, announcement }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isCleanPage = pathname === '/cart' || pathname === '/checkout' || pathname.startsWith('/account');
  const [logoError, setLogoError] = useState(false);
  const { itemCount } = useCart();
  const { user, profile, isAdmin, isModerator } = useAuth();
  const { isInstalled, installApp } = usePWAInstall();
  const userAvatar = profile?.avatar_url || extractAvatarUrl(user);

  const hasLogo = Boolean(storeLogo && storeLogo !== '/logo.svg' && !logoError);
  const displayName = storeName || STORE_CONFIG.name;

  return (
    <header className="store-header">
      {announcement?.enabled && announcement?.text && (
        <div className="store-announcement-bar">
          <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            {announcement.link ? (
              <Link href={announcement.link} style={{ color: 'inherit', textDecoration: 'none' }}>
                {announcement.text} ➔
              </Link>
            ) : (
              <span>{announcement.text}</span>
            )}
          </div>
        </div>
      )}
      <div className="container store-header__container">
        {/* Main Row */}
        <div className="store-header__inner">
          {/* Logo */}
          <Link href="/" className="store-header__logo" id="header-logo-link" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasLogo ? (
              <img
                src={storeLogo}
                alt={displayName}
                style={{ maxHeight: '34px', maxWidth: '140px', objectFit: 'contain' }}
                onError={() => setLogoError(true)}
              />
            ) : (
              <span>{displayName}</span>
            )}
          </Link>

          {/* Desktop Search Bar with Live Recommendations */}
          <div className="store-header__search desktop-search">
            <SearchBar placeholder="Search products, brands, categories..." />
          </div>

          {/* Action Buttons */}
          <div className="store-header__actions">
            {/* Direct PWA Install Action (Shown only when not installed) */}
            {!isInstalled && (
              <>
                <button
                  type="button"
                  onClick={installApp}
                  className="header-install-pill"
                  title="Install ShopBD App"
                  id="header-install-app-pill"
                  aria-label="Install App"
                >
                  <Download size={14} />
                  <span>Install App</span>
                </button>
                <button
                  type="button"
                  onClick={installApp}
                  className="header-install-btn-mobile"
                  title="Install ShopBD App"
                  id="header-install-app-mobile"
                  aria-label="Install App"
                >
                  <Download size={16} />
                </button>
              </>
            )}

            {/* Admin Portal Shortcut if Admin (Desktop only) */}
            {(isAdmin || isModerator) && (
              <Link
                href="/admin"
                className="header-action-btn desktop-only-action"
                title="Admin Dashboard"
                id="header-admin-link"
              >
                <ShieldCheck size={20} color="var(--color-primary)" />
              </Link>
            )}

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="header-action-btn"
              title="Wishlist"
              id="header-wishlist-link"
            >
              <Heart size={20} />
            </Link>

            {/* Notification Bell (Both mobile and desktop) */}
            <NotificationBell />

            {/* My Orders (Desktop only - mobile accesses via bottom Account tab) */}
            {user && (
              <Link
                href="/account?tab=orders"
                className="header-action-btn desktop-only-action"
                title="My Orders"
                id="header-my-orders-btn"
              >
                <Package size={20} />
              </Link>
            )}

            {/* Cart (Desktop only - mobile accesses via bottom Cart tab) */}
            <Link
              href="/cart"
              className="header-action-btn desktop-only-action"
              title="Shopping Cart"
              id="header-cart-link"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && <span className="header-badge">{itemCount}</span>}
            </Link>

            {/* User Account / Profile Button (Desktop only - mobile accesses via bottom Account tab) */}
            <Link
              href={user ? '/account' : '/auth'}
              className="header-user-btn desktop-only-action"
              title={user ? 'My Account' : 'Sign In'}
              id="header-account-link"
            >
              {user ? (
                <div className="header-user-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
                  {userAvatar ? (
                    <Image
                      src={userAvatar}
                      alt={profile?.full_name || 'User'}
                      fill
                      sizes="32px"
                      unoptimized
                      referrerPolicy="no-referrer"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>
              ) : (
                <div className="header-signin-pill">
                  <User size={15} />
                  <span>Sign In</span>
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Dedicated Search Bar (Hidden on Cart, Checkout, and Account) */}
        {!isCleanPage && (
          <div className="store-header__mobile-search">
            <SearchBar placeholder="Search products, brands, categories..." isMobile />
          </div>
        )}
      </div>
    </header>
  );
}
