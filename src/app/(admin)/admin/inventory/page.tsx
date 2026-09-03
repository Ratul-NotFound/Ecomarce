'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils/format';
import {
  getProductCostPrice,
  calculateProfitMetrics,
  syncCostToTags,
  calculateDiscountPrice,
  calculateDiscountPercent,
  getVariantPricing,
  extractOptionSchema,
} from '@/lib/utils/pricing';
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
  ChevronDown,
  ChevronUp,
  Layers,
  Trash2,
  History,
  Pencil,
  RefreshCw,
  PlusCircle,
  FileText,
} from 'lucide-react';
import type { Product, ProductVariant } from '@/types';

export default function AdminInventoryPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Inline editing states for Parent Product Cost
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [editingCostVal, setEditingCostVal] = useState<number | string>('');

  // Inline editing states for Variant Stock
  const [editingVarStockId, setEditingVarStockId] = useState<string | null>(null);
  const [editingVarStockVal, setEditingVarStockVal] = useState<number | string>('');

  // Inline editing states for Variant Cost
  const [editingVarCostId, setEditingVarCostId] = useState<string | null>(null);
  const [editingVarCostVal, setEditingVarCostVal] = useState<number | string>('');

  // Inline editing states for Variant Sale Price
  const [editingVarSaleId, setEditingVarSaleId] = useState<string | null>(null);
  const [editingVarSaleVal, setEditingVarSaleVal] = useState<number | string>('');

  // ────────────────────────────────────────────────────────────
  // MODAL STATES FOR VARIANT CRUD
  // ────────────────────────────────────────────────────────────
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [targetProductForAdd, setTargetProductForAdd] = useState<Product | null>(null);
  const [newVarSize, setNewVarSize] = useState('');
  const [newVarColor, setNewVarColor] = useState('');
  const [newVarMaterial, setNewVarMaterial] = useState('');
  const [newVarSku, setNewVarSku] = useState('');
  const [newVarStock, setNewVarStock] = useState<number | string>(10);
  const [newVarCost, setNewVarCost] = useState<number | string>('');
  const [newVarRegular, setNewVarRegular] = useState<number | string>('');
  const [newVarSale, setNewVarSale] = useState<number | string>('');
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);

  // Edit Variant Modal State
  const [isEditVariantOpen, setIsEditVariantOpen] = useState(false);
  const [targetProductForEdit, setTargetProductForEdit] = useState<Product | null>(null);
  const [targetVariantForEdit, setTargetVariantForEdit] = useState<ProductVariant | null>(null);
  const [editVarSize, setEditVarSize] = useState('');
  const [editVarColor, setEditVarColor] = useState('');
  const [editVarMaterial, setEditVarMaterial] = useState('');
  const [editVarSku, setEditVarSku] = useState('');
  const [editVarStock, setEditVarStock] = useState<number | string>(0);
  const [editVarCost, setEditVarCost] = useState<number | string>('');
  const [editVarRegular, setEditVarRegular] = useState<number | string>('');
  const [editVarSale, setEditVarSale] = useState<number | string>('');

  // Stock Movement Logs Modal State
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [logsProduct, setLogsProduct] = useState<Product | null>(null);
  const [productLogs, setProductLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
      .select('*, variants:product_variants(*)')
      .order('stock_quantity', { ascending: true });
    if (data) setProducts(data as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Financial intelligence aggregations with deep variant matrix support
  const financials = useMemo(() => {
    let totalCostInvestment = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      const vars = p.variants || [];
      if (vars.length > 0) {
        vars.forEach(v => {
          const vPricing = getVariantPricing(p.tags || [], v.sku, {
            cost: getProductCostPrice(p),
            regular: p.base_price,
            sale: p.sale_price ?? p.base_price,
            priceModifier: Number(v.price_modifier) || 0,
          });
          const vStock = v.stock_quantity || 0;
          totalCostInvestment += vPricing.costPrice * vStock;
          totalRetailValue += vPricing.salePrice * vStock;
        });
      } else {
        const unitCost = getProductCostPrice(p);
        const unitSell = p.sale_price ?? p.base_price ?? 0;
        const stock = p.stock_quantity || 0;

        totalCostInvestment += unitCost * stock;
        totalRetailValue += unitSell * stock;
      }

      if ((p.stock_quantity || 0) <= p.low_stock_threshold) {
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

  // Quick delta adjustments (e.g. +5, -1, +20)
  const handleAdjustStock = async (
    productId: string,
    delta: number,
    changeType: string,
    variantId?: string
  ) => {
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId,
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

  // Direct exact stock save
  const handleSaveExactStock = async (
    productId: string,
    variantId: string | undefined,
    currentStock: number,
    newStockInput: number | string
  ) => {
    const newStock = Number(newStockInput);
    if (isNaN(newStock) || newStock < 0) {
      showToast('Please enter a valid stock number', 'error');
      return;
    }
    const delta = newStock - currentStock;
    if (delta === 0) {
      setEditingVarStockId(null);
      return;
    }

    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId,
          delta,
          changeType: delta > 0 ? 'restock' : 'adjustment',
          notes: `Direct stock adjustment (${currentStock} → ${newStock})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Stock set to ${newStock}`, 'success');
      setEditingVarStockId(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to update stock', 'error');
    }
  };

  // Inline edit parent cost price
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

  // Inline edit variant buying cost
  const handleSaveVariantCostInline = async (
    product: Product,
    variant: ProductVariant,
    newCostVal: number | string
  ) => {
    const newCost = Number(newCostVal);
    if (isNaN(newCost) || newCost < 0) {
      showToast('Please enter a valid buying price', 'error');
      return;
    }

    try {
      const vPricing = getVariantPricing(product.tags || [], variant.sku, {
        cost: getProductCostPrice(product),
        regular: product.base_price,
        sale: product.sale_price ?? product.base_price,
        priceModifier: Number(variant.price_modifier) || 0,
      });

      const res = await fetch('/api/admin/inventory/variants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          productId: product.id,
          costPrice: newCost,
          regularPrice: vPricing.regularPrice,
          sellingPrice: vPricing.salePrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Buying cost for SKU ${variant.sku} set to ৳${newCost}`, 'success');
      setEditingVarCostId(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to update variant cost', 'error');
    }
  };

  // Inline edit variant sale price
  const handleSaveVariantSaleInline = async (
    product: Product,
    variant: ProductVariant,
    newSaleVal: number | string
  ) => {
    const newSale = Number(newSaleVal);
    if (isNaN(newSale) || newSale <= 0) {
      showToast('Please enter a valid selling price', 'error');
      return;
    }

    try {
      const vPricing = getVariantPricing(product.tags || [], variant.sku, {
        cost: getProductCostPrice(product),
        regular: product.base_price,
        sale: product.sale_price ?? product.base_price,
        priceModifier: Number(variant.price_modifier) || 0,
      });

      const res = await fetch('/api/admin/inventory/variants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: variant.id,
          productId: product.id,
          costPrice: vPricing.costPrice,
          regularPrice: vPricing.regularPrice,
          sellingPrice: newSale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Sale price for SKU ${variant.sku} set to ৳${newSale}`, 'success');
      setEditingVarSaleId(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to update variant sale price', 'error');
    }
  };

  // ────────────────────────────────────────────────────────────
  // VARIANT CRUD MODAL HANDLERS
  // ────────────────────────────────────────────────────────────

  // Open Add Variant Modal
  const openAddVariantModal = (product: Product) => {
    setTargetProductForAdd(product);
    const parentCost = getProductCostPrice(product);
    const parentRegular = product.base_price;
    const parentSale = product.sale_price ?? product.base_price;

    setNewVarSize('');
    setNewVarColor('');
    setNewVarMaterial('');
    setNewVarSku(`${product.sku}-V${(product.variants?.length || 0) + 1}`);
    setNewVarStock(10);
    setNewVarCost(parentCost > 0 ? parentCost : '');
    setNewVarRegular(parentRegular);
    setNewVarSale(parentSale);
    setIsAddVariantOpen(true);
  };

  // Submit Add Variant
  const handleSaveNewVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForAdd) return;
    if (!newVarSku.trim()) {
      showToast('Please enter a SKU code', 'error');
      return;
    }

    setIsSubmittingVariant(true);
    try {
      const res = await fetch('/api/admin/inventory/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: targetProductForAdd.id,
          sku: newVarSku.trim(),
          size: newVarSize.trim() || null,
          color: newVarColor.trim() || null,
          material: newVarMaterial.trim() || null,
          stockQuantity: Number(newVarStock) || 0,
          costPrice: newVarCost ? Number(newVarCost) : null,
          regularPrice: newVarRegular ? Number(newVarRegular) : null,
          sellingPrice: newVarSale ? Number(newVarSale) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Variant "${newVarSku}" created successfully!`, 'success');
      setIsAddVariantOpen(false);
      setExpandedIds(prev => ({ ...prev, [targetProductForAdd.id]: true }));
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to create variant', 'error');
    } finally {
      setIsSubmittingVariant(false);
    }
  };

  // Open Edit Variant Modal
  const openEditVariantModal = (product: Product, variant: ProductVariant) => {
    setTargetProductForEdit(product);
    setTargetVariantForEdit(variant);

    const vPricing = getVariantPricing(product.tags || [], variant.sku, {
      cost: getProductCostPrice(product),
      regular: product.base_price,
      sale: product.sale_price ?? product.base_price,
      priceModifier: Number(variant.price_modifier) || 0,
    });

    setEditVarSize(variant.size || '');
    setEditVarColor(variant.color || '');
    setEditVarMaterial(variant.material || '');
    setEditVarSku(variant.sku);
    setEditVarStock(variant.stock_quantity);
    setEditVarCost(vPricing.costPrice > 0 ? vPricing.costPrice : '');
    setEditVarRegular(vPricing.regularPrice);
    setEditVarSale(vPricing.salePrice);
    setIsEditVariantOpen(true);
  };

  // Submit Edit Variant
  const handleSaveEditVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductForEdit || !targetVariantForEdit) return;

    setIsSubmittingVariant(true);
    try {
      const res = await fetch('/api/admin/inventory/variants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: targetVariantForEdit.id,
          productId: targetProductForEdit.id,
          sku: editVarSku.trim(),
          size: editVarSize.trim() || null,
          color: editVarColor.trim() || null,
          material: editVarMaterial.trim() || null,
          stockQuantity: Number(editVarStock) || 0,
          costPrice: editVarCost ? Number(editVarCost) : null,
          regularPrice: editVarRegular ? Number(editVarRegular) : null,
          sellingPrice: editVarSale ? Number(editVarSale) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Variant "${editVarSku}" updated successfully!`, 'success');
      setIsEditVariantOpen(false);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to update variant', 'error');
    } finally {
      setIsSubmittingVariant(false);
    }
  };

  // Delete Variant
  const handleDeleteVariant = async (productId: string, variantId: string, sku: string) => {
    if (!window.confirm(`Are you sure you want to delete variant SKU "${sku}"? Stock and financials will update automatically.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/inventory/variants?id=${variantId}&productId=${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Variant "${sku}" deleted successfully`, 'success');
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete variant', 'error');
    }
  };

  // Open Inventory Audit Logs
  const openHistoryModal = async (product: Product) => {
    setLogsProduct(product);
    setIsLogsOpen(true);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/admin/inventory/logs?productId=${product.id}`);
      const data = await res.json();
      setProductLogs(data.logs || []);
    } catch (err) {
      showToast('Failed to load inventory logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredProducts = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const hasMatchingVariant = (p.variants || []).some(
      v =>
        (v.sku && v.sku.toLowerCase().includes(q)) ||
        (v.size && v.size.toLowerCase().includes(q)) ||
        (v.color && v.color.toLowerCase().includes(q))
    );
    return (
      p.name_en.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      hasMatchingVariant
    );
  });

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Warehouse Inventory & Variant Studio</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Full CRUD operations for product variants, SKU tracking, inline costing, and restock management.
          </p>
        </div>

        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add New Product</span>
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
          <div className="admin-kpi-change">Cost of all in-stock goods across variants (COGS)</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Total Retail Revenue Value</span>
            <div className="admin-kpi-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
              <Package size={20} />
            </div>
          </div>
          <div className="admin-kpi-value">{formatCurrency(financials.totalRetailValue)}</div>
          <div className="admin-kpi-change">Expected gross sales value from current inventory</div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Potential Gross Profit</span>
            <div className="admin-kpi-icon-box" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--color-success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="admin-kpi-value">{formatCurrency(financials.potentialGrossProfit)}</div>
          <div className="admin-kpi-change" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
            {financials.storeMargin}% Store Profit Margin
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-header">
            <span className="admin-kpi-label">Low Stock Alerts</span>
            <div className="admin-kpi-icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="admin-kpi-value">{financials.lowStockCount}</div>
          <div className="admin-kpi-change">Products at or below threshold</div>
        </div>
      </div>

      {/* Pricing & Profit Margin Calculator */}
      <div className="admin-card" style={{ marginBottom: '24px', background: 'linear-gradient(to right, #ffffff, #f8fafc)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px', borderRadius: 'var(--radius-md)', color: 'var(--color-primary)' }}>
            <Calculator size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
              Interactive Pricing & Profit Margin Calculator
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
              Calculate instant profit margins, markups, and discounted sale prices before setting variant costs.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div>
            <label className="admin-label">Regular / Base Price (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcBasePrice}
              onChange={e => handleCalcBaseChange(e.target.value)}
              placeholder="1500"
            />
          </div>

          <div>
            <label className="admin-label">Discount Percent (%)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                className="admin-input"
                value={calcDiscountPercent}
                onChange={e => handleCalcDiscountChange(e.target.value)}
                placeholder="20"
                style={{ paddingRight: '28px' }}
              />
              <Percent size={14} color="var(--color-admin-muted)" style={{ position: 'absolute', right: '10px', top: '12px' }} />
            </div>
          </div>

          <div>
            <label className="admin-label">Discounted Selling Price (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcSellingPrice}
              onChange={e => handleCalcSaleChange(e.target.value)}
              placeholder="1200"
            />
          </div>

          <div>
            <label className="admin-label">Unit Buying Cost / COGS (৳)</label>
            <input
              type="number"
              className="admin-input"
              value={calcCostPrice}
              onChange={e => setCalcCostPrice(e.target.value)}
              placeholder="800"
            />
          </div>

          {/* Computed Margin Output */}
          <div
            style={{
              background: calcMetrics.isProfitable ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${calcMetrics.isProfitable ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '8px 14px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>Computed Net Profit</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ fontSize: '16px', color: calcMetrics.isProfitable ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {formatCurrency(calcMetrics.netProfit)}
              </strong>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: calcMetrics.isProfitable ? 'var(--color-success)' : 'var(--color-danger)',
                  color: '#ffffff',
                }}
              >
                {calcMetrics.marginPercent}% margin
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Inventory Products Table */}
      <div className="admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} color="var(--color-admin-muted)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Filter products, SKUs, or variant options..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="admin-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={loadProducts}
              className="btn btn-secondary btn-sm"
              style={{ background: '#ffffff', color: 'var(--color-admin-text)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={13} />
              <span>Refresh Stock</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-admin-muted)' }}>
            Loading warehouse inventory and variant matrix...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-admin-muted)' }}>
            No products found matching your search.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Buying Cost (COGS)</th>
                  <th>Selling Price</th>
                  <th>Unit Profit (Margin)</th>
                  <th>Total Stock</th>
                  <th>Valuation</th>
                  <th style={{ textAlign: 'right' }}>Quick Restock / Actions</th>
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
                  const hasVariants = product.has_variants || (product.variants && product.variants.length > 0);
                  const variantCount = product.variants?.length || 0;

                  return (
                    <React.Fragment key={product.id}>
                      <tr>
                        <td>
                          <strong style={{ color: 'var(--color-admin-text)', fontSize: '14px' }}>{product.name_en}</strong>
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedIds(prev => ({ ...prev, [product.id]: !prev[product.id] }))}
                              style={{
                                background: hasVariants ? 'rgba(59, 130, 246, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                                border: `1px solid ${hasVariants ? 'rgba(59, 130, 246, 0.25)' : 'rgba(100, 116, 139, 0.2)'}`,
                                color: hasVariants ? 'var(--color-primary)' : 'var(--color-admin-muted)',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              {expandedIds[product.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              <span>{variantCount > 0 ? `${variantCount} Variants` : '+ Add First Variant'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openHistoryModal(product)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-admin-muted)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                              }}
                              title="View stock history"
                            >
                              <History size={11} />
                              <span>History</span>
                            </button>
                          </div>
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

                      {/* Expandable Sub-Table for Product Variants with Full CRUD */}
                      {expandedIds[product.id] && (
                        <tr key={`${product.id}-variants-drawer`}>
                          <td colSpan={8} style={{ padding: '0 0 16px 20px', background: 'var(--color-admin-surface-2)' }}>
                            <div style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-admin-border)', padding: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Layers size={15} color="var(--color-primary)" />
                                  <span>Variant Inventory & SKU Management for "{product.name_en}"</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => openHistoryModal(product)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ background: '#ffffff', color: 'var(--color-admin-text)', fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <History size={12} />
                                    <span>Stock Logs</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openAddVariantModal(product)}
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  >
                                    <Plus size={12} />
                                    <span>+ Add Variant</span>
                                  </button>
                                </div>
                              </div>

                              {(!product.variants || product.variants.length === 0) ? (
                                <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-admin-border)' }}>
                                  <Package size={24} color="var(--color-admin-muted)" style={{ margin: '0 auto 8px' }} />
                                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-admin-text)', marginBottom: '4px' }}>
                                    No variants created for this product yet
                                  </p>
                                  <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginBottom: '12px' }}>
                                    Create size, diameter, stand, color, or material options with custom buying costs and selling prices.
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => openAddVariantModal(product)}
                                    className="btn btn-primary btn-sm"
                                  >
                                    <Plus size={13} />
                                    <span>Create First Variant</span>
                                  </button>
                                </div>
                              ) : (
                                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-admin-border)', textAlign: 'left', color: 'var(--color-admin-muted)' }}>
                                      <th style={{ padding: '6px 8px' }}>Option Combination</th>
                                      <th style={{ padding: '6px 8px' }}>SKU</th>
                                      <th style={{ padding: '6px 8px' }}>Buying Cost (COGS)</th>
                                      <th style={{ padding: '6px 8px' }}>Selling Price</th>
                                      <th style={{ padding: '6px 8px' }}>Unit Margin</th>
                                      <th style={{ padding: '6px 8px' }}>Stock (Click to Edit)</th>
                                      <th style={{ padding: '6px 8px' }}>Valuation</th>
                                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {product.variants.map(v => {
                                      const vPricing = getVariantPricing(product.tags || [], v.sku, {
                                        cost: unitCost,
                                        regular: product.base_price,
                                        sale: product.sale_price ?? product.base_price,
                                        priceModifier: Number(v.price_modifier) || 0,
                                      });
                                      const vStock = v.stock_quantity || 0;
                                      const vVal = vPricing.costPrice * vStock;
                                      const vLabel = [v.size, v.color, v.material].filter(Boolean).join(' / ') || v.sku;
                                      const isVLow = vStock <= 5;

                                      const isEditingThisStock = editingVarStockId === v.id;
                                      const isEditingThisCost = editingVarCostId === v.id;
                                      const isEditingThisSale = editingVarSaleId === v.id;

                                      return (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--color-admin-surface-2)' }}>
                                          <td style={{ padding: '8px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
                                            {vLabel}
                                          </td>
                                          <td style={{ padding: '8px', color: 'var(--color-admin-muted)', fontFamily: 'monospace' }}>
                                            {v.sku}
                                          </td>

                                          {/* Variant Cost with 1-Click Inline Edit */}
                                          <td style={{ padding: '8px' }}>
                                            {isEditingThisCost ? (
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <input
                                                  type="number"
                                                  className="admin-input"
                                                  value={editingVarCostVal}
                                                  onChange={e => setEditingVarCostVal(e.target.value)}
                                                  autoFocus
                                                  style={{ width: '80px', height: '26px', fontSize: '11px', padding: '2px 6px' }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveVariantCostInline(product, v, editingVarCostVal)}
                                                  className="btn btn-primary btn-sm"
                                                  style={{ padding: '2px 5px', height: '26px' }}
                                                >
                                                  <Check size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingVarCostId(null)}
                                                  className="btn btn-secondary btn-sm"
                                                  style={{ padding: '2px 5px', height: '26px' }}
                                                >
                                                  <X size={12} />
                                                </button>
                                              </div>
                                            ) : (
                                              <span
                                                onClick={() => {
                                                  setEditingVarCostId(v.id);
                                                  setEditingVarCostVal(vPricing.costPrice > 0 ? vPricing.costPrice : '');
                                                }}
                                                style={{ cursor: 'pointer', fontWeight: 700, color: '#3b82f6', borderBottom: '1px dashed #3b82f6' }}
                                                title="Click to edit buying price"
                                              >
                                                {vPricing.costPrice > 0 ? formatCurrency(vPricing.costPrice) : 'Set Cost ৳'}
                                              </span>
                                            )}
                                          </td>

                                          {/* Variant Sale Price with 1-Click Inline Edit */}
                                          <td style={{ padding: '8px' }}>
                                            {isEditingThisSale ? (
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <input
                                                  type="number"
                                                  className="admin-input"
                                                  value={editingVarSaleVal}
                                                  onChange={e => setEditingVarSaleVal(e.target.value)}
                                                  autoFocus
                                                  style={{ width: '80px', height: '26px', fontSize: '11px', padding: '2px 6px' }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveVariantSaleInline(product, v, editingVarSaleVal)}
                                                  className="btn btn-primary btn-sm"
                                                  style={{ padding: '2px 5px', height: '26px' }}
                                                >
                                                  <Check size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingVarSaleId(null)}
                                                  className="btn btn-secondary btn-sm"
                                                  style={{ padding: '2px 5px', height: '26px' }}
                                                >
                                                  <X size={12} />
                                                </button>
                                              </div>
                                            ) : (
                                              <span
                                                onClick={() => {
                                                  setEditingVarSaleId(v.id);
                                                  setEditingVarSaleVal(vPricing.salePrice);
                                                }}
                                                style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-primary)', borderBottom: '1px dashed var(--color-primary)' }}
                                                title="Click to edit selling price"
                                              >
                                                {formatCurrency(vPricing.salePrice)}
                                              </span>
                                            )}
                                          </td>

                                          {/* Profit & Margin */}
                                          <td style={{ padding: '8px' }}>
                                            <span style={{ color: vPricing.isProfitable ? '#16a34a' : '#ef4444', fontWeight: 700 }}>
                                              {formatCurrency(vPricing.netProfit)} ({vPricing.marginPercent}%)
                                            </span>
                                          </td>

                                          {/* Stock Quantity with 1-Click Direct Override */}
                                          <td style={{ padding: '8px' }}>
                                            {isEditingThisStock ? (
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <input
                                                  type="number"
                                                  className="admin-input"
                                                  value={editingVarStockVal}
                                                  onChange={e => setEditingVarStockVal(e.target.value)}
                                                  autoFocus
                                                  style={{ width: '60px', height: '26px', fontSize: '11px', padding: '2px 6px' }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveExactStock(product.id, v.id, vStock, editingVarStockVal)}
                                                  className="btn btn-primary btn-sm"
                                                  style={{ padding: '2px 5px', height: '26px' }}
                                                >
                                                  <Check size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingVarStockId(null)}
                                                  className="btn btn-secondary btn-sm"
                                                  style={{ padding: '2px 5px', height: '26px' }}
                                                >
                                                  <X size={12} />
                                                </button>
                                              </div>
                                            ) : (
                                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <span
                                                  onClick={() => {
                                                    setEditingVarStockId(v.id);
                                                    setEditingVarStockVal(vStock);
                                                  }}
                                                  style={{
                                                    cursor: 'pointer',
                                                    fontWeight: 800,
                                                    fontSize: '13px',
                                                    color: isVLow ? '#ef4444' : '#16a34a',
                                                    borderBottom: '1px dashed currentColor',
                                                  }}
                                                  title="Click to directly type exact stock"
                                                >
                                                  {vStock}
                                                </span>
                                                {isVLow && <span className="badge badge-danger" style={{ fontSize: '9px' }}>Low</span>}
                                              </div>
                                            )}
                                          </td>

                                          {/* Capital Valuation */}
                                          <td style={{ padding: '8px', fontWeight: 700 }}>
                                            {formatCurrency(vVal)}
                                          </td>

                                          {/* Restock & CRUD Actions */}
                                          <td style={{ padding: '8px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                              {/* Quick Deltas */}
                                              <button
                                                type="button"
                                                onClick={() => handleAdjustStock(product.id, -1, 'adjustment', v.id)}
                                                disabled={vStock <= 0}
                                                className="btn btn-secondary btn-sm"
                                                style={{ padding: '2px 6px', height: '24px' }}
                                                title="Decrease 1"
                                              >
                                                <Minus size={10} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleAdjustStock(product.id, 5, 'restock', v.id)}
                                                className="btn btn-secondary btn-sm"
                                                style={{ padding: '2px 6px', height: '24px', fontWeight: 700 }}
                                                title="Restock +5"
                                              >
                                                +5
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleAdjustStock(product.id, 20, 'restock', v.id)}
                                                className="btn btn-primary btn-sm"
                                                style={{ padding: '2px 6px', height: '24px', fontWeight: 700 }}
                                                title="Restock +20"
                                              >
                                                +20
                                              </button>

                                              {/* Edit Variant Modal Trigger */}
                                              <button
                                                type="button"
                                                onClick={() => openEditVariantModal(product, v)}
                                                className="btn btn-secondary btn-sm"
                                                style={{ padding: '2px 6px', height: '24px', marginLeft: '4px' }}
                                                title="Edit all variant details"
                                              >
                                                <Pencil size={11} color="var(--color-admin-text)" />
                                              </button>

                                              {/* Delete Variant Trigger */}
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteVariant(product.id, v.id, v.sku)}
                                                className="btn btn-secondary btn-sm"
                                                style={{ padding: '2px 6px', height: '24px', color: 'var(--color-danger)' }}
                                                title="Delete this variant"
                                              >
                                                <Trash2 size={11} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────
          MODAL: ADD NEW VARIANT
          ──────────────────────────────────────────────────────────── */}
      {isAddVariantOpen && targetProductForAdd && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Add New Variant
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                  Product: <strong>{targetProductForAdd.name_en}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVariantOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-admin-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewVariant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Option Attributes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="admin-label">Option 1 (Size/Dia)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={newVarSize}
                    onChange={e => setNewVarSize(e.target.value)}
                    placeholder="e.g. 10 inch / XL"
                  />
                </div>
                <div>
                  <label className="admin-label">Option 2 (Color/Stand)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={newVarColor}
                    onChange={e => setNewVarColor(e.target.value)}
                    placeholder="e.g. Wooden Stand"
                  />
                </div>
                <div>
                  <label className="admin-label">Option 3 (Material)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={newVarMaterial}
                    onChange={e => setNewVarMaterial(e.target.value)}
                    placeholder="e.g. Solid Wood"
                  />
                </div>
              </div>

              {/* SKU and Initial Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="admin-label">SKU Code *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={newVarSku}
                    onChange={e => setNewVarSku(e.target.value)}
                    placeholder="MOON-10-WOOD"
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Initial Stock *</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={newVarStock}
                    onChange={e => setNewVarStock(e.target.value)}
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Pricing & Costing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="admin-label">Buying Cost (COGS ৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={newVarCost}
                    onChange={e => setNewVarCost(e.target.value)}
                    placeholder="৳ 450"
                  />
                </div>
                <div>
                  <label className="admin-label">Regular Price (৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={newVarRegular}
                    onChange={e => setNewVarRegular(e.target.value)}
                    placeholder="৳ 800"
                  />
                </div>
                <div>
                  <label className="admin-label">Sale Price (৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={newVarSale}
                    onChange={e => setNewVarSale(e.target.value)}
                    placeholder="৳ 720"
                  />
                </div>
              </div>

              {/* Live Margin Calculation Preview */}
              {Number(newVarSale) > 0 && Number(newVarCost) > 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                  <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>Profit Margin Preview:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <strong style={{ fontSize: '14px', color: '#15803d' }}>
                      +৳{Number(newVarSale) - Number(newVarCost)} Net Profit
                    </strong>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                      ({(((Number(newVarSale) - Number(newVarCost)) / Number(newVarSale)) * 100).toFixed(1)}% margin)
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddVariantOpen(false)}
                  className="btn btn-secondary"
                  style={{ background: '#ffffff', color: 'var(--color-admin-text)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVariant}
                  className="btn btn-primary"
                >
                  {isSubmittingVariant ? 'Creating Variant...' : 'Create Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          MODAL: EDIT EXISTING VARIANT
          ──────────────────────────────────────────────────────────── */}
      {isEditVariantOpen && targetProductForEdit && targetVariantForEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '560px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                  Edit Variant Details
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                  SKU: <strong>{targetVariantForEdit.sku}</strong> — Product: {targetProductForEdit.name_en}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditVariantOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-admin-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditVariant} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Option Attributes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="admin-label">Option 1 (Size/Dia)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editVarSize}
                    onChange={e => setEditVarSize(e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label">Option 2 (Color/Stand)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editVarColor}
                    onChange={e => setEditVarColor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="admin-label">Option 3 (Material)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editVarMaterial}
                    onChange={e => setEditVarMaterial(e.target.value)}
                  />
                </div>
              </div>

              {/* SKU and Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="admin-label">SKU Code *</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editVarSku}
                    onChange={e => setEditVarSku(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="admin-label">Stock Quantity *</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={editVarStock}
                    onChange={e => setEditVarStock(e.target.value)}
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Pricing & Costing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="admin-label">Buying Cost (COGS ৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={editVarCost}
                    onChange={e => setEditVarCost(e.target.value)}
                    placeholder="৳ Cost"
                  />
                </div>
                <div>
                  <label className="admin-label">Regular Price (৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={editVarRegular}
                    onChange={e => setEditVarRegular(e.target.value)}
                    placeholder="৳ Regular"
                  />
                </div>
                <div>
                  <label className="admin-label">Sale Price (৳)</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={editVarSale}
                    onChange={e => setEditVarSale(e.target.value)}
                    placeholder="৳ Sale"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditVariantOpen(false)}
                  className="btn btn-secondary"
                  style={{ background: '#ffffff', color: 'var(--color-admin-text)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVariant}
                  className="btn btn-primary"
                >
                  {isSubmittingVariant ? 'Saving Changes...' : 'Save Variant Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          MODAL: INVENTORY AUDIT MOVEMENT LOGS
          ──────────────────────────────────────────────────────────── */}
      {isLogsOpen && logsProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--color-admin-border)' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <History size={16} color="var(--color-primary)" />
                  <span>Stock Movement History</span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>
                  Product: <strong>{logsProduct.name_en}</strong> ({logsProduct.sku})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-admin-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-admin-muted)' }}>
                  Fetching inventory audit logs...
                </div>
              ) : productLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-admin-muted)' }}>
                  No stock adjustments recorded yet for this product.
                </div>
              ) : (
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-admin-border)', textAlign: 'left', color: 'var(--color-admin-muted)' }}>
                      <th style={{ padding: '8px 6px' }}>Date & Time</th>
                      <th style={{ padding: '8px 6px' }}>Action</th>
                      <th style={{ padding: '8px 6px' }}>Delta</th>
                      <th style={{ padding: '8px 6px' }}>Before → After</th>
                      <th style={{ padding: '8px 6px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productLogs.map(log => {
                      const isPositive = log.quantity_change > 0;
                      return (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--color-admin-surface-2)' }}>
                          <td style={{ padding: '8px 6px', color: 'var(--color-admin-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background:
                                  log.change_type === 'restock'
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : log.change_type === 'sale'
                                    ? 'rgba(59, 130, 246, 0.1)'
                                    : 'rgba(245, 158, 11, 0.1)',
                                color:
                                  log.change_type === 'restock'
                                    ? 'var(--color-success)'
                                    : log.change_type === 'sale'
                                    ? 'var(--color-primary)'
                                    : 'var(--color-warning)',
                              }}
                            >
                              {log.change_type}
                            </span>
                          </td>
                          <td style={{ padding: '8px 6px', fontWeight: 800, color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }}>
                            {isPositive ? `+${log.quantity_change}` : log.quantity_change}
                          </td>
                          <td style={{ padding: '8px 6px', color: 'var(--color-admin-text)' }}>
                            {log.quantity_before} → <strong>{log.quantity_after}</strong>
                          </td>
                          <td style={{ padding: '8px 6px', color: 'var(--color-admin-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.notes || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-admin-border)', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setIsLogsOpen(false)}
                className="btn btn-secondary btn-sm"
                style={{ background: '#ffffff', color: 'var(--color-admin-text)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
