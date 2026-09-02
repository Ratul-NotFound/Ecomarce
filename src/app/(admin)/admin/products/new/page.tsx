import React from 'react';
import Link from 'next/link';
import ProductForm from '@/components/admin/ProductForm';
import { createClient } from '@/lib/supabase/server';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import { ArrowLeft } from 'lucide-react';

export default async function NewProductPage() {
  const supabase = await createClient();
  const categoryRepo = new CategoryRepository(supabase);
  const categories = await categoryRepo.findAllActive();

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
        <h1 className="admin-page-title" style={{ marginTop: '8px' }}>Create New Product</h1>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
