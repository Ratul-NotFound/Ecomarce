import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import ProductGrid from '@/components/store/ProductGrid';
import FilterSidebar from '@/components/store/FilterSidebar';
import MobileFilterDrawer from '@/components/store/MobileFilterDrawer';
import { Search, Zap, LayoutGrid, Flame } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import type { Metadata } from 'next';

import { redirect } from 'next/navigation';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const sParams = await searchParams;
  const query = sParams.q || '';
  return {
    title: query
      ? `Search results for "${query}" | ${STORE_CONFIG.name}`
      : `Explore Products & Categories | ${STORE_CONFIG.name}`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sParams = await searchParams;
  // If user navigated to flash sale via search query, send directly to Deals Hub!
  if (sParams.flash_sale === 'true' || sParams.deals === 'true') {
    redirect('/deals');
  }

  const query = sParams.q || '';
  const categorySlug = sParams.category || '';
  const minPrice = sParams.min_price ? Number(sParams.min_price) : undefined;
  const maxPrice = sParams.max_price ? Number(sParams.max_price) : undefined;
  const sort = (sParams.sort as any) || 'newest';

  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);
  const categoryRepo = new CategoryRepository(supabase);

  const categories = await categoryRepo.findAllActive();
  const selectedCategory = categorySlug
    ? categories.find(c => c.slug === categorySlug || c.id === categorySlug)
    : null;

  const { data: products, count } = await productRepo.findAll({
    search: query || undefined,
    category_id: selectedCategory?.id,
    min_price: minPrice,
    max_price: maxPrice,
    sort,
    page_size: 32,
  });

  return (
    <div className="container" style={{ padding: '20px 16px 60px' }}>
      {/* Compact Clean Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutGrid size={20} color="var(--color-primary)" />
          <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
            {query
              ? `"${query}"`
              : selectedCategory
              ? selectedCategory.name_en
              : 'Explore Catalog'}
          </h1>
        </div>

        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Horizontal Category Quick Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingBottom: '8px',
          marginBottom: '12px',
        }}
      >
        <Link
          href="/search"
          className={`btn btn-sm ${!categorySlug ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 'var(--radius-full)', fontSize: '12px', padding: '5px 12px' }}
        >
          ✨ All
        </Link>

        {/* Link to dedicated Deals Hub */}
        <Link
          href="/deals"
          className="btn btn-sm btn-secondary"
          style={{
            whiteSpace: 'nowrap',
            flexShrink: 0,
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            padding: '5px 12px',
            color: '#ef4444',
            borderColor: 'rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.06)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Zap size={13} fill="#ef4444" />
          <span>Flash Deals Hub</span>
        </Link>

        {categories.map(cat => {
          const isActive = categorySlug === cat.slug;
          return (
            <Link
              key={cat.id}
              href={`/search?category=${cat.slug}`}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap', flexShrink: 0, borderRadius: 'var(--radius-full)', fontSize: '12px', padding: '5px 12px' }}
            >
              {cat.name_en}
            </Link>
          );
        })}
      </div>

      {/* Visual Category Showcase (when browsing general catalog) */}
      {!categorySlug && !query && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Explore Departments
          </div>
          <div className="explore-category-grid">
            {categories.map((cat, idx) => {
              const icons = ['👕', '🎧', '🛋️', '⚽', '🎒', '💄', '⌚', '🏠'];
              const icon = icons[idx % icons.length];
              return (
                <Link
                  key={cat.id}
                  href={`/search?category=${cat.slug}`}
                  className="explore-category-card"
                >
                  <div className="explore-category-icon">{icon}</div>
                  <div className="explore-category-info">
                    <div className="explore-category-name">{cat.name_en}</div>
                    <div className="explore-category-sub">Browse items ➔</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Filter & Sort Bar (Opens Bottom Drawer) */}
      <MobileFilterDrawer categories={categories} totalCount={count} />

      {/* Product Grid Layout */}
      <div className="search-page-layout">
        <div className="search-sidebar-wrapper">
          <FilterSidebar categories={categories} currentCategory={categorySlug} />
        </div>

        <div className="search-products-wrapper">
          <ProductGrid
            products={products}
            emptyMessage={
              query
                ? `No items found matching "${query}"`
                : 'No products available in this collection.'
            }
          />
        </div>
      </div>
    </div>
  );
}
