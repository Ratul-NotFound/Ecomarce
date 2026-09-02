'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';
import { getProductCostPrice, calculateProfitMetrics, syncCostToTags, calculateDiscountPrice, calculateDiscountPercent } from '@/lib/utils/pricing';
import { useToast } from '@/components/shared/ToastProvider';
import { createClient } from '@/lib/supabase/client';
import {
  Boxes,
  Plus,
  Minus,
  Calculator,
  AlertTriangle,
  ArrowUpDown,
  DollarSign,
  TrendingUp,
  Package,
  Search,
  Edit2,
  Check,
  X,
  Percent,
  Tag,
} from 'lucide-react';
import type { Product } from '@/types';

export default function AdminInventoryPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostVal, setEditingCostVal] = useState<number | string>('');

  // Pricing & Discount Calculator state
  const [calcBasePrice, setCalcBasePrice] = useState<number | string>(1500);
  const [calcDiscountPercent, setCalcDiscountPercent] = useState<number | string>(20);
  const [calcSellingPrice, setCalcSellingPrice] = useState<number | string>(1200);
  const [calcCostPrice, setCalcCostPrice] = useState<number | string>(800);

  const handleCalcBaseChange = (val: string) => {
    setCalcBasePrice(val);
    const b = Number(val);
    const d = Number(calcDiscountPercent);
    if (b > 0 && d > 0) {
      setCalcSellingPrice(calculateDiscountPrice(b, d));
    }
  };

  const handleCalcDiscountChange = (pct: number | string) => {
    setCalcDiscountPercent(pct);
    const b = Number(calcBasePrice);
    const d = Number(pct);
    if (b > 0 && d > 0) {
      setCalcSellingPrice(calculateDiscountPrice(b, d));
    } else if (!pct || d <= 0) {
      setCalcSellingPrice(b);
    }
  };

  const handleCalcSaleChange = (val: string) => {
    setCalcSellingPrice(val);
    const s = Number(val);
    const b = Number(calcBasePrice);
    if (b > 0 && s > 0 && s < b) {
      setCalcDiscountPercent(calculateDiscountPercent(b, s));
    } else if (!val || s >= b) {
      setCalcDiscountPercent('');
    }
  };

  const cost = Number(calcCostPrice) || 0;
  const sell = Number(calcSellingPrice) || 0;
  const calcMetrics = calculateProfitMetrics(sell, cost);

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

  // Financial intelligence aggregations
  const financials = useMemo(() => {
    let totalCostInvestment = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      const unitCost = getProductCostPrice(p);
      const unitSell = p.sale_price ?? p.base_price ?? 0;
      const stock = p.stock_quantity || 0;

      totalCostInvestment += unitCost * stock;
      totalRetailValue += unitSell * stock;

      if (stock <= p.low_stock_threshold) {
        lowStockCount++;
      }
    });

    const potentialGrossProfit = Math.max(0, totalRetailValue - totalCostInvestment);
    const storeMargin = totalRetailValue > 0 ? ((potentialGrossProfit / totalRetailValue) * 100).toFixed(1) : '0.0';

    return {
      totalCostInvestment,
      totalRetailValue,
      potentialGrossProfit,
      storeMargin,
      lowStockCount,
      totalUnits: products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0),
    };
  }, [products]);

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

  const handleSaveCostPrice = async (product: Product) => {
    try {
      const newCost = Number(editingCostVal);
      if (isNaN(newCost) || newCost < 0) {
        showToast('Please enter a valid buying price', 'error');
        return;
      }

      const updatedTags = syncCostToTags(product.tags || [], newCost);

      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          cost_price: newCost,
          tags: updatedTags,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to update cost price');

      showToast(`Buying cost for "${product.name_en}" set to ৳${newCost}`, 'success');
      setEditingCostId(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save buying price', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name_en.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Inventory & Financial Costing</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Track unit buying prices (COGS), monitor inventory capital investment, and compute profit margins.
          </p>
        </div>

        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add Product with Costing</span>
        </Link>
      </div>

      {/* Financial Valuation KPI Cards */}
      <div className="admin-kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Total Capital Investment</span>
            <div className="admin-kpi-icon-box" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="admin-kpi-value">{formatCurrency(financials.totalCostInvestment)}</div>
          <div className="admin-kpi-change">Cost of all in-stock goods (COGS)</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Retail Inventory Value</span>
            <div className="admin-kpi-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
              <Package size={20} />
            </div>
          </div>
          <div className="admin-kpi-value">{formatCurrency(financials.totalRetailValue)}</div>
          <div className="admin-kpi-change">Across {financials.totalUnits} available units</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Potential Gross Profit</span>
            <div className="admin-kpi-icon-box" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--color-success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="admin-kpi-value" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(financials.potentialGrossProfit)}
          </div>
          <div className="admin-kpi-change">Store Gross Margin: {financials.storeMargin}%</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Low Stock Alerts</span>
            <div className="admin-kpi-icon-box" style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--color-warning)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="admin-kpi-value">{financials.lowStockCount} items</div>
          <div className="admin-kpi-change">Needs restock attention</div>
        </div>
      </div>

      {/* Interactive Discount, Margin & Pricing Calculator */}
      <div className="admin-card" style={{ background: '#ffffff', border: '1px solid var(--color-admin-border)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={18} color="var(--color-primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Interactive Price, Discount & Margin Calculator
            </h2>
          </div>
          {Boolean(Number(calcDiscountPercent) > 0) && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--color-danger)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              -{calcDiscountPercent}% DISCOUNT APPLIED
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end', marginBottom: '14px' }}>
          <div className="form-group">
            <label className="admin-label">Regular Base Price (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcBasePrice}
              onChange={e => handleCalcBaseChange(e.target.value)}
              placeholder="e.g. 1500"
            />
          </div>

          <div className="form-group">
            <label className="admin-label">Discount (%)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                className="admin-input"
                value={calcDiscountPercent}
                onChange={e => handleCalcDiscountChange(e.target.value)}
                placeholder="e.g. 20"
                min="0"
                max="99"
                style={{ paddingRight: '28px' }}
              />
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>
                %
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="admin-label">Offer Sale Price (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcSellingPrice}
              onChange={e => handleCalcSaleChange(e.target.value)}
              placeholder="e.g. 1200"
            />
          </div>

          <div className="form-group">
            <label className="admin-label">Unit Buying Cost (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcCostPrice}
              onChange={e => setCalcCostPrice(e.target.value)}
              placeholder="e.g. 800"
            />
          </div>
        </div>

        {/* Preset Discount Chips Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-admin-muted)', fontWeight: 600 }}>Quick Discounts:</span>
          {[5, 10, 15, 20, 25, 30, 40, 50].map(pct => (
            <button
              key={pct}
              type="button"
              onClick={() => handleCalcDiscountChange(pct)}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                border: Number(calcDiscountPercent) === pct ? '1px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                background: Number(calcDiscountPercent) === pct ? 'var(--color-primary)' : '#ffffff',
                color: Number(calcDiscountPercent) === pct ? '#ffffff' : 'var(--color-admin-text)',
                cursor: 'pointer',
              }}
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleCalcDiscountChange(0)}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-admin-border)',
              background: '#ffffff',
              color: 'var(--color-danger)',
              cursor: 'pointer',
              marginLeft: '4px',
            }}
          >
            No Discount
          </button>
        </div>

        {/* Metrics Results Box */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Customer Price</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
              {formatCurrency(sell)}
            </div>
            {Number(calcBasePrice) > sell && (
              <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 700, marginTop: '2px' }}>
                Customer saves {formatCurrency(Number(calcBasePrice) - sell)}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Unit Net Profit</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: calcMetrics.isProfitable ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {formatCurrency(calcMetrics.netProfit)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', fontWeight: 600, marginTop: '2px' }}>
              Selling {formatCurrency(sell)} - Cost {formatCurrency(cost)}
            </div>
          </div>

          <div style={{ background: 'var(--color-admin-surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-admin-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Profit Margin %</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
              {calcMetrics.marginPercent}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', fontWeight: 600, marginTop: '2px' }}>
              {calcMetrics.markupPercent}% markup on cost
            </div>
          </div>
        </div>
      </div>

      {/* Stock & Costing Table */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Product Inventory & Unit Buying Prices
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '2px' }}>
              Click any Buying Price to edit your costing on-the-fly.
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-admin-muted)' }} />
            <input
              type="text"
              className="admin-input"
              placeholder="Search product or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '34px', height: '36px', fontSize: '13px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-admin-muted)' }}>Loading inventory data...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-admin-muted)' }}>No matching products found.</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Buying Cost (COGS)</th>
                  <th>Selling Price</th>
                  <th>Unit Profit (Margin)</th>
                  <th>Current Stock</th>
                  <th>Total Cost Valuation</th>
                  <th style={{ textAlign: 'right' }}>Quick Restock</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const unitCost = getProductCostPrice(product);
                  const unitSell = product.sale_price ?? product.base_price ?? 0;
                  const metrics = calculateProfitMetrics(unitSell, unitCost);
                  const isLow = product.stock_quantity <= product.low_stock_threshold;
                  const totalCostVal = unitCost * (product.stock_quantity || 0);

                  const isEditingCost = editingCostId === product.id;

                  return (
                    <tr key={product.id}>
                      <td>
                        <strong style={{ color: 'var(--color-admin-text)' }}>{product.name_en}</strong>
                      </td>
                      <td>
                        <code style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>{product.sku}</code>
                      </td>

                      {/* Buying Price / Costing Cell with 1-Click Inline Edit */}
                      <td>
                        {isEditingCost ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              className="admin-input"
                              value={editingCostVal}
                              onChange={e => setEditingCostVal(e.target.value)}
                              placeholder="৳ Cost"
                              autoFocus
                              style={{ width: '90px', height: '30px', fontSize: '12px', padding: '2px 8px' }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveCostPrice(product)}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 6px', height: '30px' }}
                              title="Save Buying Price"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCostId(null)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 6px', height: '30px' }}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingCostId(product.id);
                              setEditingCostVal(unitCost || '');
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px dashed var(--color-admin-border)',
                              background: unitCost > 0 ? '#ffffff' : 'rgba(234, 179, 8, 0.08)',
                            }}
                            title="Click to change buying price"
                          >
                            <span style={{ fontWeight: 800, fontSize: '13px', color: unitCost > 0 ? 'var(--color-admin-text)' : 'var(--color-warning)' }}>
                              {unitCost > 0 ? formatCurrency(unitCost) : 'Set Cost ৳'}
                            </span>
                            <Edit2 size={11} color="var(--color-admin-muted)" />
                          </div>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatCurrency(unitSell)}
                      </td>

                      {/* Profit & Margin */}
                      <td>
                        {unitCost > 0 ? (
                          <div>
                            <strong style={{ fontSize: '13px', color: metrics.isProfitable ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              {formatCurrency(metrics.netProfit)}
                            </strong>
                            <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', fontWeight: 600 }}>
                              {metrics.marginPercent}% margin
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>Cost not set</span>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: isLow ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {product.stock_quantity}
                        </span>
                        {isLow && (
                          <span className="badge badge-danger" style={{ marginLeft: '8px' }}>Low Stock</span>
                        )}
                      </td>

                      {/* Total Cost Valuation */}
                      <td>
                        <strong style={{ color: 'var(--color-admin-text)', fontSize: '13px' }}>
                          {unitCost > 0 ? formatCurrency(totalCostVal) : '—'}
                        </strong>
                      </td>

                      {/* Restock Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product.id, -1, 'adjustment')}
                            disabled={product.stock_quantity <= 0}
                            className="btn btn-secondary btn-sm"
                            style={{ background: '#ffffff', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', padding: '4px 8px' }}
                            title="Decrease 1"
                          >
                            <Minus size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product.id, 5, 'restock')}
                            className="btn btn-secondary btn-sm"
                            style={{ background: '#ffffff', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)', padding: '4px 8px', fontWeight: 700 }}
                            title="Restock +5"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjustStock(product.id, 20, 'restock')}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', fontWeight: 700 }}
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
