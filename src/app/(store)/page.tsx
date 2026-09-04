import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProductRepository } from '@/lib/supabase/repositories/ProductRepository';
import { CategoryRepository } from '@/lib/supabase/repositories/CategoryRepository';
import { getStoreSettings } from '@/lib/store-settings';
import HeroBanner from '@/components/store/HeroBanner';
import CategoryGrid from '@/components/store/CategoryGrid';
import FlashSale from '@/components/store/FlashSale';
import ProductGrid from '@/components/store/ProductGrid';
import { Sparkles, TrendingUp, ShieldCheck, Truck, RotateCcw, Headphones } from 'lucide-react';
import type { SpecialOffer, Product } from '@/types';
import { resolveFlashSaleEndTime } from '@/lib/flash-sale-utils';

export const revalidate = 60; // Incremental Static Regeneration every 60s

export default async function HomePage() {
  const supabase = await createClient();
  const productRepo = new ProductRepository(supabase);
  const categoryRepo = new CategoryRepository(supabase);

  let banners: SpecialOffer[] = [];
  let categories: any[] = [];
  let flashSaleProducts: Product[] = [];
  let featuredProducts: Product[] = [];
  let newArrivals: Product[] = [];
  let settings = await getStoreSettings();

  try {
    const [bannersRes, cats, flash, feat, newest] = await Promise.all([
      supabase
        .from('special_offers')
        .select('*')
        .eq('type', 'hero_banner')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      categoryRepo.findTopLevel(),
      productRepo.findFlashSale(),
      productRepo.findFeatured(8),
      productRepo.findAll({ sort: 'newest', page_size: 8 }),
    ]);

    banners = (bannersRes.data as SpecialOffer[]) || [];
    categories = cats;
    flashSaleProducts = flash;
    featuredProducts = feat;
    newArrivals = newest.data;
  } catch (err) {
    console.error('Error fetching homepage data:', err);
  }

  // Fallback demo products if Supabase tables are initially empty
  if (featuredProducts.length === 0 && newArrivals.length === 0) {
    const STATIC_DEMO_DATE = '2026-01-01T00:00:00.000Z';
    const STATIC_FLASH_DATE = '2026-12-31T23:59:59.000Z';
    const demoSampleProducts: Product[] = [
      {
        id: 'p1',
        name_en: 'Premium Cotton Oxford Shirt',
        name_bn: 'প্রিমিয়াম কটন অক্সফোর্ড শার্ট',
        slug: 'premium-cotton-oxford-shirt',
        description_en: 'Classic tailored fit, breathable 100% combed cotton.',
        description_bn: null,
        category_id: null,
        brand: 'Fabrilife',
        sku: 'SHIRT-001',
        base_price: 1850,
        sale_price: 1450,
        discount_percent: 21,
        stock_quantity: 45,
        low_stock_threshold: 5,
        images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'],
        tags: ['fashion', 'men', 'shirts'],
        has_variants: true,
        weight_grams: 250,
        is_active: true,
        is_featured: true,
        is_flash_sale: true,
        flash_sale_ends_at: STATIC_FLASH_DATE,
        display_order: 1,
        total_sold: 142,
        total_views: 1200,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
      {
        id: 'p2',
        name_en: 'Wireless ANC Noise-Cancelling Headphones',
        name_bn: 'ওয়্যারলেস নয়েজ ক্যানসেলিং হেডফোন',
        slug: 'wireless-anc-headphones',
        description_en: '40-hour battery life, high-res audio drivers.',
        description_bn: null,
        category_id: null,
        brand: 'SoundPulse',
        sku: 'AUDIO-002',
        base_price: 4200,
        sale_price: 3500,
        discount_percent: 16,
        stock_quantity: 20,
        low_stock_threshold: 3,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80'],
        tags: ['electronics', 'gadgets', 'audio'],
        has_variants: false,
        weight_grams: 300,
        is_active: true,
        is_featured: true,
        is_flash_sale: false,
        flash_sale_ends_at: null,
        display_order: 2,
        total_sold: 89,
        total_views: 940,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
      {
        id: 'p3',
        name_en: 'Minimalist Leather Chrono Watch',
        name_bn: 'লেদার ক্রোনো ওয়াচ',
        slug: 'minimalist-leather-chrono-watch',
        description_en: 'Sapphire crystal glass, genuine full-grain leather strap.',
        description_bn: null,
        category_id: null,
        brand: 'Aethel',
        sku: 'WATCH-003',
        base_price: 2950,
        sale_price: null,
        discount_percent: null,
        stock_quantity: 15,
        low_stock_threshold: 4,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'],
        tags: ['lifestyle', 'accessories', 'watch'],
        has_variants: false,
        weight_grams: 180,
        is_active: true,
        is_featured: true,
        is_flash_sale: true,
        flash_sale_ends_at: STATIC_FLASH_DATE,
        display_order: 3,
        total_sold: 63,
        total_views: 650,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
      {
        id: 'p4',
        name_en: 'Everyday Water-Resistant Urban Backpack',
        name_bn: 'ওয়াটার রেজিস্ট্যান্ট ব্যাকপ্যাক',
        slug: 'water-resistant-urban-backpack',
        description_en: 'Dedicated 16-inch laptop compartment with USB charging port.',
        description_bn: null,
        category_id: null,
        brand: 'PackCraft',
        sku: 'BAG-004',
        base_price: 2400,
        sale_price: 1990,
        discount_percent: 17,
        stock_quantity: 32,
        low_stock_threshold: 5,
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80'],
        tags: ['lifestyle', 'bags'],
        has_variants: false,
        weight_grams: 600,
        is_active: true,
        is_featured: true,
        is_flash_sale: false,
        flash_sale_ends_at: null,
        display_order: 4,
        total_sold: 210,
        total_views: 1890,
        meta_title: null,
        meta_description: null,
        created_at: STATIC_DEMO_DATE,
        updated_at: STATIC_DEMO_DATE,
      },
    ];
    featuredProducts = demoSampleProducts;
    newArrivals = demoSampleProducts;
    flashSaleProducts = demoSampleProducts.filter(p => p.is_flash_sale);
  }

  const flashSaleEndTime = resolveFlashSaleEndTime(settings);

  // Dynamic Section Map for Sequence Customization
  const sectionMap: Record<string, React.ReactNode> = {
    hero: <HeroBanner key="hero" banners={banners} />,
    trust_badges: (
      <div key="trust_badges" className="trust-badges-grid">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'var(--color-primary-10)', color: 'var(--color-primary)', borderRadius: 'var(--radius-lg)' }}>
            <Truck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{settings.trust_badge_1_title}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{settings.trust_badge_1_desc}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'var(--color-success-light)', color: 'var(--color-success)', borderRadius: 'var(--radius-lg)' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{settings.trust_badge_2_title}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{settings.trust_badge_2_desc}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', borderRadius: 'var(--radius-lg)' }}>
            <RotateCcw size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{settings.trust_badge_3_title}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{settings.trust_badge_3_desc}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'rgba(147, 51, 234, 0.12)', color: '#9333ea', borderRadius: 'var(--radius-lg)' }}>
            <Headphones size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px' }}>{settings.trust_badge_4_title}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{settings.trust_badge_4_desc}</div>
          </div>
        </div>
      </div>
    ),
    categories: <CategoryGrid key="categories" categories={categories} />,
    flash_sale: settings.homepage_flash_sale_enabled && flashSaleProducts.length > 0 ? (
      <FlashSale key="flash_sale" products={flashSaleProducts} targetDate={flashSaleEndTime} />
    ) : null,
    featured: (
      <section key="featured" style={{ margin: '40px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} color="var(--color-primary)" />
            <h2>{settings.homepage_featured_title}</h2>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--color-primary)', fontWeight: 600 }}>Curated Top Picks</span>
        </div>
        <ProductGrid products={featuredProducts} />
      </section>
    ),
    new_arrivals: (
      <section key="new_arrivals" style={{ margin: '40px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={22} color="var(--color-success)" />
            <h2>New Arrivals / নতুন কালেকশন</h2>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Fresh in stock</span>
        </div>
        <ProductGrid products={newArrivals} />
      </section>
    ),
  };

  return (
    <div className="container" style={{ paddingBottom: '40px' }} suppressHydrationWarning>
      {settings.homepage_sections_order.map(secKey => {
        const isVisible = settings.homepage_section_visibility?.[secKey] !== false;
        if (!isVisible) return null;
        return sectionMap[secKey] || null;
      })}
    </div>
  );
}
