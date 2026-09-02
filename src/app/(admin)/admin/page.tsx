import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import KPICard from '@/components/admin/KPICard';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import {
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
  Sparkles,
  Package,
} from 'lucide-react';
import type { Order, Product } from '@/types';

export const revalidate = 0; // Fresh metrics on every view

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  let totalRevenue = 0;
  let totalOrdersCount = 0;
  let pendingPaymentsCount = 0;
  let totalCustomersCount = 0;
  let recentOrders: Order[] = [];
  let lowStockProducts: Product[] = [];

  try {
    const [ordersRes, profilesRes, productsRes] = await Promise.all([
      dbClient.from('orders').select('*').order('created_at', { ascending: false }),
      dbClient.from('profiles').select('id', { count: 'exact' }),
      dbClient.from('products').select('*').lte('stock_quantity', 5).order('stock_quantity', { ascending: true }),
    ]);

    const orders = (ordersRes.data as Order[]) || [];
    totalOrdersCount = orders.length;
    totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    pendingPaymentsCount = orders.filter(o => o.payment_status === 'submitted' || o.payment_status === 'pending').length;
    recentOrders = orders.slice(0, 6);
    totalCustomersCount = profilesRes.count || 0;
    lowStockProducts = (productsRes.data as Product[]) || [];
  } catch (err) {
    console.error('Failed to load admin metrics:', err);
  }

  return (
    <div suppressHydrationWarning>
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Executive Dashboard</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Store operations overview, live sales metrics, and pending fulfillments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/admin/products/new" className="btn btn-primary btn-sm" id="admin-add-product-btn">
            <Plus size={14} />
            <span>Add New Product</span>
          </Link>
          <Link
            href="/admin/customize"
            className="btn btn-secondary btn-sm"
            style={{ background: 'var(--color-admin-surface-2)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)' }}
          >
            <Sparkles size={14} />
            <span>Customize Store</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        <KPICard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          change="Lifetime Gross Sales"
          icon={DollarSign}
        />
        <KPICard
          label="Total Orders"
          value={totalOrdersCount}
          change="Customer Purchases"
          icon={ShoppingBag}
        />
        <KPICard
          label="Pending Payments"
          value={pendingPaymentsCount}
          change={pendingPaymentsCount > 0 ? '⚠️ Action Required' : 'All Clear'}
          icon={AlertTriangle}
        />
        <KPICard
          label="Registered Users"
          value={totalCustomersCount}
          change="Customer Profiles"
          icon={Users}
        />
      </div>

      {/* Low Stock Notification Alert */}
      {lowStockProducts.length > 0 && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-xl)', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} color="var(--color-danger)" />
            <div>
              <strong style={{ color: 'var(--color-admin-text)', fontSize: '14px' }}>
                {lowStockProducts.length} Product(s) Running Low on Stock!
              </strong>
              <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                {lowStockProducts.slice(0, 3).map(p => `${p.name_en} (${p.stock_quantity} left)`).join(', ')}
              </div>
            </div>
          </div>
          <Link href="/admin/inventory" className="btn btn-danger btn-sm">
            Restock Inventory →
          </Link>
        </div>
      )}

      {/* Recent Orders Section */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-admin-text)' }}>Recent Orders</h2>
          <Link href="/admin/orders" style={{ fontSize: '13px', color: 'var(--color-primary-light)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>View All Orders</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-admin-muted)' }}>
            No customer orders placed yet.
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <strong>#{order.order_number}</strong>
                    </td>
                    <td>
                      <div>{order.shipping_address?.full_name || 'Customer'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                        {order.shipping_address?.district}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>
                      {formatCurrency(order.total)}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: order.payment_status === 'confirmed' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {order.payment_method.toUpperCase()} ({order.payment_status})
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${order.status}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ background: 'var(--color-admin-surface-2)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', padding: '4px 10px' }}
                      >
                        Manage
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
