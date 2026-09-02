'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { Ticket, Plus, Trash2 } from 'lucide-react';
import type { Coupon } from '@/types';

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState<number | string>(10);
  const [minOrder, setMinOrder] = useState<number | string>(1000);
  const [maxUses, setMaxUses] = useState<number | string>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCoupons = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('coupons')
        .select('*');
      if (data) setCoupons(data as Coupon[]);
    } catch (err) {
      console.warn('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          type,
          value,
          min_order_amount: minOrder,
          max_uses: maxUses,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Coupon "${code.toUpperCase()}" created!`, 'success');
      setCode('');
      loadCoupons();
    } catch (err: any) {
      showToast(err.message || 'Error creating coupon', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Coupons & Special Discounts</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Create promo codes, minimum spend conditions, and usage limits.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Create Coupon Card */}
        <div className="admin-card">
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
            Create New Coupon Code
          </h2>
          <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="admin-label">Coupon Code *</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. SUMMER25"
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ textTransform: 'uppercase' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="admin-label">Discount Type</label>
                <select
                  className="admin-input"
                  value={type}
                  onChange={e => setType(e.target.value as any)}
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (৳)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="admin-label">Discount Value *</label>
                <input
                  type="number"
                  className="admin-input"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  min="1"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="admin-label">Min Order (৳)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={minOrder}
                  onChange={e => setMinOrder(e.target.value)}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Max Uses Limit</label>
                <input
                  type="number"
                  className="admin-input"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  min="1"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '8px' }}
            >
              <Plus size={14} />
              <span>{isSubmitting ? 'Creating...' : 'Create Coupon'}</span>
            </button>
          </form>
        </div>

        {/* Existing Coupons List */}
        <div className="admin-card">
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
            Active Promo Codes
          </h2>

          {loading ? (
            <p style={{ color: 'var(--color-admin-muted)' }}>Loading coupons...</p>
          ) : coupons.length === 0 ? (
            <p style={{ color: 'var(--color-admin-muted)' }}>No coupons created yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {coupons.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--color-admin-surface-2)',
                    border: '1px solid var(--color-admin-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <code style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary-light)' }}>
                        {c.code}
                      </code>
                      <span className="badge badge-success">
                        {c.type === 'percent' ? `${c.value}% OFF` : `৳${c.value} OFF`}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                      Min Order: ৳{c.min_order_amount} • Used: {c.used_count}/{c.max_uses || '∞'}
                    </div>
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
