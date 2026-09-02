'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Package,
  Eye,
} from 'lucide-react';
import KPICard from '@/components/admin/KPICard';
import SalesAnalyticsChart from '@/components/admin/SalesAnalyticsChart';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import type { Order, Product } from '@/types';

interface AdminDashboardClientProps {
  initialOrders: Order[];
  totalCustomers: number;
  lowStockProducts: Product[];
}

export default function AdminDashboardClient({
  initialOrders,
  totalCustomers,
  lowStockProducts,
}: AdminDashboardClientProps) {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Filter orders by timeframe
  const filteredOrders = useMemo(() => {
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return initialOrders.filter(o => {
      if (timeframe === 'all') return true;
      const orderDate = new Date(o.created_at).getTime();
      const diffMs = now - orderDate;

      if (timeframe === 'today') return diffMs <= oneDayMs;
      if (timeframe === 'week') return diffMs <= 7 * oneDayMs;
      if (timeframe === 'month') return diffMs <= 30 * oneDayMs;
      return true;
    });
  }, [initialOrders, timeframe]);

  // Recalculate metrics
  const metrics = useMemo(() => {
    const validOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    const revenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingPayments = filteredOrders.filter(
      o => o.payment_status === 'submitted' || o.payment_status === 'pending'
    ).length;

    return {
      revenue,
      orderCount: filteredOrders.length,
      pendingPayments,
    };
  }, [filteredOrders]);

  const recentOrders = filteredOrders.slice(0, 6);

  const statusBadges: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-primary',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
  };

  return (
    <div>
      {/* Timeframe Controls Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--color-primary)" />
            Dashboard Timeframe:
          </span>
          {[
            { label: 'Today (24h)', value: 'today' },
            { label: 'Last 7 Days', value: 'week' },
            { label: 'This Month (30d)', value: 'month' },
            { label: 'All Time', value: 'all' },
          ].map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTimeframe(t.value as any)}
              className="btn btn-sm"
              style={{
                background: timeframe === t.value ? 'var(--color-primary)' : '#ffffff',
                color: timeframe === t.value ? '#ffffff' : 'var(--color-admin-text)',
                border: '1px solid var(--color-admin-border)',
                fontWeight: 700,
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
          <Link
            href="/admin/customize"
            className="btn btn-secondary btn-sm"
            style={{ background: '#ffffff', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)' }}
          >
            <Sparkles size={14} color="var(--color-primary)" />
            <span>Customize Store</span>
          </Link>
        </div>
      </div>

      {/* Dynamic KPI Cards */}
      <div className="admin-kpi-grid">
        <KPICard
          label="Total Revenue"
          value={formatCurrency(metrics.revenue)}
          change={`${timeframe.toUpperCase()} Gross Sales`}
          icon={DollarSign}
        />
        <KPICard
          label="Total Orders"
          value={metrics.orderCount}
          change={`${timeframe.toUpperCase()} Purchases`}
          icon={ShoppingBag}
        />
        <KPICard
          label="Pending Payments"
          value={metrics.pendingPayments}
          change="Requires Action"
          icon={AlertTriangle}
        />
        <KPICard
          label="Total Customers"
          value={totalCustomers}
          change="Registered Profiles"
          icon={Users}
        />
      </div>

      {/* Visual Analytics Chart */}
      <div style={{ marginBottom: '24px' }}>
        <SalesAnalyticsChart orders={filteredOrders} timeframe={timeframe} />
      </div>

      {/* 2-Column: Recent Orders & Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Recent Orders Table */}
        <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-admin-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Recent Orders ({recentOrders.length})
            </h2>
            <Link
              href="/admin/orders"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-admin-muted)' }}>
              No orders found in this timeframe.
            </div>
          ) : (
            <div className="admin-table-container" style={{ border: 'none', borderRadius: '0' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => {
                    const addr = order.shipping_address || {};
                    return (
                      <tr key={order.id}>
                        <td>
                          <strong style={{ color: 'var(--color-primary)' }}>#{order.order_number}</strong>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{addr.full_name || 'Customer'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                            {formatDate(order.created_at)}
                          </div>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--color-admin-text)' }}>{formatCurrency(order.total)}</strong>
                        </td>
                        <td>
                          <span className={`badge ${statusBadges[order.status] || 'badge-info'}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="btn btn-secondary btn-sm"
                            style={{
                              background: '#ffffff',
                              color: 'var(--color-admin-text)',
                              borderColor: 'var(--color-admin-border)',
                              padding: '4px 10px',
                            }}
                          >
                            <Eye size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Inventory Alert */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--color-warning)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                Low Stock Warnings
              </h2>
            </div>
            <Link
              href="/admin/inventory"
              style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              Inventory Hub →
            </Link>
          </div>

          {lowStockProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--color-admin-muted)' }}>
              <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, color: 'var(--color-admin-text)' }}>Inventory Levels Healthy</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>No items are under minimum stock thresholds.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowStockProducts.map(p => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-admin-border)',
                    background: '#ffffff',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--color-admin-text)' }}>{p.name_en}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                      SKU: {p.sku} • {formatCurrency(p.base_price)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: 'var(--color-danger)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      {p.stock_quantity} left
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
