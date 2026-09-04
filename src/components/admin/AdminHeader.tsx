'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, LogOut, Store } from 'lucide-react';
import { useAuth, extractAvatarUrl } from '@/hooks/useAuth';
import { STORE_CONFIG } from '@/lib/store-config';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
}

export default function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  const router = useRouter();
  const { profile, user, signOut, isSuperAdmin, effectiveRole } = useAuth();
  const userAvatar = profile?.avatar_url || extractAvatarUrl(user);

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
          style={{ background: 'none', border: 'none', color: 'var(--color-admin-text)', cursor: 'pointer' }}
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>
          {STORE_CONFIG.name} Control Panel
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          href="/"
          target="_blank"
          className="btn btn-secondary btn-sm"
          style={{
            background: '#ffffff',
            borderColor: 'var(--color-admin-border)',
            color: 'var(--color-admin-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 700,
          }}
        >
          <Store size={14} color="var(--color-primary)" />
          <span className="hide-mobile">Live Website</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={profile?.full_name || 'Admin'}
              referrerPolicy="no-referrer"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                objectFit: 'cover',
                border: '1px solid var(--color-admin-border)',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                background: 'var(--color-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
              }}
            >
              {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }} className="hide-mobile">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
                {profile?.full_name || user?.email || 'Admin'}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  background: isSuperAdmin
                    ? 'rgba(234, 179, 8, 0.15)'
                    : effectiveRole === 'moderator'
                    ? 'rgba(147, 51, 234, 0.15)'
                    : 'rgba(37, 99, 235, 0.1)',
                  color: isSuperAdmin
                    ? '#b45309'
                    : effectiveRole === 'moderator'
                    ? '#7e22ce'
                    : '#1d4ed8',
                  border: isSuperAdmin ? '1px solid rgba(234, 179, 8, 0.3)' : undefined,
                }}
              >
                {isSuperAdmin ? 'Super Admin' : effectiveRole === 'moderator' ? 'Moderator' : 'Admin'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          style={{ background: 'none', border: 'none', color: 'var(--color-admin-muted)', cursor: 'pointer', padding: '4px' }}
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
