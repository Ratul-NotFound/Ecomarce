import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import { getOptimizedImageUrl } from '@/lib/utils/images';
import { ArrowLeft, FileText, Phone, MapPin, User, ShieldCheck, CreditCard, Tag, Printer, Package } from 'lucide-react';
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
      {/* Header navigation & multi-format print action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          href="/admin/orders"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-primary-light)', fontWeight: 600 }}
        >
          <ArrowLeft size={14} />
          <span>Back to All Orders</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Shipping Tag (6-Up Format) */}
          <a
            href={`/api/invoices/${order.id}?type=tag&layout=6-up`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ background: 'var(--color-admin-surface-2)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Tag size={14} color="#059669" />
            <span>🏷️ Shipping Tag</span>
          </a>

          {/* Thermal Label (4x6) */}
          <a
            href={`/api/invoices/${order.id}?type=tag&layout=thermal`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ background: 'var(--color-admin-surface-2)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} color="#64748b" />
            <span>Thermal (4x6)</span>
          </a>

          {/* Full A4 Invoice */}
          <a
            href={`/api/invoices/${order.id}?type=standard`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={14} />
            <span>📄 Print A4 Invoice</span>
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Order Summary & Item Snapshot */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-admin-border)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-admin-text)' }}>
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
              {order.shipping_address?.sender_phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-admin-text)' }}>
                  <CreditCard size={14} color="var(--color-primary-light)" />
                  <span>Payment Sent From: <strong>{order.shipping_address.sender_phone}</strong></span>
                </div>
              )}
            </div>

            {/* Items table */}
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '12px', textTransform: 'uppercase' }}>
              Items Ordered ({order.items_snapshot?.length || 0})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--color-admin-border)', paddingBottom: '16px', marginBottom: '16px' }}>
              {(order.items_snapshot || []).map((item, idx) => {
                const img = item.image_snapshot ? getOptimizedImageUrl(item.image_snapshot, 'thumb') : null;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '13px', color: 'var(--color-admin-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-admin-surface-2)',
                          overflow: 'hidden',
                          position: 'relative',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--color-admin-border)',
                        }}
                      >
                        {img ? (
                          <Image
                            src={img}
                            alt={item.name_snapshot}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="44px"
                          />
                        ) : (
                          <Package size={18} color="var(--color-admin-muted)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        {item.product_id ? (
                          <Link
                            href={`/admin/products/${item.product_id}`}
                            style={{ fontWeight: 700, color: 'var(--color-admin-text)', textDecoration: 'none' }}
                          >
                            {item.name_snapshot}
                          </Link>
                        ) : (
                          <div style={{ fontWeight: 700 }}>{item.name_snapshot}</div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                          Qty: <strong>{item.quantity}</strong> × {formatCurrency(item.unit_price)}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, color: 'var(--color-admin-text)', flexShrink: 0 }}>
                      {formatCurrency(item.total_price)}
                    </div>
                  </div>
                );
              })}
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
