'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { Ticket, Plus, Trash2, Edit3, CheckCircle2, XCircle, Package, Search, X, Eye, EyeOff, Tag } from 'lucide-react';
import type { Coupon, Product } from '@/types';

interface ExtendedCoupon extends Coupon {
  applicable_product_ids?: string[];
  show_on_deals_page?: boolean;
}

export default function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<ExtendedCoupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State (New Coupon)
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState<number | string>(10);
  const [minOrder, setMinOrder] = useState<number | string>(1000);
  const [maxUses, setMaxUses] = useState<number | string>(100);
  const [showOnDealsPage, setShowOnDealsPage] = useState(true);
  const [applyScope, setApplyScope] = useState<'all' | 'specific'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingCoupon, setEditingCoupon] = useState<ExtendedCoupon | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editType, setEditType] = useState<'percent' | 'fixed'>('percent');
  const [editValue, setEditValue] = useState<number | string>(10);
  const [editMinOrder, setEditMinOrder] = useState<number | string>(0);
  const [editMaxUses, setEditMaxUses] = useState<number | string>('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editShowOnDealsPage, setEditShowOnDealsPage] = useState(true);
  const [editApplyScope, setEditApplyScope] = useState<'all' | 'specific'>('all');
  const [editSelectedProductIds, setEditSelectedProductIds] = useState<string[]>([]);
  const [editProductSearch, setEditProductSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const [couponsRes, prodsRes] = await Promise.all([
        fetch('/api/admin/coupons').then(r => r.json()),
        supabase.from('products').select('id, name_en, base_price, images').order('created_at', { ascending: false }),
      ]);

      if (couponsRes?.coupons) setCoupons(couponsRes.coupons);
      if (prodsRes?.data) setProducts(prodsRes.data as Product[]);
    } catch (err) {
      console.warn('Failed to load coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
          max_uses: maxUses || null,
          is_active: true,
          show_on_deals_page: showOnDealsPage,
          applicable_product_ids: applyScope === 'specific' ? selectedProductIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Coupon "${code.toUpperCase()}" created!`, 'success');
      setCode('');
      setSelectedProductIds([]);
      setApplyScope('all');
      setShowOnDealsPage(true);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error creating coupon', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: ExtendedCoupon) => {
    try {
      const updatedStatus = !coupon.is_active;
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          is_active: updatedStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCoupons(coupons.map(c => (c.id === coupon.id ? { ...c, is_active: updatedStatus } : c)));
      showToast(`Coupon "${coupon.code}" ${updatedStatus ? 'activated (ON)' : 'deactivated (OFF)'}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update coupon status', 'error');
    }
  };

  const handleToggleDealsVisibility = async (coupon: ExtendedCoupon) => {
    try {
      const nextVis = coupon.show_on_deals_page === false ? true : false;
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          code: coupon.code,
          show_on_deals_page: nextVis,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCoupons(coupons.map(c => (c.id === coupon.id ? { ...c, show_on_deals_page: nextVis } : c)));
      showToast(`Coupon "${coupon.code}" ${nextVis ? 'is now visible on Deals shelf (ON)' : 'is now hidden from Deals shelf (OFF)'}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to update visibility', 'error');
    }
  };

  const handleDeleteCoupon = async (coupon: ExtendedCoupon) => {
    if (!confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${coupon.id}&code=${coupon.code}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCoupons(coupons.filter(c => c.id !== coupon.id));
      showToast(`Coupon "${coupon.code}" deleted`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete coupon', 'error');
    }
  };

  const openEditModal = (coupon: ExtendedCoupon) => {
    setEditingCoupon(coupon);
    setEditCode(coupon.code);
    setEditType(coupon.type);
    setEditValue(coupon.value);
    setEditMinOrder(coupon.min_order_amount || 0);
    setEditMaxUses(coupon.max_uses || '');
    setEditIsActive(coupon.is_active);
    setEditShowOnDealsPage(coupon.show_on_deals_page !== false);
    const hasSpecific = Boolean(coupon.applicable_product_ids && coupon.applicable_product_ids.length > 0);
    setEditApplyScope(hasSpecific ? 'specific' : 'all');
    setEditSelectedProductIds(coupon.applicable_product_ids || []);
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    try {
      setIsUpdating(true);
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCoupon.id,
          code: editCode,
          type: editType,
          value: editValue,
          min_order_amount: editMinOrder,
          max_uses: editMaxUses || null,
          is_active: editIsActive,
          show_on_deals_page: editShowOnDealsPage,
          applicable_product_ids: editApplyScope === 'specific' ? editSelectedProductIds : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Coupon "${editCode.toUpperCase()}" updated!`, 'success');
      setEditingCoupon(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update coupon', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name_en.toLowerCase().includes(productSearch.toLowerCase())
  );

  const editFilteredProducts = products.filter(p =>
    p.name_en.toLowerCase().includes(editProductSearch.toLowerCase())
  );

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Coupons & Promo Codes</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Create discount codes, toggle ON/OFF, and restrict coupons to specific promotional products.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Create Coupon Form */}
        <div className="admin-card">
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="var(--color-primary-light)" />
            <span>Create New Promo Coupon</span>
          </h2>

          <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="admin-label">Coupon Code *</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. FLASH20"
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
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
                  min={1}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="admin-label">Min. Order Spend (৳)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={minOrder}
                  onChange={e => setMinOrder(e.target.value)}
                  min={0}
                />
              </div>

              <div className="form-group">
                <label className="admin-label">Usage Limit (Max Uses)</label>
                <input
                  type="number"
                  className="admin-input"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value)}
                  min={1}
                />
              </div>
            </div>

            {/* Deals Page Voucher Shelf Toggle */}
            <div style={{ background: 'var(--color-admin-surface-2)', border: '1px solid var(--color-admin-border)', borderRadius: 'var(--radius-lg)', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={15} color="#f59e0b" />
                  <span>Show on Deals Page Shelf</span>
                </strong>
                <p style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
                  If ON, customers can tap to claim this code directly on the /deals page voucher shelf. If OFF, it remains private.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOnDealsPage(!showOnDealsPage)}
                className={`btn btn-sm ${showOnDealsPage ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {showOnDealsPage ? <Eye size={13} /> : <EyeOff size={13} />}
                <span>{showOnDealsPage ? 'Visible on Deals' : 'Hidden (Private)'}</span>
              </button>
            </div>

            {/* Product Applicability Scope */}
            <div style={{ background: 'var(--color-admin-surface-2)', border: '1px solid var(--color-admin-border)', borderRadius: 'var(--radius-lg)', padding: '14px' }}>
              <label className="admin-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} color="var(--color-primary-light)" />
                <span>Product Applicability</span>
              </label>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-admin-text)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="scope"
                    checked={applyScope === 'all'}
                    onChange={() => setApplyScope('all')}
                  />
                  <span>All Products in Store</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-admin-text)', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="scope"
                    checked={applyScope === 'specific'}
                    onChange={() => setApplyScope('specific')}
                  />
                  <span>Specific Products Only</span>
                </label>
              </div>

              {applyScope === 'specific' && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ position: 'relative', marginBottom: '8px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-admin-muted)' }} />
                    <input
                      type="text"
                      className="admin-input"
                      style={{ paddingLeft: '32px', height: '34px', fontSize: '12px' }}
                      placeholder="Search products to connect..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                    />
                  </div>

                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                    {filteredProducts.map(p => {
                      const isSelected = selectedProductIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'var(--color-admin-surface)',
                            border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-admin-border)'}`,
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            color: 'var(--color-admin-text)',
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                            {p.name_en}
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedProductIds([...selectedProductIds, p.id]);
                              } else {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== p.id));
                              }
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '6px' }}>
                    {selectedProductIds.length} specific product(s) selected
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ marginTop: '8px' }}
            >
              <Plus size={16} />
              <span>{isSubmitting ? 'Creating Coupon...' : 'Publish Coupon'}</span>
            </button>
          </form>
        </div>

        {/* Existing Coupons List */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Ticket size={18} color="var(--color-primary-light)" />
              <span>Active & Inactive Coupons ({coupons.length})</span>
            </h2>
          </div>

          {loading ? (
            <p style={{ color: 'var(--color-admin-muted)' }}>Loading coupons...</p>
          ) : coupons.length === 0 ? (
            <p style={{ color: 'var(--color-admin-muted)', fontSize: '13px' }}>No coupon codes created yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {coupons.map(c => {
                const isRestricted = Boolean(c.applicable_product_ids && c.applicable_product_ids.length > 0);
                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'var(--color-admin-surface-2)',
                      border: `1px solid ${c.is_active ? 'var(--color-admin-border)' : 'rgba(239, 68, 68, 0.3)'}`,
                      borderRadius: 'var(--radius-xl)',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: c.is_active ? 1 : 0.65,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '15px',
                            fontWeight: 900,
                            letterSpacing: '1px',
                            color: 'var(--color-admin-text)',
                          }}
                        >
                          {c.code}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: c.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: c.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                          }}
                        >
                          {c.is_active ? 'ACTIVE' : 'OFF'}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-primary-10)',
                            color: 'var(--color-primary-light)',
                          }}
                        >
                          {c.type === 'percent' ? `${c.value}% OFF` : `৳${c.value} FLAT`}
                        </span>

                        {/* Deals Shelf Status Badge */}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: c.show_on_deals_page !== false ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-admin-surface)',
                            color: c.show_on_deals_page !== false ? '#f59e0b' : 'var(--color-admin-muted)',
                            border: c.show_on_deals_page !== false ? 'none' : '1px solid var(--color-admin-border)',
                          }}
                        >
                          {c.show_on_deals_page !== false ? '🎟️ Live on /deals' : '🔒 Private Code'}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                        Min Order: ৳{c.min_order_amount} • Used: {c.used_count}/{c.max_uses ? c.max_uses : '∞'}
                      </div>

                      {/* Scope Badge */}
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>
                        {isRestricted ? (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            🎯 Applies to {c.applicable_product_ids!.length} specific item(s) only
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-admin-muted)' }}>
                            🌐 Applies to all store items
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Deals Shelf 1-click toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggleDealsVisibility(c)}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px', height: '30px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title={c.show_on_deals_page !== false ? 'Click to hide from /deals shelf' : 'Click to show on /deals shelf'}
                      >
                        {c.show_on_deals_page !== false ? <Eye size={13} color="#f59e0b" /> : <EyeOff size={13} />}
                        <span>{c.show_on_deals_page !== false ? 'On Deals: YES' : 'On Deals: NO'}</span>
                      </button>

                      {/* ON / OFF Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(c)}
                        className={`btn btn-sm ${c.is_active ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ fontSize: '11px', padding: '4px 10px', height: '30px' }}
                        title={c.is_active ? 'Turn OFF coupon' : 'Turn ON coupon'}
                      >
                        {c.is_active ? 'Turn OFF' : 'Turn ON'}
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(c)}
                        style={{
                          background: 'var(--color-admin-surface)',
                          border: '1px solid var(--color-admin-border)',
                          color: 'var(--color-admin-text)',
                          padding: '6px',
                          borderRadius: 'var(--radius-md)',
                          cursor: 'pointer',
                        }}
                        title="Edit Coupon"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteCoupon(c)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          padding: '6px',
                          cursor: 'pointer',
                        }}
                        title="Delete Coupon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
         EDIT COUPON MODAL
         ──────────────────────────────────────────────────────────── */}
      {editingCoupon && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '16px',
          }}
        >
          <div
            className="admin-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid var(--color-admin-border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                Edit Coupon: {editingCoupon.code}
              </h2>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-admin-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="admin-label">Coupon Code *</label>
                <input
                  type="text"
                  className="admin-input"
                  value={editCode}
                  onChange={e => setEditCode(e.target.value)}
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label">Discount Type</label>
                  <select
                    className="admin-input"
                    value={editType}
                    onChange={e => setEditType(e.target.value as any)}
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed (৳)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="admin-label">Discount Value</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label">Min. Order Spend (৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={editMinOrder}
                    onChange={e => setEditMinOrder(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label">Max Uses (Limit)</label>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="Unlimited"
                    value={editMaxUses}
                    onChange={e => setEditMaxUses(e.target.value)}
                  />
                </div>
              </div>

              {/* Status Switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--color-admin-surface-2)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)' }}>Coupon Status</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: editIsActive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={e => setEditIsActive(e.target.checked)}
                  />
                  <span>{editIsActive ? 'Active (ON)' : 'Inactive (OFF)'}</span>
                </label>
              </div>

              {/* Deals Page Voucher Shelf Visibility */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--color-admin-surface-2)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={14} color="#f59e0b" />
                    <span>Show on Deals Page Shelf</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                    Display as a 1-tap claimable voucher ticket on /deals
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditShowOnDealsPage(!editShowOnDealsPage)}
                  className={`btn btn-sm ${editShowOnDealsPage ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {editShowOnDealsPage ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{editShowOnDealsPage ? 'Visible' : 'Hidden'}</span>
                </button>
              </div>

              {/* Specific Product Restriction */}
              <div style={{ background: 'var(--color-admin-surface-2)', border: '1px solid var(--color-admin-border)', borderRadius: 'var(--radius-lg)', padding: '12px' }}>
                <label className="admin-label" style={{ marginBottom: '8px' }}>Product Scope</label>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-admin-text)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editScope"
                      checked={editApplyScope === 'all'}
                      onChange={() => setEditApplyScope('all')}
                    />
                    <span>All Products</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-admin-text)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="editScope"
                      checked={editApplyScope === 'specific'}
                      onChange={() => setEditApplyScope('specific')}
                    />
                    <span>Specific Products Only</span>
                  </label>
                </div>

                {editApplyScope === 'specific' && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      className="admin-input"
                      style={{ height: '32px', fontSize: '11px', marginBottom: '6px' }}
                      placeholder="Search products..."
                      value={editProductSearch}
                      onChange={e => setEditProductSearch(e.target.value)}
                    />

                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {editFilteredProducts.map(p => {
                        const isSelected = editSelectedProductIds.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '5px 8px',
                              background: isSelected ? 'rgba(37, 99, 235, 0.15)' : 'var(--color-admin-surface)',
                              border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-admin-border)'}`,
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              color: 'var(--color-admin-text)',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                              {p.name_en}
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setEditSelectedProductIds([...editSelectedProductIds, p.id]);
                                } else {
                                  setEditSelectedProductIds(editSelectedProductIds.filter(id => id !== p.id));
                                }
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                      {editSelectedProductIds.length} product(s) linked to this coupon
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingCoupon(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
