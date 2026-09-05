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
        .select('*')
        .order('created_at', { ascending: false })
        .limit(250),
      dbClient
        .from('profiles')
        .select('id', { count: 'exact', head: true }),
      dbClient
        .from('products')
        .select('id, name_en, slug, sku, stock_quantity, low_stock_threshold, base_price, sale_price, images')
        .order('stock_quantity', { ascending: true })
        .limit(50),
    ]);

    orders = (ordersRes.data as unknown as Order[]) || [];
    totalCustomersCount = profilesRes.count || 0;
    
    // Dynamically filter products at or below their custom low_stock_threshold (fallback: 5)
    const allProducts = (productsRes.data as Product[]) || [];
    lowStockProducts = allProducts.filter(
      p => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5)
    ).slice(0, 20);
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
