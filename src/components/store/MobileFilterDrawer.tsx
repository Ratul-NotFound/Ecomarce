'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ArrowUpDown, X, RotateCcw, Zap, Check } from 'lucide-react';
import type { Category } from '@/types';

interface MobileFilterDrawerProps {
  categories?: Category[];
  totalCount?: number;
}

const PRICE_PRESETS = [
  { label: 'Under ৳1k', min: '', max: '1000' },
  { label: '৳1k - ৳2.5k', min: '1000', max: '2500' },
  { label: '৳2.5k - ৳5k', min: '2500', max: '5000' },
  { label: '৳5k+', min: '5000', max: '' },
];

export default function MobileFilterDrawer({
  categories = [],
  totalCount = 0,
}: MobileFilterDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '10000');
  const [sliderMax, setSliderMax] = useState<number>(Number(searchParams.get('max_price')) || 10000);
  const [isFlashSale, setIsFlashSale] = useState(searchParams.get('flash_sale') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  // Sync state when URL params change
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || '');
    setMinPrice(searchParams.get('min_price') || '');
    const currentMax = searchParams.get('max_price');
    setMaxPrice(currentMax || '');
    setSliderMax(currentMax ? Number(currentMax) : 10000);
    setIsFlashSale(searchParams.get('flash_sale') === 'true');
    setSort(searchParams.get('sort') || 'newest');
  }, [searchParams]);

  // Calculate active filter count
  const activeFilterCount = [
    selectedCategory,
    minPrice,
    maxPrice && maxPrice !== '10000' ? maxPrice : null,
    isFlashSale,
    sort !== 'newest' ? sort : null,
  ].filter(Boolean).length;

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedCategory) params.set('category', selectedCategory);
    else params.delete('category');

    if (minPrice) params.set('min_price', minPrice);
    else params.delete('min_price');

    if (maxPrice && Number(maxPrice) < 10000) params.set('max_price', maxPrice);
    else if (maxPrice && Number(maxPrice) >= 10000 && searchParams.get('max_price')) params.delete('max_price');
    else if (!maxPrice) params.delete('max_price');

    if (isFlashSale) params.set('flash_sale', 'true');
    else params.delete('flash_sale');

    if (sort && sort !== 'newest') params.set('sort', sort);
    else params.delete('sort');

    params.delete('page');
    setIsOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleQuickSort = (newSort: string) => {
    setSort(newSort);
    const params = new URLSearchParams(searchParams.toString());
    if (newSort && newSort !== 'newest') params.set('sort', newSort);
    else params.delete('sort');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSliderMax(10000);
    setIsFlashSale(false);
    setSort('newest');
    const query = searchParams.get('q');
    if (query) {
      router.push(`${pathname}?q=${encodeURIComponent(query)}`);
    } else {
      router.push(pathname);
    }
    setIsOpen(false);
  };

  const handlePresetClick = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    if (max) setSliderMax(Number(max));
    else setSliderMax(10000);
  };

  return (
    <>
      {/* Mobile Sticky Filter & Sort Bar */}
      <div className="mobile-filter-bar">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mobile-filter-trigger"
          id="mobile-open-filters-btn"
        >
          <SlidersHorizontal size={16} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="mobile-filter-badge">{activeFilterCount}</span>
          )}
        </button>

        <div className="mobile-sort-select-wrapper">
          <ArrowUpDown size={15} className="mobile-sort-icon" />
          <select
            value={sort}
            onChange={e => handleQuickSort(e.target.value)}
            className="mobile-sort-select"
            id="mobile-quick-sort"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="best_selling">Best Selling</option>
          </select>
        </div>
      </div>

      {/* Drawer Backdrop */}
      {isOpen && (
        <div
          className="mobile-drawer-backdrop"
          onClick={() => setIsOpen(false)}
          role="presentation"
        />
      )}

      {/* Bottom Sheet Drawer */}
      <div className={`mobile-filter-drawer ${isOpen ? 'mobile-filter-drawer--open' : ''}`}>
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={18} color="var(--color-primary)" />
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Filter & Refine</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleReset}
              className="mobile-drawer-reset-btn"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mobile-drawer-close-btn"
              aria-label="Close filters"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="mobile-drawer-body">
          {/* 1. Category Selection */}
          <div className="drawer-filter-section">
            <h4 className="drawer-section-title">Category</h4>
            <div className="drawer-chips-grid">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`drawer-chip ${!selectedCategory ? 'drawer-chip--active' : ''}`}
              >
                All Categories
              </button>

              {categories.map(cat => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? '' : cat.slug)}
                    className={`drawer-chip ${isSelected ? 'drawer-chip--active' : ''}`}
                  >
                    {isSelected && <Check size={12} />}
                    <span>{cat.name_en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Adjustable Price Bar & Slider */}
          <div className="drawer-filter-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <h4 className="drawer-section-title" style={{ margin: 0 }}>Price Range</h4>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                ৳{minPrice || 0} — ৳{sliderMax >= 10000 ? '10,000+' : sliderMax.toLocaleString()}
              </span>
            </div>

            {/* Adjustable Slider Range Bar */}
            <div className="price-slider-container">
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={sliderMax}
                onChange={e => {
                  const val = Number(e.target.value);
                  setSliderMax(val);
                  setMaxPrice(val >= 10000 ? '' : String(val));
                }}
                className="price-range-slider"
                id="mobile-price-slider"
              />
              <div className="price-slider-ticks">
                <span>৳100</span>
                <span>৳2,500</span>
                <span>৳5,000</span>
                <span>৳10k+</span>
              </div>
            </div>

            {/* Quick Price Presets */}
            <div className="drawer-chips-grid" style={{ marginTop: '12px' }}>
              {PRICE_PRESETS.map((preset, idx) => {
                const isActive = minPrice === preset.min && (maxPrice === preset.max || (!maxPrice && preset.max === ''));
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetClick(preset.min, preset.max)}
                    className={`drawer-chip ${isActive ? 'drawer-chip--active' : ''}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Min Price (৳)</label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  min="0"
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Max Price (৳)</label>
                <input
                  type="number"
                  placeholder="10000"
                  className="form-input"
                  value={maxPrice}
                  onChange={e => {
                    setMaxPrice(e.target.value);
                    if (e.target.value) setSliderMax(Number(e.target.value));
                  }}
                  min="0"
                  style={{ height: '36px', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* 3. Special Promotions Toggle */}
          <div className="drawer-filter-section">
            <label className="drawer-toggle-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Flash Sale Deals Only</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Show limited-time discounts</div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isFlashSale}
                onChange={e => setIsFlashSale(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
            </label>
          </div>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="mobile-drawer-footer">
          <button
            type="button"
            onClick={handleApply}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-xl)', fontSize: '14px', fontWeight: 800 }}
            id="mobile-apply-filters-btn"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
