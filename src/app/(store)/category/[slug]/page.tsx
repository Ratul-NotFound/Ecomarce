import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import ProductGrid from '@/components/store/ProductGrid';
import FilterSidebar from '@/components/store/FilterSidebar';
import type { Metadata } from 'next';
import { STORE_CONFIG } from '@/lib/store-config';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const catRepo = new CategoryRepository(supabase);
  const cat = await catRepo.findBySlug(slug);

  if (!cat) return { title: 'Category Not Found' };
  return {
    title: `${cat.name_en} | ${STORE_CONFIG.name}`,
    description: cat.meta_description || `Browse ${cat.name_en} items at ${STORE_CONFIG.name}.`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sParams = await searchParams;

  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);
  const categoryRepo = new CategoryRepository(supabase);

  const category = await categoryRepo.findBySlug(slug);
  if (!category) {
    notFound();
  }

  const minPrice = sParams.min_price ? Number(sParams.min_price) : undefined;
  const maxPrice = sParams.max_price ? Number(sParams.max_price) : undefined;
  const sort = (sParams.sort as any) || 'newest';

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

      {/* Two-column layout: Filter Sidebar + Product Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="category-layout">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }} className="hide-mobile">
            <FilterSidebar currentCategory={category.slug} />
            <div>
              <ProductGrid products={products} emptyMessage={`No products found in ${category.name_en}`} />
            </div>
          </div>

          <div className="hide-desktop">
            <ProductGrid products={products} emptyMessage={`No products found in ${category.name_en}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
