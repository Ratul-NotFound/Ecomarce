import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Plus } from 'lucide-react';
import AdminProductTable from '@/components/admin/AdminProductTable';
import type { Product } from '@/types';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const supabase = await createClient();
  let dbClient = supabase;
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      dbClient = createAdminClient();
    }
  } catch {}

  const [productsRes, categoriesRes] = await Promise.all([
    dbClient.from('products').select('*, category:categories(name_en)').order('created_at', { ascending: false }),
    dbClient.from('categories').select('id, name_en').order('display_order', { ascending: true }),
  ]);

  const products = (productsRes.data as Product[]) || [];
  const categories = categoriesRes.data || [];

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Product Catalog</h1>
          <p style={{ color: 'var(--color-admin-muted)', fontSize: '14px', marginTop: '4px' }}>
            Manage store inventory, prices, variants, and product promotions.
          </p>
        </div>

        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add New Product</span>
        </Link>
      </div>

      <div className="admin-card">
        <AdminProductTable initialProducts={products} categories={categories} />
      </div>
    </div>
  );
}
