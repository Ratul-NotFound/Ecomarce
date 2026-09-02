import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import { ArrowLeft } from 'lucide-react';
import type { Product } from '@/types';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  const categoryRepo = new CategoryRepository(dbClient);
  const [categories, productRes] = await Promise.all([
    categoryRepo.findAllActive(),
    dbClient.from('products').select('*, variants:product_variants(*)').eq('id', id).single(),
  ]);

  if (productRes.error || !productRes.data) {
    notFound();
  }

  const product = productRes.data as Product;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link
          href="/admin/products"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-primary-light)', fontWeight: 600 }}
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>
        <h1 className="admin-page-title" style={{ marginTop: '8px' }}>
          Edit: {product.name_en}
        </h1>
      </div>

      <ProductForm initialProduct={product} categories={categories} />
    </div>
  );
}
