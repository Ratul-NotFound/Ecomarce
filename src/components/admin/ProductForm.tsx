'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from './ImageUploader';
import { useToast } from '@/components/shared/ToastProvider';
import { slugify, formatCurrency } from '@/lib/utils/format';
import { getProductCostPrice, syncCostToTags, calculateProfitMetrics } from '@/lib/utils/pricing';
import type { Product, Category, ProductVariant } from '@/types';
import { Plus, Trash2, Calculator, TrendingUp } from 'lucide-react';

interface ProductFormProps {
  initialProduct?: Product | null;
  categories: Category[];
}

export default function ProductForm({ initialProduct, categories = [] }: ProductFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const isEditing = Boolean(initialProduct);

  const [nameEn, setNameEn] = useState(initialProduct?.name_en || '');
  const [nameBn, setNameBn] = useState(initialProduct?.name_bn || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || '');
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [sku, setSku] = useState(initialProduct?.sku || `SKU-${Date.now().toString().slice(-6)}`);
  const [basePrice, setBasePrice] = useState<number | string>(initialProduct?.base_price ?? '');
  const [salePrice, setSalePrice] = useState<number | string>(initialProduct?.sale_price ?? '');
  const [costPrice, setCostPrice] = useState<number | string>(
    initialProduct ? getProductCostPrice(initialProduct) || '' : ''
  );
  const [stockQuantity, setStockQuantity] = useState<number | string>(initialProduct?.stock_quantity ?? 10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(initialProduct?.low_stock_threshold ?? 5);
  const [descriptionEn, setDescriptionEn] = useState(initialProduct?.description_en || '');
  const [descriptionBn, setDescriptionBn] = useState(initialProduct?.description_bn || '');
  const [images, setImages] = useState<string[]>(initialProduct?.images || []);
  const [isFeatured, setIsFeatured] = useState(initialProduct?.is_featured || false);
  const [isFlashSale, setIsFlashSale] = useState(initialProduct?.is_flash_sale || false);
  const [displayOrder, setDisplayOrder] = useState<number | string>(initialProduct?.display_order ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic variants
  const [variants, setVariants] = useState<Array<{ size: string; color: string; price_modifier: number; stock_quantity: number }>>(
    initialProduct?.variants?.map(v => ({
      size: v.size || '',
      color: v.color || '',
      price_modifier: v.price_modifier || 0,
      stock_quantity: v.stock_quantity || 0,
    })) || []
  );

  const handleNameChange = (val: string) => {
    setNameEn(val);
    if (!isEditing) {
      setSlug(slugify(val));
    }
  };

  const handleAddVariant = () => {
    setVariants([...variants, { size: 'M', color: '', price_modifier: 0, stock_quantity: 10 }]);
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleVariantChange = (idx: number, field: string, val: any) => {
    const updated = [...variants];
    (updated[idx] as any)[field] = val;
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameEn.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (!basePrice || Number(basePrice) <= 0) {
      showToast('Please set a valid base price', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name_en: nameEn.trim(),
        name_bn: nameBn.trim() || null,
        slug: slug.trim() || slugify(nameEn),
        category_id: categoryId || null,
        brand: brand.trim() || null,
        sku: sku.trim(),
        base_price: Number(basePrice),
        sale_price: salePrice ? Number(salePrice) : null,
        cost_price: costPrice ? Number(costPrice) : null,
        tags: syncCostToTags(initialProduct?.tags || [], costPrice ? Number(costPrice) : null),
        stock_quantity: Number(stockQuantity) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        description_en: descriptionEn.trim() || null,
        description_bn: descriptionBn.trim() || null,
        images,
        is_featured: isFeatured,
        is_flash_sale: isFlashSale,
        flash_sale_ends_at: isFlashSale ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
        display_order: Number(displayOrder) || 0,
        has_variants: variants.length > 0,
        variants: variants.map((v, idx) => ({
          sku: `${sku}-V${idx + 1}`,
          size: v.size.trim() || null,
          color: v.color.trim() || null,
          price_modifier: Number(v.price_modifier) || 0,
          stock_quantity: Number(v.stock_quantity) || 0,
          images: [],
        })),
      };

      const url = isEditing ? `/api/admin/products/${initialProduct?.id}` : '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save product');
      }

      showToast(`Product "${nameEn}" saved successfully!`, 'success');
      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      showToast(err.message || 'Error saving product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '1000px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Core Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Basic Product Information
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="admin-label" htmlFor="prod-name-en">Product Title (English) *</label>
                <input
                  id="prod-name-en"
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Classic Cotton Polo Shirt"
                  value={nameEn}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-label" htmlFor="prod-name-bn">Product Title (বাংলা / Bangla)</label>
                <input
                  id="prod-name-bn"
                  type="text"
                  className="admin-input"
                  placeholder="e.g. ক্লাসিক কটন পোলো শার্ট"
                  value={nameBn}
                  onChange={e => setNameBn(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label" htmlFor="prod-slug">URL Slug</label>
                  <input
                    id="prod-slug"
                    type="text"
                    className="admin-input"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label" htmlFor="prod-category">Category</label>
                  <select
                    id="prod-category"
                    className="admin-input"
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name_en} {c.name_bn ? `(${c.name_bn})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label" htmlFor="prod-brand">Brand / Manufacturer</label>
                  <input
                    id="prod-brand"
                    type="text"
                    className="admin-input"
                    placeholder="e.g. Apex / Easy"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label" htmlFor="prod-sku">SKU Code *</label>
                  <input
                    id="prod-sku"
                    type="text"
                    className="admin-input"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="admin-label" htmlFor="prod-desc-en">Description (English)</label>
                <textarea
                  id="prod-desc-en"
                  className="admin-input"
                  rows={4}
                  placeholder="Highlight key materials, specifications, and fit..."
                  value={descriptionEn}
                  onChange={e => setDescriptionEn(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="admin-label" htmlFor="prod-desc-bn">Description (বাংলা / Bangla)</label>
                <textarea
                  id="prod-desc-bn"
                  className="admin-input"
                  rows={3}
                  placeholder="পণ্যটির বিশেষ বৈশিষ্ট্য এবং বিবরণ লিখুন..."
                  value={descriptionBn}
                  onChange={e => setDescriptionBn(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Variants Builder */}
          <div className="admin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>Product Variants</h2>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)' }}>Sizes, Colors, and Price Modifiers</p>
              </div>
              <button
                type="button"
                onClick={handleAddVariant}
                className="btn btn-secondary btn-sm"
                style={{ background: 'var(--color-admin-surface-2)', color: '#ffffff', borderColor: 'var(--color-admin-border)' }}
              >
                <Plus size={14} />
                <span>Add Variant</span>
              </button>
            </div>

            {variants.length === 0 ? (
              <div style={{ color: 'var(--color-admin-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                No variants configured. Product will sell as a single standard item.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {variants.map((v, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1.2fr auto', gap: '8px', alignItems: 'center', background: 'var(--color-admin-surface-2)', padding: '12px', borderRadius: 'var(--radius-lg)' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)' }}>Size</span>
                      <input
                        type="text"
                        placeholder="M / 42 / XL"
                        className="admin-input"
                        value={v.size}
                        onChange={e => handleVariantChange(idx, 'size', e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)' }}>Color</span>
                      <input
                        type="text"
                        placeholder="Navy / Black"
                        className="admin-input"
                        value={v.color}
                        onChange={e => handleVariantChange(idx, 'color', e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)' }}>Price +/- (৳)</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="admin-input"
                        value={v.price_modifier}
                        onChange={e => handleVariantChange(idx, 'price_modifier', e.target.value)}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)' }}>Stock</span>
                      <input
                        type="number"
                        placeholder="10"
                        className="admin-input"
                        value={v.stock_quantity}
                        onChange={e => handleVariantChange(idx, 'stock_quantity', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', marginTop: '14px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing, Inventory & Media */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Pricing & Stock */}
          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px' }}>
              Pricing & Costing (COGS)
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Buying Price / Costing */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="admin-label" htmlFor="prod-cost-price" style={{ margin: 0 }}>
                    Buying Price / Product Costing (৳)
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Internal Costing
                  </span>
                </div>
                <input
                  id="prod-cost-price"
                  type="number"
                  className="admin-input"
                  placeholder="e.g. 850 (Your purchase cost)"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                  min="0"
                />
                <p style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                  Used to calculate your real net profit, profit margins, and total inventory value.
                </p>
              </div>

              <div className="form-group">
                <label className="admin-label" htmlFor="prod-base-price">Regular Base Price (৳) *</label>
                <input
                  id="prod-base-price"
                  type="number"
                  className="admin-input"
                  placeholder="1500"
                  value={basePrice}
                  onChange={e => setBasePrice(e.target.value)}
                  min="0"
                  required
                />
              </div>

              <div className="form-group">
                <label className="admin-label" htmlFor="prod-sale-price">Offer / Discounted Sale Price (৳)</label>
                <input
                  id="prod-sale-price"
                  type="number"
                  className="admin-input"
                  placeholder="1250"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  min="0"
                />
              </div>

              {/* Dynamic Financial Intelligence Preview */}
              {Boolean(Number(basePrice) || Number(costPrice)) && (() => {
                const effectiveSell = Number(salePrice) || Number(basePrice) || 0;
                const effectiveCost = Number(costPrice) || 0;
                const metrics = calculateProfitMetrics(effectiveSell, effectiveCost);
                const totalStockInv = effectiveCost * (Number(stockQuantity) || 0);

                return (
                  <div
                    style={{
                      background: 'var(--color-admin-surface-2)',
                      border: '1px solid var(--color-admin-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--color-admin-text)' }}>
                      <TrendingUp size={14} color="var(--color-primary)" />
                      <span>Financial Margin Preview</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-admin-border)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-admin-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Gross Profit / Unit</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: metrics.isProfitable ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {formatCurrency(metrics.netProfit)}
                        </div>
                      </div>

                      <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-admin-border)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-admin-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Profit Margin %</div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {metrics.marginPercent}%
                        </div>
                      </div>
                    </div>

                    {effectiveCost > 0 && Number(stockQuantity) > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--color-admin-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Stock Investment:</span>
                        <strong style={{ color: 'var(--color-admin-text)' }}>{formatCurrency(totalStockInv)}</strong>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="admin-label" htmlFor="prod-stock">Total Stock Quantity *</label>
                  <input
                    id="prod-stock"
                    type="number"
                    className="admin-input"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="admin-label" htmlFor="prod-low-stock">Low Stock Alert Level</label>
                  <input
                    id="prod-low-stock"
                    type="number"
                    className="admin-input"
                    value={lowStockThreshold}
                    onChange={e => setLowStockThreshold(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ffffff', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                  />
                  <span>Feature on Homepage Spotlight</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#ffffff', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={isFlashSale}
                    onChange={e => setIsFlashSale(e.target.checked)}
                  />
                  <span>Include in Flash Sale Banner (7-day timer)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Media Images */}
          <div className="admin-card">
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '16px' }}>
              Product Gallery Images
            </h2>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          {/* Submit / Cancel Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1, padding: '14px' }}
              id="save-product-submit-btn"
            >
              {isSubmitting ? 'Saving Product...' : isEditing ? 'Update Product' : 'Publish Product'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="btn btn-secondary"
              style={{ background: 'var(--color-admin-surface-2)', color: '#ffffff', borderColor: 'var(--color-admin-border)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
