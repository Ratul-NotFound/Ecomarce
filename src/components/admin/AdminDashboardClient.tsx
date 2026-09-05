'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  DollarSign,
  ShoppingBag,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
  Palette,
  Calendar,
  Clock,
  CheckCircle2,
  Package,
  Eye,
  RefreshCw,
  Zap,
} from 'lucide-react';
import KPICard from '@/components/admin/KPICard';
import SalesAnalyticsChart from '@/components/admin/SalesAnalyticsChart';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import { getOptimizedImageUrl } from '@/lib/utils/images';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/shared/ToastProvider';
import type { Order, Product } from '@/types';

interface AdminDashboardClientProps {
  initialOrders: Order[];
  totalCustomers: number;
  lowStockProducts: Product[];
}

export default function AdminDashboardClient({
  initialOrders,
  totalCustomers: initialTotalCustomers,
  lowStockProducts: initialLowStockProducts,
}: AdminDashboardClientProps) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [totalCustomers, setTotalCustomers] = useState<number>(initialTotalCustomers);
  const [lowStock, setLowStock] = useState<Product[]>(initialLowStockProducts);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [hasNewOrdersLive, setHasNewOrdersLive] = useState(false);

  // Sync state if SSR props change
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    setTotalCustomers(initialTotalCustomers);
  }, [initialTotalCustomers]);

  useEffect(() => {
    setLowStock(initialLowStockProducts);
  }, [initialLowStockProducts]);

  // Fetch fresh orders and metrics from client
  const refreshDashboardData = useCallback(async (showNotification = false) => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const [ordersRes, profilesRes, productsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(250),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('products')
          .select('id, name_en, slug, sku, stock_quantity, low_stock_threshold, base_price, sale_price, images')
          .order('stock_quantity', { ascending: true })
          .limit(50),
      ]);

      if (ordersRes.data) {
        setOrders(ordersRes.data as unknown as Order[]);
      }
      if (typeof profilesRes.count === 'number') {
        setTotalCustomers(profilesRes.count);
      }
      if (productsRes.data) {
        const prods = productsRes.data as Product[];
        setLowStock(
          prods.filter(p => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 5)).slice(0, 20)
        );
      }

      setLastRefreshedAt(new Date());
      setHasNewOrdersLive(false);
      if (showNotification) {
        showToast('Dashboard metrics synchronized with live database!', 'success');
      }
    } catch (err) {
      console.error('Failed to refresh dashboard metrics:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Supabase Realtime Subscription for live updates
  useEffect(() => {
    const supabase = createClient();
    const ordersChannel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          setHasNewOrdersLive(true);
          refreshDashboardData(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          refreshDashboardData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [refreshDashboardData]);

  // Filter orders by timeframe using accurate calendar boundaries
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter(o => {
      if (timeframe === 'all') return true;
      const orderDate = new Date(o.created_at);

      if (timeframe === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return orderDate.getTime() >= startOfDay;
      }
      if (timeframe === 'week') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        return orderDate.getTime() >= sevenDaysAgo;
      }
      if (timeframe === 'month') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
        return orderDate.getTime() >= thirtyDaysAgo;
      }
      return true;
    });
  }, [orders, timeframe]);

  // Recalculate metrics
  const metrics = useMemo(() => {
    const validOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    const revenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingPaymentOrders = filteredOrders.filter(
      o => o.payment_status === 'submitted' || o.payment_status === 'pending'
    );

    return {
      revenue,
      orderCount: filteredOrders.length,
      pendingPayments: pendingPaymentOrders.length,
      pendingPaymentOrders,
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
      {/* Timeframe Controls Bar & Real-time status */}
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
            { label: 'Today', value: 'today' },
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Real-time Refresh Button */}
          <button
            type="button"
            onClick={() => refreshDashboardData(true)}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{
              background: '#ffffff',
              color: 'var(--color-admin-text)',
              borderColor: 'var(--color-admin-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              position: 'relative',
            }}
            title={`Last updated: ${lastRefreshedAt.toLocaleTimeString()}`}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : undefined }} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
            {hasNewOrdersLive && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: 'var(--color-danger)',
                  border: '2px solid #ffffff',
                }}
              />
            )}
          </button>

          <Link href="/admin/products/new" className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
          <Link
            href="/admin/customize"
            className="btn btn-secondary btn-sm"
            style={{ background: '#ffffff', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)' }}
          >
            <Palette size={14} color="var(--color-primary)" />
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
          change="Requires Verification"
          icon={AlertTriangle}
        />
        <KPICard
          label="Total Customers"
          value={totalCustomers}
          change="Registered Profiles"
          icon={Users}
        />
      </div>

      {/* Pending Payments Alert Section (Quick Action) */}
      {metrics.pendingPayments > 0 && (
        <div
          className="admin-card"
          style={{
            marginBottom: '24px',
            background: 'linear-gradient(to right, #fffbeb, #ffffff)',
            borderLeft: '4px solid #f59e0b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '6px', borderRadius: 'var(--radius-md)', color: '#d97706' }}>
                <Zap size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Action Needed: {metrics.pendingPayments} Payment{metrics.pendingPayments > 1 ? 's' : ''} Pending Verification
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                  Orders submitted via bKash / Nagad awaiting admin TrxID confirmation before fulfillment.
                </p>
              </div>
            </div>
            <Link
              href="/admin/orders?payment=submitted"
              className="btn btn-sm"
              style={{ background: '#d97706', color: '#ffffff', fontWeight: 700, fontSize: '12px', border: 'none' }}
            >
              Verify In Orders List →
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {metrics.pendingPaymentOrders.slice(0, 4).map(o => {
              const isBkash = o.payment_method?.toLowerCase() === 'bkash';
              return (
                <div
                  key={o.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--color-admin-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--color-primary)' }}>#{o.order_number}</strong>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isBkash ? 'rgba(226, 19, 110, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                          color: isBkash ? '#e2136e' : '#ea580c',
                          textTransform: 'uppercase',
                        }}
                      >
                        {o.payment_method}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                      {o.shipping_address?.full_name || 'Customer'} • {formatCurrency(o.total)}
                    </div>
                  </div>

                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Verify
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

        {/* Low Stock Inventory Alert with Image Thumbnails */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="var(--color-warning)" />
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                Low Stock Warnings ({lowStock.length})
              </h2>
            </div>
            <Link
              href="/admin/inventory"
              style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              Inventory Hub →
            </Link>
          </div>

          {lowStock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--color-admin-muted)' }}>
              <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, color: 'var(--color-admin-text)' }}>Inventory Levels Healthy</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>No items are under minimum stock thresholds.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowStock.map(p => {
                const imgUrl = p.images?.[0] ? getOptimizedImageUrl(p.images[0], 'thumb') : null;
                return (
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
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-admin-surface-2)',
                          overflow: 'hidden',
                          position: 'relative',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {imgUrl ? (
                          <Image
                            src={imgUrl}
                            alt={p.name_en}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="40px"
                          />
                        ) : (
                          <Package size={18} color="var(--color-admin-muted)" />
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <Link
                          href={`/admin/products/${p.id}`}
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: 'var(--color-admin-text)',
                            textDecoration: 'none',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {p.name_en}
                        </Link>
                        <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                          SKU: {p.sku || 'N/A'} • {formatCurrency(p.base_price)}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: (p.stock_quantity ?? 0) === 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: (p.stock_quantity ?? 0) === 0 ? 'var(--color-danger)' : '#d97706',
                          border: (p.stock_quantity ?? 0) === 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        {p.stock_quantity} left
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
