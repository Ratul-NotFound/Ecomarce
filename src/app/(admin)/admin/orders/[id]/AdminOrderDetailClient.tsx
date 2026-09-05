'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Truck, FileText, Send, AlertTriangle, Copy, Check, Phone, Hash } from 'lucide-react';
import { useToast } from '@/components/shared/ToastProvider';
import type { Order, OrderStatus } from '@/types';

interface AdminOrderDetailClientProps {
  order: Order;
}

export default function AdminOrderDetailClient({ order }: AdminOrderDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [trackingMsg, setTrackingMsg] = useState('');
  const [location, setLocation] = useState(order.shipping_address?.district || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(text);
      showToast(`Copied ${label} (${text}) to clipboard!`, 'success');
      setTimeout(() => setCopiedText(null), 2500);
    }
  };

  const handleConfirmPayment = async () => {
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_payment' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm payment');

      showToast('Payment marked as CONFIRMED!', 'success');
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Payment confirmation error', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsProcessing(true);
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          status,
          message: trackingMsg.trim() || `Order status updated to ${status}.`,
          location: location.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      showToast('Order status and timeline updated!', 'success');
      setTrackingMsg('');
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Error updating order', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Payment Verification Card */}
      <div className="admin-card">
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px' }}>
          Payment Verification
        </h2>

        {(() => {
          const senderPhone = (order.shipping_address as any)?.sender_phone || order.payment_sender_phone || (order.notes?.includes('Payment Sender:') ? order.notes.split('Payment Sender:')[1]?.trim()?.split(' ')[0] : null);
          const isBkash = order.payment_method?.toLowerCase() === 'bkash';
          const isNagad = order.payment_method?.toLowerCase() === 'nagad';
          const methodColor = isBkash ? '#e2136e' : isNagad ? '#f97316' : '#2563eb';
          const methodBg = isBkash ? 'rgba(226, 19, 110, 0.1)' : isNagad ? 'rgba(249, 115, 22, 0.1)' : 'rgba(37, 99, 235, 0.1)';

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--color-admin-surface-2)', padding: '18px', borderRadius: 'var(--radius-lg)' }}>
              {/* Header row: Method, Status, Amount, Confirm CTA */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: methodBg,
                      color: methodColor,
                      textTransform: 'uppercase',
                    }}
                  >
                    {order.payment_method.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: order.payment_status === 'confirmed' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                      color: order.payment_status === 'confirmed' ? 'var(--color-success)' : '#d97706',
                      textTransform: 'uppercase',
                    }}
                  >
                    {order.payment_status}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-admin-muted)', fontWeight: 600 }}>
                    Payable: <strong style={{ color: 'var(--color-admin-text)' }}>৳{order.total}</strong>
                  </span>
                </div>

                {order.payment_status !== 'confirmed' ? (
                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isProcessing}
                    className="btn btn-primary btn-sm"
                    id="confirm-payment-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Verify & Confirm Payment</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontWeight: 700, fontSize: '13px' }}>
                    <CheckCircle2 size={18} />
                    <span>Payment Verified</span>
                  </div>
                )}
              </div>

              {/* Sender Phone and TrxID Verification Grid */}
              {(senderPhone || order.payment_transaction_id) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-admin-border)' }}>
                  {/* Sender Phone Card */}
                  {senderPhone && (
                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-admin-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} color={methodColor} />
                          <span>Sender Phone Number (টাকা পাঠানোর নম্বর)</span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)', marginTop: '2px', fontFamily: 'monospace' }}>
                          {senderPhone}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(senderPhone, 'Sender Phone')}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copiedText === senderPhone ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        <span>{copiedText === senderPhone ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  {/* TrxID Card */}
                  {order.payment_transaction_id && (
                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-admin-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Hash size={12} color={methodColor} />
                          <span>Transaction ID (TrxID)</span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: methodColor, marginTop: '2px', fontFamily: 'monospace' }}>
                          {order.payment_transaction_id}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(order.payment_transaction_id!, 'TrxID')}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copiedText === order.payment_transaction_id ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        <span>{copiedText === order.payment_transaction_id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 2. Status & Delivery Tracking Update Form */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
            Order Fulfillment Pipeline
          </h2>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary-10)',
              color: 'var(--color-primary)',
              textTransform: 'uppercase',
            }}
          >
            Current: {status}
          </span>
        </div>

        {/* 1-Click Quick Action Stepper */}
        <div style={{ marginBottom: '20px', padding: '14px', background: 'var(--color-admin-surface-2)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-muted)', marginBottom: '10px' }}>
            ⚡ 1-Click Status Advancement:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { val: 'confirmed' as OrderStatus, label: '✓ Confirmed', color: '#0284c7' },
              { val: 'processing' as OrderStatus, label: '📦 Processing', color: '#7c3aed' },
              { val: 'shipped' as OrderStatus, label: '🚚 Shipped', color: '#2563eb' },
              { val: 'out_for_delivery' as OrderStatus, label: '🛵 Out for Delivery', color: '#ea580c' },
              { val: 'delivered' as OrderStatus, label: '🎉 Delivered', color: '#16a34a' },
            ].map(step => {
              const isCurrent = status === step.val;
              return (
                <button
                  key={step.val}
                  type="button"
                  disabled={isProcessing || isCurrent}
                  onClick={async () => {
                    try {
                      setIsProcessing(true);
                      setStatus(step.val);
                      const res = await fetch(`/api/admin/orders/${order.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'update_status',
                          status: step.val,
                          message: `Order status advanced to ${step.val}.`,
                          location: location.trim() || undefined,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to update status');

                      showToast(`Order status updated to "${step.val.toUpperCase()}"!`, 'success');
                      router.refresh();
                    } catch (err: any) {
                      showToast(err.message || 'Error updating status', 'error');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="btn btn-sm"
                  style={{
                    background: isCurrent ? step.color : '#ffffff',
                    color: isCurrent ? '#ffffff' : 'var(--color-admin-text)',
                    borderColor: isCurrent ? step.color : 'var(--color-admin-border)',
                    fontWeight: 700,
                    fontSize: '12px',
                    padding: '6px 12px',
                    opacity: isCurrent ? 1 : 0.9,
                  }}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="admin-label" htmlFor="order-status-select">Manual Status Override</label>
              <select
                id="order-status-select"
                className="admin-input"
                value={status}
                onChange={e => setStatus(e.target.value as OrderStatus)}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing / Packaging</option>
                <option value="shipped">Shipped / In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
              </select>
            </div>

            <div className="form-group">
              <label className="admin-label" htmlFor="order-location-field">Current Courier / Hub Location</label>
              <input
                id="order-location-field"
                type="text"
                className="admin-input"
                placeholder="e.g. Dhaka Hub / Chittagong Sorting Office"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="admin-label" htmlFor="order-timeline-note">Timeline Note for Customer</label>
            <input
              id="order-timeline-note"
              type="text"
              className="admin-input"
              placeholder="e.g. Package dispatched via Pathao Courier (Tracking: BD-9821)"
              value={trackingMsg}
              onChange={e => setTrackingMsg(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="btn btn-primary btn-sm"
            style={{ width: 'fit-content' }}
            id="update-order-status-btn"
          >
            <Send size={14} />
            <span>Update Tracking & Notify</span>
          </button>
        </form>
      </div>
    </div>
  );
}
