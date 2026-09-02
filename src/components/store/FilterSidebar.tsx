'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Filter, RotateCcw, Check } from 'lucide-react';
import type { Category } from '@/types';
import DualRangeSlider from './DualRangeSlider';

interface FilterSidebarProps {
  categories?: Category[];
  currentCategory?: string;
}

const PRICE_PRESETS = [
  { label: 'Under ৳1k', min: 0, max: 1000 },
  { label: '৳1k - ৳2.5k', min: 1000, max: 2500 },
  { label: '৳2.5k - ৳5k', min: 2500, max: 5000 },
  { label: '৳5k+', min: 5000, max: 10000 },
];

export default function FilterSidebar({ categories = [], currentCategory }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState<number>(Number(searchParams.get('min_price')) || 0);
  const [maxPrice, setMaxPrice] = useState<number>(Number(searchParams.get('max_price')) || 10000);
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  useEffect(() => {
    setMinPrice(Number(searchParams.get('min_price')) || 0);
    setMaxPrice(Number(searchParams.get('max_price')) || 10000);
    setSort(searchParams.get('sort') || 'newest');
  }, [searchParams]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (minPrice > 0) params.set('min_price', String(minPrice));
    else params.delete('min_price');

    if (maxPrice < 10000) params.set('max_price', String(maxPrice));
    else params.delete('max_price');

    if (sort && sort !== 'newest') params.set('sort', sort);
    else params.delete('sort');

    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setMinPrice(0);
    setMaxPrice(10000);
    setSort('newest');
    const query = searchParams.get('q');
    if (query) {
      router.push(`${pathname}?q=${encodeURIComponent(query)}`);
    } else {
      router.push(pathname);
    }
  };

  const handleSliderChange = (newMin: number, newMax: number) => {
    setMinPrice(newMin);
    setMaxPrice(newMax);
  };

  const handlePresetClick = (min: number, max: number) => {
    setMinPrice(min);
    setMaxPrice(max);
  };

  return (
    <aside
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px',
        height: 'fit-content',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '16px' }}>
          <Filter size={18} color="var(--color-primary)" />
          <span>Filters</span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      </div>

      <form onSubmit={handleApplyFilter} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Sort order */}
        <div className="form-group">
          <label className="form-label" htmlFor="filter-sort-select">Sort By</label>
          <select
            id="filter-sort-select"
            className="form-input"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="newest">Newest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="best_selling">Best Selling</option>
          </select>
        </div>

        {/* Categories List */}
        {categories.length > 0 && (
          <div className="form-group">
            <label className="form-label">Category</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              <a
                href="/search"
                style={{
                  fontSize: '13px',
                  fontWeight: !currentCategory ? 700 : 500,
                  color: !currentCategory ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {!currentCategory && <Check size={14} />}
                <span>All Categories</span>
              </a>
              {categories.map(cat => {
                const isCurrent = currentCategory === cat.slug;
                return (
                  <a
                    key={cat.id}
                    href={`/search?category=${cat.slug}`}
                    style={{
                      fontSize: '13px',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isCurrent && <Check size={14} />}
                    <span>{cat.name_en}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Two-Sided Smooth Adjustable Price Range Slider */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Price Range</label>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>
              ৳{minPrice.toLocaleString()} — ৳{maxPrice >= 10000 ? '10k+' : maxPrice.toLocaleString()}
            </span>
          </div>

          <DualRangeSlider
            min={0}
            max={10000}
            step={100}
            minVal={minPrice}
            maxVal={maxPrice}
            onChange={handleSliderChange}
          />
          <div className="price-slider-ticks">
            <span>৳0</span>
            <span>৳2.5k</span>
            <span>৳5k</span>
            <span>৳7.5k</span>
            <span>৳10k+</span>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {PRICE_PRESETS.map((preset, idx) => {
              const isActive = minPrice === preset.min && maxPrice === preset.max;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetClick(preset.min, preset.max)}
                  className={`drawer-chip ${isActive ? 'drawer-chip--active' : ''}`}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Numeric Custom Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
            <input
              type="number"
              placeholder="Min (৳)"
              className="form-input"
              value={minPrice === 0 ? '' : minPrice}
              onChange={e => setMinPrice(Number(e.target.value) || 0)}
              min="0"
              max={maxPrice}
              style={{ height: '36px', fontSize: '12px' }}
            />
            <input
              type="number"
              placeholder="Max (৳)"
              className="form-input"
              value={maxPrice === 10000 ? '' : maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value) || 10000)}
              min={minPrice}
              max="10000"
              style={{ height: '36px', fontSize: '12px' }}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-sm" id="apply-filter-btn" style={{ width: '100%', padding: '10px' }}>
          Apply Filters
        </button>
      </form>
    </aside>
  );
}
