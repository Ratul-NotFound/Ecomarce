'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Truck, FileText, Send, AlertTriangle } from 'lucide-react';
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
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
          Payment Verification
        </h2>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--color-admin-surface-2)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>
              Method & Status
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
              {order.payment_method.toUpperCase()} — {order.payment_status.toUpperCase()}
            </div>
            {order.payment_transaction_id && (
              <div style={{ fontSize: '13px', color: 'var(--color-primary-light)', marginTop: '4px' }}>
                Customer Submitted TrxID: <strong>{order.payment_transaction_id}</strong>
              </div>
            )}
          </div>

          {order.payment_status !== 'confirmed' ? (
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="btn btn-primary"
              id="confirm-payment-btn"
            >
              <CheckCircle2 size={16} />
              <span>Verify & Confirm Payment</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontWeight: 700 }}>
              <CheckCircle2 size={18} />
              <span>Payment Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Status & Delivery Tracking Update Form */}
      <div className="admin-card">
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
          Update Order Fulfillment Status
        </h2>

        <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label className="admin-label" htmlFor="order-status-select">Fulfillment State</label>
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
