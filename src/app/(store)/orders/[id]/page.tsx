import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import OrderTimeline from '@/components/store/OrderTimeline';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import { CheckCircle, FileText, ArrowLeft, ShieldCheck, Phone, MapPin } from 'lucide-react';
import type { Order } from '@/types';

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
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
    <div className="container" style={{ padding: '32px 16px 80px', maxWidth: '840px' }}>
      {/* Header breadcrumb & actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link href="/orders" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600 }}>
          <ArrowLeft size={16} />
          <span>My Orders</span>
        </Link>

        <a
          href={`/api/invoices/${order.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          id="download-invoice-btn"
        >
          <FileText size={16} />
          <span>View Invoice / রশিদ</span>
        </a>
      </div>

      {/* Main Order Card */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-2xl)', padding: '32px', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Order #{order.order_number}</h1>
              <span className={`badge badge-${order.status}`}>{getStatusLabel(order.status)}</span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Placed on {formatDate(order.created_at)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Payment Status</div>
            <div style={{ fontWeight: 800, color: order.payment_status === 'confirmed' ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {order.payment_status.toUpperCase()} ({order.payment_method.toUpperCase()})
            </div>
          </div>
        </div>

        {/* Live Timeline Tracking */}
        <OrderTimeline status={order.status} events={order.tracking_info} />

        {/* Delivery Address & Contact */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', background: 'var(--color-surface-2)', padding: '20px', borderRadius: 'var(--radius-xl)', margin: '24px 0' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              <MapPin size={14} />
              <span>Delivery Address</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{order.shipping_address.full_name}</div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {order.shipping_address.street_address}, {order.shipping_address.upazila}, {order.shipping_address.district}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
              <Phone size={14} />
              <span>Recipient Contact</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{order.shipping_address.phone}</div>
            {order.payment_transaction_id && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                TrxID: <code>{order.payment_transaction_id}</code>
              </div>
            )}
          </div>
        </div>

        {/* Items List */}
        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px' }}>Order Items</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px', marginBottom: '20px' }}>
          {(order.items_snapshot || []).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
              <div>
                <strong>{item.quantity}x</strong> {item.name_snapshot}
              </div>
              <div style={{ fontWeight: 700 }}>
                {formatCurrency(item.total_price)}
              </div>
            </div>
          ))}
        </div>

        {/* Total Cost Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', maxWidth: '300px', marginLeft: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
            <span>Shipping</span>
            <span>{formatCurrency(order.shipping_fee)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-danger)' }}>
              <span>Discount</span>
              <span>-{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '18px', borderTop: '1px solid var(--color-border)', paddingTop: '10px', color: 'var(--color-primary)' }}>
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
