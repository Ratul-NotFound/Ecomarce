import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';
import type { Order, Product } from '@/types';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient();

  let orders: Order[] = [];
  let totalCustomersCount = 0;
  let lowStockProducts: Product[] = [];

  try {
    const [ordersRes, profilesRes, productsRes] = await Promise.all([
      dbClient
        .from('orders')
        .select('id, order_number, customer_name, customer_phone, customer_email, total, status, payment_status, payment_method, shipping_address, created_at')
        .order('created_at', { ascending: false })
        .limit(250),
      dbClient
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
      dbClient
        .from('products')
        .select('id, name_en, slug, stock_quantity, low_stock_threshold, base_price, sale_price, images')
        .lte('stock_quantity', 5)
        .order('stock_quantity', { ascending: true })
        .limit(20),
    ]);

    orders = (ordersRes.data as unknown as Order[]) || [];
    totalCustomersCount = profilesRes.count || 0;
    lowStockProducts = (productsRes.data as Product[]) || [];
  } catch (err) {
    console.error('Failed to load admin metrics:', err);
  }

  return (
    <div suppressHydrationWarning>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Executive Dashboard</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Live store operations overview, visual sales graphs, and fulfillment tracking.
          </p>
        </div>
      </div>

      <AdminDashboardClient
        initialOrders={orders}
        totalCustomers={totalCustomersCount}
        lowStockProducts={lowStockProducts}
      />
    </div>
  );
}
