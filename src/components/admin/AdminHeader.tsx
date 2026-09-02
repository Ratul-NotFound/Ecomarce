'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, Bell, Store } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { STORE_CONFIG } from '@/lib/store-config';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const router = useRouter();
  const { profile, user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut('/auth');
  };

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hide-desktop"
          style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-admin-muted)' }}>
          {STORE_CONFIG.name} Control Panel
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          href="/"
          target="_blank"
          className="btn btn-secondary btn-sm"
          style={{ background: 'var(--color-admin-surface-2)', borderColor: 'var(--color-admin-border)', color: '#ffffff' }}
        >
          <Store size={14} />
          <span className="hide-mobile">Live Website</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9999px', background: 'var(--color-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
            {profile?.full_name?.charAt(0) || 'A'}
          </div>
          <span className="hide-mobile" style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>
            {profile?.full_name || user?.email || 'Admin'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          style={{ background: 'none', border: 'none', color: 'var(--color-admin-muted)', cursor: 'pointer' }}
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
