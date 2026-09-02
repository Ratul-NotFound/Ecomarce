import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import { ArrowLeft, FileText, Phone, MapPin, User, ShieldCheck } from 'lucide-react';
import AdminOrderDetailClient from './AdminOrderDetailClient';
import type { Order } from '@/types';

interface AdminOrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  let query = dbClient.from('orders').select('*');
  if (id.startsWith('EC-')) {
    query = query.eq('order_number', id);
  } else {
    query = query.eq('id', id);
  }

  const { data, error } = await query.single();
  if (error || !data) {
    notFound();
  }

  const order = data as Order;

  return (
    <div>
      {/* Header navigation & invoice print button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link
          href="/admin/orders"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-primary-light)', fontWeight: 600 }}
        >
          <ArrowLeft size={14} />
          <span>Back to All Orders</span>
        </Link>

        <a
          href={`/api/invoices/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{ background: 'var(--color-admin-surface-2)', color: '#ffffff', borderColor: 'var(--color-admin-border)' }}
        >
          <FileText size={14} />
          <span>Print / Export Invoice</span>
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Order Summary & Item Snapshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-admin-border)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff' }}>
                  Order #{order.order_number}
                </h1>
                <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                  Placed on {formatDate(order.created_at)}
                </div>
              </div>

              <span className={`badge badge-${order.status}`}>{getStatusLabel(order.status)}</span>
            </div>

            {/* Customer Details */}
            <div style={{ background: 'var(--color-admin-surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#ffffff' }}>
                <User size={14} color="var(--color-primary-light)" />
                <strong>{order.shipping_address?.full_name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-admin-text)' }}>
                <Phone size={14} color="var(--color-primary-light)" />
                <span>{order.shipping_address?.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-admin-text)' }}>
                <MapPin size={14} color="var(--color-primary-light)" />
                <span>{order.shipping_address?.street_address}, {order.shipping_address?.upazila}, {order.shipping_address?.district}</span>
              </div>
            </div>

            {/* Items table */}
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '12px', textTransform: 'uppercase' }}>
              Items Ordered
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderBottom: '1px solid var(--color-admin-border)', paddingBottom: '16px', marginBottom: '16px' }}>
              {(order.items_snapshot || []).map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-admin-text)' }}>
                  <div>
                    <strong>{item.quantity}x</strong> {item.name_snapshot}
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {formatCurrency(item.total_price)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--color-admin-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping Fee</span>
                <span>{formatCurrency(order.shipping_fee)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-light)', borderTop: '1px solid var(--color-admin-border)', paddingTop: '10px' }}>
                <span>Total Amount</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Moderator Verification and Status Controls */}
        <div>
          <AdminOrderDetailClient order={order} />
        </div>
      </div>
    </div>
  );
}
