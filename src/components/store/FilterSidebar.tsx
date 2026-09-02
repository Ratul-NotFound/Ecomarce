'use client';

import React, { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Filter, RotateCcw } from 'lucide-react';
import type { Category } from '@/types';

interface FilterSidebarProps {
  categories?: Category[];
  currentCategory?: string;
}

export default function FilterSidebar({ categories = [], currentCategory }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (minPrice) params.set('min_price', minPrice);
    else params.delete('min_price');

    if (maxPrice) params.set('max_price', maxPrice);
    else params.delete('max_price');

    if (sort) params.set('sort', sort);

    params.delete('page'); // Reset to page 1 on filter
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleReset = () => {
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    router.push(pathname);
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
          <Filter size={18} />
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
        {categories.length > 0 && !currentCategory && (
          <div className="form-group">
            <label className="form-label">Category</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {categories.map(cat => (
                <a
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}
                >
                  {cat.name_en}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Price Range */}
        <div className="form-group">
          <label className="form-label">Price Range (৳)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="number"
              placeholder="Min"
              className="form-input"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              min="0"
            />
            <input
              type="number"
              placeholder="Max"
              className="form-input"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              min="0"
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-sm" id="apply-filter-btn">
          Apply Filters
        </button>
      </form>
    </aside>
  );
}
