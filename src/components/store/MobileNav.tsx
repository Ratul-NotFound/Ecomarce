'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, Search, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export default function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <Link
        href="/"
        className={`mobile-nav-tab ${pathname === '/' ? 'mobile-nav-tab--active' : ''}`}
        id="mobile-nav-home"
      >
        <Home size={20} />
        <span>Home</span>
      </Link>

      <Link
        href="/search"
        className={`mobile-nav-tab ${pathname.startsWith('/search') ? 'mobile-nav-tab--active' : ''}`}
        id="mobile-nav-search"
      >
        <Search size={20} />
        <span>Search</span>
      </Link>

      <Link
        href="/cart"
        className={`mobile-nav-tab ${pathname.startsWith('/cart') ? 'mobile-nav-tab--active' : ''}`}
        id="mobile-nav-cart"
      >
        <ShoppingBag size={20} />
        {itemCount > 0 && <span className="mobile-nav-badge">{itemCount}</span>}
        <span>Cart</span>
      </Link>

      <Link
        href="/account"
        className={`mobile-nav-tab ${pathname.startsWith('/account') || pathname.startsWith('/auth') ? 'mobile-nav-tab--active' : ''}`}
        id="mobile-nav-account"
      >
        <User size={20} />
        <span>Account</span>
      </Link>
    </nav>
  );
}
