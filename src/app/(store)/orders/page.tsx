'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import { Package, ArrowRight, ShoppingBag } from 'lucide-react';
import type { Order } from '@/types';

export default function UserOrdersPage() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) {
      const supabase = createClient();
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setOrders(data as Order[]);
          }
          setFetching(false);
        });
    } else if (!loading) {
      setFetching(false);
    }
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading your orders...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Please Sign In</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Sign in to track your current purchases and view past orders.
        </p>
        <Link href="/auth?redirect=/orders" className="btn btn-primary" id="signin-to-view-orders-btn">
          Sign In Now
        </Link>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <div style={{ maxWidth: '380px', margin: '0 auto' }}>
          <Package size={48} color="var(--color-primary)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>No Orders Found</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            You haven't placed any orders with us yet.
          </p>
          <Link href="/" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 16px 80px', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '24px' }}>My Order History</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {orders.map(order => (
          <div
            key={order.id}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--color-text-primary)' }}>
                  #{order.order_number}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginLeft: '8px' }}>
                  {formatDate(order.created_at)}
                </span>
              </div>
              <span className={`badge badge-${order.status}`}>{getStatusLabel(order.status)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Items: </span>
                <strong>{(order.items_snapshot || []).reduce((acc, i) => acc + i.quantity, 0)}</strong>
                <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>|</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Total: </span>
                <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(order.total)}</strong>
              </div>

              <Link
                href={`/orders/${order.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontWeight: 700, fontSize: '13px' }}
              >
                <span>Track Order</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
