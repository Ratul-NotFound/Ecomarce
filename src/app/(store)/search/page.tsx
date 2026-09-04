import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import { getStoreSettings } from '@/lib/store-settings';
import ProductGrid from '@/components/store/ProductGrid';
import FilterSidebar from '@/components/store/FilterSidebar';
import MobileFilterDrawer from '@/components/store/MobileFilterDrawer';
import { Search, Zap, LayoutGrid, Flame } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import type { Metadata } from 'next';
import { getCategoryEmoji } from '@/components/store/CategoryGrid';

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

  const [settings, categories] = await Promise.all([
    getStoreSettings(),
    categoryRepo.findAllActive(),
  ]);

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

  const trendingTags = settings.explore_trending_tags
    ? settings.explore_trending_tags.split(',').map(t => t.trim()).filter(Boolean)
    : [];

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
              : settings.explore_title}
          </h1>
        </div>

        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Trending Search Keywords Pills */}
      {trendingTags.length > 0 && !categorySlug && !query && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            marginBottom: '16px',
            paddingBottom: '4px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Trending:
          </span>
          {trendingTags.map(tag => (
            <Link
              key={tag}
              href={`/search?q=${encodeURIComponent(tag)}`}
              className="btn btn-sm btn-secondary"
              style={{
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                padding: '3px 10px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      {/* Active Category Filter Pill if filtered */}
      {selectedCategory && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Category:</span>
          <Link
            href="/search"
            className="btn btn-sm btn-secondary"
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '4px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-primary-10)',
              color: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              fontWeight: 700,
            }}
          >
            <span>{selectedCategory.name_en}</span>
            <span style={{ fontWeight: 900, fontSize: '14px' }}>✕</span>
          </Link>
        </div>
      )}

      {/* Visual Category Showcase (when browsing general catalog) */}
      {!categorySlug && !query && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {settings.explore_departments_title || 'Explore Departments'}
          </div>
          <div className="landing-category-grid">
            {categories.map((cat, idx) => {
              const emoji = getCategoryEmoji(cat.slug, cat.name_en, idx);
              return (
                <Link
                  key={cat.id}
                  href={`/search?category=${cat.slug}`}
                  className="landing-category-card"
                  id={`cat-card-${cat.slug}`}
                >
                  <div className="landing-category-icon">{emoji}</div>
                  <div className="landing-category-title">{cat.name_en}</div>
                  {cat.name_bn && (
                    <div className="landing-category-sub">{cat.name_bn}</div>
                  )}
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
