'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/format';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import { Boxes, Plus, Minus, Calculator, AlertTriangle, ArrowUpDown } from 'lucide-react';
import type { Product } from '@/types';

export default function AdminInventoryPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Profit Margin Calculator state
  const [calcCostPrice, setCalcCostPrice] = useState<number | string>(800);
  const [calcSellingPrice, setCalcSellingPrice] = useState<number | string>(1200);

  const cost = Number(calcCostPrice) || 0;
  const sell = Number(calcSellingPrice) || 0;
  const netProfit = Math.max(0, sell - cost);
  const marginPercent = sell > 0 ? ((netProfit / sell) * 100).toFixed(1) : '0.0';
  const markupPercent = cost > 0 ? ((netProfit / cost) * 100).toFixed(1) : '0.0';

  const loadProducts = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('stock_quantity', { ascending: true });
    if (data) setProducts(data as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAdjustStock = async (productId: string, delta: number, changeType: string) => {
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          delta,
          changeType,
          notes: delta > 0 ? 'Admin Manual Restock' : 'Admin Stock Correction',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Stock updated (${delta > 0 ? `+${delta}` : delta})`, 'success');
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to adjust stock', 'error');
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Inventory & Profit Analytics</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Monitor real-time product stock, quick-restock units, and compute gross profit margins.
          </p>
        </div>
      </div>

      {/* Profit Margin Calculator Tool Card */}
      <div className="admin-card" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Calculator size={20} color="var(--color-primary-light)" />
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>Live Selling Profit & Margin Calculator</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="admin-label">Unit Cost Price (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcCostPrice}
              onChange={e => setCalcCostPrice(e.target.value)}
              placeholder="e.g. 800"
            />
          </div>

          <div className="form-group">
            <label className="admin-label">Unit Selling Price (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcSellingPrice}
              onChange={e => setCalcSellingPrice(e.target.value)}
              placeholder="e.g. 1200"
            />
          </div>

          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>Gross Profit Per Unit</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-success)' }}>
              {formatCurrency(netProfit)}
            </div>
          </div>

          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px 16px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', textTransform: 'uppercase' }}>Profit Margin %</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary-light)' }}>
              {marginPercent}% ({markupPercent}% Markup)
            </div>
          </div>
        </div>
      </div>

      {/* Stock Management Table */}
      <div className="admin-card">
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
          Product Stock Overview & Quick Restock
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-admin-muted)' }}>Loading stock table...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-admin-muted)' }}>No products found in inventory.</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Total Sold</th>
                  <th>Current Stock</th>
                  <th>Alert Level</th>
                  <th style={{ textAlign: 'right' }}>Quick Adjust</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const isLow = product.stock_quantity <= product.low_stock_threshold;
                  return (
                    <tr key={product.id}>
                      <td>
                        <strong style={{ color: '#ffffff' }}>{product.name_en}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>{product.sku}</code>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-primary-light)' }}>
                        {formatCurrency(product.sale_price ?? product.base_price)}
                      </td>
                      <td>
                        <strong>{product.total_sold} units</strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: isLow ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {product.stock_quantity}
                        </span>
                        {isLow && (
                          <span className="badge badge-danger" style={{ marginLeft: '8px' }}>Low Stock</span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                        ≤ {product.low_stock_threshold} units
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product.id, -1, 'adjustment')}
                            disabled={product.stock_quantity <= 0}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--color-admin-surface-2)', color: '#ffffff', borderColor: 'var(--color-admin-border)', padding: '4px 8px' }}
                            title="Decrease 1"
                          >
                            <Minus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product.id, 5, 'restock')}
                            className="btn btn-secondary btn-sm"
                            style={{ background: 'var(--color-admin-surface-2)', color: '#ffffff', borderColor: 'var(--color-admin-border)', padding: '4px 8px' }}
                            title="Restock +5"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product.id, 20, 'restock')}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px' }}
                            title="Restock +20"
                          >
                            +20
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
    </div>
  );
}
