import React from 'react';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import ProductGrid from '@/components/store/ProductGrid';
import FilterSidebar from '@/components/store/FilterSidebar';
import type { Metadata } from 'next';
import { STORE_CONFIG } from '@/lib/store-config';

// ISR: Cache category pages for 5 minutes (300 seconds)
export const revalidate = 300;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

// React cache() deduplicates the category lookup between generateMetadata
// and the page component, preventing double DB round-trips.
const getCachedCategory = cache(async (slug: string) => {
  const supabase = await createClient();
  const catRepo = new CategoryRepository(supabase);
  return catRepo.findBySlug(slug);
});

// Pre-render top-level categories at build time for instant CDN response
export async function generateStaticParams() {
  try {
    const supabase = await createClient();
    const catRepo = new CategoryRepository(supabase);
    const categories = await catRepo.findTopLevel();
    return categories.map(cat => ({ slug: cat.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCachedCategory(slug);

  if (!cat) return { title: 'Category Not Found' };
  return {
    title: `${cat.name_en} | ${STORE_CONFIG.name}`,
    description: cat.meta_description || `Browse ${cat.name_en} items at ${STORE_CONFIG.name}.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  const category = await getCachedCategory(slug);
  if (!category) {
    notFound();
  }

  const minPrice = sParams.min_price ? Number(sParams.min_price) : undefined;
  const maxPrice = sParams.max_price ? Number(sParams.max_price) : undefined;
  const sort = (sParams.sort as any) || 'newest';

  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);

  const { data: products, count } = await productRepo.findAll({
    category_id: category.id,
    min_price: minPrice,
    max_price: maxPrice,
    sort,
    page_size: 24,
  });

  return (
    <div className="container" style={{ padding: '24px 0 60px' }}>
      {/* Category Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>{category.name_en}</h1>
        {category.name_bn && (
          <div style={{ fontSize: '15px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {category.name_bn}
          </div>
        )}
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Showing {products.length} of {count} products
        </div>
      </div>

      {/* Category Layout */}
      <div className="search-page-layout">
        <div className="search-sidebar-wrapper">
          <FilterSidebar currentCategory={category.slug} />
        </div>

        <div className="search-products-wrapper">
          <ProductGrid products={products} emptyMessage={`No products found in ${category.name_en}`} />
        </div>
      </div>
    </div>
  );
}
