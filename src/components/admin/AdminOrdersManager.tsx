'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Eye,
  Calendar,
  ArrowUpDown,
  Filter,
  Printer,
  Tag,
  Package,
  CheckSquare,
  Square,
  X,
  RefreshCw,
  Layers,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
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

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Picking & Fulfillment Hub Modal State
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [hubTimeframe, setHubTimeframe] = useState<'1h' | 'today' | '7d' | '30d' | 'selected'>('today');
  const [hubLoading, setHubLoading] = useState(false);
  const [hubSummary, setHubSummary] = useState<any>(null);

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
          const matchSender =
            (o.shipping_address as any)?.sender_phone?.toLowerCase().includes(q) ||
            o.notes?.toLowerCase().includes(q);
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

  // Handle Multi-Selection
  const isAllSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedIds.has(o.id));
  const isSomeSelected = filteredOrders.some(o => selectedIds.has(o.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<string>();
      filteredOrders.forEach(o => next.add(o.id));
      setSelectedIds(next);
    }
  };

  const toggleSelectOrder = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Fetch Hub Summary on timeframe change or open
  useEffect(() => {
    if (!isHubOpen) return;

    setHubLoading(true);
    let url = `/api/admin/orders/summary?timeframe=${hubTimeframe}`;
    if (hubTimeframe === 'selected' && selectedIds.size > 0) {
      url = `/api/admin/orders/summary?ids=${Array.from(selectedIds).join(',')}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setHubSummary(data);
        }
      })
      .catch(() => {})
      .finally(() => setHubLoading(false));
  }, [isHubOpen, hubTimeframe, selectedIds]);

  const statusBadges: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-primary',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
  };

  // Helper for batch print URLs
  const getBatchPrintUrl = (type: 'standard' | 'tags' | 'manifest', layout: string = '6-up') => {
    if (selectedIds.size > 0) {
      const ids = Array.from(selectedIds).join(',');
      return `/api/invoices/batch?ids=${ids}&type=${type}&layout=${layout}`;
    }
    return `/api/invoices/batch?timeframe=${timeRange === 'all' ? 'today' : timeRange}&type=${type}&layout=${layout}&status=${statusFilter}`;
  };

  return (
    <div>
      {/* Top Header Controls: Timeframe & Fulfillment Hub Button */}
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

        {/* Fulfillment & Picking Hub Trigger Button */}
        <button
          type="button"
          onClick={() => {
            if (selectedIds.size > 0) setHubTimeframe('selected');
            setIsHubOpen(true);
          }}
          className="btn btn-primary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
          }}
        >
          <Package size={16} />
          <span>Order Processing & Picking Hub / প্যাকিং হাব</span>
        </button>
      </div>

      {/* Live Metrics Header Bar */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
          Orders: <span style={{ color: 'var(--color-primary)' }}>{metrics.count}</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
          Total Value: <span style={{ color: 'var(--color-success)' }}>{formatCurrency(metrics.totalRev)}</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
          Pending / Confirmed: <span style={{ color: '#d97706' }}>{metrics.pendingCount}</span>
        </div>
      </div>

      {/* Multi-Selection Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>
              ✓ {selectedIds.size} {selectedIds.size === 1 ? 'Order' : 'Orders'} Selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#e2e8f0',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Print Invoices (A4 Batch) */}
            <a
              href={getBatchPrintUrl('standard')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
              }}
            >
              <Printer size={13} />
              <span>Print A4 Invoices ({selectedIds.size})</span>
            </a>

            {/* Print 6-Up Shipping Tags */}
            <a
              href={getBatchPrintUrl('tags', '6-up')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
              }}
            >
              <Tag size={13} />
              <span>Print 6-Up Tags</span>
            </a>

            {/* Print 9-Up Mini Tags */}
            <a
              href={getBatchPrintUrl('tags', '9-up')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
              }}
            >
              <Tag size={13} />
              <span>9-Up Mini</span>
            </a>

            {/* Print Thermal Label */}
            <a
              href={getBatchPrintUrl('tags', 'thermal')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
              }}
            >
              <Printer size={13} />
              <span>Thermal (4x6)</span>
            </a>

            {/* Print Picking Manifest */}
            <a
              href={getBatchPrintUrl('manifest')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm"
              style={{
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
              }}
            >
              <Package size={13} />
              <span>Picking Manifest</span>
            </a>
          </div>
        </div>
      )}

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
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={input => {
                        if (input) input.indeterminate = isSomeSelected;
                      }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      title="Select / Deselect all filtered orders"
                    />
                  </th>
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
                  const isSelected = selectedIds.has(order.id);

                  return (
                    <tr key={order.id} style={{ background: isSelected ? 'rgba(37, 99, 235, 0.04)' : undefined }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
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
                          const senderPhone =
                            (addr as any)?.sender_phone ||
                            order.payment_sender_phone ||
                            (order.notes?.includes('Payment Sender:')
                              ? order.notes.split('Payment Sender:')[1]?.trim()?.split(' ')[0]
                              : null);
                          const isBkash = order.payment_method?.toLowerCase() === 'bkash';
                          const isNagad = order.payment_method?.toLowerCase() === 'nagad';
                          const methodColor = isBkash ? '#e2136e' : isNagad ? '#f97316' : '#2563eb';
                          const methodBg = isBkash
                            ? 'rgba(226, 19, 110, 0.1)'
                            : isNagad
                            ? 'rgba(249, 115, 22, 0.1)'
                            : 'rgba(37, 99, 235, 0.1)';

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
                                    background:
                                      order.payment_status === 'confirmed'
                                        ? 'rgba(34, 197, 94, 0.12)'
                                        : 'rgba(234, 179, 8, 0.12)',
                                    color: order.payment_status === 'confirmed' ? 'var(--color-success)' : '#d97706',
                                  }}
                                >
                                  {order.payment_status?.toUpperCase() || 'PENDING'}
                                </span>
                              </div>

                              {/* Synced Sender Phone Number */}
                              {senderPhone && (
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-text)', marginTop: '4px' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--color-admin-muted)', fontWeight: 600 }}>FROM:</span>{' '}
                                  {senderPhone}
                                </div>
                              )}

                              {/* Synced TrxID */}
                              {order.payment_transaction_id && (
                                <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 600 }}>TRX:</span>{' '}
                                  <code style={{ fontSize: '11px', color: methodColor, fontWeight: 700 }}>
                                    {order.payment_transaction_id}
                                  </code>
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
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <a
                            href={`/api/invoices/${order.id}?type=tag&layout=6-up`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            title="Print Single Shipping Tag"
                            style={{ padding: '6px 8px', borderColor: 'var(--color-admin-border)' }}
                          >
                            <Tag size={13} />
                          </a>

                          <a
                            href={`/api/invoices/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            title="Print Full Invoice"
                            style={{ padding: '6px 8px', borderColor: 'var(--color-admin-border)' }}
                          >
                            <Printer size={13} />
                          </a>

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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
         ORDER PROCESSING & PICKING HUB (MODAL / DIALOG)
         ──────────────────────────────────────────────────────────── */}
      {isHubOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setIsHubOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-admin-border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={22} color="var(--color-primary)" />
                  <span>Order Processing & Warehouse Picking Hub / প্যাকিং হাব</span>
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                  Instant product aggregation and batch print generator for order packing teams.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsHubOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-admin-muted)', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Timeframe Selector for Aggregation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { label: '⚡ Last 1 Hour (১ ঘণ্টা)', value: '1h' },
                { label: '📅 Today (আজকে)', value: 'today' },
                { label: '📦 Last 7 Days (৭ দিন)', value: '7d' },
                { label: '📊 This Month (৩০ দিন)', value: '30d' },
                ...(selectedIds.size > 0 ? [{ label: `✓ Selected Orders (${selectedIds.size})`, value: 'selected' }] : []),
              ].map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setHubTimeframe(t.value as any)}
                  className="btn btn-sm"
                  style={{
                    background: hubTimeframe === t.value ? 'var(--color-primary)' : 'var(--color-admin-surface-2)',
                    color: hubTimeframe === t.value ? '#ffffff' : 'var(--color-admin-text)',
                    border: '1px solid var(--color-admin-border)',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '6px 14px',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Summary KPI Cards */}
            {hubSummary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>Orders in Batch</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-primary)', marginTop: '4px' }}>{hubSummary.totalOrders}</div>
                </div>

                <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>Total Units to Pick</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>{hubSummary.totalUnits} Units</div>
                </div>

                <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>Unique Products</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-admin-text)', marginTop: '4px' }}>{hubSummary.uniqueProductsCount} Items</div>
                </div>

                <div style={{ background: 'var(--color-admin-surface-2)', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>Batch Total Value</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--color-admin-text)', marginTop: '4px' }}>{formatCurrency(hubSummary.totalRevenue)}</div>
                </div>
              </div>
            )}

            {/* Batch Generation & Print Action Links */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Direct Print & Export</strong>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Print manifest or parcel tags for this timeframe ({hubTimeframe.toUpperCase()}).
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`/api/invoices/batch?timeframe=${hubTimeframe === 'selected' ? '' : hubTimeframe}&ids=${hubTimeframe === 'selected' ? Array.from(selectedIds).join(',') : ''}&type=manifest`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#d97706',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                  }}
                >
                  <Package size={14} />
                  <span>🖨️ Print Picking Sheet</span>
                </a>

                <a
                  href={`/api/invoices/batch?timeframe=${hubTimeframe === 'selected' ? '' : hubTimeframe}&ids=${hubTimeframe === 'selected' ? Array.from(selectedIds).join(',') : ''}&type=tags&layout=6-up`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                  }}
                >
                  <Tag size={14} />
                  <span>🏷️ Print 6-Up Shipping Tags</span>
                </a>

                <a
                  href={`/api/invoices/batch?timeframe=${hubTimeframe === 'selected' ? '' : hubTimeframe}&ids=${hubTimeframe === 'selected' ? Array.from(selectedIds).join(',') : ''}&type=tags&layout=9-up`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#475569',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                  }}
                >
                  <Tag size={14} />
                  <span>🏷️ Print 9-Up Mini Tags</span>
                </a>

                <a
                  href={`/api/invoices/batch?timeframe=${hubTimeframe === 'selected' ? '' : hubTimeframe}&ids=${hubTimeframe === 'selected' ? Array.from(selectedIds).join(',') : ''}&type=standard`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                  }}
                >
                  <Printer size={14} />
                  <span>📄 Print All A4 Invoices</span>
                </a>
              </div>
            </div>

            {/* Aggregated Products Breakdown Table */}
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '12px' }}>
              Product Inventory Picking List / প্রয়োজনীয় পণ্যের মোট সংখ্যা
            </h3>

            {hubLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-admin-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <span>Aggregating products from orders...</span>
              </div>
            ) : !hubSummary || hubSummary.products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-admin-muted)', background: 'var(--color-admin-surface-2)', borderRadius: 'var(--radius-lg)' }}>
                No orders found for this timeframe.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--color-admin-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <table className="admin-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                      <th>Product Description</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Total Units</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Unit Price</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Total Value</th>
                      <th>Order Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hubSummary.products.map((p: any, idx: number) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-admin-muted)' }}>{idx + 1}</td>
                        <td>
                          <strong style={{ color: 'var(--color-admin-text)' }}>{p.name}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(37, 99, 235, 0.1)',
                              color: 'var(--color-primary)',
                              fontWeight: 800,
                              fontSize: '13px',
                            }}
                          >
                            {p.totalUnits} Units
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-admin-muted)' }}>{formatCurrency(p.unitPrice)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                          {formatCurrency(p.totalRevenue)}
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                            {p.ordersCount} {p.ordersCount === 1 ? 'order' : 'orders'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
