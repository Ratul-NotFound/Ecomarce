'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Boxes,
  Users,
  MessageSquare,
  BarChart3,
  Sparkles,
  Ticket,
  Sliders,
  Store,
} from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const links = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Products Catalog', href: '/admin/products', icon: Package },
    { label: 'Orders & Payments', href: '/admin/orders', icon: ShoppingBag },
    { label: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes },
    { label: 'Live Support Chat', href: '/admin/messages', icon: MessageSquare },
    { label: 'Customers', href: '/admin/customers', icon: Users },
    { label: 'Analytics & Traffic', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Coupons & Deals', href: '/admin/coupons', icon: Ticket },
    { label: 'Storefront Design', href: '/admin/customize', icon: Sparkles },
    { label: 'Store Settings', href: '/admin/settings', icon: Sliders },
  ];

  return (
    <aside className={`admin-sidebar ${isOpen ? 'admin-sidebar--open' : ''}`}>
      {/* Brand / Logo */}
      <div className="admin-sidebar__logo">
        <Link href="/admin" className="admin-sidebar__brand">
          <span>{STORE_CONFIG.name}</span>
          <span className="admin-sidebar__role-tag">Admin</span>
        </Link>
      </div>

      {/* Navigation list */}
      <nav className="admin-sidebar__nav">
        <div className="admin-sidebar__section-label">Management</div>
        {links.slice(0, 4).map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="admin-sidebar__section-label">Growth & Analytics</div>
        {links.slice(4, 7).map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="admin-sidebar__section-label">Configuration</div>
        {links.slice(7).map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <Link
            href="/"
            target="_blank"
            className="admin-nav-link"
            style={{ color: 'var(--color-primary-light)' }}
          >
            <Store size={18} />
            <span>View Live Store →</span>
          </Link>
        </div>
      </nav>
    </aside>
  );
}
