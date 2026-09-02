import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import ProductGallery from '@/components/store/ProductGallery';
import ReviewSection from '@/components/store/ReviewSection';
import ProductGrid from '@/components/store/ProductGrid';
import ProductDetailClientActions from './ProductDetailClientActions';
import type { Metadata } from 'next';
import { STORE_CONFIG } from '@/lib/store-config';
import { ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import { getProductVideoUrl } from '@/lib/utils/video';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);
  const product = await productRepo.findBySlug(slug);

  if (!product) {
    return { title: 'Product Not Found' };
  }

  return {
    title: `${product.name_en} | ${STORE_CONFIG.name}`,
    description: product.description_en || `${product.name_en} at the best price in Bangladesh.`,
    openGraph: {
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);

  const product = await productRepo.findBySlug(slug);

  if (!product) {
    notFound();
  }

  // Increment product view counter
  productRepo.incrementViews(product.id).catch(() => {});

  // Fetch related products
  const related = await productRepo.findRelated(product.id, product.category_id, 4);

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      <div className="pdp-layout">
        {/* Left Column: Image Gallery & Video Player */}
        <ProductGallery
          images={product.images || []}
          productName={product.name_en}
          videoUrl={product.video_url || getProductVideoUrl(product)}
        />

        {/* Right Column: Information, Pricing & Interactive Island */}
        <div className="pdp-info">
          {product.category && (
            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', letterSpacing: '1px' }}>
              {product.category.name_en}
            </div>
          )}

          <h1 className="pdp-title">{product.name_en}</h1>
          {product.name_bn && (
            <div style={{ fontSize: '16px', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '-8px' }}>
              {product.name_bn}
            </div>
          )}

          {/* Client Interactive Ordering Island (Variants, Quantity, Add to Cart, Buy Now) */}
          <ProductDetailClientActions product={product} />

          {/* Product Description */}
          {product.description_en && (
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Product Overview</h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '14px', whiteSpace: 'pre-line' }}>
                {product.description_en}
              </p>
              {product.description_bn && (
                <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7, fontSize: '14px', marginTop: '12px', whiteSpace: 'pre-line' }}>
                  {product.description_bn}
                </p>
              )}
            </div>
          )}

          {/* Delivery & Guarantee Points */}
          <div style={{ background: 'var(--color-surface-2)', padding: '16px', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <Truck size={18} color="var(--color-primary)" />
              <span>Cash on Delivery & bKash / Nagad payment available nationwide</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <ShieldCheck size={18} color="var(--color-success)" />
              <span>100% Quality Checked & Brand Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <ReviewSection productId={product.id} reviews={product.reviews || []} />

      {/* Related Products Section */}
      {related.length > 0 && (
        <section style={{ marginTop: '60px' }}>
          <h2 style={{ marginBottom: '20px' }}>You Might Also Like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
