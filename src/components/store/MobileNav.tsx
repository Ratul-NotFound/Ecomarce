'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Zap, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth, extractAvatarUrl } from '@/hooks/useAuth';

export default function MobileNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, profile } = useAuth();
  const userAvatar = profile?.avatar_url || extractAvatarUrl(user);

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
        className={`mobile-nav-tab ${pathname === '/search' ? 'mobile-nav-tab--active' : ''}`}
        id="mobile-nav-categories"
      >
        <LayoutGrid size={20} />
        <span>Explore</span>
      </Link>

      <Link
        href="/deals"
        className={`mobile-nav-tab ${pathname.startsWith('/deals') ? 'mobile-nav-tab--active' : ''}`}
        id="mobile-nav-deals"
      >
        <Zap size={20} />
        <span>Deals</span>
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
        href={user ? '/account' : '/auth'}
        className={`mobile-nav-tab ${pathname.startsWith('/account') || pathname.startsWith('/auth') ? 'mobile-nav-tab--active' : ''}`}
        id="mobile-nav-account"
      >
        {userAvatar ? (
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              overflow: 'hidden',
              position: 'relative',
              border: pathname.startsWith('/account') ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            }}
          >
            <Image src={userAvatar} alt="Account" fill sizes="22px" unoptimized referrerPolicy="no-referrer" style={{ objectFit: 'cover' }} />
          </div>
        ) : (
          <User size={20} />
        )}
        <span>Account</span>
      </Link>
    </nav>
  );
}
