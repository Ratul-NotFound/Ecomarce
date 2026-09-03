'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingBag, Heart, User, Search, ShieldCheck, Package } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  categories?: Array<{ id: string; name_en: string; name_bn?: string | null; slug: string }>;
  announcement?: {
    enabled: boolean;
    text: string;
    link?: string;
  };
}

export default function Header({ categories = [], announcement }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isCleanPage = pathname === '/cart' || pathname === '/checkout' || pathname.startsWith('/account');
  const { itemCount } = useCart();
  const { user, profile, isAdmin, isModerator } = useAuth();
  const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

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
          <Link href="/" className="store-header__logo" id="header-logo-link">
            <span>{STORE_CONFIG.name}</span>
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearchSubmit} className="store-header__search desktop-search">
            <Search className="store-header__search-icon" size={18} />
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              className="store-header__search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              id="header-search-input"
            />
          </form>

          {/* Action Buttons */}
          <div className="store-header__actions">
            {/* Admin Portal Shortcut if Admin */}
            {(isAdmin || isModerator) && (
              <Link
                href="/admin"
                className="header-action-btn"
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

            {/* My Orders (Desktop shortcut when logged in) */}
            {user && (
              <Link
                href="/account?tab=orders"
                className="header-action-btn desktop-only-cart"
                title="My Orders"
                id="header-my-orders-btn"
              >
                <Package size={20} />
              </Link>
            )}

            {/* Cart (Desktop only - mobile uses bottom nav) */}
            <Link
              href="/cart"
              className="header-action-btn desktop-only-cart"
              title="Shopping Cart"
              id="header-cart-link"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && <span className="header-badge">{itemCount}</span>}
            </Link>

            {/* User Account / Profile Button */}
            <Link
              href={user ? '/account' : '/auth'}
              className="header-user-btn"
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
          <form onSubmit={handleSearchSubmit} className="store-header__mobile-search">
            <Search className="store-header__mobile-search-icon" size={16} />
            <input
              type="text"
              placeholder="Search products, brands, categories..."
              className="store-header__mobile-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              id="mobile-header-search-input"
            />
          </form>
        )}
      </div>
    </header>
  );
}
