import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Plus, Edit3, Trash2, ExternalLink, Package } from 'lucide-react';
import type { Product } from '@/types';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const supabase = await createClient();
  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  const { data, error } = await dbClient
    .from('products')
    .select('*, category:categories(name_en)')
    .order('created_at', { ascending: false });

  const products = (data as Product[]) || [];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Product Catalog</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage store inventory, prices, variants, and product promotions.
          </p>
        </div>

        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add New Product</span>
        </Link>
      </div>

      <div className="admin-card">
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-admin-muted)' }}>
            <Package size={40} style={{ margin: '0 auto 12px', opacity: 0.6 }} />
            <h3 style={{ color: 'var(--color-admin-text)', fontSize: '18px', marginBottom: '8px' }}>No products published</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>Create your first product to populate your catalog.</p>
            <Link href="/admin/products/new" className="btn btn-primary btn-sm">
              Add First Product
            </Link>
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
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const img = p.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&q=80';
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative', width: '44px', height: '44px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--color-admin-surface-2)' }}>
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
                        <div style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>
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
                        {p.is_active ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Draft</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--color-admin-surface-2)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', padding: '6px' }}
                            title="View in store"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--color-admin-surface-2)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', padding: '6px 12px' }}
                          >
                            <Edit3 size={14} />
                            <span>Edit</span>
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
    </div>
  );
}
