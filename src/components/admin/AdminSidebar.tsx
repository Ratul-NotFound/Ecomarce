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
  Palette,
  Ticket,
  Sliders,
  Store,
  ShieldAlert,
} from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import { useAuth } from '@/hooks/useAuth';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { effectiveRole, isSuperAdmin } = useAuth();

  const isModerator = effectiveRole === 'moderator';

  // Define links with permission tiers
  const allLinks = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, minRole: 'moderator' },
    { label: 'Products Catalog', href: '/admin/products', icon: Package, minRole: 'moderator' },
    { label: 'Orders & Payments', href: '/admin/orders', icon: ShoppingBag, minRole: 'moderator' },
    { label: 'Inventory & Stock', href: '/admin/inventory', icon: Boxes, minRole: 'moderator' },
    { label: 'Live Support Chat', href: '/admin/messages', icon: MessageSquare, minRole: 'moderator' },
    { label: 'Customers Directory', href: '/admin/customers', icon: Users, minRole: 'moderator' },
    { label: 'Analytics & Traffic', href: '/admin/analytics', icon: BarChart3, minRole: 'admin' },
    { label: 'Coupons & Deals', href: '/admin/coupons', icon: Ticket, minRole: 'admin' },
    { label: 'Storefront Design', href: '/admin/customize', icon: Palette, minRole: 'admin' },
    { label: 'Store Settings', href: '/admin/settings', icon: Sliders, minRole: 'admin' },
  ];

  // Filter links for current role
  const visibleLinks = allLinks.filter(item => {
    if (isModerator && item.minRole === 'admin') return false;
    return true;
  });

  const managementLinks = visibleLinks.filter(l =>
    ['/admin', '/admin/products', '/admin/orders', '/admin/inventory'].includes(l.href)
  );

  const growthLinks = visibleLinks.filter(l =>
    ['/admin/messages', '/admin/customers', '/admin/analytics'].includes(l.href)
  );

  const configLinks = visibleLinks.filter(l =>
    ['/admin/coupons', '/admin/customize', '/admin/settings'].includes(l.href)
  );

  // Role tag styling
  const roleLabel = isSuperAdmin ? 'Super Admin' : effectiveRole === 'admin' ? 'Admin' : 'Moderator';
  const roleBadgeStyle = isSuperAdmin
    ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff', boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)' }
    : effectiveRole === 'admin'
    ? { background: 'var(--color-primary, #2563eb)', color: '#ffffff' }
    : { background: '#7c3aed', color: '#ffffff' };

  return (
    <aside className={`admin-sidebar ${isOpen ? 'admin-sidebar--open' : ''}`}>
      {/* Brand / Logo */}
      <div className="admin-sidebar__logo">
        <Link href="/admin" className="admin-sidebar__brand">
          <span>{STORE_CONFIG.name}</span>
          <span
            className="admin-sidebar__role-tag"
            style={{
              ...roleBadgeStyle,
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '10.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {roleLabel}
          </span>
        </Link>
      </div>

      {/* Navigation list */}
      <nav className="admin-sidebar__nav">
        {managementLinks.length > 0 && (
          <>
            <div className="admin-sidebar__section-label">Management</div>
            {managementLinks.map(item => {
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
          </>
        )}

        {growthLinks.length > 0 && (
          <>
            <div className="admin-sidebar__section-label">Operations & Users</div>
            {growthLinks.map(item => {
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
          </>
        )}

        {configLinks.length > 0 && (
          <>
            <div className="admin-sidebar__section-label">Configuration & Marketing</div>
            {configLinks.map(item => {
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
          </>
        )}

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
