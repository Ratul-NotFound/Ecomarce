'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ArrowUpDown, X, RotateCcw, Zap, Check, ChevronDown } from 'lucide-react';
import type { Category } from '@/types';
import DualRangeSlider from './DualRangeSlider';

interface MobileFilterDrawerProps {
  categories?: Category[];
  totalCount?: number;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'best_selling', label: 'Best Selling' },
];

export default function MobileFilterDrawer({
  categories = [],
  totalCount = 0,
}: MobileFilterDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [minPrice, setMinPrice] = useState<number>(Number(searchParams.get('min_price')) || 0);
  const [maxPrice, setMaxPrice] = useState<number>(Number(searchParams.get('max_price')) || 10000);
  const [isFlashSale, setIsFlashSale] = useState(searchParams.get('flash_sale') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    }
    if (isSortOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSortOpen]);

  // Sync state when URL params change
  useEffect(() => {
    setSelectedCategory(searchParams.get('category') || '');
    setMinPrice(Number(searchParams.get('min_price')) || 0);
    setMaxPrice(Number(searchParams.get('max_price')) || 10000);
    setIsFlashSale(searchParams.get('flash_sale') === 'true');
    setSort(searchParams.get('sort') || 'newest');
  }, [searchParams]);

  // Calculate active filter count
  const activeFilterCount = [
    selectedCategory,
    minPrice > 0 ? minPrice : null,
    maxPrice < 10000 ? maxPrice : null,
    isFlashSale,
    sort !== 'newest' ? sort : null,
  ].filter(Boolean).length;

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedCategory) params.set('category', selectedCategory);
    else params.delete('category');

    if (minPrice > 0) params.set('min_price', String(minPrice));
    else params.delete('min_price');

    if (maxPrice < 10000) params.set('max_price', String(maxPrice));
    else params.delete('max_price');

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
    setIsSortOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (newSort && newSort !== 'newest') params.set('sort', newSort);
    else params.delete('sort');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setSelectedCategory('');
    setMinPrice(0);
    setMaxPrice(10000);
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

  const handleSliderChange = (newMin: number, newMax: number) => {
    setMinPrice(newMin);
    setMaxPrice(newMax);
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label || 'Newest';

  return (
    <>
      {/* Mobile Sticky Filter & Sort Bar */}
      <div className="mobile-filter-bar">
        {/* Filter Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mobile-filter-trigger"
          id="mobile-open-filters-btn"
        >
          <SlidersHorizontal size={15} />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="mobile-filter-badge">{activeFilterCount}</span>
          )}
        </button>

        {/* Custom Styled Sort Dropdown (Replaces Ugly Native Select) */}
        <div className="mobile-sort-select-wrapper" ref={sortDropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="mobile-sort-select"
            id="mobile-quick-sort-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              padding: '0 12px 0 32px',
              textAlign: 'left',
              width: '100%',
              background: '#ffffff',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              height: '40px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-main, #0f172a)',
              cursor: 'pointer',
            }}
          >
            <ArrowUpDown size={14} className="mobile-sort-icon" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSortLabel}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
          </button>

          {/* Custom Dropdown Popup Menu */}
          {isSortOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                left: 0,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                padding: '6px',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {SORT_OPTIONS.map(opt => {
                const isSelected = sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleQuickSort(opt.value)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      color: isSelected ? 'var(--color-primary, #2563eb)' : 'var(--color-text-main, #1e293b)',
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} color="var(--color-primary, #2563eb)" />}
                  </button>
                );
              })}
            </div>
          )}
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
          {/* 1. Sort Order */}
          <div className="drawer-filter-section">
            <h4 className="drawer-section-title">Sort By</h4>
            <div className="drawer-chips-grid">
              {SORT_OPTIONS.map(opt => {
                const isSelected = sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSort(opt.value)}
                    className={`drawer-chip ${isSelected ? 'drawer-chip--active' : ''}`}
                  >
                    {isSelected && <Check size={12} />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Category Selection */}
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

          {/* 3. Clean & Smooth Two-Sided Adjustable Price Range */}
          <div className="drawer-filter-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <h4 className="drawer-section-title" style={{ margin: 0 }}>Price Range</h4>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>
                ৳{minPrice.toLocaleString()} — ৳{maxPrice >= 10000 ? '10,000+' : maxPrice.toLocaleString()}
              </span>
            </div>

            {/* Custom Smooth Dual Range Slider */}
            <DualRangeSlider
              min={0}
              max={10000}
              step={50}
              minVal={minPrice}
              maxVal={maxPrice}
              onChange={handleSliderChange}
            />

            {/* Clean Min/Max Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Min Price (৳)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="form-input"
                  value={minPrice === 0 ? '' : minPrice}
                  onChange={e => setMinPrice(Number(e.target.value) || 0)}
                  min="0"
                  max={maxPrice}
                  style={{ height: '38px', fontSize: '13px', borderRadius: 'var(--radius-lg)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Max Price (৳)
                </label>
                <input
                  type="number"
                  placeholder="10000"
                  className="form-input"
                  value={maxPrice === 10000 ? '' : maxPrice}
                  onChange={e => setMaxPrice(Number(e.target.value) || 10000)}
                  min={minPrice}
                  max="10000"
                  style={{ height: '38px', fontSize: '13px', borderRadius: 'var(--radius-lg)' }}
                />
              </div>
            </div>
          </div>

          {/* 4. Special Promotions Toggle */}
          <div className="drawer-filter-section">
            <label className="drawer-toggle-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>Flash Sale Deals Only</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Show discounted items</div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={isFlashSale}
                onChange={e => setIsFlashSale(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
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
            style={{ width: '100%', padding: '13px', borderRadius: 'var(--radius-xl)', fontSize: '14px', fontWeight: 800 }}
            id="mobile-apply-filters-btn"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
