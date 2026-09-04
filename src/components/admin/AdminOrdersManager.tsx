'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, Eye, Calendar, ArrowUpDown, Filter, DollarSign, CheckCircle2, Clock, Truck } from 'lucide-react';
import { formatCurrency, formatDate, getStatusLabel } from '@/lib/utils/format';
import type { Order } from '@/types';

interface AdminOrdersManagerProps {
  initialOrders: Order[];
}

export default function AdminOrdersManager({ initialOrders }: AdminOrdersManagerProps) {
  const [orders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month' | 'quarter'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Filter & Sort Logic
  const filteredOrders = useMemo(() => {
    const now = new Date().getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return orders
      .filter(o => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchNum = o.order_number?.toLowerCase().includes(q);
          const matchName = o.shipping_address?.full_name?.toLowerCase().includes(q);
          const matchPhone = o.shipping_address?.phone?.toLowerCase().includes(q);
          const matchCity = o.shipping_address?.district?.toLowerCase().includes(q);
          const matchSender = (o.shipping_address as any)?.sender_phone?.toLowerCase().includes(q) || o.notes?.toLowerCase().includes(q);
          const matchTrx = o.payment_transaction_id?.toLowerCase().includes(q);
          if (!matchNum && !matchName && !matchPhone && !matchCity && !matchSender && !matchTrx) return false;
        }

        // Status
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;

        // Payment Method
        if (paymentFilter !== 'all') {
          const method = o.payment_method?.toLowerCase();
          if (paymentFilter === 'cod' && method !== 'cod' && method !== 'cash on delivery') return false;
          if (paymentFilter === 'bkash' && method !== 'bkash') return false;
          if (paymentFilter === 'nagad' && method !== 'nagad') return false;
        }

        // Time Range
        if (timeRange !== 'all') {
          const orderDate = new Date(o.created_at).getTime();
          const diffMs = now - orderDate;

          if (timeRange === 'today' && diffMs > oneDayMs) return false;
          if (timeRange === 'week' && diffMs > 7 * oneDayMs) return false;
          if (timeRange === 'month' && diffMs > 30 * oneDayMs) return false;
          if (timeRange === 'quarter' && diffMs > 90 * oneDayMs) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'highest') return (Number(b.total) || 0) - (Number(a.total) || 0);
        if (sortBy === 'lowest') return (Number(a.total) || 0) - (Number(b.total) || 0);
        return 0;
      });
  }, [orders, search, statusFilter, timeRange, paymentFilter, sortBy]);

  // Metrics on filtered view
  const metrics = useMemo(() => {
    const totalRev = filteredOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const deliveredCount = filteredOrders.filter(o => o.status === 'delivered').length;
    const pendingCount = filteredOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;

    return { totalRev, deliveredCount, pendingCount, count: filteredOrders.length };
  }, [filteredOrders]);

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
      {/* Quick Time Range Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="var(--color-primary)" />
            Timeframe:
          </span>
          {[
            { label: 'All Time', value: 'all' },
            { label: 'Today (24h)', value: 'today' },
            { label: 'Last 7 Days', value: 'week' },
            { label: 'This Month (30d)', value: 'month' },
            { label: 'Quarter (90d)', value: 'quarter' },
          ].map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTimeRange(t.value as any)}
              className="btn btn-sm"
              style={{
                background: timeRange === t.value ? 'var(--color-primary)' : '#ffffff',
                color: timeRange === t.value ? '#ffffff' : 'var(--color-admin-text)',
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

        {/* Live Filter Summary Pills */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
            Orders: <span style={{ color: 'var(--color-primary)' }}>{metrics.count}</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
            Total: <span style={{ color: 'var(--color-success)' }}>{formatCurrency(metrics.totalRev)}</span>
          </div>
        </div>
      </div>

      {/* Control Filters Bar */}
      <div
        className="admin-card"
        style={{
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-admin-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search order #, customer, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
          />
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <select
            className="admin-input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: '160px', height: '38px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Payment Method */}
          <select
            className="admin-input"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            style={{ width: '160px', height: '38px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            <option value="all">All Payments</option>
            <option value="cod">Cash on Delivery</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
          </select>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} color="var(--color-admin-muted)" />
            <select
              className="admin-input"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{ width: '180px', height: '38px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="newest">Date: Newest First</option>
              <option value="oldest">Date: Oldest First</option>
              <option value="highest">Amount: High to Low</option>
              <option value="lowest">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 16px', color: 'var(--color-admin-muted)' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '8px' }}>
              No matching orders found
            </h3>
            <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
              Try adjusting your timeframe (Days, Weeks, Months), order status, or search query.
            </p>
          </div>
        ) : (
          <div className="admin-table-container" style={{ border: 'none', borderRadius: '0' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer / Contact</th>
                  <th>Date & Time</th>
                  <th>Payment</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const addr = order.shipping_address || {};
                  return (
                    <tr key={order.id}>
                      <td>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          style={{
                            fontWeight: 800,
                            color: 'var(--color-primary)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          #{order.order_number}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-admin-text)' }}>
                          {addr.full_name || 'Customer'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                          {addr.phone || 'No phone'} {addr.district ? `• ${addr.district}` : ''}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-admin-text)' }}>
                          {formatDate(order.created_at)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const senderPhone = (addr as any)?.sender_phone || order.payment_sender_phone || (order.notes?.includes('Payment Sender:') ? order.notes.split('Payment Sender:')[1]?.trim()?.split(' ')[0] : null);
                          const isBkash = order.payment_method?.toLowerCase() === 'bkash';
                          const isNagad = order.payment_method?.toLowerCase() === 'nagad';
                          const methodColor = isBkash ? '#e2136e' : isNagad ? '#f97316' : '#2563eb';
                          const methodBg = isBkash ? 'rgba(226, 19, 110, 0.1)' : isNagad ? 'rgba(249, 115, 22, 0.1)' : 'rgba(37, 99, 235, 0.1)';

                          return (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: methodBg,
                                    color: methodColor,
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  {(order.payment_method || 'COD').toUpperCase()}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-full)',
                                    background: order.payment_status === 'confirmed' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                                    color: order.payment_status === 'confirmed' ? 'var(--color-success)' : '#d97706',
                                  }}
                                >
                                  {order.payment_status?.toUpperCase() || 'PENDING'}
                                </span>
                              </div>

                              {/* Synced Sender Phone Number */}
                              {senderPhone && (
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-text)', marginTop: '4px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--color-admin-muted)', fontWeight: 600 }}>FROM:</span> {senderPhone}
                                </div>
                              )}

                              {/* Synced TrxID */}
                              {order.payment_transaction_id && (
                                <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 600 }}>TRX:</span> <code style={{ fontSize: '11px', color: methodColor, fontWeight: 700 }}>{order.payment_transaction_id}</code>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <strong style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                          {formatCurrency(order.total)}
                        </strong>
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
                            padding: '6px 12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} />
                          <span>View</span>
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
    </div>
  );
}
