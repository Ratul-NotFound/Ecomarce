import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminAnalyticsClient from '@/components/admin/AdminAnalyticsClient';
import type { Order, Product } from '@/types';

export const revalidate = 0;

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  const [ordersRes, productsRes] = await Promise.all([
    dbClient.from('orders').select('*').order('created_at', { ascending: false }),
    dbClient.from('products').select('*').order('total_sold', { ascending: false }).limit(10),
  ]);

  const orders = (ordersRes.data as Order[]) || [];
  const products = (productsRes.data as Product[]) || [];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Store Traffic & Analytics</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Monitor real-time website traffic, hourly/daily/weekly/monthly trends, unique visitor IPs, and revenue performance.
          </p>
        </div>
      </div>

      <AdminAnalyticsClient orders={orders} products={products} />
    </div>
  );
}
