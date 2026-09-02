'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Edit3, Trash2, ExternalLink, Package, Eye, EyeOff, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import { useToast } from '@/components/shared/ToastProvider';
import type { Product } from '@/types';

interface AdminProductTableProps {
  initialProducts: Product[];
}

export default function AdminProductTable({ initialProducts }: AdminProductTableProps) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name_en.toLowerCase().includes(search.toLowerCase()) ||
      (p.name_bn && p.name_bn.toLowerCase().includes(search.toLowerCase())) ||
      p.sku.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'active') return p.is_active;
    if (statusFilter === 'hidden') return !p.is_active;
    return true;
  });

  const handleToggleActive = async (p: Product) => {
    const newStatus = !p.is_active;
    setLoadingId(p.id);

    // Optimistic update
    setProducts(prev => prev.map(item => (item.id === p.id ? { ...item, is_active: newStatus } : item)));

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, is_active: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update product visibility');
      }

      showToast(
        newStatus ? `"${p.name_en}" is now visible in the storefront.` : `"${p.name_en}" is now HIDDEN from the storefront.`,
        'success'
      );
    } catch (err: any) {
      // Revert on error
      setProducts(prev => prev.map(item => (item.id === p.id ? { ...item, is_active: p.is_active } : item)));
      showToast(err.message || 'Failed to update visibility', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');

      setProducts(prev => prev.filter(p => p.id !== id));
      showToast(`Product "${name}" deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  return (
    <div>
      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-admin-muted)' }} />
          <input
            type="text"
            className="admin-input"
            placeholder="Search by title or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'active', 'hidden'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className="btn btn-sm"
              style={{
                background: statusFilter === tab ? 'var(--color-primary)' : '#ffffff',
                color: statusFilter === tab ? '#ffffff' : 'var(--color-admin-text)',
                border: '1px solid var(--color-admin-border)',
                fontWeight: 700,
                textTransform: 'capitalize',
                fontSize: '12px',
                padding: '6px 14px',
              }}
            >
              {tab === 'all' ? `All (${products.length})` : tab === 'active' ? `Visible (${products.filter(p => p.is_active).length})` : `Hidden (${products.filter(p => !p.is_active).length})`}
            </button>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-admin-muted)' }}>
          <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
          <h3 style={{ color: 'var(--color-admin-text)', fontSize: '18px', marginBottom: '8px' }}>No products found</h3>
          <p style={{ fontSize: '14px' }}>Try clearing your search or filter.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>SKU</th>
                <th>Base / Sale Price</th>
                <th>Stock</th>
                <th>Visibility</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const img = p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80';
                const isLoading = loadingId === p.id;
                return (
                  <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.65 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            position: 'relative',
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: '#ffffff',
                            border: '1px solid var(--color-admin-border)',
                          }}
                        >
                          <Image src={img} alt={p.name_en} fill style={{ objectFit: 'cover' }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-admin-text)' }}>{p.name_en}</div>
                          {p.name_bn && (
                            <div style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>{p.name_bn}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>{p.category?.name_en || '—'}</td>
                    <td>
                      <code style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>{p.sku}</code>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatCurrency(p.sale_price ?? p.base_price)}
                      </div>
                      {p.sale_price && (
                        <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', textDecoration: 'line-through' }}>
                          {formatCurrency(p.base_price)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: p.stock_quantity <= p.low_stock_threshold ? 'var(--color-danger)' : 'var(--color-success)',
                        }}
                      >
                        {p.stock_quantity} units
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        disabled={isLoading}
                        className="btn btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          borderRadius: 'var(--radius-full)',
                          background: p.is_active ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: p.is_active ? 'var(--color-success)' : 'var(--color-danger)',
                          border: `1px solid ${p.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          cursor: 'pointer',
                        }}
                        title={p.is_active ? 'Click to HIDE product from storefront' : 'Click to SHOW product on storefront'}
                      >
                        {p.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{p.is_active ? 'Visible (ON)' : 'Hidden (OFF)'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <Link
                          href={`/products/${p.slug}`}
                          target="_blank"
                          className="btn btn-secondary btn-sm"
                          style={{
                            background: '#ffffff',
                            color: 'var(--color-admin-text)',
                            borderColor: 'var(--color-admin-border)',
                            padding: '6px',
                          }}
                          title="View live in store"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <Link
                          href={`/admin/products/${p.id}/edit`}
                          className="btn btn-secondary btn-sm"
                          style={{
                            background: '#ffffff',
                            color: 'var(--color-admin-text)',
                            borderColor: 'var(--color-admin-border)',
                            padding: '6px 12px',
                            fontWeight: 700,
                          }}
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.name_en)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            background: '#ffffff',
                            color: 'var(--color-danger)',
                            borderColor: 'var(--color-admin-border)',
                            padding: '6px 8px',
                          }}
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
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
  );
}
