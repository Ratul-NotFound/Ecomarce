'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import ProductGrid from '@/components/store/ProductGrid';
import { Heart } from 'lucide-react';
import type { Product } from '@/types';

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) {
      const supabase = createClient();
      supabase
        .from('wishlists')
        .select('product_id, product:products(*)')
        .eq('user_id', user.id)
        .then(({ data, error }) => {
          if (!error && data) {
            const list = data.map((item: any) => item.product).filter(Boolean);
            setProducts(list);
          }
          setFetching(false);
        });
    } else if (!loading) {
      setFetching(false);
    }
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="container" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading wishlist...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 16px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '12px' }}>Save Items You Love</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
          Sign in to sync your wishlist across all devices and get alerted on price drops.
        </p>
        <Link href="/auth?redirect=/wishlist" className="btn btn-primary">
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '32px 16px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Heart size={24} color="var(--color-danger)" fill="currentColor" />
        <h1 style={{ fontSize: '26px', fontWeight: 800 }}>My Wishlist ({products.length})</h1>
      </div>

      <ProductGrid
        products={products}
        emptyMessage="Your wishlist is empty. Tap the heart icon on any product to save it here!"
      />
    </div>
  );
}
