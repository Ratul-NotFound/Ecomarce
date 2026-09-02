import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import { ShoppingBag, Search, Eye } from 'lucide-react';
import type { Order } from '@/types';

export const revalidate = 0;

interface AdminOrdersPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const sParams = await searchParams;
  const statusFilter = sParams.status || '';
  const search = sParams.search || '';

  const supabase = await createClient();
  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  let query = dbClient.from('orders').select('*').order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  if (search) {
    query = query.ilike('order_number', `%${search}%`);
  }

  const { data } = await query;
  const orders = (data as Order[]) || [];

  const tabs = [
    { label: 'All Orders', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Orders & Fulfillment</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Verify customer payments, update courier tracking status, and inspect delivery addresses.
          </p>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
        {tabs.map(tab => (
          <Link
            key={tab.value}
            href={`/admin/orders${tab.value ? `?status=${tab.value}` : ''}`}
            className={`btn ${statusFilter === tab.value ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{
              background: statusFilter === tab.value ? 'var(--color-primary)' : 'var(--color-admin-surface)',
              color: 'var(--color-admin-text)',
              borderColor: 'var(--color-admin-border)',
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Orders Table Card */}
      <div className="admin-card">
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-admin-muted)' }}>
            <ShoppingBag size={36} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <p style={{ fontSize: '15px' }}>No orders found under this status filter.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer Info</th>
                  <th>Method & TrxID</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <strong style={{ color: 'var(--color-primary-light)' }}>#{order.order_number}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-admin-text)' }}>
                        {order.shipping_address?.full_name || 'Customer'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                        📞 {order.shipping_address?.phone} • {order.shipping_address?.district}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{order.payment_method.toUpperCase()}</div>
                      {order.payment_transaction_id && (
                        <code style={{ fontSize: '11px', color: 'var(--color-primary-light)' }}>
                          Trx: {order.payment_transaction_id}
                        </code>
                      )}
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-admin-text)' }}>{formatCurrency(order.total)}</td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: order.payment_status === 'confirmed' ? 'var(--color-success)' : 'var(--color-warning)',
                        }}
                      >
                        {order.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${order.status}`}>{getStatusLabel(order.status)}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ background: 'var(--color-admin-surface-2)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', padding: '6px 12px' }}
                      >
                        <Eye size={14} />
                        <span>Manage</span>
                      </Link>
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
