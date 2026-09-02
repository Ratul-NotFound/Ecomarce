'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Heart, User, Search, ShieldCheck } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  categories?: Array<{ id: string; name_en: string; name_bn?: string | null; slug: string }>;
}

export default function Header({ categories = [] }: HeaderProps) {
  const router = useRouter();
  const { itemCount } = useCart();
  const { user, isAdmin, isModerator } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <>
      <header className="store-header">
        <div className="container store-header__inner">
          {/* Logo */}
          <Link href="/" className="store-header__logo" id="header-logo-link">
            <span>{STORE_CONFIG.name}</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="store-header__search hide-mobile">
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
                <ShieldCheck size={22} color="var(--color-primary)" />
              </Link>
            )}

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="header-action-btn hide-mobile"
              title="Wishlist"
              id="header-wishlist-link"
            >
              <Heart size={22} />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="header-action-btn"
              title="Shopping Cart"
              id="header-cart-link"
            >
              <ShoppingBag size={22} />
              {itemCount > 0 && <span className="header-badge">{itemCount}</span>}
            </Link>

            {/* User Account / Auth (Desktop only - mobile has bottom nav) */}
            <Link
              href={user ? '/account' : '/auth'}
              className="header-action-btn hide-mobile"
              title={user ? 'My Account' : 'Sign In'}
              id="header-account-link"
            >
              <User size={22} />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
