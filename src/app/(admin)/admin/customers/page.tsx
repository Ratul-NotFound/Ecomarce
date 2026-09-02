import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils/format';
import { Users } from 'lucide-react';
import type { Profile } from '@/types';

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  const { data } = await dbClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const profiles = (data as Profile[]) || [];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customer Directory</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            View registered user profiles, loyalty point balances, and referral codes.
          </p>
        </div>
      </div>

      <div className="admin-card">
        {profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-admin-muted)' }}>
            <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <p>No customer profiles found yet.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Loyalty Points</th>
                  <th>Referral Code</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '9999px', background: 'var(--color-primary-10)', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
                          {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <strong style={{ color: '#ffffff' }}>{user.full_name || 'Customer'}</strong>
                      </div>
                    </td>
                    <td>{user.phone || '—'}</td>
                    <td>
                      <span className={`badge ${user.role === 'admin' ? 'badge-danger' : 'badge-primary'}`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-accent)' }}>{user.points || 0} pts</strong>
                    </td>
                    <td>
                      <code style={{ fontSize: '12px', color: 'var(--color-primary-light)' }}>
                        {user.referral_code}
                      </code>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
