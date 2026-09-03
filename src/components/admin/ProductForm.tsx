'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader from './ImageUploader';
import ProductMediaManager from './ProductMediaManager';
import { useToast } from '@/components/shared/ToastProvider';
import { slugify, formatCurrency } from '@/lib/utils/format';
import {
  getProductCostPrice,
  syncCostToTags,
  getVariantCostPrice,
  syncVariantCostsToTags,
  extractOptionSchema,
  syncOptionSchemaToTags,
  getVariantPricing,
  syncVariantFinancialsToTags,
  calculateProfitMetrics,
  calculateDiscountPrice,
  calculateDiscountPercent,
  type ProductOptionSchema,
} from '@/lib/utils/pricing';
import { getProductVideoUrl, syncVideoToTags } from '@/lib/utils/video';
import type { Product, Category, ProductVariant } from '@/types';
import {
  Plus,
  Trash2,
  Calculator,
  TrendingUp,
  Percent,
  Tag,
  Sparkles,
  Layers,
  Box,
  Copy,
  CheckSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
  const [discountPercent, setDiscountPercent] = useState<number | string>(
    initialProduct?.discount_percent ?? (
      initialProduct?.base_price && initialProduct?.sale_price
        ? calculateDiscountPercent(initialProduct.base_price, initialProduct.sale_price)
        : ''
    )
  );
  const [costPrice, setCostPrice] = useState<number | string>(
    initialProduct ? getProductCostPrice(initialProduct) || '' : ''
  );
  const [videoUrl, setVideoUrl] = useState<string>(
    initialProduct ? getProductVideoUrl(initialProduct) || '' : ''
  );
  const [stockQuantity, setStockQuantity] = useState<number | string>(initialProduct?.stock_quantity ?? 10);
  const [totalSold, setTotalSold] = useState<number | string>(initialProduct?.total_sold ?? 0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | string>(initialProduct?.low_stock_threshold ?? 5);
  const [descriptionEn, setDescriptionEn] = useState(initialProduct?.description_en || '');
  const [descriptionBn, setDescriptionBn] = useState(initialProduct?.description_bn || '');
  const [images, setImages] = useState<string[]>(initialProduct?.images || []);
  const [isFeatured, setIsFeatured] = useState(initialProduct?.is_featured || false);
  const [isFlashSale, setIsFlashSale] = useState(initialProduct?.is_flash_sale || false);
  const [displayOrder, setDisplayOrder] = useState<number | string>(initialProduct?.display_order ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bidirectional Price & Discount Handlers
  const handleBasePriceChange = (val: string) => {
    setBasePrice(val);
    const numBase = Number(val);
    const numDisc = Number(discountPercent);
    if (numBase > 0 && numDisc > 0) {
      setSalePrice(calculateDiscountPrice(numBase, numDisc));
    } else if (numBase > 0 && Number(salePrice) > 0) {
      setDiscountPercent(calculateDiscountPercent(numBase, Number(salePrice)));
    }
  };

  const handleSalePriceChange = (val: string) => {
    setSalePrice(val);
    const numSale = Number(val);
    const numBase = Number(basePrice);
    if (numBase > 0 && numSale > 0 && numSale < numBase) {
      setDiscountPercent(calculateDiscountPercent(numBase, numSale));
    } else if (!val || numSale >= numBase) {
      setDiscountPercent('');
    }
  };

  const handleDiscountPercentChange = (val: string | number) => {
    setDiscountPercent(val);
    const numDisc = Number(val);
    const numBase = Number(basePrice);
    if (numBase > 0 && numDisc > 0) {
      setSalePrice(calculateDiscountPrice(numBase, numDisc));
    } else if (!val || numDisc <= 0) {
      setSalePrice('');
    }
  };

  // Universal Multi-Attribute Dynamic Variant Architecture
  interface FormVariant {
    id?: string;
    size: string; // Option 1
    color: string; // Option 2
    material: string; // Option 3 / Custom
    sku: string;
    cost_price: number | string; // Buying Price (COGS)
    regular_price: number | string; // List Price / MSRP
    sale_price: number | string; // Customer Checkout Price
    discount_percent: number | string;
    price_modifier: number;
    stock_quantity: number | string;
  }

  const [hasVariants, setHasVariants] = useState<boolean>(
    Boolean(initialProduct?.has_variants || (initialProduct?.variants && initialProduct.variants.length > 0))
  );

  // Dynamic Options Definition
  interface DynamicOptionDef {
    name: string;
    values: string;
  }

  const [optionDefs, setOptionDefs] = useState<DynamicOptionDef[]>(() => {
    const existing = extractOptionSchema(initialProduct?.tags || []);
    if (existing && existing.length > 0) {
      return existing.map(e => ({
        name: e.name,
        values: e.values.join(', '),
      }));
    }
    return [
      { name: 'Diameter / Size', values: '6 inch, 8 inch, 10 inch' },
      { name: 'Stand / Base', values: 'Wooden Stand, Plastic Stand' },
    ];
  });

  const [variants, setVariants] = useState<FormVariant[]>(() => {
    const baseReg = Number(initialProduct?.base_price || 0);
    const baseEff = Number(initialProduct?.sale_price ?? initialProduct?.base_price ?? 0);
    const prodCost = getProductCostPrice(initialProduct || {});

    return (
      initialProduct?.variants?.map((v, idx) => {
        const pricing = getVariantPricing(initialProduct?.tags || [], v.sku, {
          cost: prodCost,
          regular: baseReg,
          sale: baseEff,
          priceModifier: Number(v.price_modifier) || 0,
        });

        return {
          id: v.id,
          size: v.size || '',
          color: v.color || '',
          material: v.material || '',
          sku: v.sku || `${initialProduct?.sku || 'SKU'}-V${idx + 1}`,
          cost_price: pricing.costPrice > 0 ? pricing.costPrice : (prodCost > 0 ? prodCost : ''),
          regular_price: pricing.regularPrice > 0 ? pricing.regularPrice : (baseReg > 0 ? baseReg : ''),
          sale_price: pricing.salePrice > 0 ? pricing.salePrice : (baseEff > 0 ? baseEff : ''),
          discount_percent: pricing.discountPercent > 0 ? pricing.discountPercent : '',
          price_modifier: Number(v.price_modifier) || 0,
          stock_quantity: v.stock_quantity ?? 10,
        };
      }) || []
    );
  });

  // Bulk Generator State
  const [showGenerator, setShowGenerator] = useState(false);
  const [genPreset, setGenPreset] = useState<'lighting' | 'apparel' | 'watches' | 'bags' | 'eyewear' | 'gadgets' | 'volume' | 'custom'>('lighting');
  const [genDefaultReg, setGenDefaultReg] = useState<number | string>('');
  const [genDefaultSell, setGenDefaultSell] = useState<number | string>('');
  const [genDefaultCost, setGenDefaultCost] = useState<number | string>('');
  const [genDefaultStock, setGenDefaultStock] = useState<number | string>(10);

  const applyCategoryPreset = (preset: 'lighting' | 'apparel' | 'watches' | 'bags' | 'eyewear' | 'gadgets' | 'volume' | 'custom') => {
    setGenPreset(preset);
    if (preset === 'lighting') {
      setOptionDefs([
        { name: 'Diameter / Size', values: '6 inch, 8 inch, 10 inch' },
        { name: 'Stand / Base', values: 'Wooden Stand, Plastic Stand' },
      ]);
    } else if (preset === 'apparel') {
      setOptionDefs([
        { name: 'Size', values: 'S, M, L, XL, XXL' },
        { name: 'Color', values: 'Black, White, Navy Blue' },
      ]);
    } else if (preset === 'watches') {
      setOptionDefs([
        { name: 'Dial Size', values: '40mm, 44mm' },
        { name: 'Strap Material', values: 'Italian Leather, Milanese Steel, Sport Silicone' },
      ]);
    } else if (preset === 'bags') {
      setOptionDefs([
        { name: 'Capacity', values: 'Compact 15L, Everyday 25L, Travel 40L' },
        { name: 'Material', values: 'Waterproof Canvas, Genuine Leather' },
      ]);
    } else if (preset === 'eyewear') {
      setOptionDefs([
        { name: 'Frame Color', values: 'Matte Black, Tortoise Shell' },
        { name: 'Lens Coating', values: 'Polarized UV400, Blue-Light Cut' },
      ]);
    } else if (preset === 'gadgets') {
      setOptionDefs([
        { name: 'Storage', values: '128GB, 256GB, 512GB' },
        { name: 'Finish / Color', values: 'Space Gray, Silver, Midnight' },
      ]);
    } else if (preset === 'volume') {
      setOptionDefs([
        { name: 'Weight / Volume', values: '250ml, 500ml, 1 Liter' },
        { name: 'Packaging', values: 'Glass Jar, Refill Pouch' },
      ]);
    } else {
      setOptionDefs([
        { name: 'Option 1', values: 'Option A, Option B' },
        { name: 'Option 2', values: 'Standard, Premium' },
      ]);
    }
  };

  const handleAddOptionDef = () => {
    if (optionDefs.length >= 3) {
      showToast('Maximum 3 option dimensions supported', 'info');
      return;
    }
    setOptionDefs([
      ...optionDefs,
      { name: `Option ${optionDefs.length + 1}`, values: 'Standard, Custom' },
    ]);
  };

  const handleRemoveOptionDef = (idx: number) => {
    if (optionDefs.length <= 1) {
      showToast('You must have at least one option dimension', 'info');
      return;
    }
    setOptionDefs(optionDefs.filter((_, i) => i !== idx));
  };

  const handleUpdateOptionDef = (idx: number, field: 'name' | 'values', val: string) => {
    const updated = [...optionDefs];
    updated[idx][field] = val;
    setOptionDefs(updated);
  };

  const handleGenerateCombinations = () => {
    const cleanDefs = optionDefs
      .map(o => ({
        name: o.name.trim(),
        values: o.values.split(',').map(v => v.trim()).filter(Boolean),
      }))
      .filter(o => o.name && o.values.length > 0);

    if (cleanDefs.length === 0) {
      showToast('Please specify at least one option name with values', 'error');
      return;
    }

    const effectiveBase = Number(salePrice || basePrice || 0);
    const baseReg = Number(basePrice || effectiveBase);
    const regDefault = genDefaultReg !== '' ? Number(genDefaultReg) : baseReg;
    const saleDefault = genDefaultSell !== '' ? Number(genDefaultSell) : (effectiveBase || regDefault);
    const costDefault = genDefaultCost !== '' ? Number(genDefaultCost) : (Number(costPrice) || 0);
    const stockDefault = genDefaultStock !== '' ? Number(genDefaultStock) : 10;
    const baseSkuClean = (sku.trim() || 'PROD').toUpperCase();

    // Cartesian product across all defined options
    let combos: Array<Record<string, string>> = [{}];
    cleanDefs.forEach(def => {
      const next: Array<Record<string, string>> = [];
      combos.forEach(c => {
        def.values.forEach(v => {
          next.push({ ...c, [def.name]: v });
        });
      });
      combos = next;
    });

    const newRows: FormVariant[] = combos.map(combo => {
      const keys = Object.keys(combo);
      const val1 = combo[keys[0]] || '';
      const val2 = combo[keys[1]] || '';
      const val3 = combo[keys[2]] || '';

      const slugParts = [val1, val2, val3]
        .filter(Boolean)
        .map(v => v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5))
        .join('-');

      const variantSku = `${baseSkuClean}-${slugParts}`.toUpperCase();
      const discPct = regDefault > saleDefault && regDefault > 0
        ? calculateDiscountPercent(regDefault, saleDefault)
        : 0;

      const modifier = effectiveBase > 0 && saleDefault > 0 ? saleDefault - effectiveBase : 0;

      return {
        size: val1,
        color: val2,
        material: val3 || (keys.length > 2 ? JSON.stringify(combo) : ''),
        sku: variantSku,
        cost_price: costDefault > 0 ? costDefault : '',
        regular_price: regDefault > 0 ? regDefault : '',
        sale_price: saleDefault > 0 ? saleDefault : '',
        discount_percent: discPct > 0 ? discPct : '',
        price_modifier: modifier,
        stock_quantity: stockDefault,
      };
    });

    setVariants(newRows);
    setHasVariants(true);
    setShowGenerator(false);
    showToast(`Generated ${newRows.length} variant combinations matrix!`, 'success');
  };

  const handleNameChange = (val: string) => {
    setNameEn(val);
    if (!isEditing) {
      setSlug(slugify(val));
    }
  };

  const handleAddVariant = () => {
    const baseReg = Number(basePrice || 0);
    const effectiveBase = Number(salePrice || basePrice || 0);
    const costVal = Number(costPrice) || '';
    const newIdx = variants.length + 1;
    setVariants([
      ...variants,
      {
        size: 'Option 1',
        color: 'Option 2',
        material: '',
        sku: `${sku.trim() || 'SKU'}-V${newIdx}`,
        cost_price: costVal,
        regular_price: baseReg || '',
        sale_price: effectiveBase || '',
        discount_percent: baseReg > effectiveBase && baseReg > 0 ? calculateDiscountPercent(baseReg, effectiveBase) : '',
        price_modifier: 0,
        stock_quantity: 10,
      },
    ]);
    setHasVariants(true);
  };

  const handleRemoveVariant = (idx: number) => {
    const remaining = variants.filter((_, i) => i !== idx);
    setVariants(remaining);
    if (remaining.length === 0) {
      setHasVariants(false);
    }
  };

  const handleVariantChange = (idx: number, field: keyof FormVariant, val: any) => {
    const updated = [...variants];
    const item = { ...updated[idx], [field]: val };
    const effectiveBase = Number(salePrice || basePrice || 0);

    if (field === 'sale_price') {
      const numSale = Number(val);
      const numReg = Number(item.regular_price);
      if (!isNaN(numSale) && numReg > numSale && numReg > 0) {
        item.discount_percent = calculateDiscountPercent(numReg, numSale);
      } else {
        item.discount_percent = '';
      }
      item.price_modifier = !isNaN(numSale) && effectiveBase > 0 ? numSale - effectiveBase : 0;
    } else if (field === 'regular_price') {
      const numReg = Number(val);
      const numSale = Number(item.sale_price);
      if (numReg > 0 && numSale > 0 && numReg > numSale) {
        item.discount_percent = calculateDiscountPercent(numReg, numSale);
      }
    } else if (field === 'discount_percent') {
      const numDisc = Number(val);
      const numReg = Number(item.regular_price) || Number(basePrice) || effectiveBase;
      if (numReg > 0 && numDisc > 0) {
        const discounted = calculateDiscountPrice(numReg, numDisc);
        item.sale_price = discounted;
        item.price_modifier = effectiveBase > 0 ? discounted - effectiveBase : 0;
      }
    }

    updated[idx] = item;
    setVariants(updated);
  };

  const handleAutoSyncStock = () => {
    const total = variants.reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0);
    setStockQuantity(total);
    showToast(`Synchronized total stock: ${total} units from ${variants.length} variants!`, 'success');
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

      // Filter out empty slots, ensuring primary slot 0 is first
      const cleanImages = images.filter(img => Boolean(img && img.trim()));

      // Encode dynamic option schema in tags
      const activeOptionSchema: ProductOptionSchema[] = optionDefs
        .map(o => ({
          name: o.name.trim(),
          values: o.values.split(',').map(v => v.trim()).filter(Boolean),
        }))
        .filter(o => o.name && o.values.length > 0);

      const baseCostTags = syncCostToTags(initialProduct?.tags || [], costPrice ? Number(costPrice) : null);
      const withSchemaTags = syncOptionSchemaToTags(baseCostTags, activeOptionSchema);

      // Encode complete variant financials (vcost, vreg, vsale)
      const variantFinancials = variants.map(v => ({
        sku: v.sku.trim(),
        costPrice: v.cost_price,
        regularPrice: v.regular_price,
        salePrice: v.sale_price,
      }));
      const withFinancialTags = syncVariantFinancialsToTags(withSchemaTags, variantFinancials);
      const finalTags = syncVideoToTags(withFinancialTags, videoUrl.trim() || null);

      const effectiveBase = Number(salePrice || basePrice || 0);

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
        video_url: videoUrl.trim() || null,
        tags: finalTags,
        stock_quantity: Number(stockQuantity) || 0,
        total_sold: Number(totalSold) || 0,
        low_stock_threshold: Number(lowStockThreshold) || 5,
        description_en: descriptionEn.trim() || null,
        description_bn: descriptionBn.trim() || null,
        images: cleanImages,
        is_featured: isFeatured,
        is_flash_sale: isFlashSale,
        flash_sale_ends_at: isFlashSale ? new Date(Date.now() + 7 * 86400000).toISOString() : null,
        display_order: Number(displayOrder) || 0,
        has_variants: hasVariants && variants.length > 0,
        variants: (hasVariants && variants.length > 0)
          ? variants.map((v, idx) => {
              const numSell = Number(v.sale_price || v.regular_price || 0);
              const modifier = !isNaN(numSell) && effectiveBase > 0
                ? numSell - effectiveBase
                : (Number(v.price_modifier) || 0);

              return {
                id: v.id,
                sku: v.sku.trim() || `${sku.trim()}-V${idx + 1}`,
                size: v.size.trim() || null,
                color: v.color.trim() || null,
                material: v.material.trim() || null,
                price_modifier: modifier,
                cost_price: Number(v.cost_price) || 0,
                selling_price: numSell || (effectiveBase + modifier),
                stock_quantity: Number(v.stock_quantity) || 0,
                images: [],
              };
            })
          : [],
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
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', marginBottom: '16px' }}>
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

          {/* Top-Notch Multi-Attribute Product Variants & Pricing Engine */}
          <div className="admin-card" style={{ border: '1px solid var(--color-admin-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--color-primary-light)" />
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-admin-text)', margin: 0 }}>
                    Product Variants & Options
                  </h2>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '4px' }}>
                  Sizes, Colors, Storage capacities, Volumes, with independent selling and buying/cost prices
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowGenerator(!showGenerator)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: showGenerator ? 'var(--color-primary-10)' : 'var(--color-admin-surface-2)',
                    color: showGenerator ? 'var(--color-primary)' : 'var(--color-admin-text)',
                    borderColor: showGenerator ? 'var(--color-primary)' : 'var(--color-admin-border)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="Generate combinations in bulk"
                >
                  <Sparkles size={14} />
                  <span>{showGenerator ? 'Close Generator' : 'Bulk Generator'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} />
                  <span>Add Single Variant</span>
                </button>
              </div>
            </div>

            {/* Dynamic Option Definitions & Permutation Generator Panel */}
            {showGenerator && (
              <div
                style={{
                  background: 'var(--color-admin-surface-2)',
                  border: '1px solid var(--color-admin-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="var(--color-primary-light)" />
                    <strong style={{ fontSize: '14px', color: 'var(--color-admin-text)' }}>
                      Universal Multi-Option Permutation Generator
                    </strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                    Works for any category (Lighting, Watches, Bags, Apparel, Groceries, Gadgets)
                  </span>
                </div>

                {/* Category Preset Quick Buttons */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-admin-muted)', alignSelf: 'center', marginRight: '4px' }}>
                    Category Presets:
                  </span>
                  {[
                    { id: 'lighting', label: '💡 Lights & Decor' },
                    { id: 'watches', label: '⌚ Watches' },
                    { id: 'bags', label: '🎒 Bags & Luggage' },
                    { id: 'apparel', label: '👕 Apparel' },
                    { id: 'eyewear', label: '🕶️ Eyewear' },
                    { id: 'gadgets', label: '📱 Gadgets' },
                    { id: 'volume', label: '🧴 Groceries / Volume' },
                    { id: 'custom', label: '✨ Custom' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyCategoryPreset(p.id as any)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        border: genPreset === p.id ? '1px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                        background: genPreset === p.id ? 'var(--color-primary-10)' : 'var(--color-admin-surface)',
                        color: genPreset === p.id ? 'var(--color-primary)' : 'var(--color-admin-text)',
                        cursor: 'pointer',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic Option Definition Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-admin-text)' }}>
                    Define Product Option Dimensions (e.g. Diameter, Stand Type, Dial Size, Material):
                  </div>
                  {optionDefs.map((def, defIdx) => (
                    <div
                      key={defIdx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(140px, 200px) 1fr auto',
                        gap: '10px',
                        alignItems: 'center',
                        background: 'var(--color-admin-surface)',
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-admin-border)',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '3px' }}>
                          Option Name
                        </span>
                        <input
                          type="text"
                          className="admin-input"
                          value={def.name}
                          onChange={e => handleUpdateOptionDef(defIdx, 'name', e.target.value)}
                          placeholder="e.g. Diameter"
                          style={{ fontSize: '12px' }}
                        />
                      </div>

                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '3px' }}>
                          Values (comma-separated list)
                        </span>
                        <input
                          type="text"
                          className="admin-input"
                          value={def.values}
                          onChange={e => handleUpdateOptionDef(defIdx, 'values', e.target.value)}
                          placeholder="e.g. 6 inch, 8 inch, 10 inch"
                          style={{ fontSize: '12px' }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveOptionDef(defIdx)}
                        style={{
                          color: 'var(--color-danger)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '6px',
                          alignSelf: 'center',
                        }}
                        title="Remove dimension"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  {optionDefs.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddOptionDef}
                      style={{
                        background: 'none',
                        border: '1px dashed var(--color-primary)',
                        color: 'var(--color-primary)',
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Another Option Dimension (e.g. Material / Light Color)</span>
                    </button>
                  )}
                </div>

                {/* Default Pricing Inputs for Bulk Generation */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)' }}>Default Regular Price (৳)</span>
                    <input
                      type="number"
                      className="admin-input"
                      value={genDefaultReg}
                      onChange={e => setGenDefaultReg(e.target.value)}
                      placeholder={String(basePrice || '500')}
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)' }}>Default Sale Price (৳)</span>
                    <input
                      type="number"
                      className="admin-input"
                      value={genDefaultSell}
                      onChange={e => setGenDefaultSell(e.target.value)}
                      placeholder={String(salePrice || basePrice || '450')}
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)' }}>Default Buying Cost (৳)</span>
                    <input
                      type="number"
                      className="admin-input"
                      value={genDefaultCost}
                      onChange={e => setGenDefaultCost(e.target.value)}
                      placeholder={String(costPrice || '300')}
                      style={{ fontSize: '12px' }}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-admin-dim)' }}>Stock Per Variant</span>
                    <input
                      type="number"
                      className="admin-input"
                      value={genDefaultStock}
                      onChange={e => setGenDefaultStock(e.target.value)}
                      placeholder="10"
                      style={{ fontSize: '12px' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCombinations}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', padding: '10px', fontWeight: 800, fontSize: '13px' }}
                >
                  ⚡ Generate All Permutations Matrix
                </button>
              </div>
            )}

            {/* Empty State */}
            {variants.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  background: 'var(--color-admin-surface-2)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--color-admin-border)',
                }}
              >
                <Box size={32} color="var(--color-admin-muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                <strong style={{ fontSize: '14px', color: 'var(--color-admin-text)', display: 'block' }}>
                  No Variants Configured
                </strong>
                <p style={{ fontSize: '12px', color: 'var(--color-admin-muted)', marginTop: '4px', maxWidth: '420px', margin: '4px auto 14px' }}>
                  This product currently sells as a single standard unit. Click <strong>Bulk Generator</strong> or <strong>Add Single Variant</strong> to configure dynamic sizes, stands, colors, and individual matrix pricing.
                </p>
                <button
                  type="button"
                  onClick={() => setShowGenerator(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ background: 'var(--color-admin-surface)', color: 'var(--color-admin-text)', borderColor: 'var(--color-admin-border)' }}
                >
                  <Sparkles size={14} />
                  <span>Open Option Permutations Generator</span>
                </button>
              </div>
            ) : (
              /* Variants Matrix List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-admin-muted)', padding: '0 4px', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Configured SKUs / Combinations: <strong>{variants.length}</strong></span>
                  <button
                    type="button"
                    onClick={handleAutoSyncStock}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '11px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'underline',
                    }}
                  >
                    ⚡ Auto-Sum Total Stock ({variants.reduce((acc, v) => acc + (Number(v.stock_quantity) || 0), 0)} units)
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {variants.map((v, idx) => {
                    const effectiveBase = Number(salePrice || basePrice || 0);
                    const sellVal = v.sale_price !== '' ? Number(v.sale_price) : effectiveBase;
                    const costVal = Number(v.cost_price) || 0;
                    const metrics = calculateProfitMetrics(sellVal, costVal);

                    const opt1Label = optionDefs[0]?.name || 'Option 1';
                    const opt2Label = optionDefs[1]?.name || 'Option 2';

                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--color-admin-surface-2)',
                          border: '1px solid var(--color-admin-border)',
                          borderRadius: 'var(--radius-lg)',
                          padding: '12px 14px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr)) auto',
                          gap: '10px',
                          alignItems: 'center',
                        }}
                      >
                        {/* Option 1: Diameter / Size / etc. */}
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '3px' }}>
                            {opt1Label}
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. 6 inch"
                            className="admin-input"
                            value={v.size}
                            onChange={e => handleVariantChange(idx, 'size', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 8px' }}
                          />
                        </div>

                        {/* Option 2: Stand / Color / etc. */}
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '3px' }}>
                            {opt2Label}
                          </span>
                          <input
                            type="text"
                            placeholder="e.g. Wooden Stand"
                            className="admin-input"
                            value={v.color}
                            onChange={e => handleVariantChange(idx, 'color', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 8px' }}
                          />
                        </div>

                        {/* Variant SKU */}
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '3px' }}>
                            SKU Code
                          </span>
                          <input
                            type="text"
                            placeholder="MLAMP-6IN-WOOD"
                            className="admin-input"
                            value={v.sku}
                            onChange={e => handleVariantChange(idx, 'sku', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 8px' }}
                          />
                        </div>

                        {/* Buying Cost (COGS) */}
                        <div>
                          <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                            Buying Cost (৳)
                          </span>
                          <input
                            type="number"
                            placeholder="COGS"
                            className="admin-input"
                            value={v.cost_price}
                            onChange={e => handleVariantChange(idx, 'cost_price', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 8px' }}
                            min="0"
                          />
                        </div>

                        {/* Regular Price (MSRP) */}
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                            Regular Price (৳)
                          </span>
                          <input
                            type="number"
                            placeholder={String(basePrice || '500')}
                            className="admin-input"
                            value={v.regular_price}
                            onChange={e => handleVariantChange(idx, 'regular_price', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 8px' }}
                            min="0"
                          />
                        </div>

                        {/* Sale Price (Customer Checkout) */}
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--color-primary-light)', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                            Sale Price (৳)
                          </span>
                          <input
                            type="number"
                            placeholder={String(effectiveBase || '450')}
                            className="admin-input"
                            value={v.sale_price}
                            onChange={e => handleVariantChange(idx, 'sale_price', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 8px' }}
                            min="0"
                          />
                        </div>

                        {/* Discount % with bidirectional calculation */}
                        <div style={{ maxWidth: '70px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '3px' }}>
                            Discount %
                          </span>
                          <input
                            type="number"
                            placeholder="0%"
                            className="admin-input"
                            value={v.discount_percent}
                            onChange={e => handleVariantChange(idx, 'discount_percent', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 6px', textAlign: 'center' }}
                            min="0"
                            max="99"
                          />
                        </div>

                        {/* Live Profit Margin Badge */}
                        <div style={{ textAlign: 'center', minWidth: '95px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '4px' }}>
                            Unit Profit
                          </span>
                          {costVal > 0 && sellVal > 0 ? (
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                background: metrics.isProfitable ? 'rgba(22, 163, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: metrics.isProfitable ? '#16a34a' : '#ef4444',
                              }}
                              title={`Unit Net Profit: ${formatCurrency(metrics.netProfit)}`}
                            >
                              {metrics.isProfitable ? '+' : ''}{formatCurrency(metrics.netProfit)} ({metrics.marginPercent}%)
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)' }}>
                              Set cost
                            </span>
                          )}
                        </div>

                        {/* Stock Quantity */}
                        <div style={{ maxWidth: '80px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--color-admin-dim)', display: 'block', marginBottom: '3px' }}>
                            Stock
                          </span>
                          <input
                            type="number"
                            placeholder="10"
                            className="admin-input"
                            value={v.stock_quantity}
                            onChange={e => handleVariantChange(idx, 'stock_quantity', e.target.value)}
                            style={{ fontSize: '12px', padding: '6px 8px' }}
                            min="0"
                          />
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          style={{
                            color: 'var(--color-danger)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            alignSelf: 'center',
                          }}
                          title="Remove variant"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
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

              {/* Regular Base Price */}
              <div className="form-group">
                <label className="admin-label" htmlFor="prod-base-price">Regular Base Price (৳) *</label>
                <input
                  id="prod-base-price"
                  type="number"
                  className="admin-input"
                  placeholder="1500"
                  value={basePrice}
                  onChange={e => handleBasePriceChange(e.target.value)}
                  min="0"
                  required
                />
              </div>

              {/* Synced Discount Calculator Control */}
              <div
                style={{
                  background: 'var(--color-admin-surface-2)',
                  border: '1px solid var(--color-admin-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="admin-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Percent size={14} color="var(--color-primary)" />
                    <span>Discount Calculator & Sync</span>
                  </label>
                  {Boolean(Number(discountPercent) > 0) && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: 'var(--color-danger)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      -{discountPercent}% OFF
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-admin-muted)' }}>
                      Discount Percentage (%)
                    </span>
                    <div style={{ position: 'relative', marginTop: '4px' }}>
                      <input
                        type="number"
                        className="admin-input"
                        placeholder="e.g. 20"
                        value={discountPercent}
                        onChange={e => handleDiscountPercentChange(e.target.value)}
                        min="0"
                        max="99"
                        style={{ height: '36px', fontSize: '13px', paddingRight: '28px' }}
                      />
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 700, color: 'var(--color-admin-muted)' }}>
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-admin-muted)' }}>
                      Offer Sale Price (৳)
                    </span>
                    <input
                      id="prod-sale-price"
                      type="number"
                      className="admin-input"
                      placeholder="e.g. 1200"
                      value={salePrice}
                      onChange={e => handleSalePriceChange(e.target.value)}
                      min="0"
                      style={{ height: '36px', fontSize: '13px', marginTop: '4px' }}
                    />
                  </div>
                </div>

                {/* Quick Preset Discount Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-admin-muted)', fontWeight: 600, marginRight: '2px' }}>
                    Presets:
                  </span>
                  {[5, 10, 15, 20, 25, 30, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleDiscountPercentChange(pct)}
                      style={{
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        border: Number(discountPercent) === pct ? '1px solid var(--color-primary)' : '1px solid var(--color-admin-border)',
                        background: Number(discountPercent) === pct ? 'var(--color-primary)' : '#ffffff',
                        color: Number(discountPercent) === pct ? '#ffffff' : 'var(--color-admin-text)',
                        cursor: 'pointer',
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                  {Boolean(salePrice || discountPercent) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountPercent('');
                        setSalePrice('');
                      }}
                      style={{
                        padding: '3px 7px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-admin-border)',
                        background: '#ffffff',
                        color: 'var(--color-danger)',
                        cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Live Savings & Strikethrough Display */}
                {Boolean(Number(basePrice) > 0 && Number(salePrice) > 0 && Number(salePrice) < Number(basePrice)) && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 10px',
                      background: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-admin-border)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ textDecoration: 'line-through', color: 'var(--color-admin-muted)', marginRight: '6px' }}>
                        {formatCurrency(Number(basePrice))}
                      </span>
                      <strong style={{ color: 'var(--color-primary)', fontSize: '14px' }}>
                        {formatCurrency(Number(salePrice))}
                      </strong>
                    </div>
                    <span style={{ color: 'var(--color-success)', fontWeight: 800, fontSize: '11px' }}>
                      Customer saves {formatCurrency(Number(basePrice) - Number(salePrice))}
                    </span>
                  </div>
                )}
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
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
                  <label className="admin-label" htmlFor="prod-total-sold">Total Sold (Units)</label>
                  <input
                    id="prod-total-sold"
                    type="number"
                    className="admin-input"
                    value={totalSold}
                    onChange={e => setTotalSold(e.target.value)}
                    min="0"
                    placeholder="0"
                  />
                  <span style={{ fontSize: '10px', color: 'var(--color-admin-muted)' }}>
                    Auto-increments with orders
                  </span>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'var(--color-admin-text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-admin-border)',
                    background: isFeatured ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  <span>Feature on Homepage Spotlight</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    color: 'var(--color-admin-text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-admin-border)',
                    background: isFlashSale ? 'rgba(59, 130, 246, 0.05)' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isFlashSale}
                    onChange={e => setIsFlashSale(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                  <span>Include in Flash Sale Banner (7-day timer)</span>
                </label>
              </div>
            </div>
          </div>

          {/* 4 Pictures & Video Media Manager */}
          <div className="admin-card">
            <ProductMediaManager
              images={images}
              onChangeImages={setImages}
              videoUrl={videoUrl}
              onChangeVideoUrl={setVideoUrl}
            />
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
              style={{
                background: '#ffffff',
                color: 'var(--color-admin-text)',
                borderColor: 'var(--color-admin-border)',
                fontWeight: 700,
                padding: '14px 24px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
