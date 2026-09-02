'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  Calendar,
  CreditCard,
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import KPICard from '@/components/admin/KPICard';
import SalesAnalyticsChart from '@/components/admin/SalesAnalyticsChart';
import { formatCurrency } from '@/lib/utils/format';
import type { Order, Product } from '@/types';

interface AdminAnalyticsClientProps {
  orders: Order[];
  products: Product[];
}

export default function AdminAnalyticsClient({ orders, products }: AdminAnalyticsClientProps) {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'all'>('month');

  // Filter orders by timeframe
  const filteredOrders = useMemo(() => {
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return orders.filter(o => {
      if (timeframe === 'all') return true;
      const orderDate = new Date(o.created_at).getTime();
      const diffMs = now - orderDate;

      if (timeframe === 'today') return diffMs <= oneDayMs;
      if (timeframe === 'week') return diffMs <= 7 * oneDayMs;
      if (timeframe === 'month') return diffMs <= 30 * oneDayMs;
      return true;
    });
  }, [orders, timeframe]);

  // Recalculate metrics based on filtered orders
  const metrics = useMemo(() => {
    const validOrders = filteredOrders.filter(o => o.status !== 'cancelled');
    const revenue = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const orderCount = filteredOrders.length;
    const aov = orderCount > 0 ? Math.round(revenue / Math.max(validOrders.length, 1)) : 0;
    const deliveredCount = filteredOrders.filter(o => o.status === 'delivered').length;
    const deliveryRate = orderCount > 0 ? Math.round((deliveredCount / orderCount) * 100) : 0;

    return { revenue, orderCount, aov, deliveredCount, deliveryRate };
  }, [filteredOrders]);

  // Order status breakdown
  const statusStats = useMemo(() => {
    const total = Math.max(filteredOrders.length, 1);
    const counts: Record<string, number> = {
      delivered: 0,
      shipped: 0,
      processing: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
    };

    filteredOrders.forEach(o => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });

    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      percent: Math.round((count / total) * 100),
    }));
  }, [filteredOrders]);

  // Payment method breakdown
  const paymentStats = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      cod: { count: 0, total: 0 },
      bkash: { count: 0, total: 0 },
      nagad: { count: 0, total: 0 },
    };

    filteredOrders.forEach(o => {
      const m = (o.payment_method || 'cod').toLowerCase();
      const key = m.includes('bkash') ? 'bkash' : m.includes('nagad') ? 'nagad' : 'cod';
      if (!counts[key]) counts[key] = { count: 0, total: 0 };
      counts[key].count += 1;
      if (o.status !== 'cancelled') {
        counts[key].total += Number(o.total) || 0;
      }
    });

    return counts;
  }, [filteredOrders]);

  // District distribution
  const districtStats = useMemo(() => {
    const dMap: Record<string, { count: number; total: number }> = {};
    filteredOrders.forEach(o => {
      const dist = o.shipping_address?.district || 'Dhaka';
      if (!dMap[dist]) dMap[dist] = { count: 0, total: 0 };
      dMap[dist].count += 1;
      if (o.status !== 'cancelled') {
        dMap[dist].total += Number(o.total) || 0;
      }
    });

    return Object.entries(dMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);
  }, [filteredOrders]);

  return (
    <div>
      {/* Timeframe Filter Buttons */}
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
            Analytics Period:
          </span>
          {[
            { label: 'Today (24h)', value: 'today' },
            { label: 'Last 7 Days', value: 'week' },
            { label: 'Last 30 Days', value: 'month' },
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

        <div style={{ fontSize: '13px', color: 'var(--color-admin-muted)', fontWeight: 600 }}>
          Displaying performance for {filteredOrders.length} customer orders
        </div>
      </div>

      {/* Recalculated KPI Cards */}
      <div className="admin-kpi-grid">
        <KPICard
          label="Period Gross Sales"
          value={formatCurrency(metrics.revenue)}
          change={`${timeframe.toUpperCase()} Revenue`}
          icon={DollarSign}
        />
        <KPICard
          label="Total Orders"
          value={metrics.orderCount}
          change="Customer checkouts"
          icon={ShoppingCart}
        />
        <KPICard
          label="Average Order Value"
          value={formatCurrency(metrics.aov)}
          change="Per successful order"
          icon={TrendingUp}
        />
        <KPICard
          label="Fulfillment Rate"
          value={`${metrics.deliveryRate}%`}
          change={`${metrics.deliveredCount} Delivered Orders`}
          icon={CheckCircle2}
        />
      </div>

      {/* Visual Analytics Chart */}
      <div style={{ marginBottom: '24px' }}>
        <SalesAnalyticsChart orders={filteredOrders} timeframe={timeframe} />
      </div>

      {/* 2-Column Insights Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Order Status Distribution */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Truck size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Fulfillment Pipeline Distribution
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {statusStats.map(s => {
              const statusColors: Record<string, string> = {
                delivered: '#22c55e',
                shipped: '#3b82f6',
                processing: '#06b6d4',
                confirmed: '#6366f1',
                pending: '#f59e0b',
                cancelled: '#ef4444',
              };
              const color = statusColors[s.status] || '#64748b';
              return (
                <div key={s.status}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--color-admin-text)' }}>{s.status}</span>
                    <span style={{ color: 'var(--color-admin-muted)' }}>
                      {s.count} orders ({s.percent}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--color-admin-surface-2)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${s.percent}%`,
                        height: '100%',
                        background: color,
                        borderRadius: '9999px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CreditCard size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Payment Methods Breakdown
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              { key: 'cod', label: 'Cash on Delivery (COD)', desc: 'Direct cash upon delivery', color: '#10b981' },
              { key: 'bkash', label: 'bKash Mobile Wallet', desc: 'Instant manual transfer verification', color: '#ec4899' },
              { key: 'nagad', label: 'Nagad Mobile Wallet', desc: 'Postal financial service', color: '#f97316' },
            ].map(m => {
              const data = paymentStats[m.key] || { count: 0, total: 0 };
              return (
                <div
                  key={m.key}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--color-admin-border)',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-admin-text)' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                      {data.count} Orders
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--color-primary)' }}>
                      {formatCurrency(data.total)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2-Column: Top Products & Top Districts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Top Selling Products */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={18} color="var(--color-primary)" />
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                Top Selling Products
              </h3>
            </div>
            <Link href="/admin/products" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none' }}>
              View Catalog →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.slice(0, 5).map((p, idx) => (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', minWidth: '20px' }}>
                    #{idx + 1}
                  </span>
                  {p.images?.[0] && (
                    <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-admin-border)' }}>
                      <Image src={p.images[0]} alt={p.name_en} fill style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--color-admin-text)' }}>{p.name_en}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                      {formatCurrency(p.sale_price ?? p.base_price)}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--color-admin-text)' }}>
                    {p.total_sold || 0} sold
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Bangladesh Districts */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <MapPin size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Top Districts by Sales Volume
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {districtStats.map(([district, data], idx) => (
              <div
                key={district}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-admin-border)',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', minWidth: '20px' }}>
                    #{idx + 1}
                  </span>
                  <div>
                    <strong style={{ fontSize: '14px', color: 'var(--color-admin-text)' }}>{district}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                      {data.count} Shipments
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-success)' }}>
                    {formatCurrency(data.total)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
