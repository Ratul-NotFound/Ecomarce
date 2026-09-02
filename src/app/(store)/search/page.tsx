import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import ProductGrid from '@/components/store/ProductGrid';
import FilterSidebar from '@/components/store/FilterSidebar';
import { Search } from 'lucide-react';
import { STORE_CONFIG } from '@/lib/store-config';
import type { Metadata } from 'next';

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const sParams = await searchParams;
  const query = sParams.q || '';
  return {
    title: query ? `Search results for "${query}" | ${STORE_CONFIG.name}` : `Search Products | ${STORE_CONFIG.name}`,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sParams = await searchParams;
  const query = sParams.q || '';
  const minPrice = sParams.min_price ? Number(sParams.min_price) : undefined;
  const maxPrice = sParams.max_price ? Number(sParams.max_price) : undefined;
  const sort = (sParams.sort as any) || 'newest';

  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);
  const categoryRepo = new CategoryRepository(supabase);

  const [categories, { data: products, count }] = await Promise.all([
    categoryRepo.findAllActive(),
    productRepo.findAll({
      search: query,
      min_price: minPrice,
      max_price: maxPrice,
      sort,
      page_size: 24,
    }),
  ]);

  return (
    <div className="container" style={{ padding: '24px 0 60px' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={24} color="var(--color-primary)" />
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>
            {query ? `Results for "${query}"` : 'All Products'}
          </h1>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Found {count} item(s)
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }} className="hide-mobile">
          <FilterSidebar categories={categories} />
          <div>
            <ProductGrid products={products} emptyMessage={query ? `No items found matching "${query}"` : 'No products available'} />
          </div>
        </div>

        <div className="hide-desktop">
          <ProductGrid products={products} emptyMessage={query ? `No items found matching "${query}"` : 'No products available'} />
        </div>
      </div>
    </div>
  );
}
